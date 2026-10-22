const test=require('node:test');
const assert=require('node:assert/strict');
const load=require('../helpers/insights-loader.cjs');
const core=load('lib/trend-intelligence.ts');
const svc=load('lib/trend-intelligence-service.ts',{'./trend-intelligence':core});
const now=new Date('2026-10-25T12:34:00Z');
const q=(extra='')=>core.parseTrendQuery(new URLSearchParams('period=7d&keyword=alma&category=Tech&'+extra),now);
test('24 hours are chronological absolute UTC buckets across midnight and DST',()=>{
 for(const anchor of ['2026-03-29T10:30:00Z','2026-10-25T10:30:00Z','2026-01-01T01:30:00Z']){
  const query=core.parseTrendQuery(new URLSearchParams('period=24h'),new Date(anchor));const points=core.makePoints(query.window,[]);
  assert.equal(points.length,24);assert.equal(Date.parse(query.window.end)-Date.parse(query.window.start),86400000);
  for(let i=1;i<24;i++)assert.equal(Date.parse(points[i].timestamp)-Date.parse(points[i-1].timestamp),3600000);
 }
});
test('supported daily periods and custom leap-day window use UTC and an equal-length previous window',()=>{
 for(const days of [7,30,90,365]){const w=core.parseTrendQuery(new URLSearchParams(`period=${days}d`),now).window;assert.equal(core.makePoints(w,[]).length,days);assert.equal(Date.parse(w.start)-Date.parse(w.previousStart),Date.parse(w.end)-Date.parse(w.start));}
 const w=core.parseTrendQuery(new URLSearchParams('period=custom&startDate=2024-02-28&endDate=2024-03-01'),now).window;
 assert.equal(core.makePoints(w,[]).length,3);assert.equal(w.end,'2024-03-02T00:00:00.000Z');
});
test('invalid dates, unbounded ranges, filters and future anchors are rejected',()=>{
 for(const query of ['period=10000d','period=custom&startDate=2025-02-29&endDate=2025-03-01','period=custom&startDate=2020-01-01&endDate=2026-01-01','period=custom&startDate=2026-12-01&endDate=2026-12-02','period=7d&asOf=2099-01-01','period=7d&offset=-1','period=7d&sources='+Array.from({length:21},(_,i)=>'s'+i).join(',')])assert.throws(()=>core.parseTrendQuery(new URLSearchParams(query),now));
});
test('growth compares equal periods without fabricated 100% or single-hit hot status',()=>{
 assert.equal(core.comparison(15,10).growth,.5);assert.equal(core.comparison(1,0).growth,null);assert.equal(core.comparison(1,0).status,'Új aktivitás');assert.equal(core.comparison(0,10).growth,-1);assert.equal(core.comparison(10,10).status,'Stabil');assert.equal(core.comparison(12,5).status,'Most felkapott');
});
test('zero fill, unknown sources and exact per-bucket reconciliation',()=>{
 const w=q().window;const timestamp=core.makePoints(w,[])[0].timestamp;
 const points=core.makePoints(w,[{timestamp,source:'telex',count:2},{timestamp,source:'ismeretlen forrás',count:1},{timestamp,source:'__proto__',count:1}]);
 assert.equal(points[0].freq,4);assert.equal(Object.values(points[0].sources).reduce((a,b)=>a+b,0),4);assert.equal(points[1].freq,0);assert.throws(()=>core.makePoints(w,[{timestamp,source:'x',count:NaN}]));
});
test('category identity and SQL filters are parameterized, deduplicate article observations',()=>{
 const query=q("sources=Telex,444&categories=Tech");query.keyword="x' OR 1=1 --";const sql=svc.observationSql(query);
 assert.ok(sql.values.includes(query.keyword));assert.ok(!sql.sql.includes(query.keyword));assert.match(sql.sql,/MIN\(k.created_at\)/);assert.match(sql.sql,/GROUP BY k.article_id/);assert.ok(sql.values.includes('telex'));assert.notEqual(core.trendIdentity('alma','Tech'),core.trendIdentity('alma','Politika'));
});
test('history service retains full timestamps, reconciles source totals and returns valid contract',async()=>{
 const query=q();const timestamp=core.makePoints(query.window,[])[2].timestamp;let calls=0;
 const db={execute:async(sql,args)=>{calls++;assert.match(sql,/MAX_EXECUTION_TIME/);assert.ok(args.length>0);return [calls===1?[{keyword:'alma',category:'Tech',freq:'3',previous_total:'2',first_seen:'2026-10-01 12:00:00',last_seen:'2026-10-21 12:00:00',sources:'telex|444'}]:[{timestamp,source:'telex',count:'2'},{timestamp,source:'444',count:'1'}],[]];}};
 const result=await svc.readTrendIntelligence(db,query,'history');assert.equal(core.validateHistory(result).total,3);assert.equal(result.previousTotal,2);assert.equal(result.growth,.5);assert.equal(result.history[2].freq,3);
 const broken=JSON.parse(JSON.stringify(result));broken.history[2].sources.telex=99;assert.throws(()=>core.validateHistory(broken));
});
test('article drilldown uses same observation time/category/source bounds, never publication time',async()=>{
 const query=q('sources=Telex');query.bucket=core.makePoints(query.window,[])[0].timestamp;
 const db={execute:async(sql,args)=>{assert.match(sql,/o.observed_at >= \? AND o.observed_at < \?/);assert.doesNotMatch(sql,/published_at >=/);assert.match(sql,/LIMIT 51 OFFSET \?/);assert.ok(args.includes('telex'));return [[],[]];}};
 const result=await svc.readTrendIntelligence(db,query,'articles');assert.equal(result.articles.length,0);assert.equal(result.nextOffset,null);
});
test('ambiguous keyword without category fails instead of merging distinct trends',async()=>{
 const db={execute:async()=>[[{keyword:'alma',category:'Tech'},{keyword:'alma',category:'Politika'}],[]]};await assert.rejects(()=>svc.readTrendIntelligence(db,q(),'history'),/ambiguous_category/);
});
test('client limits concurrent visible history requests and stops queued work on abort',async()=>{
 const client=load('lib/trend-intelligence-client.ts',{'./trend-intelligence':core},{AbortController,fetch:async()=>{throw Error('not called')}});
 const controller=new AbortController();let active=0,max=0,finished=0;
 await client.loadVisibleHistories(Array.from({length:12},(_,i)=>i),controller.signal,async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;finished++;});assert.equal(max,3);assert.equal(finished,12);
 let started=0;await client.loadVisibleHistories([1,2,3,4,5],controller.signal,async()=>{started++;controller.abort();});assert.equal(started,1);
});
test('empty retained dataset is a valid zero series; malformed response is not converted to zero',async()=>{
 const result=await svc.readTrendIntelligence({execute:async()=>[[],[]]},q(),'history');assert.equal(core.validateHistory(result).total,0);assert.equal(result.history.length,7);assert.throws(()=>core.validateHistory({history:[]}));
});
