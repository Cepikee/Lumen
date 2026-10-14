"use strict";
const fs=require('node:fs'),crypto=require('node:crypto');
const {WorkerClient}=require('./morph-worker-client.cjs');
const {bind,baseline}=require('./morph-clause-binder.cjs');
const dir='docs/UTOM_V2_2/morph_clause/';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function main(){const freeze=JSON.parse(fs.readFileSync(dir+'02_final_freeze.json'));for(const [file,expected]of Object.entries(freeze.files))if(hash(file)!==expected)throw Error('freeze_mismatch:'+file);
 if(['A','B','E'].some(mode=>fs.existsSync(dir+mode+'_first_pass_raw.json'))||fs.existsSync(dir+'first_pass_started.json'))throw Error('immutable_first_pass_already_started');
 fs.writeFileSync(dir+'first_pass_started.json',JSON.stringify({at:new Date().toISOString(),freeze:hash(dir+'02_final_freeze.json')}),{flag:'wx'});
 const inputs=JSON.parse(fs.readFileSync(dir+'heldout_inputs.json'));const outputs={A:[],B:[],E:[]};const annotations=[];const worker=new WorkerClient();try{for(const c of inputs){outputs.A.push({id:c.id,output:baseline(c.text)});const r=await worker.request(c.text);annotations.push({id:c.id,...r});outputs.B.push({id:c.id,output:baseline(c.text,r.annotation)});outputs.E.push({id:c.id,output:bind(c.text,r.annotation)});}}finally{worker.stop();for(const mode of ['A','B','E'])fs.writeFileSync(dir+mode+'_first_pass_raw.json',JSON.stringify(outputs[mode],null,2),{flag:'wx'});fs.writeFileSync(dir+'heldout_annotations.json',JSON.stringify(annotations,null,2),{flag:'wx'});}
 // Gold is loaded only after immutable predictions have been saved.
 const {evaluate}=require('./morph-evaluate.cjs');const gold=JSON.parse(fs.readFileSync(dir+'heldout_gold.json'));const results=Object.fromEntries(['A','B','E'].map(mode=>[mode,evaluate(inputs,outputs[mode],gold)]));fs.writeFileSync(dir+'03_heldout_evaluation.json',JSON.stringify(results,null,2),{flag:'wx'});console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([k,v])=>[k,{metrics:v.metrics,evidence:v.evidence}]))));}
main().catch(e=>{console.error(e);process.exitCode=1;});
