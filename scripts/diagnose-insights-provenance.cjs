"use strict";
require("dotenv").config({ quiet: true });
const mysql=require("mysql2/promise");

if(process.env.UTOM_READONLY_DIAGNOSTICS!=="true"){
  console.error("Refusing to connect: set UTOM_READONLY_DIAGNOSTICS=true for this read-only diagnostic.");
  process.exit(2);
}

async function main(){
  const connection=await mysql.createConnection({
    host:process.env.DB_HOST||"127.0.0.1",port:Number(process.env.DB_PORT||3306),
    user:process.env.DB_USER||"utom_app",password:process.env.DB_PASSWORD,database:process.env.DB_NAME||"utom_dev",
  });
  try{
    await connection.query("SET SESSION TRANSACTION READ ONLY");
    await connection.query("START TRANSACTION READ ONLY");
    const [[articles],[sources],[quality],[categories],[states]]=await Promise.all([
      connection.query(`SELECT COUNT(*) articles, MIN(published_at) oldest_published, MAX(published_at) newest_published, MIN(created_at) oldest_ingested, MAX(created_at) newest_ingested FROM articles WHERE published_at>=UTC_TIMESTAMP()-INTERVAL 30 DAY AND published_at<UTC_TIMESTAMP()`),
      connection.query(`SELECT TRIM(COALESCE(NULLIF(source,''),'(missing)')) source, COUNT(*) articles FROM articles WHERE published_at>=UTC_TIMESTAMP()-INTERVAL 30 DAY AND published_at<UTC_TIMESTAMP() GROUP BY TRIM(COALESCE(NULLIF(source,''),'(missing)')) ORDER BY articles DESC,source`),
      connection.query(`SELECT COUNT(DISTINCT a.id) eligible, COUNT(DISTINCT s.article_id) summarized, COUNT(DISTINCT CASE WHEN a.sentiment IS NOT NULL THEN a.id END) sentiment_measured, COUNT(DISTINCT CASE WHEN s.final_clickbait IS NOT NULL THEN a.id END) clickbait_measured, COUNT(DISTINCT CASE WHEN s.trend_keywords IS NOT NULL AND TRIM(s.trend_keywords)<>'' THEN a.id END) trend_keywords_present, MIN(s.created_at) oldest_summary, MAX(s.created_at) newest_summary FROM articles a LEFT JOIN summaries s ON s.article_id=a.id WHERE a.published_at>=UTC_TIMESTAMP()-INTERVAL 30 DAY AND a.published_at<UTC_TIMESTAMP()`),
      connection.query(`SELECT CASE WHEN category IS NULL OR TRIM(category)='' OR LOWER(TRIM(category)) IN ('ismeretlen','unknown','n/a') THEN '(uncategorized)' ELSE TRIM(category) END category, COUNT(*) articles FROM articles WHERE published_at>=UTC_TIMESTAMP()-INTERVAL 30 DAY AND published_at<UTC_TIMESTAMP() GROUP BY CASE WHEN category IS NULL OR TRIM(category)='' OR LOWER(TRIM(category)) IN ('ismeretlen','unknown','n/a') THEN '(uncategorized)' ELSE TRIM(category) END ORDER BY articles DESC,category`),
      connection.query(`SELECT status,processed,COUNT(*) articles FROM articles WHERE published_at>=UTC_TIMESTAMP()-INTERVAL 30 DAY AND published_at<UTC_TIMESTAMP() GROUP BY status,processed ORDER BY status,processed`),
    ]);
    console.log(JSON.stringify({generatedAt:new Date().toISOString(),window:"[UTC_TIMESTAMP()-30 DAY, UTC_TIMESTAMP())",articles:articles[0],sources,quality:quality[0],categories,processingStates:states},null,2));
    await connection.rollback();
  }finally{await connection.end();}
}
main().catch(error=>{console.error(error?.message||error);process.exitCode=1;});
