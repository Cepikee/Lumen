"use strict";
// Replays only raw text + frozen, previously produced local NLP annotations.
// No expected labels or audit decisions enter the binder.
const fs=require('node:fs'),crypto=require('node:crypto');
const {bind}=require('./real-text-a-binder.cjs');
const dir='docs/UTOM_V2_2/c01_post_repair_20261010';
const source='docs/UTOM_V2_2/second_blind_20261009/SECOND_BEFORE_REPAIR_raw.json';
const hash=path=>crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
function main(){
 const before=JSON.parse(fs.readFileSync(source,'utf8'));
 const rows=before.rows.map(({id,text,annotation})=>({id,text,annotation,output:bind(text,annotation)}));
 const artifact={phase:'C01_POST_REPAIR',completed:new Date().toISOString(),runtimeInputs:'raw text + unchanged local NLP annotation; no gold',annotationMode:'frozen annotation replay, not a new NLP run or blind measurement',beforeSha256:hash(source),rows};
 fs.writeFileSync(dir+'/C01_POST_REPAIR_raw.json',JSON.stringify(artifact,null,2),{flag:'wx'});
 const evidence={total:0,exact:0,failures:[]};
 for(const x of rows){function walk(v,path){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string'){evidence.total++;if(x.text.slice(v.start,v.end)===v.textSpan)evidence.exact++;else evidence.failures.push({id:x.id,path});}for(const [k,c] of Object.entries(v))walk(c,path+'.'+k);}walk(x.output,'output');}
 const stable=[];
 for(const x of rows){const old=before.rows.find(b=>b.id===x.id).output;
  const project=r=>({entities:r.entities,attributionChains:r.attributionChains,frames:r.frames.map(f=>({actor:f.actor,source:f.source,sourceEvidence:f.sourceEvidence,recipient:f.recipient,syntacticRoles:f.syntacticRoles,action:f.action,polarity:f.polarity}))});
  stable.push({id:x.id,nonNumericRolesUnchanged:JSON.stringify(project(old))===JSON.stringify(project(x.output))});
 }
 fs.writeFileSync(dir+'/replay_verification.json',JSON.stringify({sourceSha256:hash(source),postSha256:hash(dir+'/C01_POST_REPAIR_raw.json'),evidence,stable,canonicalOutputsEmpty:rows.every(x=>x.output.canonical.length===0)},null,2),{flag:'wx'});
 console.log(JSON.stringify({evidence,nonNumericRolesUnchanged:stable.every(x=>x.nonNumericRolesUnchanged)}));
}
if(require.main===module)main();
