const {test}=require('node:test'),assert=require('node:assert/strict');
const {WorkerClient,validWorkerAnnotation:validAnnotation}=require('../../scripts/experimental/morph-worker-client.cjs');
const good=()=>({tokens:[{text:'Ő',start:0,end:1,lemma:'ő',pos:'PRON',morph:{Case:'Nom'},dep:'ROOT',headStart:0}],sentences:[{text:'Ő',start:0,end:1}],entities:[]});
test('NLP default uses persistent research environment',()=>assert.ok(new WorkerClient().args.includes('PYTHONPATH=/home/mark/.local/share/utom-morph-research')));
test('NLP exact UTF-16 annotation accepted',()=>assert.ok(validAnnotation('Ő',good())));
for(const[name,mutate]of [
 ['empty',a=>{a.tokens=[];a.sentences=[];}],['offset',a=>a.tokens[0].end=2],
 ['head',a=>a.tokens[0].headStart=99],['missing dependency',a=>delete a.tokens[0].dep],
 ['duplicate token',a=>a.tokens.push({...a.tokens[0]})]
])test('NLP invalid annotation hard rejected: '+name,()=>{const a=good();mutate(a);assert.equal(validAnnotation('Ő',a),false);});
test('NLP missing executable is a hard failure',async()=>{const w=new WorkerClient({command:'utom-nonexistent-worker-executable',args:[],startupMs:1000});try{await assert.rejects(w.request('Ő'),e=>e.message==='worker_error'&&e.code==='ENOENT');}finally{w.stop();}});
for(const payload of ['null','[]','42'])test('NLP non-object JSON is a hard failure: '+payload,async()=>{const w=new WorkerClient({command:process.execPath,args:['-e',`console.log(${JSON.stringify(payload)})`],startupMs:3000});try{await assert.rejects(w.request('Ő'),/malformed_output/);}finally{w.stop();}});
test('NLP Python/model startup stderr and nonzero exit preserved',async()=>{const w=new WorkerClient({command:process.execPath,args:['-e',"process.stderr.write('ModuleNotFoundError: hu_core_news_md\\n');process.exitCode=7"],startupMs:3000});try{await assert.rejects(w.request('Ő'),e=>e.message==='worker_exit'&&e.exitCode===7&&e.stderr.includes('hu_core_news_md'));}finally{w.stop();}});
for(const mode of ['invalid-json','empty-success','request-failure'])test('NLP protocol hard failure: '+mode,async()=>{const code=`console.log(JSON.stringify({type:'ready'}));require('readline').createInterface({input:process.stdin}).on('line',s=>{const q=JSON.parse(s);console.log(${JSON.stringify(mode)}==='invalid-json'?'{bad':JSON.stringify(${JSON.stringify(mode)}==='request-failure'?{id:q.id,ok:false,error:'ValueError'}:{id:q.id,ok:true,annotation:{tokens:[],sentences:[],entities:[]}}));});`;const w=new WorkerClient({command:process.execPath,args:['-e',code],startupMs:3000});try{await assert.rejects(w.request('Ő'),/malformed_output|malformed_annotation|worker_rejected/);}finally{w.stop();}});
