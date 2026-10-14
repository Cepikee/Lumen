"use strict";
const fs=require('node:fs'),assert=require('node:assert/strict');
const {WorkerClient}=require('./morph-worker-client.cjs');
const {baseline}=require('./morph-clause-binder.cjs');
async function main(){const w=new WorkerClient();const rows=[];try{
 const normal=await w.safeRequest('A kutatás működik.');assert.equal(normal.mode,'linguistic');rows.push({test:'live_normal',pass:true});
 const bad=await w.safeRequest('x'.repeat(200001));assert.equal(bad.mode,'deterministic-only');rows.push({test:'bounded_input',pass:true,reason:bad.reason});
 // Corrupt service reply path is already covered offline; here inject malformed
 // request transport into the real Python process and verify recovery.
 const corrupt=w.safeRequest('A hibás kérés után is működik.');w.child.stdin.write('{invalid json}\n');const rejected=await corrupt;assert.equal(rejected.mode,'deterministic-only');rows.push({test:'malformed_transport',pass:true,reason:rejected.reason});
 assert.equal((await w.safeRequest('Új worker indult.')).mode,'linguistic');rows.push({test:'restart_after_malformed',pass:true});
 const pending=w.safeRequest('A hosszú mondat. '.repeat(4000));setImmediate(()=>w.child?.kill());const crashed=await pending;assert.equal(crashed.mode,'deterministic-only');assert.ok(Array.isArray(baseline('Ilona 8 pontot kapott.').frames));rows.push({test:'crash_deterministic_fallback',pass:true,reason:crashed.reason});
 assert.equal((await w.safeRequest('A végső újraindítás sikerült.')).mode,'linguistic');rows.push({test:'restart_after_crash',pass:true});
 }finally{w.stop();fs.writeFileSync('docs/UTOM_V2_2/morph_clause/10_live_worker_safety.json',JSON.stringify(rows,null,2),{flag:'wx'});}console.log(rows);}
main().catch(e=>{console.error(e);process.exitCode=1;});
