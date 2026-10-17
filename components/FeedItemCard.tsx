"use client";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NewsFeedCard.module.css";

export interface FeedItem {
  id:number; url:string; source_id:number; source_name?:string|null; source?:string|null;
  content:string; title:string; detailed_content:string; ai_clean:number; created_at:string; category?:string|null; image_url?:string|null;
  image_status?:string|null; image_source_type?:string|null;
}

function relative(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "ismeretlen időpont";const minutes=Math.max(0,Math.floor((Date.now()-date.getTime())/60000));if(minutes<1)return "most";if(minutes<60)return `${minutes} perce`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours} órája`;return `${Math.floor(hours/24)} napja`;}
function fullDate(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "Ismeretlen dátum";return date.toLocaleString("hu-HU",{timeZone:"Europe/Budapest",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function sourceKey(id:number){return ({1:"telex",2:"24hu",3:"index",4:"hvg",5:"portfolio",6:"444",7:"origo"} as Record<number,string>)[id]||"source";}
function sourceDomain(item:FeedItem){return item.source?.trim()||({1:"telex.hu",2:"24.hu",3:"index.hu",4:"hvg.hu",5:"portfolio.hu",6:"444.hu",7:"origo.hu"} as Record<number,string>)[item.source_id]||item.source_name?.trim()||"Ismeretlen forrás";}
function sourceLabel(item:FeedItem){return item.source_name?.trim()||item.source?.trim()||sourceKey(item.source_id);}
function sourceBadge(item:FeedItem){return sourceLabel(item).replace(/^www\./i,"").split(".")[0].slice(0,8).toLocaleUpperCase("hu-HU");}
function safeImage(value:string|null|undefined){if(!value)return null;const trimmed=value.trim();if(/^\/article-images\/\d{4}\/\d{2}\/\d{2}\/[1-9]\d*-[a-f0-9]{12}\.webp$/.test(trimmed))return trimmed;try{const parsed=new URL(trimmed);return ["http:","https:"].includes(parsed.protocol)?parsed.toString():null;}catch{return null;}}

export default function FeedItemCard({item}:{item:FeedItem;viewMode:"card"|"compact"}){
 const router=useRouter(), title=typeof item.title==="string"&&item.title.trim()?item.title.trim():"Cím nélkül";
 const summary=typeof item.content==="string"?item.content:"";
 const open=()=>router.push(`/cikk/${item.id}`);
 const category=item.category?.trim();
 const imageUrl=safeImage(item.image_url);
 const [imageFailed,setImageFailed]=useState(false);
 const showImage=Boolean(imageUrl&&!imageFailed);
 const categoryKey=(category||"altalanos").toLocaleLowerCase("hu-HU").replace(/[^a-z0-9áéíóöőúüű]+/g,"-");
 return <article className={`${styles.card} ${styles.withImage}`} role="link" tabIndex={0} onClick={open} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}}}>
  <div className={styles.thumbnail} data-category={categoryKey}>
   {showImage?<img src={imageUrl!} width={1024} height={576} loading="lazy" decoding="async" alt="" onError={()=>setImageFailed(true)}/>:<span className={styles.fallbackMark} aria-hidden="true">U</span>}
   {showImage&&["generated","cluster_reuse"].includes(item.image_source_type||"")?<span className={styles.illustrationBadge}>AI illusztráció</span>:null}
  </div>
  <div className={styles.body}>
   <div className={styles.meta}><span className={styles.source} data-source={sourceKey(item.source_id)}>{sourceBadge(item)}</span><span className={styles.domain}>{sourceDomain(item)}</span><span aria-hidden="true">·</span><time dateTime={item.created_at} title={fullDate(item.created_at)}>{relative(item.created_at)}</time>{item.ai_clean===1?<span className={styles.aiBadge}>AI-összefoglaló</span>:null}</div>
   <h2>{title}</h2>
   <div className={styles.summary}>{summary?<ReactMarkdown>{summary}</ReactMarkdown>:<p>Ehhez a hírhez még nem érhető el rövid összefoglaló.</p>}</div>
   <footer><div className={styles.badges}>{category&&!["ismeretlen","unknown"].includes(category.toLocaleLowerCase("hu-HU"))?<span data-category={category.toLocaleLowerCase("hu-HU")}>{category}</span>:null}</div><div className={styles.actions}><button type="button" onClick={event=>{event.stopPropagation();open();}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Részletek</button>{item.url?.trim()?<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-9 9"/><path d="M12 7H6a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6"/></svg>Eredeti cikk</a>:null}</div></footer>
  </div>
 </article>;
}
