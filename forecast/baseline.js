"use strict";
const HOUR=3600000;
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length?(s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2:null;};
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',hour:'2-digit',hourCycle:'h23'});
const localHour=t=>formatter.format(t);
function predict(history,target,cutoff) {
  // Only completed, earlier hours; never use evaluation targets as training data.
  const targetHour=localHour(target);
  const eligible=history.filter(p=>Number.isFinite(p.time)&&Number.isFinite(p.count)&&p.count>=0&&p.time+HOUR<=cutoff&&p.time>=cutoff-28*24*HOUR&&localHour(p.time)===targetHour);
  if(eligible.length<7)return null;
  return median(eligible.map(p=>p.count));
}
function backtest(history,cutoff) {
  const errors=[];
  for(const point of history.filter(p=>p.time>=cutoff-7*24*HOUR&&p.time+HOUR<=cutoff)) {
    const predicted=predict(history,point.time,point.time);
    if(predicted!==null)errors.push(Math.abs(point.count-predicted));
  }
  errors.sort((a,b)=>a-b);
  return {samples:errors.length,mae:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null,radius:errors.length>=30?errors[Math.min(errors.length-1,Math.ceil(.9*errors.length)-1)]:null};
}
function forecast(history,now,horizon=6) {
  const cutoff=Math.floor(now/HOUR)*HOUR, calibration=backtest(history,cutoff), points=[];
  for(let i=1;i<=horizon;i++) {
    const target=cutoff+i*HOUR, predicted=predict(history,target,cutoff);
    if(predicted===null)return {points:[],calibration,reason:'insufficient_history'};
    points.push({date:new Date(target).toISOString(),predicted,lower:calibration.radius===null?null:Math.max(0,predicted-calibration.radius),upper:calibration.radius===null?null:predicted+calibration.radius,calibrationSamples:calibration.samples});
  }
  return {points,calibration,reason:null};
}
module.exports={predict,backtest,forecast,HOUR};
