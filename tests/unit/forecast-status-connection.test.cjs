const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs');
test('forecast status uses pool and returns service error on DB failure',async()=>{
 const route=load('app/api/forecast-status/route.ts',{'@/lib/db':{db:{query:async()=>{throw Error('offline');}}}});
 const r=await route.GET();assert.equal(r.status,503);assert.equal(r.body.lastRun,null);
});
