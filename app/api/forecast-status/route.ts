import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPublicApiRateLimit } from "@/lib/security";
export async function GET(req: Request){
 if (!await checkPublicApiRateLimit(req, "forecast-status", 120, 60_000)) {
  return NextResponse.json({status:"rate_limited",lastRun:null,nextRun:null},{status:429});
 }
 try {
 const [rows]:any=await db.query("SELECT status,DATE_FORMAT(generated_at,'%Y-%m-%d %H:%i:%s') generated_at,DATE_FORMAT(finished_at,'%Y-%m-%d %H:%i:%s') finished_at FROM insights_forecast_runs ORDER BY id DESC LIMIT 1");
 const row=rows[0];
 const iso=(value:any)=>{if(!value)return null;const d=value instanceof Date?value:new Date(String(value).replace(' ','T')+'Z');return Number.isFinite(d.getTime())?d.toISOString():null;};
 const lastRun=iso(row?.finished_at);
 return NextResponse.json({status:row?.status||'unknown',lastRun,nextRun:lastRun?new Date(Date.parse(lastRun)+345*60000).toISOString():null,schedule:'estimated_after_completion'});
 }catch{return NextResponse.json({status:'error',lastRun:null,nextRun:null},{status:503});}
}
