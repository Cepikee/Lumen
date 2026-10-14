const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const {WorkerClient,validWorkerAnnotation}=require('../../../scripts/experimental/morph-worker-client.cjs');
const {bind}=require('../../../scripts/experimental/real-text-a-binder.cjs');
const d=__dirname,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(p,x)=>fs.writeFileSync(d+'/'+p,JSON.stringify(x,null,2),{flag:'wx'});
(async()=>{
 const manifest=require('./input_manifest.json');for(const[p,h]of Object.entries(manifest.files))assert.equal(hash(fs.readFileSync(d+'/'+p)),h);
 const corpus=require('./corpus.json'),env=require('./environment.json');const w=new WorkerClient(),rows=[];
 fs.mkdirSync(d+'/annotations');fs.mkdirSync(d+'/journal');
 try{for(const item of corpus){const response=await w.request(item.text);assert.ok(validWorkerAnnotation(item.text,response.annotation));const annotation=response.annotation;
  const info={id:item.id,raw:item.text,rawSha256:hash(item.text),annotationSha256:hash(JSON.stringify(annotation)),sentenceCount:annotation.sentences.length,tokenCount:annotation.tokens.length,environmentFingerprint:env.fingerprint,model:w.load,annotation};write('annotations/'+item.id+'.json',info);
  const output=bind(item.text,annotation),r={id:item.id,text:item.text,annotation,output};write('journal/'+item.id+'.json',r);rows.push(r);console.log(item.id,info.sentenceCount,info.tokenCount);
 }
 const child=w.child,closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));child.stdin.end();const exit=await closed;assert.equal(exit.code,0);
 write('NEW_UNSEEN_BEFORE_REPAIR_raw.json',{kind:'FIRST_PASS_FRESH_NLP_NO_REPAIR',finishedAt:new Date().toISOString(),manifestHash:hash(fs.readFileSync(d+'/input_manifest.json')),environmentFingerprint:env.fingerprint,workerExit:exit,rows});
 write('first_pass_manifest.json',{sha256:hash(fs.readFileSync(d+'/NEW_UNSEEN_BEFORE_REPAIR_raw.json')),nlpSentences:rows.reduce((n,r)=>n+r.annotation.sentences.length,0),tokens:rows.reduce((n,r)=>n+r.annotation.tokens.length,0),decisionCount:150,rows:25});
 }finally{w.stop();}
})().catch(e=>{write('measurement_failure.json',{message:e.message,stderr:e.stderr,exitCode:e.exitCode});console.error(e);process.exitCode=1;});
