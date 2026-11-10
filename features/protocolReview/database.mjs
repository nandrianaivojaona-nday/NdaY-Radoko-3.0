import { stable, validatePack, compare, review, confirm, management } from './core.mjs';
const notify=encounterId=>{if(typeof window!=='undefined' && typeof BroadcastChannel!=='undefined'){const c=new BroadcastChannel('nday-protocol-review-events');c.postMessage({encounterId});setTimeout(()=>c.close(),0);}};
const DB_NAME='nday-radoko.phase2.review.v1';
const req=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
const completion=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Database transaction aborted'));tx.onerror=()=>{};});
let connection;
function open(){
 if(connection)return connection;
 connection=new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB is unavailable; validation cannot be saved.'));return;}
  const request=indexedDB.open(DB_NAME,1);
  request.onupgradeneeded=()=>{
   const db=request.result;
   db.createObjectStore('protocolPacks',{keyPath:'key'});
   const runs=db.createObjectStore('comparisonRuns',{keyPath:'id'});runs.createIndex('encounterId','encounterId');
   db.createObjectStore('sourceReferences',{keyPath:'key'});
   db.createObjectStore('currentRuns',{keyPath:'encounterId'});
  };
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();connection=null;};resolve(db);};
  request.onerror=()=>{connection=null;reject(request.error);};
  request.onblocked=()=>{connection=null;reject(new Error('Database upgrade blocked. Close other app tabs and retry.'));};
 });return connection;
}
async function storePack(pack){
 validatePack(pack);const db=await open();const tx=db.transaction('protocolPacks','readwrite');const done=completion(tx);
 try{
  const store=tx.objectStore('protocolPacks');const key=pack.id+'@'+pack.version;const existing=await req(store.get(key));
  if(existing&&stable(existing.pack)!==stable(pack))throw new Error('Protocol versions are immutable. Import a new version instead.');
  if(!existing)store.put({key,pack,savedAt:new Date().toISOString()});
  await done;return key;
 }catch(e){try{tx.abort();}catch{}await done.catch(()=>{});throw e;}
}
export async function initializeDatabase(trainingPack,references){
 await storePack(trainingPack);const db=await open();const tx=db.transaction('sourceReferences','readwrite');const done=completion(tx);
 for(const p of references)tx.objectStore('sourceReferences').put({key:p.id+'@'+p.version,title:p.title,version:p.version,clinicalApproval:p.clinicalApproval,executable:false,
  note:'Reference metadata only. Prose chart summaries are not executable rules.'});
 await done;
}
export async function importSyntheticPack(pack,user){
 if(!user?.isDemo||!['Physician','Program Admin'].includes(user.role))throw new Error('Only a clinician/admin demo account may import a synthetic rule pack.');
 return storePack(pack);
}
export async function listPacks(){const db=await open();const tx=db.transaction('protocolPacks','readonly');const done=completion(tx);const rows=await req(tx.objectStore('protocolPacks').getAll());await done;return rows.map(r=>({key:r.key,id:r.pack.id,version:r.pack.version,title:r.pack.title,release:r.pack.release}));}
export async function getRun(id){const db=await open();const tx=db.transaction('comparisonRuns','readonly');const done=completion(tx);const result=await req(tx.objectStore('comparisonRuns').get(id));await done;return result||null;}
export async function getCurrentRun(encounterId){const db=await open();const tx=db.transaction(['currentRuns','comparisonRuns'],'readonly');const done=completion(tx);const pointer=await req(tx.objectStore('currentRuns').get(encounterId));const run=pointer?await req(tx.objectStore('comparisonRuns').get(pointer.runId)):null;await done;return run||null;}
export async function listRuns(encounterId){const db=await open();const tx=db.transaction('comparisonRuns','readonly');const done=completion(tx);const rows=await req(tx.objectStore('comparisonRuns').index('encounterId').getAll(encounterId));await done;return rows.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}
export async function createRun(e,p,u,packKey){
 const db=await open();const tx=db.transaction(['protocolPacks','comparisonRuns','currentRuns'],'readwrite');const done=completion(tx);
 try{const record=await req(tx.objectStore('protocolPacks').get(packKey));if(!record)throw new Error('No executable pack selected.');
  const run=compare(e,p,u,record.pack,{id:crypto.randomUUID(),now:new Date().toISOString()});tx.objectStore('comparisonRuns').add(run);tx.objectStore('currentRuns').put({encounterId:e.id,runId:run.id});await done;notify(e.id);return run;
 }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
}
async function mutateRun(id,e,p,u,revision,operation){
 const db=await open();const tx=db.transaction(['protocolPacks','comparisonRuns','currentRuns'],'readwrite');const done=completion(tx);
 try{const run=await req(tx.objectStore('comparisonRuns').get(id));if(!run)throw new Error('Comparison run not found.');
  const active=await req(tx.objectStore('currentRuns').get(e.id));if(active?.runId!==run.id)throw new Error('This comparison was superseded. Refresh the latest run.');
  const record=await req(tx.objectStore('protocolPacks').get(run.packKey));if(!record)throw new Error('Protocol pack not found.');
  const next=operation(run,e,p,u,record.pack,revision,new Date().toISOString());tx.objectStore('comparisonRuns').put(next);await done;notify(e.id);return next;
 }catch(error){try{tx.abort();}catch{}await done.catch(()=>{});throw error;}
}
export const reviewClassification=(id,e,p,u,command,revision)=>mutateRun(id,e,p,u,revision,(r,a,b,c,pack,rev,now)=>review(r,a,b,c,pack,command,rev,now));
export const confirmClassificationSet=(id,e,p,u,revision)=>mutateRun(id,e,p,u,revision,(r,a,b,c,pack,rev,now)=>confirm(r,a,b,c,pack,rev,now));
export async function getManagement(id,e,p,u){
 const db=await open();const tx=db.transaction(['protocolPacks','comparisonRuns','currentRuns'],'readonly');const done=completion(tx);
 try{const run=await req(tx.objectStore('comparisonRuns').get(id));if(!run)throw new Error('Comparison run missing.');
  const active=await req(tx.objectStore('currentRuns').get(e.id));if(active?.runId!==run.id)throw new Error('A newer comparison superseded this review. Management remains locked.');
  const record=await req(tx.objectStore('protocolPacks').get(run.packKey));if(!record)throw new Error('Protocol pack missing.');
  const actions=management(run,e,p,u,record.pack);
  const accepted=run.confirmation.acceptedRuleIds.map(id=>({id,label:record.pack.rules.find(r=>r.id===id).label}));
  await done;return {runId:run.id,revision:run.revision,protocolId:record.pack.id,protocolVersion:record.pack.version,accepted,actions,
    validatedBy:run.confirmation.by,validatedAt:run.confirmation.at,assessmentSnapshot:run.assessmentSnapshot};
 }catch(error){await done.catch(()=>{});throw error;}
}
export const authorizeSigning=getManagement;
export async function exportReviewDatabase(){
 const db=await open();const tx=db.transaction(['protocolPacks','comparisonRuns','sourceReferences','currentRuns'],'readonly');const done=completion(tx);
 const packs=await req(tx.objectStore('protocolPacks').getAll());const runs=await req(tx.objectStore('comparisonRuns').getAll());const refs=await req(tx.objectStore('sourceReferences').getAll());const current=await req(tx.objectStore('currentRuns').getAll());await done;
 return {schemaVersion:1,currentRuns:current,exportedAt:new Date().toISOString(),syntheticOnly:true,protocolPacks:packs,comparisonRuns:runs,sourceReferences:refs};
}
