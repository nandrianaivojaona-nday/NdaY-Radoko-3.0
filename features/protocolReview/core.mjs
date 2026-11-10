export const stable = value => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  return '{'+Object.keys(value).filter(k=>value[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';
};
const fail = message => { throw new Error(message); };
export const snapshot = (encounter, patient) => stable({
  encounterId:encounter.id,patientId:patient.id,motherId:patient.motherId,ageDays:patient.ageDays,sex:patient.sex,
  countryId:patient.countryId,facilityId:encounter.facilityId,consent:encounter.consent,
  observations:[...encounter.observations].sort((a,b)=>a.definitionId.localeCompare(b.definitionId)),
});
export function assertContext(e,p,u,clinician=false) {
  if(!u?.isDemo || p?.dataClassification!=='Demo — synthetic' || p.id!==e.patientId || p.motherId!==e.motherId || p.countryId!==e.countryId) fail('Matching synthetic demonstration records and a demo account are required.');
  if(!Number.isInteger(p.ageDays)||p.ageDays<0||p.ageDays>59) fail('Synthetic infant must be aged 0–59 days.');
  if(!e.consent?.obtained||!e.consent.obtainedAt) fail('Recorded assessment consent is required.');
  if(e.physicianDecision || ['Closed','Decision signed','Follow-up scheduled','Referral in progress'].includes(e.status) || e.safetyEscalation?.triggered) fail('This encounter is read-only for routine comparison/review.');
  if(clinician && (u.role!=='Physician'||u.facilityId!==e.facilityId)) fail('Only the physician assigned to the encounter facility may validate classifications.');
  if(!clinician && !['Physician','Field Officer'].includes(u.role)) fail('This account cannot prepare comparison runs.');
  if(u.role==='Physician' && u.facilityId!==e.facilityId) fail('Physician facility mismatch.');
}
export function validatePack(pack) {
  if(!pack||pack.schemaVersion!==1||pack.release!=='synthetic-only'||!pack.id||!pack.version||!Array.isArray(pack.rules)||!pack.rules.length||pack.rules.length>100) fail('Invalid synthetic rule pack. Clinical release is not supported by this prototype.');
  const ids=new Set(),priorities=new Set(),actions=new Map();
  for(const rule of pack.rules) {
    if(typeof rule.id!=='string'||!(/^[A-Za-z0-9][A-Za-z0-9._-]*$/).test(rule.id)||Object.getOwnPropertyNames(Object.prototype).includes(rule.id)||ids.has(rule.id)||typeof rule.label!=='string'||!rule.label.trim()||typeof rule.module!=='string'||!rule.module.trim()||!Number.isInteger(rule.priority)) fail('Each rule needs unique ID, label, module and integer priority.');
    ids.add(rule.id);const key=rule.module+':'+rule.priority;
    if(priorities.has(key))fail('Priorities must be unique within a module.');priorities.add(key);
    if(!rule.citation?.sourceId||!rule.citation.section||!Number.isInteger(rule.citation.page)||rule.citation.page<1) fail('Each rule requires a source citation.');
    const walk=(node,depth=0)=>{
      if(depth>12||!node||typeof node!=='object')fail('Invalid or excessively nested rule.');
      if([Boolean(node.all),Boolean(node.any),Boolean(node.not),Boolean(node.field)].filter(Boolean).length!==1)fail('A condition must have exactly one form.');
      if(node.all||node.any){const children=node.all||node.any;if(!Array.isArray(children)||!children.length||children.length>64)fail('Invalid condition list.');children.forEach(x=>walk(x,depth+1));return;}
      if(node.not){walk(node.not,depth+1);return;}
      if(typeof node.field!=='string'||!['eq','in','gte','gt','lte','lt','contains'].includes(node.op))fail('Unsupported condition operator.');
      if(node.op==='in'&&!Array.isArray(node.value))fail('IN needs an array.');
      if(['gte','gt','lte','lt'].includes(node.op)&&!Number.isFinite(node.value))fail('Numeric thresholds must be finite numbers.');
    };walk(rule.when);
    if(!Array.isArray(rule.actions))fail('Actions must be an array.');
    for(const action of rule.actions){
      if(typeof action.id!=='string'||typeof action.text!=='string'||!action.text.trim()||!['Treatment','Referral','Counselling','Home care','Follow-up','Training placeholder'].includes(action.kind))fail('Malformed action.');
      if(actions.has(action.id)&&actions.get(action.id)!==stable(action))fail('Conflicting action definitions.');
      actions.set(action.id,stable(action));
    }
  }
  return pack;
}
function getField(field,e,p) {
  if(field==='ageDays') return {known:true,value:p.ageDays};
  if(!field.startsWith('obs:'))return {known:false,why:'Unknown input field: '+field};
  const o=e.observations.find(x=>x.definitionId===field.slice(4));
  if(!o||typeof o.value!=='string'||!o.value.trim()||['Not assessed','Unavailable','Unusable'].includes(o.quality)||/^(unable\b|unknown\b|unavailable\b|declined\b|not assessed\b)/i.test(o.value.trim()))return {known:false,why:'Missing/unusable '+field};
  return {known:true,value:o.value.trim()};
}
export function evaluateCondition(node,e,p) {
  if(node.all||node.any){
    const children=(node.all||node.any).map(x=>evaluateCondition(x,e,p));const values=children.map(x=>x.value);
    const value=node.all?(values.includes(false)?false:values.every(x=>x===true)?true:null):(values.includes(true)?true:values.every(x=>x===false)?false:null);
    return {value,trace:children};
  }
  if(node.not){const child=evaluateCondition(node.not,e,p);return {value:child.value===null?null:!child.value,trace:[child]};}
  const got=getField(node.field,e,p);if(!got.known)return {value:null,field:node.field,why:got.why};
  let value;
  if(['gte','gt','lte','lt'].includes(node.op)){
    const n=Number(got.value);if(!Number.isFinite(n))return {value:null,field:node.field,why:'Invalid numeric input'};
    value=node.op==='gte'?n>=node.value:node.op==='gt'?n>node.value:node.op==='lte'?n<=node.value:n<node.value;
  }else value=node.op==='eq'?got.value===node.value:node.op==='in'?node.value.includes(got.value):typeof got.value==='string'&&got.value.includes(String(node.value));
  return {value,field:node.field,observed:got.value,operator:node.op,expected:node.value};
}
export function compare(e,p,u,pack,context) {
  assertContext(e,p,u);validatePack(pack);
  const prior=new Map();
  const results=[...pack.rules].sort((a,b)=>a.module.localeCompare(b.module)||a.priority-b.priority).map(rule=>{
    const evaluated=evaluateCondition(rule.when,e,p);const higher=prior.get(rule.module)||[];
    let state=evaluated.value===null?'UNDETERMINED':evaluated.value?'MATCHED':'NOT_MATCHED';
    if(higher.includes('MATCHED'))state='NOT_MATCHED';
    else if(higher.includes('UNDETERMINED')&&state==='MATCHED')state='UNDETERMINED';
    prior.set(rule.module,[...higher,state]);
    return {ruleId:rule.id,label:rule.label,module:rule.module,state,citation:rule.citation,explanation:evaluated};
  });
  return {id:context.id,encounterId:e.id,patientId:p.id,facilityId:e.facilityId,packKey:pack.id+'@'+pack.version,packSnapshot:stable(pack),
    assessmentSnapshot:snapshot(e,p),createdAt:context.now,createdBy:u.id,revision:0,results,reviews:{},reviewHistory:[],confirmation:null};
}
export function assertFresh(run,e,p,pack) {
  if(!run||run.encounterId!==e.id||run.patientId!==p.id||run.facilityId!==e.facilityId||run.assessmentSnapshot!==snapshot(e,p)||run.packSnapshot!==stable(pack))fail('Stale or mismatched assessment/protocol. Run a new comparison and review it again.');
}
export function review(run,e,p,u,pack,command,expectedRevision,now) {
  assertContext(e,p,u,true);assertFresh(run,e,p,pack);
  if(run.revision!==expectedRevision)fail('Review revision changed. Reload before retrying.');
  if(run.confirmation)fail('This review set is confirmed. Create a new comparison to revise it.');
  const candidate=run.results.find(r=>r.ruleId===command.ruleId&&r.state!=='NOT_MATCHED');
  if(!candidate)fail('No reviewable indicative classification found.');
  if(!['ACCEPT','REJECT','NEEDS_INFO','REPLACE'].includes(command.decision)||!command.reason?.trim())fail('A review decision and rationale are required.');
  if(command.decision==='ACCEPT'&&candidate.state!=='MATCHED')fail('Incomplete evidence cannot be accepted as an automatic match.');
  if(command.decision==='REPLACE'&&!pack.rules.some(r=>r.id===command.replacementId&&r.id!==candidate.ruleId))fail('Alternative must map to a different classification in the same pack.');
  const next=structuredClone(run);
  const record={ruleId:candidate.ruleId,decision:command.decision,replacementId:command.decision==='REPLACE'?command.replacementId:null,reason:command.reason.trim(),by:u.id,at:now};
  next.reviews[candidate.ruleId]=record;next.reviewHistory.push(record);next.revision++;return next;
}
export function confirm(run,e,p,u,pack,expectedRevision,now) {
  assertContext(e,p,u,true);assertFresh(run,e,p,pack);
  if(run.revision!==expectedRevision)fail('Review revision changed.');
  if(run.confirmation)fail('Already confirmed; no silent overwrite allowed.');
  const candidates=run.results.filter(r=>r.state!=='NOT_MATCHED');
  if(candidates.some(r=>!run.reviews[r.ruleId]||run.reviews[r.ruleId].decision==='NEEDS_INFO'))fail('Every proposed classification needs a resolved review.');
  if(candidates.some(r=>r.state==='UNDETERMINED'))fail('Unresolved evidence remains. Collect it and rerun comparison; urgent escalation remains independent.');
  const accepted=[...new Set(candidates.flatMap(r=>{
    const x=run.reviews[r.ruleId];return x.decision==='ACCEPT'?[r.ruleId]:x.decision==='REPLACE'?[x.replacementId]:[];
  }))];
  const modules=accepted.map(id=>pack.rules.find(r=>r.id===id).module);
  if(new Set(modules).size!==modules.length)fail('Conflicting classifications in the same exclusive module require reconciliation.');
  const next=structuredClone(run);next.confirmation={by:u.id,at:now,acceptedRuleIds:accepted,assessmentSnapshot:run.assessmentSnapshot};next.revision++;return next;
}
export function management(run,e,p,u,pack) {
  assertContext(e,p,u,true);assertFresh(run,e,p,pack);
  if(!run.confirmation||run.confirmation.assessmentSnapshot!==snapshot(e,p))fail('Clinician confirmation is required before listing management.');
  const actions=new Map();
  for(const id of run.confirmation.acceptedRuleIds){
    const rule=pack.rules.find(r=>r.id===id);if(!rule)fail('Validated classification no longer exists.');
    for(const action of rule.actions){const old=actions.get(action.id);if(old&&stable(old.action)!==stable(action))fail('Conflicting actions.');actions.set(action.id,{action,classificationIds:[...(old?.classificationIds||[]),id],citation:rule.citation});}
  }
  return [...actions.values()];
}
