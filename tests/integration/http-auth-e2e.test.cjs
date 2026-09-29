"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { decryptPayload, enqueueEmail, claimNextEmail, processNextEmail } = require("../../lib/email-outbox");

const enabled = process.env.UTOM_HTTP_E2E_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function config() { const u = new URL(process.env.UTOM_TEST_MYSQL_URL); return { host: u.hostname, port: Number(u.port || 3306), user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), database: u.pathname.slice(1) }; }
async function freePort() { const server = net.createServer(); await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port; await new Promise((r) => server.close(r)); return port; }
function body(value) { return Buffer.from(JSON.stringify(value)).toString("base64url"); }
function runPost(url, value) { return new Promise((resolve, reject) => { const child = spawn(process.execPath, [path.join(__dirname, "http-auth-worker.cjs"), url, body(value)], { stdio: ["ignore", "pipe", "pipe"] }); let out="",err=""; child.stdout.on("data",c=>out+=c); child.stderr.on("data",c=>err+=c); child.on("exit",code=>code===0?resolve(JSON.parse(out)):reject(new Error(err||out))); }); }

async function startApp(port) {
  const c = config(); let output = "";
  const child = spawn(process.execPath, [path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)], { cwd: process.cwd(), env: { ...process.env, NODE_ENV:"production", DB_HOST:c.host, DB_PORT:String(c.port), DB_USER:c.user, DB_PASSWORD:c.password, DB_NAME:c.database, UTOM_OFFLINE_MODE:"false", DB_WRITE_ENABLED:"true", EMAIL_SEND_ENABLED:"false", UTOM_TEST_FIXTURE_MODE:"true", UTOM_TEST_RECAPTCHA_SCORE:"0.9", EMAIL_OUTBOX_ENCRYPTION_KEY:"ab".repeat(32), PUBLIC_APP_URL:`http://127.0.0.1:${port}`, UTOM_TRUST_PROXY_HEADERS:"false", NEXT_TELEMETRY_DISABLED:"1" }, stdio:["ignore","pipe","pipe"] });
  child.stdout.on("data",c=>output+=c); child.stderr.on("data",c=>output+=c);
  const base=`http://127.0.0.1:${port}`, deadline=Date.now()+15_000;
  while(Date.now()<deadline){ if(child.exitCode!==null) throw new Error(`app_exited:${output}`); try { const r=await fetch(`${base}/api/auth/me`); if(r.ok) return { child, base, output:()=>output }; } catch {} await new Promise(r=>setTimeout(r,100)); }
  child.kill(); throw new Error(`app_start_timeout:${output}`);
}
async function stopApp(app, signal="SIGTERM") { if(app.child.exitCode!==null) return; app.child.kill(signal); await new Promise((resolve,reject)=>{ const timer=setTimeout(()=>reject(new Error("app_stop_timeout")),8_000); app.child.once("exit",()=>{clearTimeout(timer);resolve();}); }); }
async function json(url, options={}) { const response=await fetch(url,options); return { response, data:await response.json() }; }
function cookieFrom(response) { const raw=response.headers.getSetCookie()[0]; assert.match(raw,/session_user=/); return raw.split(";",1)[0]; }

