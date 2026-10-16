"use client";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";
import styles from "./NewsFeedCard.module.css";

export interface FeedItem {
  id:number; url:string; source_id:number; source_name?:string|null; source?:string|null;
  content:string; title:string; detailed_content:string; ai_clean:number; created_at:string; category?:string|null;
}
function relative(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "ismeretlen időpont";const minutes=Math.max(0,Math.floor((Date.now()-date.getTime())/60000));if(minutes<1)return "most";if(minutes<60)return `${minutes} perce`;const hours=Math.floor(minutes/60);if(hours<24)return `${hours} órája`;return `${Math.floor(hours/24)} napja`;}
function fullDate(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "Ismeretlen dátum";return date.toLocaleString("hu-HU",{timeZone:"Europe/Budapest",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});}
function sourceKey(id:number){return ({1:"telex",2:"24hu",3:"index",4:"hvg",5:"portfolio",6:"444",7:"origo"} as Record<number,string>)[id]||"forrás";}
function sourceLabel(item:FeedItem){return item.source_name?.trim()||item.source?.trim()||sourceKey(item.source_id);}

export default function FeedItemCard({item}:{item:FeedItem;viewMode:"card"|"compact"}){
 const router=useRouter(), title=typeof item.title==="string"&&item.title.trim()?item.title.trim():"Cím nélkül";
 const summary=typeof item.content==="string"?item.content:"";
 const open=()=>router.push(`/cikk/${item.id}`);
 return <article className={styles.card} role="link" tabIndex={0} onClick={open} onKeyDown={event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();open();}}}>
  <div className={styles.thumbnail} aria-hidden="true"><span>U</span><small>UTOM</small></div>
  <div className={styles.body}>
   <div className={styles.meta}><span className={styles.source} data-source={sourceKey(item.source_id)}>{sourceLabel(item)}</span><span>·</span><time dateTime={item.created_at} title={fullDate(item.created_at)}>{relative(item.created_at)}</time></div>
   <h2>{title}</h2>
   <div className={styles.summary}>{summary?<ReactMarkdown>{summary}</ReactMarkdown>:<p>Ehhez a hírhez még nem érhető el rövid összefoglaló.</p>}</div>
   <footer><div className={styles.badges}>{item.category?.trim()&&!["ismeretlen","unknown"].includes(item.category.trim().toLocaleLowerCase("hu-HU"))?<span>{item.category}</span>:null}{item.ai_clean===1?<span>AI-összefoglaló</span>:null}</div><div className={styles.actions}><button type="button" onClick={event=>{event.stopPropagation();open();}}>Részletek</button>{item.url?.trim()?<a href={item.url} target="_blank" rel="noopener noreferrer" onClick={event=>event.stopPropagation()}>Eredeti cikk ↗</a>:null}</div></footer>
  </div>
 </article>;
}
