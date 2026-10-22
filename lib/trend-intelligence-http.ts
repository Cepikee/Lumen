import mysql from "mysql2/promise";
import { NextResponse } from "next/server";
import { parseTrendQuery } from "./trend-intelligence";
import { readTrendIntelligence, type Reader } from "./trend-intelligence-service";
let pool: mysql.Pool | undefined;
const cache = new Map<string,{expires:number;value:unknown}>();
const pending = new Map<string,Promise<unknown>>();
export async function trendIntelligenceResponse(req: Request, mode: "list" | "history" | "articles") {
  let q;
  try {
    q = parseTrendQuery(new URL(req.url).searchParams);
    if (mode !== "list" && !q.keyword) throw new Error("keyword_required");
  } catch (e) { return NextResponse.json({error:e instanceof Error ? e.message : "invalid_query"},{status:400}); }
  const key = JSON.stringify([mode,q]);
  try {
    const hit = cache.get(key);
    if (hit && hit.expires > Date.now()) return NextResponse.json(hit.value);
    let work = pending.get(key);
    if (!work) {
      if (pending.size >= 32) return NextResponse.json({error:"busy"},{status:503});
      work = (async () => {
        pool ??= mysql.createPool({host:process.env.DB_HOST || "127.0.0.1",port:Number(process.env.DB_PORT || 3306),user:process.env.DB_USER || "utom_app",password:process.env.DB_PASSWORD,database:process.env.DB_NAME || "utom_dev",connectionLimit:4,queueLimit:32,connectTimeout:5000,timezone:"Z",dateStrings:true});
        const connection = await pool.getConnection();
        try {
          await connection.query("SET time_zone = '+00:00'");
          await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
          await connection.query("START TRANSACTION READ ONLY, WITH CONSISTENT SNAPSHOT");
          const result = await readTrendIntelligence(connection as unknown as Reader,q,mode);
          await connection.commit();
          if (cache.size >= 64) cache.delete(cache.keys().next().value!);
          cache.set(key,{expires:Date.now()+30000,value:result});
          return result;
        } finally { await connection.rollback().catch(()=>undefined); connection.release(); }
      })();
      pending.set(key,work);
    }
    try { return NextResponse.json(await work); } finally { pending.delete(key); }
  } catch (e) {
    const reason = e instanceof Error ? e.message : "query_failed";
    if (["ambiguous_category","invalid_bucket"].includes(reason)) return NextResponse.json({error:reason},{status:400});
    console.error("Trend intelligence read failed", e instanceof Error ? e.name : "unknown");
    return NextResponse.json({error:"trend_intelligence_unavailable"},{status:503});
  }
}
