"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { homeRows, insightSnapshot, trendPayload, trendHistory } = require("./visual-recovery-proxy.cjs");

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.UTOM_VISUAL_BASE_URL || "http://localhost:3013";
const outputDir = path.resolve(process.env.UTOM_VISUAL_OUTPUT || "docs/recovery/screenshots/visual-recovery-v2");
const profileDir = path.join(os.tmpdir(), `utom-visual-${process.pid}`);
const debuggingPort = 9333;
fs.mkdirSync(outputDir,{recursive:true});
fs.mkdirSync(profileDir,{recursive:true});

function responseFor(rawUrl) {
  const url = new URL(rawUrl);
  if (url.pathname === "/api/auth/me") return {loggedIn:true,user:{id:1,email:"visual@example.invalid",nickname:"Vizuális teszt",email_verified:true,last_login:null,role:"user",theme:"dark",bio:null,is_premium:true,isPremium:true,premium_until:"2099-01-01",premium_tier:"test",avatar_style:"bottts",avatar_seed:"visual",avatar_format:"svg"}};
  if (url.pathname === "/api/summaries") return homeRows(Number(url.searchParams.get("page") || 1));
  if (url.pathname === "/api/feed-facets") return {contract:"public-feed-v1",definition:"Publikálható AI-összefoglalók (ai_clean=1)",total:381,categories:["Közélet","Politika","Gazdaság","Tech","Sport","Kultúra","Egészségügy","Oktatás"].map((name,index)=>({name,count:64-index*5})),sources:["telex.hu","24.hu","index.hu","hvg.hu","portfolio.hu","444.hu","origo.hu"].map((slug,index)=>({id:index+1,slug,name:["Telex","24.hu","Index","HVG","Portfolio","444.hu","Origo"][index],count:79-index*7}))};
  if (url.pathname === "/api/insights/trending-keywords") return {keywords:["energiapiac","választás","infláció","mesterséges intelligencia","sport"].map((keyword,index)=>({keyword,count:18-index*2}))};
  if (url.pathname === "/api/premium-insights/intelligence") return insightSnapshot(rawUrl);
  if (url.pathname === "/api/forecast") return {forecast:{},generatedAt:null};
  if (url.pathname === "/api/forecast-status") return {status:"idle"};
  if (url.pathname === "/api/trends") return trendPayload(url.searchParams.get("period")||"30d");
  if (url.pathname === "/api/trend-history") return trendHistory(rawUrl);
  if (url.pathname.startsWith("/api/trends/")) return {success:true,items:[],sources:[],articles:[]};
  return null;
}

class Cdp {
  constructor(socket) { this.socket=socket; this.id=0; this.pending=new Map(); this.listeners=[]; socket.onmessage=(event)=>this.receive(JSON.parse(event.data)); }
  receive(message) {
    if (message.id) {
      const pending = this.pending.get(message.id);
      if (pending) {
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      }
    } else {
      this.listeners.forEach((listener) => listener(message));
    }
  }
  send(method,params={}){return new Promise((resolve,reject)=>{const id=++this.id;this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));});}
  on(listener){this.listeners.push(listener);}
}

async function waitForJson(url, attempts=80) { for(let i=0;i<attempts;i++){try{const response=await fetch(url);if(response.ok)return response.json();}catch{}await new Promise(resolve=>setTimeout(resolve,125));}throw new Error(`Chrome DevTools nem indult el: ${url}`); }
async function wait(ms){return new Promise(resolve=>setTimeout(resolve,ms));}

