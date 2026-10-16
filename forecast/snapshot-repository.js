"use strict";
const {forecast,HOUR}=require('./baseline');
const sqlDate=t=>new Date(t).toISOString().slice(0,19).replace('T',' ');

async function evaluate(connection,now) {
  // Wait 24h for late ingestion. Evaluation is an observed corpus count, not ground truth.
  await connection.execute(`UPDATE insights_forecast_points p
    JOIN insights_forecast_runs r ON r.id=p.run_id
    SET p.actual=(SELECT COUNT(*) FROM articles a WHERE LOWER(TRIM(a.category))=p.category AND a.published_at>=p.target_at AND a.published_at<DATE_ADD(p.target_at,INTERVAL 1 HOUR)),
        p.absolute_error=ABS(p.predicted-(SELECT COUNT(*) FROM articles a WHERE LOWER(TRIM(a.category))=p.category AND a.published_at>=p.target_at AND a.published_at<DATE_ADD(p.target_at,INTERVAL 1 HOUR))),
        p.evaluated_at=?
    WHERE r.status='succeeded' AND p.evaluated_at IS NULL AND p.target_at<?`,[sqlDate(now),sqlDate(now-25*HOUR)]);
}
async function run(connection,now=Date.now()) {
  const cutoff=Math.floor(now/HOUR)*HOUR;
  const [rows]=await connection.execute(`SELECT LOWER(TRIM(category)) AS category, DATE_FORMAT(published_at,'%Y-%m-%d %H:00:00') AS bucket, COUNT(*) AS count
    FROM articles WHERE published_at>=? AND published_at<? AND category IS NOT NULL AND TRIM(category)<>''
    GROUP BY LOWER(TRIM(category)),bucket ORDER BY category,bucket`,[sqlDate(cutoff-35*24*HOUR),sqlDate(cutoff)]);
  const groups=new Map();
  for(const row of rows){const points=groups.get(row.category)||new Map();points.set(Date.parse(row.bucket.replace(' ','T')+'Z'),Number(row.count));groups.set(row.category,points);}
  const [created]=await connection.execute(`INSERT INTO insights_forecast_runs (model_version,status,generated_at,valid_until,expected_categories) VALUES ('budapest-hour-median-v1','running',?,?,?)`,[sqlDate(now),sqlDate(cutoff+7*HOUR),groups.size]);
  const id=created.insertId;
  let completed=0;
  let status;
  try {
    await connection.beginTransaction();
    for(const [category,map] of groups){
      const first=Math.min(...map.keys()),history=[];
      // No synthetic prehistory before the first observed article in a category.
      for(let t=first;t<cutoff;t+=HOUR)history.push({time:t,count:map.get(t)||0});
      const result=forecast(history,now);
      if(!result.points.length)continue;
      for(const p of result.points)await connection.execute(`INSERT INTO insights_forecast_points (run_id,category,target_at,predicted,lower_bound,upper_bound,calibration_samples) VALUES (?,?,?,?,?,?,?)`,[id,category,sqlDate(p.date),p.predicted,p.lower,p.upper,p.calibrationSamples]);
      completed++;
    }
    status=completed===groups.size&&completed>0?'succeeded':completed>0?'partial':'failed';
    await connection.execute(`UPDATE insights_forecast_runs SET status=?,completed_categories=?,finished_at=?,error_code=? WHERE id=?`,[status,completed,sqlDate(Date.now()),status==='succeeded'?null:'insufficient_history',id]);
    await connection.commit();
  } catch(error) {
    await connection.rollback();
    await connection.execute(`UPDATE insights_forecast_runs SET status='failed',finished_at=?,error_code='run_failed' WHERE id=? AND status='running'`,[sqlDate(Date.now()),id]);
    throw error;
  }
  // Backtesting is independent of publication: a metrics outage must not undo
  // or misreport a committed forecast. The next run retries unevaluated points.
  let evaluationStatus='succeeded';
  try { await evaluate(connection,now); } catch { evaluationStatus='failed'; }
  return {id,status,completed,expected:groups.size,evaluationStatus};
}
/** @param {any} connection @param {number} now @param {string|null} category */
async function read(connection,now=Date.now(),category=null) {
  const [runs]=await connection.execute(`SELECT id,model_version,DATE_FORMAT(generated_at,'%Y-%m-%d %H:%i:%s') generated_at,DATE_FORMAT(valid_until,'%Y-%m-%d %H:%i:%s') valid_until FROM insights_forecast_runs WHERE status='succeeded' ORDER BY generated_at DESC,id DESC LIMIT 1`);
  const run=runs[0];
  if(!run)return {success:true,forecast:{},freshness:'none',generatedAt:null,validUntil:null,model:'budapest-hour-median-v1',llmComparison:'unavailable_legacy_date_precision'};
  const iso=value=>value instanceof Date?value.toISOString():new Date(String(value).replace(' ','T')+'Z').toISOString();
  const validUntil=iso(run.valid_until), generatedAt=iso(run.generated_at);
  if(Date.parse(validUntil)<=now)return {success:true,forecast:{},freshness:'expired',generatedAt,validUntil,model:run.model_version};
  const [points]=await connection.execute(`SELECT category,DATE_FORMAT(target_at,'%Y-%m-%d %H:%i:%s') target_at,predicted,lower_bound,upper_bound,calibration_samples FROM insights_forecast_points WHERE run_id=? AND target_at>=? ORDER BY target_at,category`,[run.id,sqlDate(Math.floor(now/HOUR)*HOUR)]);
  const result={};
  for(const p of points){
    if(category&&p.category!==category)continue;
    if(p.predicted==null||String(p.predicted).trim()===''||!Number.isFinite(Number(p.predicted))||Number(p.predicted)<0)continue;
    let date;try{date=iso(p.target_at);}catch{continue;}
    (result[p.category]??=[]).push({date,predicted:Number(p.predicted),lower:p.lower_bound==null?null:Number(p.lower_bound),upper:p.upper_bound==null?null:Number(p.upper_bound),calibrationSamples:Number(p.calibration_samples)});
  }
  const [metrics]=await connection.execute(`SELECT COUNT(*) AS samples, AVG(absolute_error) AS mae FROM insights_forecast_points p JOIN insights_forecast_runs r ON r.id=p.run_id WHERE r.model_version=? AND p.evaluated_at IS NOT NULL`,[run.model_version]);
  return {success:true,forecast:result,freshness:'current',generatedAt,validUntil,model:run.model_version,kind:'statistical_forecast',backtest:{samples:Number(metrics[0]?.samples||0),mae:metrics[0]?.mae==null?null:Number(metrics[0].mae)},llmComparison:'unavailable_legacy_date_precision'};
}
module.exports={run,read,evaluate};
