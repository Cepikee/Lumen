const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {WorkerClient}=require('../../../scripts/experimental/morph-worker-client.cjs');
const {workerOptions}=require('../../../scripts/experimental/real-text-a-development.cjs');
const {bind}=require('../../../scripts/experimental/real-text-a-binder.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
 const dir=__dirname, manifest=JSON.parse(fs.readFileSync(path.join(dir,'input_manifest.json')));
 for(const [n,h] of Object.entries(manifest.files))if(hash(fs.readFileSync(path.join(dir,n)))!==h)throw Error('Frozen input mismatch');
 // Only corpus raw text crosses the inference boundary. Gold never enters NLP/binder.
 const corpus=JSON.parse(fs.readFileSync(path.join(dir,'corpus.json')));
 fs.mkdirSync(path.join(dir,'journal'));const rows=[];const w=new WorkerClient(workerOptions);
 try{for(const c of corpus){const annotation=(await w.request(c.text)).annotation;const output=bind(c.text,annotation);const row={id:c.id,text:c.text,annotation,output};fs.writeFileSync(path.join(dir,'journal',c.id+'.json'),JSON.stringify(row,null,2),{flag:'wx'});rows.push(row);console.log(c.id+' first pass preserved');}}
 finally{w.stop();}
 fs.writeFileSync(path.join(dir,'FRESH_BLIND_BEFORE_REPAIR_raw.json'),JSON.stringify({startedFrom:manifest.createdAt,completedAt:new Date().toISOString(),inputHashes:manifest.files,rows},null,2),{flag:'wx'});
}
main().catch(e=>{console.error(e);process.exitCode=1;});