async function main() {
  if (!fs.existsSync(chromePath)) throw new Error(`Chrome nem található: ${chromePath}`);
  const chrome=spawn(chromePath,["--headless=new","--disable-gpu",`--remote-debugging-port=${debuggingPort}`,`--user-data-dir=${profileDir}`,"--no-first-run","--no-default-browser-check","about:blank"],{stdio:"ignore",windowsHide:true});
  try {
    await waitForJson(`http://127.0.0.1:${debuggingPort}/json/version`);
    const targets=await waitForJson(`http://127.0.0.1:${debuggingPort}/json/list`);
    const pageTarget=targets.find((target)=>target.type==="page");
    if (!pageTarget?.webSocketDebuggerUrl) throw new Error("Chrome oldal target nem található.");
    const socket=new WebSocket(pageTarget.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
    const cdp=new Cdp(socket);
    const intercepted=[];const seen=[];
    cdp.on(async message=>{if(message.method!=="Fetch.requestPaused")return;const {requestId,request}=message.params;seen.push(request.url);const fixture=responseFor(request.url);try{if(fixture===null)await cdp.send("Fetch.continueRequest",{requestId});else{intercepted.push(new URL(request.url).pathname);const body=Buffer.from(JSON.stringify(fixture)).toString("base64");await cdp.send("Fetch.fulfillRequest",{requestId,responseCode:200,responseHeaders:[{name:"Content-Type",value:"application/json; charset=utf-8"},{name:"Cache-Control",value:"no-store"}],body});}}catch(error){console.error(error.message);}});
    await cdp.send("Page.enable");await cdp.send("Runtime.enable");await cdp.send("Fetch.enable",{patterns:[{urlPattern:"*",requestStage:"Request"}]});
    const pages=[
      {name:"home-desktop",url:"/",width:1920,height:1080},
      {name:"home-wide",url:"/",width:1440,height:1000},
      {name:"home-laptop",url:"/",width:1024,height:900},
      {name:"home-mobile",url:"/",width:390,height:844},
      {name:"home-mobile-narrow",url:"/",width:320,height:780},
      {name:"insights-desktop",url:"/insights?period=24h",width:1920,height:1080},
      {name:"insights-wide",url:"/insights?period=24h",width:1440,height:1200},
      {name:"insights-laptop",url:"/insights?period=24h",width:1280,height:900},
      {name:"insights-tablet",url:"/insights?period=24h",width:768,height:1100},
      {name:"insights-mobile",url:"/insights?period=24h",width:390,height:844},
      {name:"insights-mobile-narrow",url:"/insights?period=24h",width:320,height:780},
      {name:"trends-desktop",url:"/trends?period=30d",width:1920,height:1080},
      {name:"trends-wide",url:"/trends?period=30d",width:1440,height:1000},
      {name:"trends-laptop",url:"/trends?period=30d",width:1280,height:900},
      {name:"trends-compact",url:"/trends?period=30d",width:1024,height:900},
      {name:"trends-tablet",url:"/trends?period=30d",width:768,height:1100},
      {name:"trends-mobile",url:"/trends?period=30d",width:390,height:844},
      {name:"trends-mobile-narrow",url:"/trends?period=30d",width:320,height:780},
    ];
    const report=[];
    for(const page of pages){
      await cdp.send("Emulation.setDeviceMetricsOverride",{width:page.width,height:page.height,deviceScaleFactor:1,mobile:page.width<600});
      await cdp.send("Page.navigate",{url:baseUrl+page.url});await wait(1900);
      await cdp.send("Runtime.evaluate",{expression:`localStorage.setItem('cookie-consent','rejected');[...document.querySelectorAll('button')].find(button=>button.textContent?.includes('Csak szükséges'))?.click()`});
      await wait(150);
      const metrics=await cdp.send("Runtime.evaluate",{expression:`JSON.stringify({title:document.title,url:location.href,viewport:[innerWidth,innerHeight],scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,bodyWidth:document.body.getBoundingClientRect().width,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,scrollables:[...document.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+5).slice(0,15).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',clientHeight:e.clientHeight,scrollHeight:e.scrollHeight})),charts:[...document.querySelectorAll('.recharts-responsive-container,.recharts-wrapper')].map(e=>{const r=e.getBoundingClientRect();return {cls:e.className,width:Math.round(r.width),height:Math.round(r.height),svg:e.querySelectorAll('svg').length,paths:e.querySelectorAll('path').length}}),overflows:[...document.querySelectorAll('*')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left<-2}).slice(0,20).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'',right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left)}))})`,returnByValue:true});
      const shot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
      fs.writeFileSync(path.join(outputDir,`${page.name}-${page.width}x${page.height}.png`),Buffer.from(shot.data,"base64"));
      report.push({name:page.name,...JSON.parse(metrics.result.value)});
    }
    await cdp.send("Emulation.setDeviceMetricsOverride",{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
    await cdp.send("Page.navigate",{url:baseUrl+"/"});await wait(1900);
    await cdp.send("Runtime.evaluate",{expression:`(()=>{document.documentElement.style.scrollBehavior='auto';document.body.style.scrollBehavior='auto';window.scrollTo(0,900)})()`});
    await wait(300);
    const sticky=await cdp.send("Runtime.evaluate",{expression:`(()=>{const scroller=document.scrollingElement;const leftElement=document.querySelector('aside[aria-label="Főoldali navigáció"]');const rightElement=document.querySelector('aside[aria-label="Hírfolyam kontextusa"]');const left=leftElement?.getBoundingClientRect();const right=rightElement?.getBoundingClientRect();const inspect=element=>element&&({position:getComputedStyle(element).position,styleTop:getComputedStyle(element).top,overflow:getComputedStyle(element).overflow,ancestors:[...function*(){let node=element.parentElement;while(node){const style=getComputedStyle(node);yield {tag:node.tagName,cls:typeof node.className==='string'?node.className:'',overflow:style.overflow,transform:style.transform};node=node.parentElement}}()]});return JSON.stringify({scrollY,scroller:scroller&&{tag:scroller.tagName,cls:typeof scroller.className==='string'?scroller.className:'',scrollTop:scroller.scrollTop,clientHeight:scroller.clientHeight,scrollHeight:scroller.scrollHeight},primaryCategories:[...document.querySelectorAll('aside[aria-label="Főoldali navigáció"] button')].map(e=>e.textContent?.trim()).filter(Boolean),left:left&&{top:Math.round(left.top),bottom:Math.round(left.bottom),...inspect(leftElement)},right:right&&{top:Math.round(right.top),bottom:Math.round(right.bottom),...inspect(rightElement)}})})()` ,returnByValue:true});
    const stickyShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(outputDir,"home-scrolled-sticky-1440x1000.png"),Buffer.from(stickyShot.data,"base64"));

    await cdp.send("Page.navigate",{url:baseUrl+"/trends?period=30d"});await wait(1900);
    const trendInteraction=await cdp.send("Runtime.evaluate",{expression:`(async()=>{const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));const expected=['Telex','24.hu','Index','HVG','Portfolio','444.hu','Origo'];const labels=()=>[...document.querySelectorAll('label')].filter(label=>expected.includes(label.textContent?.trim()||''));const sources=[];for(const name of expected){const input=labels().find(label=>label.textContent?.trim()===name)?.querySelector('input');input?.click();await wait(120);sources.push({name,checked:Boolean(input?.checked),url:location.href});input?.click();await wait(120)}const telex=labels().find(label=>label.textContent?.trim()==='Telex')?.querySelector('input');telex?.click();await wait(250);const sourceUrl=location.href;const buttons=()=>[...document.querySelectorAll('article button[aria-label$="részletei"]')];buttons()[0]?.click();await wait(300);const opened=buttons()[0]?.getAttribute('aria-expanded');buttons()[0]?.click();await wait(250);const closed=buttons()[0]?.getAttribute('aria-expanded');buttons()[0]?.click();await wait(300);const reopened=buttons()[0]?.getAttribute('aria-expanded');buttons()[0]?.click();await wait(120);buttons()[1]?.scrollIntoView({block:'center'});buttons()[1]?.click();await wait(250);const secondOpened=buttons()[1]?.getAttribute('aria-expanded');document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,500);await wait(250);const left=document.querySelector('aside')?.getBoundingClientRect();const right=document.querySelector('main+aside')?.getBoundingClientRect();return JSON.stringify({sourceOptions:labels().length,sources,sourceUrl,opened,closed,reopened,secondOpened,scrollY,leftTop:left&&Math.round(left.top),rightTop:right&&Math.round(right.top)})})()`,awaitPromise:true,returnByValue:true});
    const openShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(outputDir,"trends-card-reopened-1440x1000.png"),Buffer.from(openShot.data,"base64"));
    await cdp.send("Page.reload",{ignoreCache:true});await wait(1900);
    const persisted=await cdp.send("Runtime.evaluate",{expression:`JSON.stringify({url:location.href,telexChecked:[...document.querySelectorAll('label')].find(label=>label.textContent?.trim()==='Telex')?.querySelector('input')?.checked??false})`,returnByValue:true});

    await cdp.send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await cdp.send("Page.navigate",{url:baseUrl+"/trends?period=30d"});await wait(1900);
    await cdp.send("Runtime.evaluate",{expression:`[...document.querySelectorAll('button')].find(button=>button.textContent?.trim()==='Szűrők')?.click()`});await wait(250);
    const mobileFilterShot=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    fs.writeFileSync(path.join(outputDir,"trends-mobile-filters-open-390x844.png"),Buffer.from(mobileFilterShot.data,"base64"));
    const interactions={sticky:JSON.parse(sticky.result.value),trend:JSON.parse(trendInteraction.result.value),persisted:JSON.parse(persisted.result.value)};
    fs.writeFileSync(path.join(outputDir,"dom-metrics.json"),JSON.stringify(report,null,2));
    fs.writeFileSync(path.join(outputDir,"interaction-results.json"),JSON.stringify(interactions,null,2));
    console.log(JSON.stringify({status:"PASS",outputDir,interceptedCount:intercepted.length,interactions,report},null,2));
    socket.close();
    await wait(100);
  } finally {
    chrome.kill();
    await Promise.race([new Promise(resolve=>chrome.once("exit",resolve)),wait(2500)]);
    if (path.resolve(profileDir).startsWith(path.resolve(os.tmpdir())+path.sep)) await fs.promises.rm(profileDir,{recursive:true,force:true,maxRetries:8,retryDelay:250});
  }
}

main().catch(error=>{console.error(error);process.exitCode=1;});
