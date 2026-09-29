"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const { decryptPayload } = require("../../lib/email-outbox");

const enabled = process.env.UTOM_HTTP_E2E_OPT_IN === "true" && Boolean(process.env.UTOM_TEST_MYSQL_URL);
function config() { const u = new URL(process.env.UTOM_TEST_MYSQL_URL); return { host:u.hostname,port:Number(u.port||3306),user:decodeURIComponent(u.username),password:decodeURIComponent(u.password),database:u.pathname.slice(1) }; }
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,"127.0.0.1",r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function encoded(value){return Buffer.from(JSON.stringify(value)).toString("base64url");}
function runPost(url,value){return new Promise((resolve,reject)=>{const c=spawn(process.execPath,[path.join(__dirname,"http-auth-worker.cjs"),url,encoded(value)],{stdio:["ignore","pipe","pipe"]});let out="",err="";c.stdout.on("data",x=>out+=x);c.stderr.on("data",x=>err+=x);c.on("exit",code=>code===0?resolve(JSON.parse(out)):reject(new Error(err||out)));});}
async function json(url,options={}){const response=await fetch(url,options);let data;try{data=await response.json();}catch{data=null;}return{response,data};}
function cookie(response){return response.headers.getSetCookie()[0].split(";",1)[0];}

async function startApp(port,upstreamPort){const c=config();let output="";const child=spawn(process.execPath,[path.join(process.cwd(),"node_modules","next","dist","bin","next"),"start","-H","127.0.0.1","-p",String(port)],{cwd:process.cwd(),env:{...process.env,NODE_ENV:"production",DB_HOST:c.host,DB_PORT:String(c.port),DB_USER:c.user,DB_PASSWORD:c.password,DB_NAME:c.database,UTOM_OFFLINE_MODE:"false",DB_WRITE_ENABLED:"true",EMAIL_SEND_ENABLED:"false",UTOM_TEST_FIXTURE_MODE:"true",UTOM_TEST_RECAPTCHA_SCORE:"0.9",EMAIL_OUTBOX_ENCRYPTION_KEY:"ab".repeat(32),PUBLIC_APP_URL:`http://127.0.0.1:${port}`,UTOM_TRUST_PROXY_HEADERS:"false",UTOM_API_KEY:"proxy-secret-marker-12345678901234567890",UTOM_INTERNAL_BASE_URL:`http://127.0.0.1:${upstreamPort}`,UTOM_INTERNAL_PROXY_TIMEOUT_MS:"250",UTOM_INTERNAL_PROXY_MAX_BYTES:"1024",NEXT_TELEMETRY_DISABLED:"1"},stdio:["ignore","pipe","pipe"]});child.stdout.on("data",x=>output+=x);child.stderr.on("data",x=>output+=x);const base=`http://127.0.0.1:${port}`,deadline=Date.now()+15000;while(Date.now()<deadline){if(child.exitCode!==null)throw new Error(`app_exited:${output}`);try{await fetch(`${base}/api/auth/me`);return{child,base,output:()=>output};}catch{}await new Promise(r=>setTimeout(r,100));}child.kill();throw new Error(`app_start_timeout:${output}`);}
async function stopApp(app,signal="SIGTERM"){if(app.child.exitCode!==null)return;app.child.kill(signal);await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("app_stop_timeout")),8000);app.child.once("exit",()=>{clearTimeout(timer);resolve();});});}

async function startUpstream(port,records){const server=http.createServer((req,res)=>{records.push({url:req.url,host:req.headers.host,key:req.headers["x-api-key"],rate:req.headers["x-utom-rate-key"]});const mode=new URL(req.url,"http://fixture").searchParams.get("mode");if(mode==="timeout")return void setTimeout(()=>{if(!res.destroyed){res.writeHead(200,{"content-type":"application/json"});res.end('{"late":true}');}},1000);if(mode==="disconnect")return void req.socket.destroy();if(mode==="malformed"){req.socket.write("HTTP/1.1 nope\r\n\r\n");return void req.socket.destroy();}if(mode==="redirect"){res.writeHead(302,{location:"http://127.0.0.1:1/private"});return void res.end();}if(mode==="large"){res.writeHead(200,{"content-type":"application/json"});return void res.end("x".repeat(2048));}if(mode==="400"){res.writeHead(400,{"content-type":"application/json"});return void res.end('{"upstream":400}');}if(mode==="500"){res.writeHead(500,{"content-type":"application/json"});return void res.end('{"upstream":500}');}res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify({success:true,path:req.url}));});await new Promise(r=>server.listen(port,"127.0.0.1",r));return server;}

