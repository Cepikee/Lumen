"use client";
import {useEffect,useState} from "react";
import SparklineDetailed from "./SparklineDetailed";
import {intelligenceParams,loadTrendHistory,type TrendScope} from "@/lib/trend-intelligence-client";
import {PERIODS,pointLabel,type TrendHistory} from "@/lib/trend-intelligence";
import styles from "./TrendIntelligencePanel.module.css";
const palette=["#16b9ff","#a45aff","#19d4ff","#f542c8","#14e69a","#ffbf3e"];
type Article={id:number;title:string;url:string;source:string;date:string|null;observedAt:string;summary?:string};
export default function TrendIntelligencePanel({keyword,category,scope,onClose}: {keyword:string;category:string;scope:TrendScope;onClose:()=>void}) {
  const [local,setLocal]=useState(scope);
  const queryKey=JSON.stringify(local);
  return <section className={styles.panel} aria-label={`${keyword} – Trendelemzés`}>
    <header><div><h3>{keyword} — Trendelemzés</h3><p>{category} · Egyedi cikk–kulcsszó kapcsolatok; az észlelés ideje szerint.</p></div><button type="button" onClick={(event)=>{event.stopPropagation();onClose();}} aria-label="Trendelemzés bezárása">Bezárás ×</button></header>
    <div className={styles.controls}><label>Elemzés időszaka<select value={local.period} onChange={e=>setLocal({...local,period:e.target.value,asOf:undefined})}>{PERIODS.map(p=><option key={p} value={p}>{p==="custom"?"Egyedi":p==="24h"?"24 óra":`${p.slice(0,-1)} nap`}</option>)}</select></label>{local.period==="custom" && <><label>Kezdőnap (UTC)<input type="date" value={local.startDate??""} onChange={e=>setLocal({...local,startDate:e.target.value,asOf:undefined})}/></label><label>Zárónap (UTC)<input type="date" value={local.endDate??""} onChange={e=>setLocal({...local,endDate:e.target.value,asOf:undefined})}/></label></>}</div>
    <PanelData key={queryKey} keyword={keyword} category={category} scope={local}/>
  </section>;
}
function PanelData({keyword,category,scope}:{keyword:string;category:string;scope:TrendScope}) {
  const [data,setData]=useState<TrendHistory|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const [bySource,setBySource]=useState(false),[selected,setSelected]=useState<number|null>(null);
  useEffect(()=>{const controller=new AbortController();
    loadTrendHistory(scope,keyword,category,controller.signal).then(setData).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>controller.abort();
  },[scope,keyword,category,retry]);
  if(error) return <div role="alert">Az idősor nem tölthető be. Ellenőrizd az időszakot. <button type="button" onClick={()=>{setError(false);setRetry(r=>r+1);}}>Újrapróbálás</button></div>;
  if(!data)return <p role="status">Történeti adatok betöltése…</p>;
  const summary=`${pointLabel(data.window.start,data.window.resolution==="hour")} – ${pointLabel(data.window.end,data.window.resolution==="hour")}`;
  const series=bySource?data.sources.map((source,i)=>({label:source,color:palette[i%palette.length],values:data.history.map(p=>p.sources[source]??0)})):undefined;
  return <><div className={styles.metrics}><span>Időablak: {summary}</span><span>Összes: <b>{data.total.toLocaleString("hu-HU")}</b></span><span>Előző azonos hosszúságú időszak: {data.previousTotal.toLocaleString("hu-HU")}</span><span>{data.growth===null?data.status:`${data.growth>=0?"+":""}${(data.growth*100).toLocaleString("hu-HU",{maximumFractionDigits:1})}% · ${data.status}`}</span><span>Források: {data.sources.length}</span>{data.lastSeen&&<span>Utolsó észlelés: {pointLabel(data.lastSeen,true)}</span>}</div>
    <div className={styles.mode}><button type="button" aria-pressed={!bySource} onClick={()=>setBySource(false)}>Összes előfordulás</button><button type="button" aria-pressed={bySource} onClick={()=>setBySource(true)}>Forrásonként</button></div>
    {data.total===0&&<p role="status">Nincs rögzített kapcsolat ebben az időablakban. A nullák a sikeresen lekérdezett tárolt adatokat jelentik.</p>}
    <SparklineDetailed history={data.firstSeen === null ? [] : data.history} period={data.window.period} series={series} onPointSelect={setSelected}/>
    <p className={styles.note}>A jelmagyarázat kapcsolja a forrásvonalakat. Kattints egy pontra a cikkekhez. Napi összesítés: UTC-nap; órás időpontok: Europe/Budapest, időzóna-jelöléssel.</p>
    <label className={styles.pointSelect}>Időpont részletei<select value={selected??""} onChange={e=>setSelected(e.target.value===""?null:Number(e.target.value))}><option value="">Válassz időpontot…</option>{data.history.map((p,i)=><option key={p.timestamp} value={i}>{pointLabel(p.timestamp,data.window.resolution==="hour")} — {p.freq} kapcsolat</option>)}</select></label>
    {selected!==null&&data.history[selected]&&<PointArticles key={data.history[selected].timestamp} keyword={keyword} category={category} scope={{...scope,asOf:data.window.asOf}} bucket={data.history[selected].timestamp} count={data.history[selected].freq}/>}
  </>;
}
function PointArticles({keyword,category,scope,bucket,count}:{keyword:string;category:string;scope:TrendScope;bucket:string;count:number}) {
  const [articles,setArticles]=useState<Article[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(true),[offset,setOffset]=useState(0),[next,setNext]=useState<number|null>(null);
  useEffect(()=>{const controller=new AbortController();const q=intelligenceParams(scope,keyword,category);q.set("bucket",bucket);q.set("offset",String(offset));
    fetch(`/api/trends/trend-sources?${q}`,{signal:controller.signal,cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("articles_http");const p=await r.json();if(p.version!==2||!Array.isArray(p.articles)||p.articles.some((a:Article)=>!a||!Number.isSafeInteger(a.id)||typeof a.title!=="string"||typeof a.url!=="string"||typeof a.source!=="string")||(p.nextOffset!==null&&!Number.isSafeInteger(p.nextOffset)))throw new Error("articles_shape");if(controller.signal.aborted)return;setArticles(p.articles);setNext(p.nextOffset);}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();
  },[keyword,category,scope,bucket,offset]);
  return <div className={styles.articles}><h4>Kapcsolódó cikkek · {count} kapcsolat</h4>{loading?<p role="status">Cikkek betöltése…</p>:error?<p role="alert">A cikklista nem tölthető be.</p>:<><ul>{articles.map(a=><li key={a.id}>{/^https?:\/\//i.test(a.url)?<a href={a.url} target="_blank" rel="noopener noreferrer">{a.title||"Cím nélkül"}</a>:<strong>{a.title||"Cím nélkül"}</strong>}<small>{a.source} · {a.date?pointLabel(a.date,true):"Publikálási idő nem elérhető"}</small>{a.summary&&<p>{a.summary}</p>}</li>)}</ul>{!articles.length&&<p>Nincs visszakapcsolható cikk ebben az időablakban.</p>}<div className={styles.mode}>{offset>0&&<button type="button" onClick={()=>{setLoading(true);setError(false);setOffset(Math.max(0,offset-50));}}>Előző 50</button>}{next!==null&&<button type="button" onClick={()=>{setLoading(true);setError(false);setOffset(next);}}>Következő 50</button>}</div></>}</div>;
}
