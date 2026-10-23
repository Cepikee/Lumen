"use strict";

const { normalizeSourceIdentity } = require('./source-identity');
const { businessDayBounds } = require('./business-time');
const DAY = 86400000;
const PERIODS = { '24h': DAY, '7d': 7*DAY, '30d': 30*DAY, '90d': 90*DAY };
const localHourFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Budapest',weekday:'short',hour:'2-digit',hourCycle:'h23'});
const key = value => String(value ?? '').trim().toLocaleLowerCase('hu-HU');
const sourceKey = value => normalizeSourceIdentity(value)?.key || key(value);
const isKnownCategory = value => { const normalized=key(value); return normalized && !['ismeretlen','unknown','n/a'].includes(normalized); };
function time(value) {
  if (value == null || value === '') return null;
  const text = typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(' ', 'T')+'Z' : value;
  const n = new Date(text).getTime();
  return Number.isFinite(n) ? n : null;
}
function number(value) { return value == null || String(value).trim()==='' || !['string','number'].includes(typeof value) || !Number.isFinite(Number(value)) ? null : Number(value); }
function queryOptions(params, now = Date.now()) {
  const period = params.get('period') ?? '24h';
  if (period !== 'today' && !PERIODS[period]) throw new Error('invalid_period');
  const rawEnd = params.get('asOf');
  const end = rawEnd === null ? Math.floor(now/60000)*60000 : time(rawEnd);
  if (end === null || end > now || end < now-7*DAY) throw new Error('invalid_asOf');
  const filters = {};
  for (const field of ['category','source','keyword','cluster']) {
    const raw = params.get(field);
    if (raw !== null && (!raw.trim() || raw.length>150)) throw new Error('invalid_'+field);
    if (raw) filters[field] = field==='source' ? sourceKey(raw) : key(raw);
  }
  const page = Number(params.get('page') ?? 1);
  if (!Number.isSafeInteger(page) || page<1 || page>100000) throw new Error('invalid_page');
  const phase = params.get('phase') ?? 'current';
  if (!['current','previous'].includes(phase)) throw new Error('invalid_phase');
  const start = period === 'today' ? businessDayBounds(new Date(end)).start.getTime() : end-PERIODS[period];
  const duration = end-start;
  return { period, end, start, previousStart:start-duration, filters, page, phase };
}
function normalizeRows(rows) {
  const seen = new Set();
  return rows.flatMap(r => {
    const id = Number(r.id), published = time(r.publishedAt);
    if (!Number.isSafeInteger(id) || id<=0 || seen.has(id) || published===null) return [];
    seen.add(id);
    const sentiment = number(r.sentiment), clickbait = number(r.clickbait);
    return [{id, score:number(r.score), title:String(r.title || 'Cím nélküli cikk'), category:key(r.category)||'ismeretlen', source:sourceKey(r.source), published,
      summaryId:r.summaryId == null ? null : Number(r.summaryId), processed:time(r.processedAt),
      sentiment:[-1,0,1].includes(sentiment) ? sentiment : null,
      clickbait:clickbait!==null && clickbait>=0 && clickbait<=100 ? clickbait:null,
      keywords:[...new Set(String(r.keywords||'').split(',').map(s=>key(s.replace(/[\[\]"']/g,''))).filter(Boolean))],
      cluster:r.clusterId==null?null:String(r.clusterId), clusterStart:time(r.clusterStart), firstSource:sourceKey(r.firstSource),
    }];
  });
}
function matches(r, filters) { return (!filters.category || r.category===filters.category) && (!filters.source || r.source===filters.source) && (!filters.keyword || r.keywords.includes(filters.keyword)) && (!filters.cluster || r.cluster===filters.cluster); }
function select(rows, options, phase='current') { const start=phase==='previous'?options.previousStart:options.start, end=phase==='previous'?options.start:options.end; return rows.filter(r=>r.published>=start && r.published<end && matches(r,options.filters)); }
const median = values => { const a=[...values].sort((x,y)=>x-y); return a.length ? (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2 : null; };
function quality(rows, field, end) {
  const measured=rows.filter(r=>r[field]!==null), dates=measured.map(r=>r.processed).filter(t=>t!==null);
  const last=dates.length?Math.max(...dates):null;
  return {eligible:rows.length, analyzed:measured.length, missing:rows.length-measured.length,
    state:!measured.length?'none':measured.length===rows.length?'complete':'partial', lowSample:measured.length<20,
    lastMeasuredAt:last===null?null:new Date(last).toISOString(), ageMinutes:last===null?null:Math.max(0,Math.floor((end-last)/60000))};
}
function delta(current, previous) { return {current, previous, absolute:current-previous, percent:previous ? (current-previous)/previous*100:null, isNew:previous===0 && current>0}; }
function group(rows, field) { const groups=new Map(); for(const r of rows){const values=Array.isArray(r[field])?r[field]:[r[field]];for(const value of values){if(value==null||value==='')continue;const list=groups.get(value)||[];list.push(r);groups.set(value,list);}}return groups; }
function movement(current, previous, field) {
  const a=group(current,field), b=group(previous,field);
  return [...new Set([...a.keys(),...b.keys()])].map(name=>({name,...delta(a.get(name)?.length||0,b.get(name)?.length||0),sources:new Set((a.get(name)||[]).map(r=>r.source).filter(Boolean)).size, previousSources:new Set((b.get(name)||[]).map(r=>r.source).filter(Boolean)).size}))
    .sort((x,y)=>Math.abs(y.absolute)-Math.abs(x.absolute)||x.name.localeCompare(y.name,'hu'));
}
function lifecycle(values) {
  const [a,b,c,d]=values;
  if(values.reduce((n,v)=>n+v,0)<10)return 'insufficient';
  if(a+b+c===0 && d>=5)return 'new';
  if(d===0 && c>0)return 'fading';
  if(d<c*.8)return 'declining';
  if(d>c && c>b && d-c<c-b)return 'slowing';
  if(d>=c*1.2 && d-c>=3)return 'rising';
  return 'stable';
}
function detail(rows, options) {
  const selected=select(rows,options,options.phase).sort((a,b)=>b.published-a.published||b.id-a.id);
  return {total:selected.length,page:options.page,pages:Math.ceil(selected.length/25),sources:[...new Set(selected.map(r=>r.source).filter(Boolean))],
    items:selected.slice((options.page-1)*25,options.page*25).map(r=>({id:r.id,title:r.title,source:r.source,category:r.category,publishedAt:new Date(r.published).toISOString(),href:r.summaryId?'/cikk/'+r.summaryId:null,measurementPending:r.summaryId===null}))};
}
function basicViews(current, options) {
  const categorized=current.filter(r=>isKnownCategory(r.category));
  const cats=group(categorized,'category');
  const sentiment = list => ({positive:list.filter(r=>r.sentiment===1).length,neutral:list.filter(r=>r.sentiment===0).length,negative:list.filter(r=>r.sentiment===-1).length});
  const categories=[...cats].map(([category,list])=>({category,articleCount:list.length,trendScore:list.length,sourceDiversity:new Set(list.map(r=>r.source).filter(Boolean)).size,lastArticleAt:new Date(Math.max(...list.map(r=>r.published))).toISOString(),ringSources:[...group(list,'source')].map(([label,a])=>({label,name:label,count:a.length,percent:100*a.length/list.length}))}));
  const buckets=list=>[...group(list.map(r=>({...r,bucket:new Date(Math.floor(r.published/3600000)*3600000).toISOString()})),'bucket')].sort(([a],[b])=>a.localeCompare(b));
  const sources=[...group(current,'source')].map(([source,list])=>{const measured=list.filter(r=>r.clickbait!==null);return {source,count:measured.length,avg_clickbait:measured.length?measured.reduce((s,r)=>s+r.clickbait,0)/measured.length:null,total:measured.length,clickbait:measured.filter(r=>r.clickbait>=45).length,ratio:measured.length?measured.filter(r=>r.clickbait>=45).length/measured.length:null,quality:quality(list,'clickbait',options.end)};});
  return { overview:{success:true,categories}, timeseries:{categories:[...cats].map(([category,list])=>({category,points:buckets(list).map(([date,a])=>({date,count:a.length}))}))},
    sentiment:{...sentiment(current),quality:quality(current,'sentiment',options.end)},categorySentiment:{categories:Object.fromEntries([...cats].map(([cat,list])=>[cat,sentiment(list)]))},
    timeline:{timeline:buckets(current).map(([date,list])=>({date,...sentiment(list)}))},clickbait:{success:true,sources},clickbaitRatio:{success:true,sources},
    keywords:{keywords:[...group(current,'keywords')].map(([keyword,list])=>({keyword,count:list.length})).filter(k=>k.count>=3).sort((a,b)=>b.count-a.count),total:[...group(current,'keywords').values()].filter(a=>a.length>=3).length},
    distribution:{success:true,items:[...group(current,'source')].map(([source,list])=>({source,...Object.fromEntries([...group(list.filter(r=>isKnownCategory(r.category)),'category')].map(([cat,a])=>[cat,a.length]))}))}};
}
function buildSnapshot(rows, options) {
  const current=select(rows,options), previous=select(rows,options,'previous');
  const categorized=current.filter(r=>isKnownCategory(r.category));
  const oldest=rows.length?Math.min(...rows.map(r=>r.published)):options.end;
  const baselineAvailable=previous.length>0 || oldest<=options.previousStart;
  const categories=movement(current,previous,'category'), keywords=movement(current,previous,'keywords');
  const eligible=m=>Math.max(m.current,m.previous)>=10 && Math.abs(m.absolute)>=5 && Math.max(m.sources,m.previousSources)>=2;
  const highlights=baselineAvailable?[...categories.filter(m=>isKnownCategory(m.name)&&eligible(m)).map(m=>({...m,type:'category'})),...keywords.filter(eligible).map(m=>({...m,type:'keyword'}))].sort((a,b)=>Math.abs(b.absolute)-Math.abs(a.absolute)||a.name.localeCompare(b.name)).slice(0,3):[];
  const neg=list=>{const a=list.filter(r=>r.sentiment!==null);return {n:a.length,ratio:a.length?a.filter(r=>r.sentiment===-1).length/a.length:null};};
  const a=neg(current),b=neg(previous);
  const sentimentChange={current:a.ratio,previous:b.ratio,percentagePoints:a.ratio===null||b.ratio===null?null:100*(a.ratio-b.ratio),currentSample:a.n,previousSample:b.n};
  const processed=rows.filter(r=>r.processed>=options.start && r.processed<options.end && matches(r,options.filters));
  return {success:true,contractVersion:'insights-publication-v1',window:{period:options.period,start:new Date(options.start).toISOString(),end:new Date(options.end).toISOString(),previousStart:new Date(options.previousStart).toISOString(),timezone:'Europe/Budapest',basis:'articles.published_at',interval:'[start,end)',semantics:options.period==='today'?'Budapesti naptári nap 00:00-tól mostanáig':options.period==='24h'?'Gördülő 24 óra a jelenlegi pillanattól visszafelé':'Gördülő időablak a jelenlegi pillanattól visszafelé'},filters:options.filters,
    quality:{summary:quality(current,'summaryId',options.end),sentiment:quality(current,'sentiment',options.end),clickbait:quality(current,'clickbait',options.end),category:{eligible:current.length,analyzed:categorized.length,missing:current.length-categorized.length},missingSource:current.filter(r=>!r.source).length},
    counts:{...delta(current.length,previous.length),baselineAvailable,sources:new Set(current.map(r=>r.source).filter(Boolean)).size},
    highlights,sentimentChange,movers:{rising:baselineAvailable?keywords.filter(m=>eligible(m)&&m.absolute>0):[],falling:baselineAvailable?keywords.filter(m=>eligible(m)&&m.absolute<0):[]},
    processing:{published:current.length,processed:processed.length,olderPublished:processed.filter(r=>r.published<options.start).length,historyBounded:true},
    views:basicViews(current,options), intelligence:advanced(rows,options)};
}
function advanced(rows,options) {
  const scoped=rows.filter(r=>matches(r,options.filters)), current=select(rows,options), previous=select(rows,options,'previous');
  const hour=3600000, end=Math.floor(options.end/hour)*hour, start=end-hour;
  const local=t=>localHourFormatter.format(t);
  const oldest=rows.length?Math.min(...rows.map(r=>r.published)):options.end;
  const samples=[];
  // Completed UTC hours only; compare Budapest hour and weekday. DST repeated hours
  // are separate observations, never a fabricated zero or a host-local timestamp.
  for(let t=start-56*DAY;t<start;t+=hour) if(t>=oldest && local(t)===local(start)) samples.push(scoped.filter(r=>r.published>=t&&r.published<t+hour).length);
  const recent=scoped.filter(r=>r.published>=start&&r.published<end), sources=new Set(recent.map(r=>r.source).filter(Boolean)).size;
  const baseline=samples.length>=4?median(samples):null;
  const mad=baseline===null?null:median(samples.map(v=>Math.abs(v-baseline)));
  const lag=median(recent.filter(r=>r.processed!==null).map(r=>Math.max(0,r.processed-r.published)/60000));
  const baselineReady=baseline!==null&&oldest<=start-28*DAY&&samples.filter(v=>v>0).length>=3;
  const anomalous=baselineReady&&sources>=3&&recent.length>=10&&recent.length-baseline>=5&&recent.length>=Math.max(1,baseline)*2&&recent.length>baseline+3*Math.max(1,mad)&&lag!==null&&lag<=120;
  const prior=new Map(group(previous,'source'));
  const sourceStats=[...group(current,'source')].map(([source,list])=>{
    const old=prior.get(source)||[], measured=list.filter(r=>r.clickbait!==null), oldMeasured=old.filter(r=>r.clickbait!==null);
    const avg=a=>a.length?a.reduce((s,r)=>s+r.clickbait,0)/a.length:null;
    const currentClickbait=avg(measured),previousClickbait=avg(oldMeasured);
    const clustered=list.filter(r=>r.cluster&&r.firstSource&&r.clusterStart!==null&&r.published>=r.clusterStart);
    const delays=clustered.map(r=>(r.published-r.clusterStart)/60000);
    const first=new Set(clustered.filter(r=>r.source===r.firstSource).map(r=>r.cluster));
    const followed=new Set(clustered.filter(r=>r.source!==r.firstSource).map(r=>r.cluster));
    const allCurrent=rows.filter(r=>r.source===source&&r.published>=options.start&&r.published<options.end);
    const focus=[...group(allCurrent,'category')].map(([category,a])=>{
      const history=rows.filter(r=>r.source===source&&r.published>=options.start-30*DAY&&r.published<options.start);
      const oldCount=history.filter(r=>r.category===category).length;
      const oldShare=history.length?oldCount/history.length:null;
      const share=a.length/allCurrent.length;
      return {category,count:a.length,share,previous30DayShare:oldShare,shareRatio:oldShare?share/oldShare:null,historySample:history.length};
    }).sort((a,b)=>b.count-a.count);
    return {source,count:list.length,firstClusters:first.size,followedClusters:followed.size,medianDelay:median(delays),delaySample:delays.length,focus,
      clickbait:{current:currentClickbait,previous:previousClickbait,delta:currentClickbait===null||previousClickbait===null?null:currentClickbait-previousClickbait,currentSample:measured.length,previousSample:oldMeasured.length}};
  }).sort((a,b)=>b.count-a.count||a.source.localeCompare(b.source));
  const currentClusterIds=new Set(current.map(r=>r.cluster).filter(Boolean));
  const clusters=[...group(scoped,'cluster')].filter(([id])=>currentClusterIds.has(id)).map(([id,list])=>{
    const ordered=[...list].sort((a,b)=>a.published-b.published||a.id-b.id);
    const now=list.filter(r=>r.published>=options.end-90*60000&&r.published<options.end);
    const before=list.filter(r=>r.published>=options.end-180*60000&&r.published<options.end-90*60000);
    const countSources=new Set(now.map(r=>r.source).filter(Boolean)).size;
    const sentiments=[...group(now,'source')].map(([source,a])=>{const m=a.filter(r=>r.sentiment!==null);return {source,sample:m.length,average:m.length?m.reduce((s,r)=>s+r.sentiment,0)/m.length:null};});
    return {id,firstObservedAt:new Date(ordered[0].published).toISOString(),count:list.length,recentCount:now.length,previousCount:before.length,sources:countSources,emerging:countSources>=3&&now.length>=5&&now.length>before.length*2,
      sentiments,timeline:ordered.slice(0,100).map(r=>({id:r.id,source:r.source,at:new Date(r.published).toISOString(),title:r.title,href:r.summaryId?'/cikk/'+r.summaryId:null})),timelineTotal:ordered.length};
  }).sort((a,b)=>b.recentCount-a.recentCount||a.id.localeCompare(b.id));
  const keywordStates=[...group(current,'keywords')].map(([keyword])=>{
    const span=(options.end-options.start)/4;
    const buckets=Array.from({length:4},(_,i)=>current.filter(r=>r.keywords.includes(keyword)&&r.published>=options.start+i*span&&r.published<options.start+(i+1)*span).length);
    return {keyword,buckets,state:lifecycle(buckets)};
  }).sort((a,b)=>b.buckets.reduce((n,v)=>n+v,0)-a.buckets.reduce((n,v)=>n+v,0)).slice(0,20);
  const coverage=[...group(rows.filter(r=>r.published>=options.end-30*DAY),'source')].flatMap(([source,list])=>{
    const history=list.filter(r=>r.published<options.end-DAY), days=new Set(history.map(r=>new Date(r.published).toISOString().slice(0,10))).size;
    const last=Math.max(...list.map(r=>r.published));
    return days>=7 ? [{source,lastPublishedAt:new Date(last).toISOString(),hoursSince:(options.end-last)/hour,missing:options.end-last>DAY,observedDays:days}]:[];
  });
  return {velocity:{count:recent.length,start:new Date(start).toISOString(),end:new Date(end).toISOString(),baseline:baselineReady?baseline:null,baselineSamples:samples.length,anomalous,sources,medianProcessingDelayMinutes:lag,signalId:new Date(start).toISOString()+':'+JSON.stringify(options.filters)},sourceStats,
    clusters:clusters.slice(0,20),clusterTotal:clusters.length,emerging:clusters.filter(c=>c.emerging),keywordStates,coverage,
    diversity:{articles:current.length,clusters:new Set(current.map(r=>r.cluster).filter(Boolean)).size,unclustered:current.filter(r=>!r.cluster).length,newClusters:new Set(current.filter(r=>r.cluster&&r.clusterStart>=options.start&&r.clusterStart<options.end).map(r=>r.cluster)).size}};
}
module.exports={DAY,PERIODS,time,key,sourceKey,queryOptions,normalizeRows,select,quality,delta,movement,lifecycle,detail,buildSnapshot,group,median,matches,advanced};
