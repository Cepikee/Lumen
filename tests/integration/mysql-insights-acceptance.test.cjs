"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const mysql=require('mysql2/promise');
const {loadMigrations,applyMigrations}=require('../../db/migration-core.cjs');
const {configFromUrl}=require('../../scripts/run-mysql-integration-suite.cjs');
const load=require('../helpers/insights-loader.cjs');
const I=require('../../lib/insights-intelligence');
const forecast=require('../../forecast/snapshot-repository');
const enabled=process.env.UTOM_MYSQL_TEST_OPT_IN==='true'&&!!process.env.UTOM_TEST_MYSQL_URL;
const sqlDate=t=>new Date(t).toISOString().slice(0,19).replace('T',' ');

test('Insights real MySQL acceptance (isolated loopback fixture, not accuracy measurement)',{skip:!enabled},async t=>{
 const config=configFromUrl();
 assert.match(config.database,/insights.*_test$/,'dedicated Insights database required');
 const c=await mysql.createConnection({...config,timezone:'Z'}),observer=await mysql.createConnection({...config,timezone:'Z'});
 const evidence={version:(await c.query('SELECT VERSION() version'))[0][0].version,plans:[],coverage:null};
 try {
  await t.test('clean baseline -> 061/062; runner idempotence; schema and legacy coexistence',async()=>{
   await c.query('SET FOREIGN_KEY_CHECKS=0');
   for(const row of (await c.query('SHOW TABLES'))[0])await c.query('DROP TABLE `'+String(Object.values(row)[0]).replaceAll('`','``')+'`');
   await c.query('SET FOREIGN_KEY_CHECKS=1');
   const all=loadMigrations();await applyMigrations(c,all.filter(m=>+m.version<=60));
   await c.execute("INSERT INTO forecast(category,date,predicted) VALUES ('legacy','2026-01-01',3)");
   assert.equal((await applyMigrations(c,all)).length,2);
   assert.deepEqual(await applyMigrations(c,all),[]);
   const [cols]=await c.query("SELECT TABLE_NAME,COLUMN_NAME,DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'insights_forecast_%'");
   assert.equal(cols.length,19);assert.equal(cols.find(r=>r.COLUMN_NAME==='target_at').DATA_TYPE,'datetime');
   const [keys]=await c.query("SELECT CONSTRAINT_NAME,REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='insights_forecast_points' AND REFERENCED_TABLE_NAME IS NOT NULL");
   assert.equal(keys.length,1);assert.equal(keys[0].REFERENCED_TABLE_NAME,'insights_forecast_runs');
   assert.equal((await c.query('SELECT COUNT(*) n FROM forecast'))[0][0].n,1);
   assert.equal((await c.query('SELECT COUNT(*) n FROM insights_forecast_points'))[0][0].n,0);
   evidence.schema=cols; evidence.indexes=(await c.query('SHOW INDEX FROM insights_forecast_points'))[0];
  });
  const now=Math.floor(Date.now()/3600000)*3600000;
  await t.test('35 days of hourly SQL history produces calibrated successful forecast',async()=>{
   const values=Array.from({length:35*24},(_,i)=>['technical fixture','https://fixture.invalid/hour/'+i,'sport','telex',sqlDate(now-(35*24-i)*3600000)]);
   await c.query('INSERT INTO articles(title,url_canonical,category,source,published_at) VALUES ?',[values]);
   const result=await forecast.run(c,now);assert.equal(result.status,'succeeded');
   const read=await forecast.read(c,now);assert.equal(read.freshness,'current');assert.equal(read.forecast.sport.length,6);
   assert.ok(read.forecast.sport.every(p=>p.predicted===1&&p.calibrationSamples>=30&&p.lower!==null));
   evidence.forecast={run:result,points:read.forecast.sport};
  });
  await t.test('running partial failed do not replace success; commit atomically switches snapshot',async()=>{
   const old=(await forecast.read(observer,now)).forecast.sport[0].predicted;
   for(const status of ['running','partial','failed'])await c.execute("INSERT INTO insights_forecast_runs(model_version,status,generated_at,valid_until,expected_categories) VALUES('fixture',?,?,?,1)",[status,sqlDate(now+1000),sqlDate(now+3600000)]);
   assert.equal((await forecast.read(observer,now)).forecast.sport[0].predicted,old);
   await c.beginTransaction();
   const [r]=await c.execute("INSERT INTO insights_forecast_runs(model_version,status,generated_at,valid_until,expected_categories) VALUES('fixture','succeeded',?,?,1)",[sqlDate(now+2000),sqlDate(now+3600000)]);
   await c.execute("INSERT INTO insights_forecast_points(run_id,category,target_at,predicted) VALUES(?,'sport',?,99)",[r.insertId,sqlDate(now)]);
   assert.equal((await forecast.read(observer,now)).forecast.sport[0].predicted,old);
   await c.commit();assert.equal((await forecast.read(observer,now)).forecast.sport[0].predicted,99);
   assert.equal((await forecast.read(observer,now+3600000)).freshness,'expired');
  });
  await t.test('real point write failure rolls back; post-commit evaluation failure retains success',async()=>{
   const proxy=()=>({execute:c.execute.bind(c),beginTransaction:c.beginTransaction.bind(c),commit:c.commit.bind(c),rollback:c.rollback.bind(c)});
   let n=0;const failing=proxy();failing.execute=async(sql,args)=>{if(sql.startsWith('INSERT INTO insights_forecast_points')&&++n===2)return c.execute(sql,[...args.slice(0,3),null,...args.slice(4)]);return c.execute(sql,args);};
   await assert.rejects(forecast.run(failing,now+3000));
   const [[last]]=await c.query('SELECT id,status FROM insights_forecast_runs ORDER BY id DESC LIMIT 1');assert.equal(last.status,'failed');
   assert.equal((await c.execute('SELECT COUNT(*) n FROM insights_forecast_points WHERE run_id=?',[last.id]))[0][0].n,0);
   const metrics=proxy();metrics.execute=(sql,args)=>sql.startsWith('UPDATE insights_forecast_points')?c.query('SELECT * FROM missing_evaluation_fixture_table'):c.execute(sql,args);
   const result=await forecast.run(metrics,now+4000);assert.equal(result.status,'succeeded');assert.equal(result.evaluationStatus,'failed');
   assert.equal((await forecast.read(observer,now)).forecast.sport[0].predicted,1);
  });
  await t.test('actual/error SQL waits for grace period',async()=>{
   const [r]=await c.execute("INSERT INTO insights_forecast_runs(model_version,status,generated_at,valid_until,expected_categories) VALUES('fixture','succeeded',?,?,1)",[sqlDate(now-48*3600000),sqlDate(now-40*3600000)]);
   for(const age of [26,24])await c.execute("INSERT INTO insights_forecast_points(run_id,category,target_at,predicted) VALUES(?,'sport',?,3)",[r.insertId,sqlDate(now-age*3600000)]);
   await forecast.evaluate(c,now);
   const [points]=await c.execute('SELECT actual,absolute_error,evaluated_at FROM insights_forecast_points WHERE run_id=? ORDER BY target_at',[r.insertId]);
   assert.equal(points[0].actual,1);assert.equal(points[0].absolute_error,2);assert.equal(points[1].evaluated_at,null);
  });
  let queryCount=0;const queries=[];
  const database={query:async(sql,args)=>{queryCount++;queries.push({sql,args});return c.query(sql,args);}};
  const service=()=>load('lib/insights-snapshot.ts',{'@/lib/db':{db:database},'./insights-intelligence':I,'./business-time':{mysqlUtc:sqlDate},'node:crypto':require('node:crypto'),'./insights-v2':{insightsEvents:async()=>({enabled:false,items:[]})}});
  let s=service();
  await t.test('real schema snapshot query, period/filter populations and evidence agree',async()=>{
   for(const period of ['24h','7d','30d','90d']){
    const p=new URLSearchParams({period});const data=await s.getInsightsSnapshot(p);
    assert.equal(data.counts.current,data.evidence.total);assert.equal(data.quality.summary.analyzed,0);assert.equal(data.quality.sentiment.analyzed,0);assert.equal(data.quality.clickbait.analyzed,0);
    assert.ok(data.evidence.items.every(r=>r.href===null));
    for(const filter of ['source=telex','category=sport','keyword=missing','cluster=999999']){
     const d=await s.getInsightsSnapshot(new URLSearchParams('period='+period+'&'+filter));assert.equal(d.counts.current,d.evidence.total);
    }
   }
   assert.equal(queryCount,1,'all periods and filters share one SQL population');
   const first=await s.getInsightsSnapshot(new URLSearchParams('period=90d'));const second=await s.getInsightsSnapshot(new URLSearchParams({period:'90d',asOf:first.window.end,page:'2'}));
   assert.equal(second.evidence.items.length,25);assert.notEqual(second.evidence.items[0].id,first.evidence.items[0].id);
  });
  await t.test('query plans for shared snapshot/history/evaluation, timings',async()=>{
   for(const q of queries.slice(0,1)){
    const start=performance.now();const [plan]=await c.query('EXPLAIN '+q.sql,q.args);await c.query(q.sql,q.args);
    evidence.plans.push({scope:'all periods and filters use shared 180-day snapshot',plan,latencyMs:performance.now()-start});
   }
   const sql="SELECT LOWER(TRIM(category)) category,DATE_FORMAT(published_at,'%Y-%m-%d %H:00:00') bucket,COUNT(*) count FROM articles WHERE published_at>=? AND published_at<? GROUP BY LOWER(TRIM(category)),bucket ORDER BY category,bucket";
   evidence.plans.push({scope:'forecast history',plan:(await c.query('EXPLAIN '+sql,[sqlDate(now-35*86400000),sqlDate(now)]))[0]});
  });
  await t.test('cache concurrency, four-end eviction, restart and HTTP error mapping',async()=>{
   s=service();queryCount=0;
   await Promise.all([s.snapshotRows(now),s.snapshotRows(now)]);assert.equal(queryCount,1);
   for(let i=1;i<=4;i++)await s.snapshotRows(now-i*60000);
   await assert.rejects(s.snapshotRows(now,true),/snapshot_expired/);
   await assert.rejects(service().snapshotRows(now-60000,true),/snapshot_expired/);
   const route=load('app/api/insights/intelligence/route.ts',{'@/lib/insights-snapshot':s});
   assert.equal((await route.GET({url:'http://local/?period=bad'})).status,400);
   assert.equal((await route.GET({url:'http://local/?asOf='+new Date(now).toISOString()})).status,410);
   const broken=load('app/api/insights/intelligence/route.ts',{'@/lib/insights-snapshot':{getInsightsSnapshot:()=>c.query('SELECT * FROM missing_fixture_table')}});
   assert.equal((await broken.GET({url:'http://local/'})).status,503);
  });
  await t.test('membership coverage fixture is measured, never fabricated',async()=>{
   const [[coverage]]=await c.query('SELECT COUNT(*) articles,COUNT(DISTINCT ea.article_id) members FROM articles a LEFT JOIN v2_event_articles ea ON ea.article_id=a.id');
   evidence.coverage={...coverage,percent:coverage.articles?100*coverage.members/coverage.articles:null,fixture:true};assert.equal(coverage.members,0);
  });
  await t.test('real current/previous keywords, null measurements, zero baseline and backlog',async()=>{
   const ids=[];
   for(let i=0;i<16;i++){
    const [r]=await c.execute('INSERT INTO articles(title,url_canonical,source,category,published_at,sentiment) VALUES(?,?,?,?,?,?)',['keyword fixture','https://fixture.invalid/keyword/'+i,i%2?'hvg':'telex','gazdaság',sqlDate(now-(i<12?2:30)*3600000),null]);ids.push(r.insertId);
    await c.execute('INSERT INTO summaries(article_id,trend_keywords,created_at,final_clickbait) VALUES(?,?,?,?)',[r.insertId,'infláció',sqlDate(now-3600000),i===0?null:50]);
   }
   const data=await service().getInsightsSnapshot(new URLSearchParams('period=24h&keyword=infláció'));
   assert.equal(data.counts.current,12);assert.equal(data.counts.previous,4);assert.equal(data.evidence.total,12);assert.equal(data.processing.olderPublished,4);
   assert.equal(data.quality.clickbait.missing,1);assert.equal(data.quality.sentiment.analyzed,0);assert.equal(data.movers.rising[0].name,'infláció');
   const p=I.queryOptions(new URLSearchParams('period=24h&category=gazdaság'),now);
   const rows=await service().snapshotRows(now);const zero=I.buildSnapshot(rows,{...p,start:now-3*3600000,previousStart:now-6*3600000});
   assert.equal(zero.counts.previous,0);assert.equal(zero.counts.percent,null);
  });
  await t.test('DST timestamps are SQL UTC, not host wall time',async()=>{
   for(const [i,date] of ['2026-03-29 00:30:00','2026-03-29 01:30:00','2026-10-25 00:30:00','2026-10-25 01:30:00'].entries())await c.execute('INSERT INTO articles(title,url_canonical,published_at,category) VALUES(?,?,?,?)',['DST','https://fixture.invalid/dst/'+i,date,'dst']);
   const end=Date.parse('2026-10-26T00:00:00Z'),rows=await service().snapshotRows(end);
   const selected=rows.filter(r=>r.category==='dst');assert.equal(selected.length,2);assert.equal(selected[1].published-selected[0].published,-3600000);
   const d=I.buildSnapshot(rows,I.queryOptions(new URLSearchParams('period=24h&category=dst'),end));assert.equal(d.counts.current,2);
   const springEnd=Date.parse('2026-03-30T00:00:00Z');const springRows=await service().snapshotRows(springEnd);assert.equal(springRows.filter(r=>r.category==='dst').length,2);
  });
  await t.test('over 50000 SQL population fails closed',async()=>{
   for(let batch=0;batch<50;batch++)await c.query('INSERT INTO articles(title,url_canonical,published_at) VALUES ?',[Array.from({length:1000},(_,i)=>['capacity','https://fixture.invalid/capacity/'+(batch*1000+i),sqlDate(now-60000)])]);
   try{await assert.rejects(service().snapshotRows(now),/snapshot_capacity_exceeded/);}finally{await c.query("DELETE FROM articles WHERE url_canonical LIKE 'https://fixture.invalid/capacity/%'");}
  });
 }finally{await c.end();await observer.end();if(process.env.UTOM_INSIGHTS_EVIDENCE_PATH)fs.writeFileSync(process.env.UTOM_INSIGHTS_EVIDENCE_PATH,JSON.stringify(evidence,null,2));}
});
