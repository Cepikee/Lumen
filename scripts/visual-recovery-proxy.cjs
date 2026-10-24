"use strict";

const http = require("node:http");
const { normalizeRows, queryOptions, buildSnapshot } = require("../lib/insights-intelligence");

const upstream = { hostname: "127.0.0.1", port: 3013 };
const port = Number(process.env.UTOM_VISUAL_PROXY_PORT || 3014);
const sources = ["telex.hu", "24.hu", "index.hu", "hvg.hu", "portfolio.hu", "444.hu", "origo.hu"];
const sourceNames = ["Telex", "24.hu", "Index", "HVG", "Portfolio", "444.hu", "Origo"];
const categories = ["Közélet", "Politika", "Gazdaság", "Tech", "Sport", "Kultúra", "Egészségügy", "Oktatás"];
const keywords = ["energiapiac", "választás", "infláció", "mesterséges intelligencia", "sport", "kultúra", "egészségügy", "oktatás"];

function json(response, value, status = 200) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": body.length, "cache-control": "no-store" });
  response.end(body);
}

function homeRows(page = 1) {
  const offset = Math.max(0, page - 1) * 10;
  return Array.from({ length: 10 }, (_, index) => ({
    id: offset + index + 1, source_id: index % 7 + 1, source: sources[index % 7], source_name: sourceNames[index % 7],
    url: `https://${sources[index % 7]}/vizualis-teszt-${offset + index + 1}`, title: `Reprezentatív böngészős teszthír ${offset + index + 1}`,
    content: "Ez a kizárólag helyi vizuális ellenőrzéshez használt, jelölt reprezentatív összefoglaló.", detailed_content: "",
    ai_clean: 1, created_at: new Date(Date.now() - index * 27 * 60_000).toISOString(), category: categories[index % categories.length],
    image_url: null, image_status: "unavailable", image_source_type: null,
  }));
}

function insightSnapshot(url) {
  const end = Date.now();
  const raw = Array.from({ length: 168 }, (_, index) => {
    const published = new Date(end - (index % 72) * 20 * 60_000 - Math.floor(index / 72) * 86_400_000);
    return { id:index + 1, title:`Vizuális teszt ${index + 1}`, category:categories[index % 6], source:sources[index % 7], publishedAt:published.toISOString().slice(0,19).replace("T"," "),
      sentiment:[-1,0,1,0,1,-1,0][index % 7], score:0, clusterId:`c${index % 12}`, clusterStart:published.toISOString().slice(0,19).replace("T"," "), firstSource:sources[index % 7],
      summaryId:index + 1, processedAt:new Date(published.getTime()+8*60_000).toISOString().slice(0,19).replace("T"," "), clickbait:18 + (index * 11) % 71, keywords:`${keywords[index % keywords.length]}, közös téma` };
  });
  const rows = normalizeRows(raw);
  const incoming = new URL(url, "http://localhost").searchParams;
  incoming.set("period", incoming.get("period") || "24h");
  const options = queryOptions(incoming, end);
  const snapshot = buildSnapshot(rows, options);
  return { ...snapshot, evidence:{items:[],sources:[]}, explanation:{kind:"visual_acceptance_fixture",modelVersion:"none",inputHash:"local-representative-data",generatedAt:snapshot.window.end,text:"Helyi reprezentatív vizuális tesztadat.",evidenceReferences:[],providerCalls:0}, v2Events:{items:[]} };
}

