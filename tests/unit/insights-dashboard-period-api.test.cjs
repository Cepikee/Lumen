const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const business=require('../../lib/business-time.js');
function load(file, query, now='2026-10-25T12:00:00Z') {
 const exports={};
 class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return Date.parse(now);} }
 const deps={
  'next/server':{NextResponse:{json:(body,opts)=>({body,status:opts?.status??200})}},
  '@/lib/db':{db:{query}},
  '@/lib/security':{securityCheck:async()=>null},
  '@/lib/business-time':business,
 };
 deps['@/lib/insights-period']=compile('lib/insights-period.ts',deps,Clock);
 return compile(file,deps,Clock);
}
function compile(file,deps,Clock=Date){
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(!(name in deps))throw Error(name);return deps[name];},URL,Date:Clock,Buffer,console});
 return exports;
}
const paths=['sentiment/today','sentiment/by-category','sentiment/timeline','trending-keywords'];
for(const path of paths) test(path+' preserves daily defaults and all rolling windows; invalid period cannot query DB',async()=>{
 let params, calls=0;
 const route=load('app/api/insights/'+path+'/route.ts',async(sql,p)=>{params=p;calls++;assert.match(sql,/>= \?/) ;assert.match(sql,/< \?/);return [[]];});
 for(const [period,days] of [['24h',1],['7d',7],['30d',30],['90d',90]]){
  const r=await route.GET({url:'http://localhost/api?period='+period});assert.equal(r.status,200);
  assert.equal(Date.parse(params[1].replace(' ','T')+'Z')-Date.parse(params[0].replace(' ','T')+'Z'),days*86400000);
 }
 await route.GET({url:'http://localhost/api'});
 assert.equal(Date.parse(params[1].replace(' ','T')+'Z')-Date.parse(params[0].replace(' ','T')+'Z'),25*3600000,'Budapest DST fallback day');
 const before=calls;
 for(const period of ['bad','','Infinity'])assert.equal((await route.GET({url:'http://localhost/api?period='+period})).status,400);
 assert.equal(calls,before);
});
test('timeline adds repeated Budapest hour and accepts numeric DB strings',async()=>{
 const rows=[{bucket:'2026-10-25 00:00:00',sentiment:'1',c:'2'},{bucket:'2026-10-25 01:00:00',sentiment:1,c:3}];
 const route=load('app/api/insights/sentiment/timeline/route.ts',async()=>[rows]);
 const daily=await route.GET({url:'http://localhost/api'});
 assert.equal(daily.body.timeline[2].positive,5);
 const rolling=await route.GET({url:'http://localhost/api?period=24h'});
 assert.equal(rolling.body.timeline.length,2);
 assert.equal(rolling.body.timeline[0].positive,2);
});
test('keyword total is not silently capped by the top 20 list',async()=>{
 const text=Array.from({length:25},(_,i)=>'word'+i).join(',');
 const route=load('app/api/insights/trending-keywords/route.ts',async()=>[[{trend_keywords:text},{trend_keywords:text},{trend_keywords:text}]]);
 const r=await route.GET({url:'http://localhost/api?period=7d'});
 assert.equal(r.body.total,25); assert.equal(r.body.keywords.length,20);
});
test('forecast missing prediction is not a zero prediction',async()=>{
 const route=load('app/api/insights/forecast/route.ts',async()=>[[{category:'Sport',date:'2026-10-26',predicted:null},{category:'Sport',date:'2026-10-27',predicted:0}]]);
 const r=await route.GET({url:'http://localhost/api'});
 assert.equal(r.body.forecast.Sport.length,1);assert.equal(r.body.forecast.Sport[0].predicted,0);
});
test('Speed Index missing delay stays unknown',async()=>{
 const route=load('app/api/insights/speedindex/leaderboard/route.ts',async sql=>sql.includes('FROM speed_index_history')?[[]]:[[{source:'example.hu',avgDelay:null,medianDelay:'',updatedAt:null}]]);
 const r=await route.GET({url:'http://localhost/api'});
 assert.equal(r.body.leaderboard[0].avgDelay,null);assert.equal(r.body.leaderboard[0].medianDelay,null);
});
test('DB errors are card-level HTTP failures',async()=>{
 for(const path of paths){
 const route=load('app/api/insights/'+path+'/route.ts',async()=>{throw Error('fixture DB failure');});
 assert.equal((await route.GET({url:'http://localhost/api?period=7d'})).status,500);
 }
});
