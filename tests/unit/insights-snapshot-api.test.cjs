const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs');
const I=require('../../lib/insights-intelligence');
test('intelligence API rejects unknown filters, preserves error status and authorization',async()=>{
 const deps={'@/lib/insights-snapshot':{getInsightsSnapshot:async()=>{throw Error('snapshot_expired');}}};
 const route=load('app/api/insights/intelligence/route.ts',deps);
 assert.equal((await route.GET({url:'http://local/?sort=madeup'})).status,400);
 assert.equal((await route.GET({url:'http://local/?asOf=2026-10-15'})).status,410);
 const denied=load('app/api/insights/intelligence/route.ts',{...deps,'@/lib/security':{securityCheck:async()=>({status:401})}});
 assert.equal((await denied.GET({url:'http://local/'})).status,401);
});
test('category API accepts 24h and preserves missing summary in total without fake article link',async()=>{
 const rows=I.normalizeRows([{id:1,title:'Test',source:'telex',category:'gazdaság',publishedAt:new Date(Date.now()-3600000).toISOString(),summaryId:null}]);
 const route=load('app/api/insights/category/[category]/route.ts',{'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async()=>rows}});
 const r=await route.GET({url:'http://local/?period=24h'},{params:Promise.resolve({category:'Gazdaság'})});
 assert.equal(r.status,200);assert.equal(r.body.total,1);assert.equal(r.body.items[0].href,null);assert.equal(r.body.meta.articleCount,1);
});
test('client snapshot fetch rejects HTTP errors and malformed response',async()=>{
 const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
 let response={ok:false,status:500,json:async()=>({})};
 const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('hooks/useInsightsSnapshot.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>({}),fetch:async()=>response,URLSearchParams});
 await assert.rejects(exports.fetchSnapshot('/test'));
 response={ok:true,json:async()=>({success:true,views:{}})};
 await assert.rejects(exports.fetchSnapshot('/test'));
});
test('shared snapshot SQL has bounded population, optional summary and deterministic latest version',()=>{
 const fs=require('node:fs'),s=fs.readFileSync('lib/insights-snapshot.ts','utf8');
 assert.match(s,/LEFT JOIN summaries/);assert.match(s,/s2.created_at < \?/);assert.match(s,/ORDER BY s2.created_at DESC, s2.id DESC/);assert.match(s,/LIMIT 50001/);assert.match(s,/snapshot_capacity_exceeded/);
});

test('category drill-down preserves combined filters and rejects expired snapshot',async()=>{
 const deps={'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async(end,pinned)=>{assert.equal(pinned,true);throw Error('snapshot_expired');}}};
 const route=load('app/api/insights/category/[category]/route.ts',deps);
 const result=await route.GET({url:'http://local/?period=24h&source=telex&keyword=budget&asOf='+new Date(Date.now()-60000).toISOString()},{params:Promise.resolve({category:'gazdaság'})});
 assert.equal(result.status,410);
 const source=require('node:fs').readFileSync('app/insights/category/[category]/page.tsx','utf8');
 assert.match(source,/\['source', 'keyword', 'cluster', 'asOf'\]/);
 assert.match(source,/filterQuery\}/);assert.match(source,/setPage\(page \+ 1\)/);
});

test('snapshot rows single-flight shares query and fails closed after cache loss',async()=>{
 let calls=0;
 const rows=[{id:1,publishedAt:'2026-10-15 10:00:00',title:'fixture'}];
 const service=load('lib/insights-snapshot.ts',{
  '@/lib/db':{db:{query:async()=>{calls++;return [rows];}}},
  './insights-intelligence':I,'./business-time':{mysqlUtc:d=>d.toISOString()},
  'node:crypto':require('node:crypto'),'./insights-v2':{insightsEvents:async()=>({enabled:false,items:[]})}
 });
 const end=Date.parse('2026-10-15T12:00:00Z');
 const [a,b]=await Promise.all([service.snapshotRows(end),service.snapshotRows(end)]);
 assert.equal(calls,1);assert.equal(a,b);
 assert.equal(await service.snapshotRows(end,true),a);
 await assert.rejects(service.snapshotRows(end-60000,true),/snapshot_expired/);
});

test('large cluster population has bounded timeline payload without changing article counts',()=>{
 const I=require('../../lib/insights-intelligence');const now=Date.parse('2026-10-15T12:00:00Z');
 const rows=I.normalizeRows(Array.from({length:30},(_,i)=>({id:i+1,publishedAt:new Date(now-1000-i*1000).toISOString(),clusterId:i+1})));
 const snapshot=I.buildSnapshot(rows,I.queryOptions(new URLSearchParams('period=24h'),now));
 assert.equal(snapshot.counts.current,30);assert.equal(snapshot.intelligence.clusterTotal,30);assert.equal(snapshot.intelligence.clusters.length,20);
 const scoped=I.buildSnapshot(rows,I.queryOptions(new URLSearchParams('period=24h&cluster=30'),now));assert.equal(scoped.intelligence.clusters[0].id,'30');
});

test('snapshot TTL expires pinned reads without silently refreshing',async()=>{
 let clock=1000,calls=0;class Clock extends Date {static now(){return clock;}}
 const service=load('lib/insights-snapshot.ts',{'@/lib/db':{db:{query:async()=>{calls++;return [[]];}}},'./insights-intelligence':I,'./business-time':{mysqlUtc:d=>d.toISOString()},'node:crypto':require('node:crypto'),'./insights-v2':{insightsEvents:async()=>({enabled:false,items:[]})}},{Date:Clock});
 const end=Date.now();await service.snapshotRows(end);clock+=599999;await service.snapshotRows(end,true);assert.equal(calls,1);clock+=1;await assert.rejects(service.snapshotRows(end,true),/snapshot_expired/);assert.equal(calls,1);await service.snapshotRows(end);assert.equal(calls,2);
});
test('source-following UI does not claim copying or AI originality judgment',()=>{
 const s=require('node:fs').readFileSync('components/WSourceDuplication.tsx','utf8');assert.match(s,/Témakövetési arány/);assert.doesNotMatch(s,/Másolási arány|átvett tartalomnak|AI által került/);assert.match(s,/nem bizonyít másolást/);
});
