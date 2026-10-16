const {test}=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../../forecast/snapshot-repository');
const {HOUR}=require('../../forecast/baseline');
function fixture(fail=false,partial=false){const now=Date.parse('2026-10-15T12:00:00Z'),trace=[];
 const rows=Array.from({length:35*24},(_,i)=>({category:'sport',bucket:new Date(now-(35*24-i)*HOUR).toISOString().slice(0,19).replace('T',' '),count:2}));
 if(partial)rows.push({category:'tech',bucket:new Date(now-HOUR).toISOString().slice(0,19).replace('T',' '),count:1});
 const c={execute:async(sql,params)=>{trace.push({sql,params});if(sql.includes('GROUP BY'))return [rows];if(sql.includes('INSERT INTO insights_forecast_runs'))return [{insertId:3}];if(fail&&sql.includes('INSERT INTO insights_forecast_points'))throw Error('fixture write failure');return [{}];},beginTransaction:async()=>trace.push({sql:'BEGIN'}),commit:async()=>trace.push({sql:'COMMIT'}),rollback:async()=>trace.push({sql:'ROLLBACK'})};return {now,trace,c};}
test('all points and success marker publish in one transaction without deleting old results',async()=>{const f=fixture();assert.equal((await run(f.c,f.now)).status,'succeeded');assert.equal(f.trace.filter(t=>t.sql.includes('INSERT INTO insights_forecast_points')).length,6);assert.ok(f.trace.findIndex(t=>t.sql==='COMMIT')>f.trace.findIndex(t=>t.params?.[0]==='succeeded'));assert.ok(!f.trace.some(t=>/DELETE|TRUNCATE/.test(t.sql)));});
test('one insufficient category produces partial, never successful',async()=>{const f=fixture(false,true);assert.equal((await run(f.c,f.now)).status,'partial');});
test('DB write failure rolls back isolated points and marks only its run failed',async()=>{const f=fixture(true);await assert.rejects(run(f.c,f.now));assert.ok(f.trace.some(t=>t.sql==='ROLLBACK'));assert.ok(f.trace.some(t=>t.sql.includes("status='failed'")&&t.params[1]===3));assert.ok(!f.trace.some(t=>t.sql==='COMMIT'));});

test('backtest outage does not misreport or roll back a committed successful forecast',async()=>{
 const f=fixture(),execute=f.c.execute;
 f.c.execute=async(sql,params)=>{if(sql.startsWith('UPDATE insights_forecast_points'))throw Error('metrics unavailable');return execute(sql,params);};
 const result=await run(f.c,f.now);
 assert.equal(result.status,'succeeded');assert.equal(result.evaluationStatus,'failed');
 assert.ok(f.trace.some(t=>t.sql==='COMMIT'));assert.ok(!f.trace.some(t=>t.sql==='ROLLBACK'));
});
