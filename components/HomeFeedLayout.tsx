"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeedItem } from "./FeedItemCard";
import styles from "./HomeFeedLayout.module.css";

type Props={items:FeedItem[];category:string;source:string;onCategory:(value:string)=>void;onSource:(value:string)=>void;children:ReactNode};
const primary=["Közélet","Politika","Gazdaság","Tech","Sport"];
const sourceName=(item:FeedItem)=>item.source_name?.trim()||item.source?.trim()||sourceKey(item.source_id);
const sourceKey=(id:number)=>({1:"telex.hu",2:"24.hu",3:"index.hu",4:"hvg.hu",5:"portfolio.hu",6:"444.hu",7:"origo.hu"}[id]||"Ismeretlen forrás");
const sourceBadge=(name:string)=>name.replace(/^www\./i,"").split(".")[0].slice(0,6).toLocaleUpperCase("hu-HU");

export default function HomeFeedLayout({items,category,source,onCategory,onSource,children}:Props){
 const [filtersOpen,setFiltersOpen]=useState(false);
 const [topics,setTopics]=useState<Array<{keyword:string;count:number}>>([]);
 useEffect(()=>{let active=true;fetch("/api/insights/trending-keywords?period=24h",{cache:"no-store"}).then(response=>response.ok?response.json():null).then(data=>{if(active&&Array.isArray(data?.keywords))setTopics(data.keywords.filter((item:unknown):item is {keyword:string;count:number}=>Boolean(item&&typeof item==="object"&&typeof (item as {keyword?:unknown}).keyword==="string"&&Number.isFinite(Number((item as {count?:unknown}).count)))).map((item:{keyword:string;count:number})=>({keyword:item.keyword.trim(),count:Number(item.count)})).filter((item:{keyword:string;count:number})=>item.keyword).slice(0,5));}).catch(()=>{});return()=>{active=false;};},[]);
 const categories=useMemo(()=>{const map=new Map<string,number>();for(const item of items){const value=item.category?.trim();if(value&&!["ismeretlen","unknown"].includes(value.toLocaleLowerCase("hu-HU")))map.set(value,(map.get(value)||0)+1);}return map;},[items]);
 const sources=useMemo(()=>{const map=new Map<string,number>();for(const item of items){const value=sourceName(item);if(value!=="Ismeretlen forrás")map.set(value,(map.get(value)||0)+1);}return [...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"hu")).slice(0,5);},[items]);
 const latestUpdate=useMemo(()=>{const timestamps=items.map(item=>new Date(item.created_at).getTime()).filter(Number.isFinite);if(!timestamps.length)return null;return new Intl.DateTimeFormat("hu-HU",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Budapest"}).format(new Date(Math.max(...timestamps)));},[items]);
 const additional=[...categories.keys()].filter(value=>!primary.some(name=>name.toLocaleLowerCase("hu-HU")===value.toLocaleLowerCase("hu-HU")));
 const filterPanel=<div className={styles.panel}><h2>Népszerű kategóriák</h2><ul className={styles.filterList}><li><button className={!category?styles.active:""} onClick={()=>onCategory("")}><i className={styles.dot}/><span>Összes hír</span></button></li>{primary.map((name,index)=><li key={name}><button className={category.toLocaleLowerCase("hu-HU")===name.toLocaleLowerCase("hu-HU")?styles.active:""} onClick={()=>onCategory(name)}><i className={styles.dot} style={{"--dot":["#168eff","#8b5cf6","#ff8a3d","#20c8e8","#28c58b"][index]} as React.CSSProperties}/><span>{name}</span>{categories.get(name)?<small className={styles.count}>{categories.get(name)}</small>:null}</button></li>)}</ul>{additional.length?<details className={styles.more}><summary>További kategóriák</summary><ul className={styles.filterList}>{additional.map(name=><li key={name}><button onClick={()=>onCategory(name)}>{name}<small className={styles.count}>{categories.get(name)}</small></button></li>)}</ul></details>:null}</div>;
 return <main className={styles.page}><div className={styles.layout}>
  <aside className={styles.left} aria-label="Főoldali navigáció"><div className={styles.panel}><h2>Navigáció</h2><nav className={styles.nav}><Link className={!category&&!source?styles.active:""} href="/"><span aria-hidden="true">◉</span> Friss hírek</Link><button onClick={()=>setFiltersOpen(value=>!value)}><span aria-hidden="true">⌁</span> Kategóriák</button><button onClick={()=>document.getElementById("home-sources")?.scrollIntoView({behavior:"smooth"})}><span aria-hidden="true">◎</span> Források</button></nav></div>{filterPanel}</aside>
  <section className={styles.feed}><header className={styles.feedHeader}><div className={styles.feedIdentity}><span className={styles.feedTitleIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18 10 8l4 6 6-10"/><path d="M16 4h4v4"/></svg></span><div><h1>Friss hírek</h1><p>A magyar online sajtó legfrissebb hírei, egy helyen.</p></div></div><button className={styles.mobileFilters} onClick={()=>setFiltersOpen(value=>!value)}>Szűrők</button></header>
   {(category||source)&&<div className={styles.activeFilters}>{category&&<button onClick={()=>onCategory("")}>{category} ×</button>}{source&&<button onClick={()=>onSource("")}>{source} ×</button>}</div>}
   {filtersOpen&&<details open className={styles.drawer}><summary>Szűrők</summary>{filterPanel}</details>}{children}
  </section>
  <aside className={styles.right} aria-label="Hírfolyam kontextusa">
   <section className={`${styles.panel} ${styles.sourcePanel}`} id="home-sources"><h2>Aktív források</h2>{sources.length?<ol className={styles.ranking}>{sources.map(([name,count],index)=><li key={name}><em>{index+1}</em><button className={source===name?styles.active:""} onClick={()=>onSource(name)}><b>{sourceBadge(name)}</b><span>{name}</span><small className={styles.count}>{count} hír</small></button></li>)}</ol>:<p className={styles.muted}>A forráslista a hírek betöltése után jelenik meg.</p>}</section>
   <section className={styles.panel}><h2>Aktív témák</h2>{topics.length?<div className={styles.topics}>{topics.map(topic=><Link href={`/trends?keyword=${encodeURIComponent(topic.keyword)}`} key={topic.keyword}><span>#{topic.keyword}</span><small>{topic.count}</small></Link>)}</div>:<p className={styles.muted}>Még nincs elég adat aktív témákhoz.</p>}</section>
   <section className={styles.panel}><h2>Híraktivitás</h2><div className={styles.activity}><div><span>Betöltött hírek</span><strong>{items.length}</strong></div><div><span>Aktív források</span><strong>{sources.length}</strong></div>{latestUpdate?<div><span>Legfrissebb hír</span><strong>{latestUpdate}</strong></div>:null}</div></section>
  </aside>
 </div></main>;
}
