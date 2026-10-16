const {test}=require('node:test'),assert=require('node:assert/strict');
const {forecast,backtest,HOUR}=require('../../forecast/baseline');
const end=Date.parse('2026-10-26T12:00:00Z');
test('baseline has hourly UTC targets, constant history is recovered across DST',()=>{
 const h=Array.from({length:35*24},(_,i)=>({time:end-(35*24-i)*HOUR,count:4}));
 const f=forecast(h,end);assert.equal(f.points.length,6);assert.ok(f.points.every(p=>p.predicted===4));assert.equal(Date.parse(f.points[1].date)-Date.parse(f.points[0].date),HOUR);assert.equal(f.calibration.mae,0);
});
test('future observations cannot leak into calibration or prediction',()=>{
 const h=Array.from({length:35*24},(_,i)=>({time:end-(35*24-i)*HOUR,count:2}));
 assert.deepEqual(forecast(h,end),forecast([...h,{time:end+HOUR,count:99999}],end));assert.equal(backtest(h,end).mae,0);
});
test('insufficient history produces no forecast or invented interval',()=>{assert.equal(forecast([{time:end-HOUR,count:1}],end).points.length,0);});
