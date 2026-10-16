const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs'),I=require('../../lib/insights-intelligence');
const now=Date.now();
function route(rows=[]){return load('app/api/insights/category/[category]/route.ts',{'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async()=>I.normalizeRows(rows)}});}
const context={params:Promise.resolve({category:'sport'})};
test('category rejects unsafe query values and has stable sorting',async()=>{const r=route();for(const q of ['period=no','sort=no','page=Infinity','page=-1','page=1.2','limit=101'])assert.equal((await r.GET({url:'http://local/?'+q},context)).status,400,q);const rows=[1,2].map(id=>({id,category:'sport',publishedAt:new Date(now-3600000),score:5,summaryId:id}));for(const sort of ['latest','popular'])assert.deepEqual(Array.from((await route(rows).GET({url:'http://local/?sort='+sort},context)).body.items,i=>i.id),['2','1']);});