function trendPayload(period) {
  const now = Date.now();
  const topics = ["energiapiac","választás","infláció","mesterséges intelligencia","sportfinanszírozás","kulturális támogatás","egészségügyi reform","oktatási program"];
  const trends = topics.map((keyword,index)=>({keyword,category:categories[index],freq:84-index*7,previous_total:48-index*3,growth:(36-index*4)/(48-index*3),status:index<2?"Most felkapott":"Erősödik",first_seen:new Date(now-(index+8)*86_400_000).toISOString(),last_seen:new Date(now-index*23*60_000).toISOString(),sources:sources.slice(0,Math.max(2,7-index%4)).join("|"),relatedTopics:index===0?["energiaárak"]:[]}));
  const bucketCount = period === "24h" ? 24 : 30;
  const step = period === "24h" ? 3_600_000 : 86_400_000;
  const activity = Array.from({length:bucketCount},(_,index)=>({label:new Date(now-(bucketCount-index)*step).toISOString(),count:6+((index*13)%31)}));
  const sourceBreakdown = sources.map((source,index)=>({source,count:210-index*19}));
  return {version:2,unit:"distinct_article_keyword_category",status:"ok",window:{period,start:new Date(now-bucketCount*step).toISOString(),end:new Date(now).toISOString(),previousStart:new Date(now-bucketCount*step*2).toISOString(),resolution:period==="24h"?"hour":"day",asOf:new Date(now).toISOString()},trends,sourceBreakdown,activity,coverage:"visual_acceptance_fixture"};
}

function trendHistory(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const period = url.searchParams.get("period") || "30d";
  const hourly = period === "24h", count = hourly ? 24 : 30, step = hourly ? 3_600_000 : 86_400_000, end = Date.now();
  const history = Array.from({length:count},(_,index)=>{const freq=2+((index*7)%13);return {timestamp:new Date(end-(count-index)*step).toISOString(),end:new Date(end-(count-index-1)*step).toISOString(),freq,sources:{"telex.hu":Math.ceil(freq/2),"hvg.hu":Math.floor(freq/2)}};});
  return {version:2,unit:"distinct_article_keyword_category",keyword:url.searchParams.get("keyword")||"téma",category:url.searchParams.get("category")||null,window:{start:history[0].timestamp,end:new Date(end).toISOString()},history,sources:["telex.hu","hvg.hu"],total:history.reduce((sum,item)=>sum+item.freq,0),previousTotal:80,growth:.25,status:"Erősödik",firstSeen:new Date(end-40*86_400_000).toISOString(),lastSeen:new Date(end-20*60_000).toISOString(),coverage:"visual_acceptance_fixture"};
}

function createServer() { return http.createServer((request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);
  if (url.pathname === "/api/auth/me") return json(response,{loggedIn:true,user:{id:1,email:"visual@example.invalid",nickname:"Vizuális teszt",email_verified:true,last_login:null,role:"user",theme:"dark",bio:null,is_premium:true,isPremium:true,premium_until:"2099-01-01",premium_tier:"test",avatar_style:"bottts",avatar_seed:"visual",avatar_format:"svg"}});
  if (url.pathname === "/api/summaries") return json(response,homeRows(Number(url.searchParams.get("page") || 1)));
  if (url.pathname === "/api/feed-facets") return json(response,{contract:"public-feed-v1",definition:"Publikálható AI-összefoglalók (ai_clean=1)",total:381,categories:categories.map((name,index)=>({name,count:64-index*5})),sources:sources.map((slug,index)=>({id:index+1,slug,name:sourceNames[index],count:79-index*7}))});
  if (url.pathname === "/api/insights/trending-keywords") return json(response,{keywords:keywords.slice(0,5).map((keyword,index)=>({keyword,count:18-index*2}))});
  if (url.pathname === "/api/premium-insights/intelligence") return json(response,insightSnapshot(request.url));
  if (url.pathname === "/api/forecast") return json(response,{forecast:{},generatedAt:null});
  if (url.pathname === "/api/forecast-status") return json(response,{status:"idle"});
  if (url.pathname === "/api/trends") return json(response,trendPayload(url.searchParams.get("period")||"30d"));
  if (url.pathname === "/api/trend-history") return json(response,trendHistory(request.url));
  if (url.pathname.startsWith("/api/trends/")) return json(response,{success:true,items:[],sources:[],articles:[]});

  const proxy = http.request({hostname:upstream.hostname,port:upstream.port,path:request.url,method:request.method,headers:{...request.headers,host:`${upstream.hostname}:${upstream.port}`}}, upstreamResponse => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  proxy.on("error", error => json(response,{error:error.message},502));
  request.pipe(proxy);
}); }

if (require.main === module) createServer().listen(port,"127.0.0.1",()=>console.log(`UTOM visual recovery proxy ready: http://127.0.0.1:${port}`));

module.exports = { homeRows, insightSnapshot, trendPayload, trendHistory };
