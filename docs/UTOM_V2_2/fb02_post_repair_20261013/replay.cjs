const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {bind}=require('../../../scripts/experimental/real-text-a-binder.cjs');
const initialPath=__dirname+'/../fresh_blind_20261012/FRESH_BLIND_BEFORE_REPAIR_raw.json';
const initial=JSON.parse(fs.readFileSync(initialPath));
const prior=require('../fb01_post_repair_20261012/FB01_POST_REPAIR_raw.json');
const rows=initial.rows.map(r=>({id:r.id,text:r.text,annotation:r.annotation,output:bind(r.text,structuredClone(r.annotation))}));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
fs.writeFileSync(__dirname+'/FB02_POST_REPAIR_raw.json',JSON.stringify({kind:'POST_REPAIR_REPLAY_NOT_BLIND',createdAt:new Date().toISOString(),inputSha256:hash(initialPath),fb01Sha256:hash(__dirname+'/../fb01_post_repair_20261012/FB01_POST_REPAIR_raw.json'),rows},null,2),{flag:'wx'});
const raw=JSON.parse(fs.readFileSync(__dirname+'/FB02_POST_REPAIR_raw.json'));
const invariantFields=['frameId','actor','actorStatus','subject','action','actionSpan','object','numericArguments','polarity','semanticScope','modality','modalities','contrasts','conditionAntecedent','conditionality'];
const pick=o=>({entities:o.entities,contrasts:o.contrasts,canonical:o.canonical,frames:o.frames.map(f=>Object.fromEntries(invariantFields.map(k=>[k,f[k]])))});
const changed=[];
for(let i=0;i<rows.length;i++){
 assert.deepEqual(pick(raw.rows[i].output),pick(prior.rows[i].output),rows[i].id+' non-source semantic invariance');
 const a=prior.rows[i].output,b=raw.rows[i].output;
 if(JSON.stringify(a)!==JSON.stringify(b))changed.push({id:rows[i].id,before:{frames:a.frames.map(f=>({id:f.frameId,source:f.source,claimOwner:f.claimOwner})),chains:a.attributionChains,relations:a.reportingNominalRelations},after:{frames:b.frames.map(f=>({id:f.frameId,source:f.source,claimOwner:f.claimOwner})),chains:b.attributionChains,relations:b.reportingNominalRelations}});
}
fs.writeFileSync(__dirname+'/source_changes.json',JSON.stringify(changed,null,2),{flag:'wx'});
fs.writeFileSync(__dirname+'/invariance.json',JSON.stringify({comparedSnippets:rows.length,invariantFields,allEqual:true,canonicalProjectionOff:rows.every(r=>r.output.canonical.length===0&&r.output.projectionState==='disabled_research_only')},null,2),{flag:'wx'});
console.log('Changed source records:',changed.map(x=>x.id));
for(const r of changed)console.log(r.id,JSON.stringify({before:r.before.frames.map(f=>f.source?.mention),after:r.after.frames.map(f=>f.source?.mention),relations:r.after.relations.map(x=>({source:x.source?.mention,binding:x.binding,artifact:x.reportingNominal.textSpan,reasons:x.unresolvedReasons}))}));
