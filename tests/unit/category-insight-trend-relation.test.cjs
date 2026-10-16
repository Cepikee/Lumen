const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs'),I=require('../../lib/insights-intelligence');
const now=Date.now();
function route(rows=[]){return load('app/api/insights/category/[category]/route.ts',{'@/lib/insights-intelligence':I,'@/lib/insights-snapshot':{snapshotRows:async()=>I.normalizeRows(rows)}});}
const context={params:Promise.resolve({category:'sport'})};
test('trend and listing retain summary-less articles without duplicate IDs',async()=>{const row={id:1,category:'sport',publishedAt:new Date(now-3600000),summaryId:null};const r=await route([row,row]).GET({url:'http://local/?period=24h'},context);assert.equal(r.body.total,1);assert.equal(r.body.items.length,1);assert.equal(r.body.summary.trendSeries.reduce((a,b)=>a+b,0),1);});