test("production HTTP session and reset/outbox lifecycle", { skip: !enabled, timeout: 90_000 }, async (t) => {
  const pool=mysql.createPool({ ...config(), connectionLimit:8 }); const marker="session-leak-marker"; let app;
  try {
    const password="Old-password-123!", newPassword="New-password-456!", pin="1234", email="fixture-auth@example.invalid";
    const [insert]=await pool.execute("INSERT INTO users(email,nickname,password_hash,pin_code,email_verified,bio) VALUES (?,?,?,?,1,?)",[email,"fixture-auth",await bcrypt.hash(password,12),await bcrypt.hash(pin,12),marker]);
    const userId=Number(insert.insertId), port=await freePort(); app=await startApp(port);
    const login=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json",cookie:`session_user=${marker}`},body:JSON.stringify({email,password,pin,rememberMe:false})});
    assert.equal(login.data.success,true); const cookie=cookieFrom(login.response), token=cookie.split("=")[1];
    const setCookie=login.response.headers.getSetCookie()[0]; assert.match(setCookie,/HttpOnly/i); assert.match(setCookie,/Secure/i); assert.match(setCookie,/SameSite=Lax/i); assert.match(setCookie,/Path=\//i); assert.match(setCookie,/Max-Age=86400/i); assert.match(token,/^[a-f0-9]{64}$/); assert.notEqual(token,marker);
    const [[session]]=await pool.execute("SELECT user_id,token_hash FROM user_sessions WHERE user_id=?",[userId]); assert.equal(session.token_hash,crypto.createHash("sha256").update(token).digest("hex"));
    const me=await json(`${app.base}/api/auth/me`,{headers:{cookie}}); assert.equal(me.data.loggedIn,true);
    for(const bad of ["abc","f".repeat(64)]) assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:`session_user=${bad}`}})).data.loggedIn,false);
    const reads=await Promise.all([json(`${app.base}/api/auth/me`,{headers:{cookie}}),json(`${app.base}/api/auth/me`,{headers:{cookie}})]); assert.ok(reads.every(x=>x.data.loggedIn));
    await stopApp(app); assert.equal(app.output().includes(token),false); app=await startApp(port); assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie}})).data.loggedIn,true);
    const hardLogin=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,pin})}); const hardCookie=cookieFrom(hardLogin.response); await stopApp(app,"SIGKILL"); app=await startApp(port); assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:hardCookie}})).data.loggedIn,true);
    await pool.execute("UPDATE user_sessions SET expires_at=DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 1 SECOND) WHERE token_hash=?",[crypto.createHash("sha256").update(hardCookie.split("=")[1]).digest("hex")]); assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:hardCookie}})).data.loggedIn,false);
    const logoutLogin=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,pin})}); const logoutCookie=cookieFrom(logoutLogin.response);
    const concurrent=await Promise.all([json(`${app.base}/api/auth/me`,{headers:{cookie:logoutCookie}}),json(`${app.base}/api/auth/logout`,{method:"POST",headers:{cookie:logoutCookie}})]); assert.equal(concurrent[1].data.success,true); assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:logoutCookie}})).data.loggedIn,false); assert.equal((await json(`${app.base}/api/auth/logout`,{method:"POST",headers:{cookie:logoutCookie}})).data.success,true);

    const resetUrl=`${app.base}/api/auth/request-password-reset`; const [r1,r2]=await Promise.all([runPost(resetUrl,{email,recaptchaToken:"fixture"}),runPost(resetUrl,{email,recaptchaToken:"fixture"})]); assert.deepEqual([r1.body.success,r2.body.success],[true,true]);
    const [[counts]]=await pool.execute("SELECT (SELECT COUNT(*) FROM password_reset_tokens WHERE userId=?) tokens,(SELECT COUNT(*) FROM email_outbox WHERE message_kind='password_reset') mails",[userId]); assert.deepEqual([Number(counts.tokens),Number(counts.mails)],[1,1]);
    const [[outbox]]=await pool.execute("SELECT payload_encrypted FROM email_outbox WHERE message_kind='password_reset'"); const payload=decryptPayload(outbox.payload_encrypted); const resetToken=new URL(payload.text.slice(payload.text.indexOf("http"))).searchParams.get("token"); assert.match(resetToken,/^[a-f0-9]{64}$/); assert.equal(outbox.payload_encrypted.includes(resetToken),false);
    const unknown=await runPost(resetUrl,{email:"absent@example.invalid",recaptchaToken:"fixture"}); assert.deepEqual(unknown,{status:r1.status,body:r1.body});
    const [rateRows]=await pool.execute("SELECT total_count,accepted_count FROM shared_rate_limits"); assert.equal(rateRows.length,3); assert.equal(rateRows.reduce((sum,row)=>sum+Number(row.total_count),0),6);
    const consumeUrl=`${app.base}/api/auth/reset-password`; const [c1,c2]=await Promise.all([runPost(consumeUrl,{token:resetToken,password:newPassword}),runPost(consumeUrl,{token:resetToken,password:newPassword})]); assert.equal([c1,c2].filter(x=>x.body.success).length,1); assert.equal([c1,c2].filter(x=>!x.body.success).length,1);
    assert.equal((await runPost(consumeUrl,{token:resetToken,password:newPassword})).body.success,false); assert.equal((await runPost(consumeUrl,{token:"bad",password:newPassword})).body.success,false); assert.equal((await runPost(consumeUrl,{token:"e".repeat(64),password:newPassword})).body.success,false);
    const oldLogin=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,pin})}); assert.equal(oldLogin.data.success,false);
    const newLogin=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password:newPassword,pin})}); assert.equal(newLogin.data.success,true); assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie}})).data.loggedIn,false);
    const expiredToken=crypto.randomBytes(32).toString("hex"); await pool.execute("INSERT INTO password_reset_tokens(userId,token,expiresAt) VALUES (?,?,UTC_TIMESTAMP())",[userId,crypto.createHash("sha256").update(expiredToken).digest("hex")]); assert.equal((await runPost(consumeUrl,{token:expiredToken,password:"Another-password-789!"})).body.success,false);

    const rollbackToken=crypto.randomBytes(32).toString("hex"); const rollbackHash=crypto.createHash("sha256").update(rollbackToken).digest("hex"); const [rollbackInsert]=await pool.execute("INSERT INTO password_reset_tokens(userId,token,expiresAt) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 15 MINUTE))",[userId,rollbackHash]);
    await pool.query("CREATE TABLE fixture_token_delete_guard (token_id BIGINT UNSIGNED NOT NULL PRIMARY KEY, CONSTRAINT fixture_token_delete_guard_fk FOREIGN KEY (token_id) REFERENCES password_reset_tokens(id) ON DELETE RESTRICT) ENGINE=InnoDB"); await pool.execute("INSERT INTO fixture_token_delete_guard(token_id) VALUES (?)",[rollbackInsert.insertId]);
    assert.equal((await runPost(consumeUrl,{token:rollbackToken,password:"Another-password-789!"})).body.success,false);
    const [[rollbackUser]]=await pool.execute("SELECT password_hash FROM users WHERE id=?",[userId]); assert.equal(await bcrypt.compare(newPassword,rollbackUser.password_hash),true); const [[rollbackCount]]=await pool.execute("SELECT COUNT(*) count FROM password_reset_tokens WHERE token=?",[rollbackHash]); assert.equal(Number(rollbackCount.count),1);
    await pool.query("DROP TABLE fixture_token_delete_guard"); await pool.execute("DELETE FROM password_reset_tokens WHERE token=?",[rollbackHash]);

    const pinRequest=await runPost(`${app.base}/api/auth/request-pin-reset`,{email,recaptchaToken:"fixture"}); assert.equal(pinRequest.body.success,true);
    const [[pinOutbox]]=await pool.execute("SELECT payload_encrypted FROM email_outbox WHERE message_kind='pin_reset'"); const pinPayload=decryptPayload(pinOutbox.payload_encrypted); const pinToken=new URL(pinPayload.text.slice(pinPayload.text.indexOf("http"))).searchParams.get("token"); assert.match(pinToken,/^[a-f0-9]{64}$/);
    assert.equal((await runPost(`${app.base}/api/auth/reset-pin`,{token:pinToken,newPin:"5678"})).body.success,true); assert.equal((await runPost(`${app.base}/api/auth/reset-pin`,{token:pinToken,newPin:"5678"})).body.success,false);
    assert.equal((await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password:newPassword,pin})})).data.success,false); assert.equal((await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password:newPassword,pin:"5678"})})).data.success,true);

    await pool.execute("UPDATE email_outbox SET status='sent', sent_at=UTC_TIMESTAMP(6) WHERE status='pending'");
    const connection=await pool.getConnection(); try { await connection.beginTransaction(); await enqueueEmail(connection,{operationKey:`fixture-crash:${Date.now()}`,kind:"fixture",recipient:email,payload:{to:email,subject:"fixture",text:"fixture",html:"fixture"}}); await connection.commit(); } finally { connection.release(); }
    const claimed=await claimNextEmail(pool); assert.ok(claimed); assert.equal(await claimNextEmail(pool),null);
    await pool.execute("INSERT INTO email_outbox(operation_key,message_kind,recipient_hash,payload_encrypted) VALUES (?,?,?,?)",[`fixture-after-send:${Date.now()}`,"fixture",crypto.createHash("sha256").update(email).digest("hex"),outbox.payload_encrypted]); let sends=0;
    await assert.rejects(processNextEmail(pool,async()=>{sends++;},{afterSend:async()=>{throw new Error("fixture_crash_after_send");}}),/fixture_crash/); assert.equal(sends,1); assert.equal(await processNextEmail(pool,async()=>{sends++;}),null); assert.equal(sends,1);
    assert.equal(app.output().includes(token),false); assert.equal(app.output().includes(resetToken),false);
    t.diagnostic("real SMTP calls=0; session restart processes=3; reset consume processes=2");
  } finally { if(app) await stopApp(app).catch(()=>{}); await pool.end(); }
});
