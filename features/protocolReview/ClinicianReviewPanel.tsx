import React, { useEffect, useRef, useState } from 'react';
import type { Country, Encounter, Facility, Observation, ObservationMethod, Patient, Session } from '../../types';
import type { EncounterActions } from '../../components/EncounterDetail';
import type { DecisionInput } from '../../services/clinicalWorkflow';
import { canRecordObservations } from '../../services/clinicalWorkflow';
import ObservationPanel from '../../components/ObservationPanel';
import training from './training-pack.json';
import { snapshot } from './core.mjs';
import { initializeDatabase, listPacks, listRuns, getRun, getCurrentRun, createRun, reviewClassification,
  confirmClassificationSet, getManagement, importSyntheticPack, exportReviewDatabase } from './database.mjs';

interface Props {encounter:Encounter;patient:Patient;country:Country|null;session:Session;facilities:Facility[];
  actions:EncounterActions;onUrgent:()=>void;onDirty:(dirty:boolean)=>void;saveStatus:'pending'|'saved locally'|'failed'}
const methods:Record<string,ObservationMethod|undefined>={
  ASK:'Caregiver report',LOOK:'Remote visual observation',FEEL:'Trained in-person assessment',MEASURE:'Device measurement',ALL:undefined,
};
export default function ClinicianReviewPanel({encounter:e,patient:p,country,session,facilities,actions,onUrgent,onDirty,saveStatus}:Props){
  const [step,setStep]=useState('ASK');
  const [observations,setObservations]=useState<Observation[]>(e.observations);
  const [dirty,setDirty]=useState(false);
  const [packs,setPacks]=useState<any[]>([]);
  const [packKey,setPackKey]=useState('');
  const [run,setRun]=useState<any>(null);
  const [management,setManagement]=useState<any>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [dbState,setDbState]=useState('opening');
  const currentSnapshot=snapshot(e,p);
  const current=useRef(currentSnapshot);current.current=currentSnapshot;
  const mounted=useRef(true);
  const clinician=session.user.role==='Physician'&&session.user.facilityId===e.facilityId;
  const canCollect=canRecordObservations(session.user,e)&&!e.physicianDecision&&!e.safetyEscalation.triggered;
  const stale=Boolean(run&&run.assessmentSnapshot!==currentSnapshot);
  const [plan,setPlan]=useState<DecisionInput>({disposition:'Home follow-up',protocolClassification:'',protocolPlan:'',workingAssessment:'',instructionsForCaregiver:'',safetyNetting:'',
    followUpDueAt:'',followUpMethod:'Phone call',referralFacility:'',referralUrgency:'Same day',referralReason:'',incompleteEvidenceAcknowledged:false,incompleteEvidenceReason:'',caregiverUnderstandingConfirmed:false,caregiverUnderstandingNotes:''});
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{setObservations(e.observations);setDirty(false);setManagement(null);},[e.observations,currentSnapshot]);
  useEffect(()=>{onDirty(dirty);return()=>onDirty(false);},[dirty,onDirty]);
  useEffect(()=>{
    const handler=(event:BeforeUnloadEvent)=>{if(dirty){event.preventDefault();event.returnValue='';}};
    window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler);
  },[dirty]);
  useEffect(()=>{
    let active=true;
    (async()=>{try{await initializeDatabase(training,country?.protocols||[]);const options=await listPacks();const latest=await getCurrentRun(e.id);
      if(active){setPacks(options);setRun(latest);setPackKey(latest?.packKey||'');setDbState('ready');}}
      catch(err){if(active){setDbState('failed');setError(err instanceof Error?err.message:'Database unavailable');}}
    })();return()=>{active=false;};
  },[e.id,country?.id]);
  useEffect(()=>{
    const invalidate=()=>{setManagement(null);void getCurrentRun(e.id).then(latest=>{if(mounted.current)setRun(latest);}).catch(err=>{if(mounted.current)setError(String(err));});};
    const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('nday-protocol-review-events'):null;
    if(channel)channel.onmessage=event=>{if(event.data?.encounterId===e.id)invalidate();};
    window.addEventListener('focus',invalidate);
    return()=>{channel?.close();window.removeEventListener('focus',invalidate);};
  },[e.id]);
  const perform=async(fn:()=>Promise<void>)=>{
    setError('');setNotice('');setBusy(true);const atStart=current.current;
    try{await fn();if(mounted.current&&current.current!==atStart){setManagement(null);setNotice('Assessment changed while this operation was running. Refresh/rerun before proceeding.');}}
    catch(err){if(mounted.current){setManagement(null);setError(err instanceof Error?err.message:'Operation failed');}}
    finally{if(mounted.current)setBusy(false);}
  };
  const refresh=()=>perform(async()=>{const latest=await getCurrentRun(e.id);if(mounted.current)setRun(latest);setPacks(await listPacks());setManagement(null);});
  const loadManagement=()=>perform(async()=>{
    const s=current.current;const result=await getManagement(run.id,e,p,session.user);
    if(mounted.current&&s===current.current){setManagement(result);setPlan(old=>({...old,
      reviewRunId:result.runId,protocolId:result.protocolId,protocolVersion:result.protocolVersion,
      protocolClassification:result.accepted.map((c:any)=>c.label).join('; '),
      protocolPlan:result.actions.map((x:any)=>x.action.text).join('\n')}));}
  });
  const changeStep=(s:string)=>{setStep(s);};
  const save=()=>{setError('');try{actions.saveObservations(e.id,observations);setDirty(false);setNotice('Assessment updated in memory; verify the local save status before comparison.');}catch(err){setError(err instanceof Error?err.message:'Save failed');}};
  const exportDb=()=>perform(async()=>{
    const dump=await exportReviewDatabase();const url=URL.createObjectURL(new Blob([JSON.stringify(dump,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='nday-phase2-synthetic-review-export.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  if(e.physicianDecision)return <section className="surface-muted p-4 space-y-2">
    <h3 className="font-bold">Existing signed decision</h3><p>{e.physicianDecision.physicianName} · {e.physicianDecision.signedAt}</p>
    <p>{e.physicianDecision.protocolClassification||e.physicianDecision.workingAssessment}</p>
    <p className="whitespace-pre-wrap">{e.physicianDecision.protocolPlan||e.physicianDecision.instructionsForCaregiver}</p>
    <p className="text-xs">Preserved record. Older decisions were not retroactively validated by this database.</p>
  </section>;
  return <div className="space-y-4">
    <section className="surface-muted p-4 space-y-2">
      <h3 className="text-lg font-bold">Assessment → indicative classification → clinician validation</h3>
      <p className="text-sm">{p.name} · {p.ageDays} days · {session.user.name} · {session.user.role}</p>
      <p className="text-xs text-brand-accent">SYNTHETIC SOFTWARE DEMONSTRATION ONLY. No aircraft, camera, microphone or instrument connected. Built-in rules are non-medical training rules, NOT IMCI/PCIMNE.</p>
      <p className="text-xs">Assessment consent: {e.consent.obtained?'recorded':'missing'} · image permission: {e.consent.imageCaptureAllowed?'allowed':'declined'} · local assessment save: {saveStatus} · review database: {dbState}.</p>
      <button className="btn-danger" onClick={onUrgent}>Open existing urgent-care pathway</button>
      <p className="text-xs">Independent of database, comparison or review. This opens the local form; it does not contact a facility.</p>
    </section>
    {error&&<p role="alert" className="text-status-red">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}
    <nav className="flex flex-wrap gap-2" aria-label="Protocol workflow">
      {['ASK','LOOK','FEEL','MEASURE','COMPARE','VALIDATE','MANAGEMENT'].map(s=><button key={s} className={step===s?'btn-primary':'btn-secondary'} onClick={()=>changeStep(s)}>{s==='LOOK'?'LOOK / LISTEN':s}</button>)}
    </nav>
    {Object.hasOwn(methods,step)&&<section className="space-y-3">
      <p className="text-xs">Reuse the existing chart-derived input catalogue. Save answers before comparison. Unknown is not normal. This prototype stores entered findings, not captured media.</p>
      {step==='FEEL'&&<p className="text-sm text-status-red">FEEL belongs to a trained in-person examiner, not the drone. Enter synthetic documentation only; do not perform or coach examinations during this software demonstration. Record unavailable if no examiner is available.</p>}
      {step==='MEASURE'&&<p className="text-xs">Record the synthetic value, unit, device/operator note and quality. No instrument reading is imported automatically.</p>}
      <ObservationPanel observations={observations} onChange={next=>{setObservations(next);setDirty(true);setManagement(null);}}
        onSave={save} user={session.user} reportedConcerns={p.reportedConcerns} onUrgentPathway={onUrgent}
        disabled={!canCollect||!e.consent.obtained||busy} methodFilter={methods[step]}/>
    </section>}
    {step==='COMPARE'&&<section className="surface-muted p-4 space-y-3">
      <h4 className="font-bold">Executable pack stored in the database</h4>
      <p className="text-xs">Existing clinical documents are indexed as references only; their prose has not been converted into executable medical rules. Built-in test: enter DEMO-A DEMO-B under Other concern, save it, then compare.</p>
      <select className="input-field" aria-label="Executable synthetic rule pack" value={packKey} onChange={ev=>{setPackKey(ev.target.value);setManagement(null);}} disabled={busy}>
        <option value="">Choose a stored executable pack</option>{packs.map(x=><option key={x.key} value={x.key}>{x.title} · {x.version} · {x.release}</option>)}
      </select>
      <button className="btn-primary" disabled={busy||dirty||saveStatus!=='saved locally'||dbState!=='ready'||!packKey||!canCollect}
        onClick={()=>perform(async()=>{const s=current.current;const next=await createRun(e,p,session.user,packKey);if(mounted.current&&s===current.current){setRun(next);setManagement(null);setStep('VALIDATE');}})}>Save new comparison run</button>
      <p className="text-xs">Uses saved findings. No management list is returned by this operation.</p>
      {['Physician','Program Admin'].includes(session.user.role)&&<label className="block text-xs">Import a synthetic executable JSON pack (max 1 MB; never approves clinical content)
        <input type="file" accept=".json" disabled={busy} onChange={ev=>{const file=ev.target.files?.[0];if(!file)return;void perform(async()=>{if(file.size>1000000)throw new Error('Pack exceeds 1 MB.');await importSyntheticPack(JSON.parse(await file.text()),session.user);setPacks(await listPacks());});ev.target.value='';}}/>
      </label>}
    </section>}
    {step==='VALIDATE'&&<section className="space-y-3">
      <h4 className="font-bold">Indicative classifications — not yet a management plan</h4>
      {!run?<p>No saved comparison run. Open COMPARE first.</p>:<>
        <p className="text-xs">Run {run.id} · {run.packKey} · revision {run.revision} · {run.createdAt}</p>
        {stale&&<p role="alert" className="text-status-red">STALE: assessment inputs changed. Review and management are locked. Save findings and create a new comparison.</p>}
        {!clinician&&<p className="text-xs">Only the Physician demo account assigned to this facility may validate. Field officers can prepare assessment/comparison records.</p>}
        {run.results.filter((x:any)=>x.state!=='NOT_MATCHED').map((candidate:any)=><ReviewCard key={`${run.id}:${candidate.ruleId}`} candidate={candidate} existing={run.reviews[candidate.ruleId]}
          alternatives={run.results.filter((x:any)=>x.ruleId!==candidate.ruleId)} disabled={busy||stale||!clinician||Boolean(run.confirmation)}
          onReview={command=>perform(async()=>{setRun(await reviewClassification(run.id,e,p,session.user,command,run.revision));setManagement(null);})}/>)}
        {!run.results.some((x:any)=>x.state!=='NOT_MATCHED')&&<p>No proposed classification. This is NOT a counselling-only determination.</p>}
        <button className="btn-secondary" disabled={busy} onClick={refresh}>Refresh database revision</button>
        <button className="btn-primary" disabled={busy||stale||!clinician||Boolean(run.confirmation)} onClick={()=>perform(async()=>{setRun(await confirmClassificationSet(run.id,e,p,session.user,run.revision));setNotice('Classification set confirmed in the local database. Open MANAGEMENT to request linked actions.');})}>Confirm reviewed classification set</button>
        {run.confirmation&&<p className="text-xs">Confirmed by {run.confirmation.by} at {run.confirmation.at}. Clinical reference approval is not implied.</p>}
      </>}
    </section>}
    {step==='MANAGEMENT'&&<section className="surface-muted p-4 space-y-3">
      <h4 className="font-bold">Management — locked until database confirmation</h4>
      <button className="btn-primary" disabled={busy||!run||stale||!clinician||!run?.confirmation||dirty} onClick={loadManagement}>Retrieve actions for confirmed classifications</button>
      {!management&&<p className="text-xs">No treatment, counselling, referral or follow-up list has been released for this current review.</p>}
      {management&&!stale&&<>
        <p className="text-xs">Confirmed {management.validatedAt} by {management.validatedBy}. Listed actions are not authorized or delivered actions.</p>
        {management.actions.length===0&&<p>No accepted mapped actions. Do not infer that no treatment is needed.</p>}
        {management.actions.map((item:any)=><article key={item.action.id} className="border rounded p-3 text-sm"><p>{item.action.kind}: {item.action.text}</p><p className="text-xs">From {item.classificationIds.join(', ')} · {item.citation.sourceId} / {item.citation.section} / p. {item.citation.page}</p></article>)}
        <h4 className="font-bold">Separate clinician-authored synthetic plan</h4>
        <p className="text-xs">Training pack output is not medical advice. The existing clinical-signature validation still applies.</p>
        <p className="text-sm">Classifications: {management.accepted.map((x:any)=>x.label).join('; ')||'none accepted'}</p>
        <label className="label-field">Disposition<select className="input-field" value={plan.disposition} onChange={ev=>setPlan({...plan,disposition:ev.target.value as DecisionInput['disposition']})}><option>Home follow-up</option><option>In-person assessment</option><option>Urgent referral</option></select></label>
        {(['protocolPlan','workingAssessment','instructionsForCaregiver','safetyNetting'] as const).map(field=><label key={field} className="label-field">{field}<textarea className="input-field" value={plan[field]} onChange={ev=>setPlan({...plan,[field]:ev.target.value})}/></label>)}
        {plan.disposition==='Home follow-up'?<>
          <label className="label-field">Follow-up date/time<input type="datetime-local" className="input-field" value={plan.followUpDueAt||''} onChange={ev=>setPlan({...plan,followUpDueAt:ev.target.value})}/></label>
          <select className="input-field" aria-label="Follow-up method" value={plan.followUpMethod} onChange={ev=>setPlan({...plan,followUpMethod:ev.target.value as DecisionInput['followUpMethod']})}><option>Phone call</option><option>Community health worker visit</option><option>Facility visit</option><option>Drone-assisted check-in</option></select>
        </>:<>
          <label className="label-field">Receiving facility<select className="input-field" value={plan.referralFacility||''} onChange={ev=>setPlan({...plan,referralFacility:ev.target.value})}><option value="">Select a demonstration facility</option>{facilities.map(f=><option key={f.id} value={f.name}>{f.name}</option>)}</select></label>
          <select className="input-field" aria-label="Referral urgency" value={plan.referralUrgency} onChange={ev=>setPlan({...plan,referralUrgency:ev.target.value as DecisionInput['referralUrgency']})}><option>Same day</option><option>Within 24 hours</option><option>Routine</option></select>
          <textarea className="input-field" aria-label="Referral reason" value={plan.referralReason||''} onChange={ev=>setPlan({...plan,referralReason:ev.target.value})}/>
        </>}
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={plan.incompleteEvidenceAcknowledged} onChange={ev=>setPlan({...plan,incompleteEvidenceAcknowledged:ev.target.checked})}/>Acknowledge incomplete required observations in this synthetic scenario</label>
        <textarea className="input-field" aria-label="Incomplete evidence reason" value={plan.incompleteEvidenceReason||''} onChange={ev=>setPlan({...plan,incompleteEvidenceReason:ev.target.value})}/>
        <label className="flex gap-2 text-xs"><input type="checkbox" checked={plan.caregiverUnderstandingConfirmed} onChange={ev=>setPlan({...plan,caregiverUnderstandingConfirmed:ev.target.checked})}/>Record that caregiver understanding was checked in this synthetic scenario</label>
        <button className="btn-primary" disabled={busy||dirty||!management.accepted.length} onClick={()=>perform(async()=>{
          const checked=await getManagement(run.id,e,p,session.user);const result=await actions.signDecision(e.id,{...plan,
            protocolClassification:checked.accepted.map((x:any)=>x.label).join('; '),protocolId:checked.protocolId,protocolVersion:checked.protocolVersion,reviewRunId:checked.runId});
          if(!result.valid)throw new Error(result.errors.join(' '));setNotice('Synthetic plan signed. No action was automatically delivered.');
        })}>Sign synthetic management plan</button>
      </>}
    </section>}
    <div className="flex flex-wrap gap-2"><button className="btn-secondary" disabled={busy||dbState!=='ready'} onClick={exportDb}>Export local review database (synthetic only)</button><p className="text-xs">Clearing browser site data can erase this database. It is not secure shared clinical storage.</p></div>
  </div>;
}

function ReviewCard({candidate,existing,alternatives,disabled,onReview}:{candidate:any; key?: React.Key;existing:any;alternatives:any[];disabled:boolean;onReview:(command:any)=>void}){
 const [reason,setReason]=useState('');const [alternative,setAlternative]=useState('');
 return <article className="surface-muted p-4 space-y-2">
   <h5 className="font-bold">{candidate.label}</h5><p className="text-xs">{candidate.state} · {candidate.module} · source {candidate.citation.sourceId}, {candidate.citation.section}, p. {candidate.citation.page}</p>
   <details><summary className="text-xs">Matched inputs and rule explanation</summary><pre className="overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(candidate.explanation,null,2)}</pre></details>
   {existing&&<p className="text-xs">Saved review: {existing.decision} by {existing.by} at {existing.at} — {existing.reason}{existing.replacementId?` → ${existing.replacementId}`:''}</p>}
   <textarea className="input-field" aria-label={`Review rationale for ${candidate.ruleId}`} placeholder="Required clinician rationale" value={reason} disabled={disabled} onChange={e=>setReason(e.target.value)}/>
   <div className="flex flex-wrap gap-2">{['ACCEPT','REJECT','NEEDS_INFO'].map(decision=><button key={decision} className="btn-secondary" disabled={disabled||!reason.trim()||(decision==='ACCEPT'&&candidate.state!=='MATCHED')} onClick={()=>onReview({ruleId:candidate.ruleId,decision,reason})}>{decision==='NEEDS_INFO'?'Request more information':decision}</button>)}</div>
   <select className="input-field" aria-label="Alternative mapped classification" value={alternative} disabled={disabled} onChange={e=>setAlternative(e.target.value)}><option value="">Optional clinician alternative from same pack</option>{alternatives.map(x=><option key={x.ruleId} value={x.ruleId}>{x.label}</option>)}</select>
   <button className="btn-secondary" disabled={disabled||!alternative||!reason.trim()} onClick={()=>onReview({ruleId:candidate.ruleId,decision:'REPLACE',replacementId:alternative,reason})}>Record mapped alternative with rationale</button>
 </article>;
}
