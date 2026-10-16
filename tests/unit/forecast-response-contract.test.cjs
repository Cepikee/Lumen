const {test}=require('node:test'),assert=require('node:assert/strict');
const {read}=require('../../forecast/snapshot-repository');
const now=Date.parse('2026-10-15T12:00:00Z');
test('hourly snapshot preserves real zero, rejects missing predictions and expires',async()=>{
 let expired=false;
 const connection={execute:async sql=>sql.includes('WHERE status=')?[[{id:1,model_version:'baseline',generated_at:'2026-10-15 11:00:00',valid_until:expired?'2026-10-15 11:00:00':'2026-10-15 18:00:00'}]]:sql.includes('calibration_samples')?[[{category:'sport',target_at:'2026-10-15 13:00:00',predicted:0},{category:'sport',target_at:'2026-10-15 14:00:00',predicted:null}]]:[[{samples:0,mae:null}]]};
 const r=await read(connection,now);assert.equal(r.forecast.sport.length,1);assert.equal(r.forecast.sport[0].predicted,0);assert.equal(r.backtest.mae,null);
 expired=true;assert.equal((await read(connection,now)).freshness,'expired');assert.deepEqual((await read(connection,now)).forecast,{});
});
