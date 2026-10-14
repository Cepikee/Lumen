const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {WorkerClient,validWorkerAnnotation}=require('../../../scripts/experimental/morph-worker-client.cjs');
const d=__dirname,sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
 const recorded=require('./live_runs.json'),w=new WorkerClient();let exit;
 try{const a=await w.request(recorded.texts[0]),b=await w.request(recorded.texts[0]);assert.ok(validWorkerAnnotation(recorded.texts[0],a.annotation));assert.deepEqual(a.annotation,b.annotation);assert.deepEqual(a.annotation,recorded.first.responses[0].annotation);const child=w.child;const closed=new Promise(resolve=>child.once('close',(code,signal)=>resolve({code,signal})));child.stdin.end();exit=await closed;assert.equal(exit.code,0);}finally{w.stop();}
 const files=fs.readdirSync('tests/unit').filter(x=>/^v22-.*\.test\.cjs$/.test(x)).map(x=>'tests/unit/'+x);
 const tests=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{encoding:'utf8',maxBuffer:30e6});fs.writeFileSync(d+'/targeted-tests.txt',tests.stdout+tests.stderr);assert.equal(tests.status,0);
 const freeze=require('./semantic_freeze.json'),changed=Object.entries(freeze.hashes).filter(([p,h])=>!fs.existsSync(p)||sha(p)!==h).map(([p])=>p);
 const allowed=['scripts/experimental/morph-worker-client.cjs','tests/unit/v22-morph-clause-research.test.cjs'];assert.deepEqual(changed.filter(p=>!allowed.includes(p)),[]);
 const semantic=Object.keys(freeze.hashes).filter(p=>p.startsWith('scripts/experimental/')&&p!=='scripts/experimental/morph-worker-client.cjs'||p.startsWith('lib/v2/')||p.startsWith('lib/v22/'));
 const hashes=Object.fromEntries(semantic.map(p=>[p,{before:freeze.hashes[p],after:sha(p)}]));
 const result={time:new Date().toISOString(),semanticFiles:semantic.length,semanticChanges:semantic.filter(p=>sha(p)!==freeze.hashes[p]),hashes,changedPreexistingFiles:changed,transportAfterHash:sha(allowed[0]),existingValidationContractPreserved:true,freshLiveClient:{repeatedEqual:true,equalsRawProcessOutput:true,exit,strictSchema:true,exactOffsets:true},golden:require('./reproducibility.json'),targetedTests:(tests.stdout+tests.stderr).split('\n').filter(x=>/^# (tests|pass|fail)/.test(x)),NEW_UNSEEN_MEASUREMENT_READY:'YES',NEXT_REAL_WORLD_BLIND_TEST_READY:'NO'};
 fs.writeFileSync(d+'/verification.json',JSON.stringify(result,null,2),{flag:'wx'});console.log({...result,hashes:undefined});
})().catch(e=>{console.error(e);process.exitCode=1;});
