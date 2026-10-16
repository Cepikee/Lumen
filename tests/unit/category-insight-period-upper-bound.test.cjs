const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs'),I=require('../../lib/insights-intelligence');
const now=Date.now();
function route(rows=[]){return load('app/api/insights/category/[category]/route.ts',{'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async()=>I.normalizeRows(rows)}});}
const context={params:Promise.resolve({category:'sport'})};
test('category excludes future publications from every returned aggregate',async()=>{const r=await route([{id:1,category:'sport',source:'telex',publishedAt:new Date(now+86400000)},{id:2,category:'sport',source:'telex',publishedAt:new Date(now-3600000)}]).GET({url:'http://local/?period=24h'},context);assert.equal(r.body.total,1);assert.equal(r.body.summary.trendSeries.reduce((a,b)=>a+b,0),1);assert.equal(r.body.sources[0].count,1);});