test("legacy PIN upgrade and premium proxy production HTTP lifecycle",{skip:!enabled,timeout:90000},async(t)=>{
  const pool=mysql.createPool({...config(),connectionLimit:12});let app;let upstream;const records=[];
  try{
    const password="Legacy-password-123!",passwordHash=await bcrypt.hash(password,12);
    const users=[
      ["legacy@example.invalid","legacy",passwordHash,"1234",0,null],
      ["corrupt@example.invalid","corrupt",passwordHash,"12x4",0,null],
      ["null@example.invalid","null-pin",passwordHash,null,0,null],
      ["empty@example.invalid","empty-pin",passwordHash,"",0,null],
      ["modern@example.invalid","modern",passwordHash,await bcrypt.hash("4321",12),0,null],
      ["failure@example.invalid","failure",passwordHash,"2468",0,null],
      ["premium@example.invalid","premium",passwordHash,await bcrypt.hash("1111",12),1,"2099-01-01 00:00:00"],
      ["basic@example.invalid","basic",passwordHash,await bcrypt.hash("2222",12),0,null],
      ["expired@example.invalid","expired",passwordHash,await bcrypt.hash("3333",12),1,"2020-01-01 00:00:00"],
    ];
    for(const row of users)await pool.execute("INSERT INTO users(email,nickname,password_hash,pin_code,email_verified,is_premium,premium_until) VALUES (?,?,?,?,1,?,?)",row);
    const upstreamPort=await freePort();upstream=await startUpstream(upstreamPort,records);const appPort=await freePort();app=await startApp(appPort,upstreamPort);

    for(const bad of ["0000","123","12345","12x4",null,""]){const result=await runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:bad});assert.equal(result.body.success,false);}
    for(const email of ["corrupt@example.invalid","null@example.invalid","empty@example.invalid"]){const result=await runPost(`${app.base}/api/auth/login`,{email,password,pin:"1234"});assert.equal(result.body.success,false);}
    const [legacyA,legacyB]=await Promise.all([runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:"1234"}),runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:"1234"})]);assert.equal(legacyA.body.success,true);assert.equal(legacyB.body.success,true);
    const [[legacyUser]]=await pool.execute("SELECT id,pin_code FROM users WHERE email='legacy@example.invalid'");assert.match(legacyUser.pin_code,/^\$2[aby]\$/);assert.equal(await bcrypt.compare("1234",legacyUser.pin_code),true);const upgradedHash=legacyUser.pin_code;
    const modern=await runPost(`${app.base}/api/auth/login`,{email:"modern@example.invalid",password,pin:"4321"});assert.equal(modern.body.success,true);
    await pool.query("ALTER TABLE users ADD CONSTRAINT fixture_pin_upgrade_failure CHECK (email <> 'failure@example.invalid' OR CHAR_LENGTH(pin_code) <= 4)");assert.equal((await runPost(`${app.base}/api/auth/login`,{email:"failure@example.invalid",password,pin:"2468"})).body.success,false);const [[failedUpgrade]]=await pool.execute("SELECT pin_code FROM users WHERE email='failure@example.invalid'");assert.equal(failedUpgrade.pin_code,"2468");await pool.query("ALTER TABLE users DROP CHECK fixture_pin_upgrade_failure");assert.equal((await runPost(`${app.base}/api/auth/login`,{email:"failure@example.invalid",password,pin:"2468"})).body.success,true);
    const spoofed=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json","x-forwarded-for":"198.51.100.77"},body:JSON.stringify({email:"modern@example.invalid",password,pin:"0000"})});assert.equal(spoofed.data.success,false);const [[spoofAttempt]]=await pool.execute("SELECT ip FROM login_attempts ORDER BY id DESC LIMIT 1");assert.equal(spoofAttempt.ip,"direct");await pool.execute("DELETE FROM login_attempts");
    await stopApp(app);app=await startApp(appPort,upstreamPort);assert.equal((await runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:"1234"})).body.success,true);const [[afterRestart]]=await pool.execute("SELECT pin_code FROM users WHERE id=?",[legacyUser.id]);assert.equal(afterRestart.pin_code,upgradedHash);

    const sessionLogin=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"legacy@example.invalid",password,pin:"1234"})});const oldCookie=cookie(sessionLogin.response);assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:oldCookie}})).data.loggedIn,true);
    assert.equal((await runPost(`${app.base}/api/auth/request-pin-reset`,{email:"legacy@example.invalid",recaptchaToken:"fixture"})).body.success,true);const [[mail]]=await pool.execute("SELECT payload_encrypted FROM email_outbox WHERE message_kind='pin_reset' ORDER BY id DESC LIMIT 1");const payload=decryptPayload(mail.payload_encrypted);const resetToken=new URL(payload.text.slice(payload.text.indexOf("http"))).searchParams.get("token");assert.equal((await runPost(`${app.base}/api/auth/reset-pin`,{token:resetToken,newPin:"5678"})).body.success,true);assert.equal((await json(`${app.base}/api/auth/me`,{headers:{cookie:oldCookie}})).data.loggedIn,false);await pool.execute("DELETE FROM login_attempts");assert.equal((await runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:"1234"})).body.success,false);assert.equal((await runPost(`${app.base}/api/auth/login`,{email:"legacy@example.invalid",password,pin:"5678"})).body.success,true);await pool.execute("DELETE FROM login_attempts");

    async function loginCookie(email,pin){const result=await json(`${app.base}/api/auth/login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,pin})});assert.equal(result.data.success,true);return cookie(result.response);}
    const premiumCookie=await loginCookie("premium@example.invalid","1111"),basicCookie=await loginCookie("basic@example.invalid","2222"),expiredCookie=await loginCookie("expired@example.invalid","3333");
    const proxy=(suffix,cookieValue)=>json(`${app.base}/api/premium-insights${suffix}`,{headers:{...(cookieValue?{cookie:cookieValue}:{}),origin:`http://127.0.0.1:${appPort}`}});
    assert.equal((await proxy("/forecast",null)).response.status,401);assert.equal((await proxy("/forecast","session_user="+"f".repeat(64))).response.status,401);assert.equal((await proxy("/forecast?is_premium=1",basicCookie)).response.status,403);assert.equal((await proxy("/forecast",expiredCookie)).response.status,403);
    const success=await proxy("/forecast?category=tech",premiumCookie);assert.equal(success.response.status,200);assert.equal(success.data.success,true);assert.match(records.at(-1).url,/^\/api\/insights\/forecast\?category=tech$/);assert.equal(records.at(-1).key,"proxy-secret-marker-12345678901234567890");assert.match(records.at(-1).rate,/^premium-user-\d+$/);
    const beforeRejected=records.length;assert.equal((await proxy("/http:%2F%2F127.0.0.1",premiumCookie)).response.status,404);assert.equal((await proxy("/category/a%252Fb",premiumCookie)).response.status,404);assert.equal(records.length,beforeRejected);
    assert.equal((await proxy("/forecast?mode=400",premiumCookie)).response.status,400);assert.equal((await proxy("/forecast?mode=500",premiumCookie)).response.status,500);assert.equal((await proxy("/forecast?mode=timeout",premiumCookie)).response.status,502);assert.equal((await proxy("/forecast?mode=disconnect",premiumCookie)).response.status,502);assert.equal((await proxy("/forecast?mode=malformed",premiumCookie)).response.status,502);assert.equal((await proxy("/forecast?mode=large",premiumCookie)).response.status,502);assert.equal((await proxy("/forecast?mode=redirect",premiumCookie)).response.status,502);
    const concurrent=await Promise.all(Array.from({length:4},()=>proxy("/forecast?mode=success",premiumCookie)));assert.ok(concurrent.every(x=>x.response.status===200));const [[limits]]=await pool.execute("SELECT COUNT(*) count FROM shared_rate_limits");assert.ok(Number(limits.count)>=1);
    const output=app.output();assert.equal(output.includes("1234"),false);assert.equal(output.includes("5678"),false);assert.equal(output.includes("proxy-secret-marker"),false);
    t.diagnostic("browser subprocesses=0 by current architecture; local upstream calls only; paid proxy calls=0");
  }finally{if(app)await stopApp(app).catch(()=>{});if(upstream)await new Promise(r=>upstream.close(r));await pool.end();}
});
