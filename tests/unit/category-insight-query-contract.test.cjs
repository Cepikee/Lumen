const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs'),I=require('../../lib/insights-intelligence');
const now=Date.now();
function route(rows=[]){return load('app/api/insights/category/[category]/route.ts',{'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async()=>I.normalizeRows(rows)}});}
const context={params:Promise.resolve({category:'sport'})};
test('category total, list and sources share publication population including missing summary',async()=>{const r=await route([{id:1,title:'a',category:'sport',source:' TELEX ',publishedAt:new Date(now-3600000),summaryId:5},{id:2,title:'b',category:'sport',source:'telex',publishedAt:new Date(now-3600000),summaryId:null}]).GET({url:'http://local/?period=24h'},context);assert.equal(r.body.total,2);assert.equal(r.body.items.length,2);assert.equal(r.body.sources.length,1);assert.equal(r.body.sources[0].count,2);assert.equal(r.body.items.find(i=>i.title==='b').href,null);});
