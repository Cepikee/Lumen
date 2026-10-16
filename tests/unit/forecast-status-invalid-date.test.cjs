const {test}=require('node:test'),assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs');
test('invalid run timestamps never create invalid JSON dates',async()=>{
 const route=load('app/api/forecast-status/route.ts',{'@/lib/db':{db:{query:async()=>[[{status:'partial',finished_at:'broken'}]]}}});
 const r=await route.GET();assert.equal(r.body.status,'partial');assert.equal(r.body.lastRun,null);assert.equal(r.body.nextRun,null);
});
