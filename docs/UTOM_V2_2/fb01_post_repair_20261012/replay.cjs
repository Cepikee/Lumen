const fs=require('node:fs'),crypto=require('node:crypto');
const {bind}=require('../../../scripts/experimental/real-text-a-binder.cjs');
const before=require('../fresh_blind_20261012/FRESH_BLIND_BEFORE_REPAIR_raw.json');
const rows=before.rows.map(r=>({id:r.id,text:r.text,annotation:r.annotation,output:bind(r.text,structuredClone(r.annotation))}));
fs.writeFileSync(__dirname+'/FB01_POST_REPAIR_raw.json',JSON.stringify({kind:'POST_REPAIR_REPLAY_NOT_BLIND',createdAt:new Date().toISOString(),frozenBeforeSha256:crypto.createHash('sha256').update(fs.readFileSync(__dirname+'/../fresh_blind_20261012/FRESH_BLIND_BEFORE_REPAIR_raw.json')).digest('hex'),rows},null,2),{flag:'wx'});
// Compare persisted JSON, so absent versus undefined properties cannot fake a change.
const after=JSON.parse(fs.readFileSync(__dirname+'/FB01_POST_REPAIR_raw.json'));
const source=r=>({entities:r.entities,chains:r.attributionChains,nominals:r.reportingNominalRelations,frames:r.frames.map(f=>Object.fromEntries(['frameId','source','sourceEvidence','reportingActor','recipient','recipientCandidates','attribution','claimOwner','attributionChainId','actor','actorStatus','action','actionSpan','contrasts','polarity'].map(k=>[k,f[k]])))});
const changedSource=rows.filter((r,i)=>JSON.stringify(source(before.rows[i].output))!==JSON.stringify(source(after.rows[i].output))).map(r=>r.id);
const changes=after.rows.flatMap((r,i)=>r.output.frames.flatMap((f,j)=>{const old=before.rows[i].output.frames[j];if(JSON.stringify(old.numericArguments)===JSON.stringify(f.numericArguments))return[];return[{id:r.id,frame:j,text:f.content.textSpan,before:old.numericArguments,after:f.numericArguments}];}));
fs.writeFileSync(__dirname+'/numeric_changes.json',JSON.stringify(changes,null,2),{flag:'wx'});
fs.writeFileSync(__dirname+'/source_invariance.json',JSON.stringify({changedSource,compared:'All 20 snippets: entities, attribution chains, nominal relations; every frame actor/action/polarity/source/recipient/claim-owner/source-evidence/contrast'},null,2),{flag:'wx'});
console.log(JSON.stringify({changedSource,changedNumericFrames:changes.length}));
for(const c of changes)console.log(c.id,c.frame,JSON.stringify(c.after.map(n=>({v:n.value,b:n.binding,unit:n.unit,op:n.semanticScope.comparison.map(q=>q.operator),condition:n.semanticScope.conditionality}))));
