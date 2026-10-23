"use client";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import type { IntelligenceSnapshot } from "@/hooks/useInsightsSnapshot";
import { INSIGHTS_QUALITY_POLICY, isKnownCategory, isPropagationCluster, sourceClickbaitQuality } from "@/lib/insights-quality";
import styles from "./InsightsDashboard.module.css";

const labels: Record<string,string> = { new:"új", rising:"emelkedő", stable:"stabil", slowing:"lassul", declining:"csökkenő", fading:"kifutó" };
const modules = [["cycle","Terjedés"],["sources","Források"],["clickbait","Clickbait"],["keywords","Kulcsszavak"],["events","Témacsoportok"],["coverage","Lefedettség"]] as const;
type Module = typeof modules[number][0];
const date=(value:string)=>new Date(value).toLocaleString("hu-HU",{timeZone:"Europe/Budapest"});
async function readComparison(url:string) { const response=await fetch(url); if(!response.ok) throw Error(`comparison_${response.status}`); return response.json(); }

export default function InsightsSourceIntelligence({data}:{data:IntelligenceSnapshot}) {
  const router=useRouter(), path=usePathname(), search=useSearchParams();
  const [active,setActive]=useState<Module>("cycle");
  const [eventId,setEventId]=useState("");
  const comparison=useSWR(data.v2Events.enabled&&eventId?`/api/v2/source-comparison?eventId=${encodeURIComponent(eventId)}&detail=claims`:null,readComparison);
  const intel=data.intelligence;
  const propagation=intel.clusters.filter(isPropagationCluster).slice(0,5);
  const lifecycle=intel.keywordStates.filter(item=>item.state!=="insufficient"&&item.buckets.reduce((sum,value)=>sum+Number(value||0),0)>=INSIGHTS_QUALITY_POLICY.minLifecycleMentions).slice(0,10);
  function filter(field:string,value:string){const query=new URLSearchParams(search.toString());query.set(field,value);query.delete("page");router.push(`${path}?${query}`,{scroll:false});}

  return <section className={styles.intelligenceModules}>
    <div className={styles.moduleTabs} role="tablist" aria-label="Haladó Insights modulok">
      {modules.map(([id,label])=><button key={id} type="button" role="tab" aria-selected={active===id} aria-controls={`insights-panel-${id}`} onClick={()=>setActive(id)}>{label}</button>)}
    </div>
    <div className={styles.modulePanel} role="tabpanel" id={`insights-panel-${active}`}>
      {active==="cycle"&&<><h3>Hogyan terjedtek a hírek?</h3><div className={styles.moduleGrid}>
        <article><strong>{intel.velocity.count} publikált hír</strong><p>az utolsó teljes órában</p><small>{date(intel.velocity.start)} – {date(intel.velocity.end)}</small></article>
        <article><strong>{intel.diversity.clusters} eseménycsoport</strong><p>{intel.diversity.articles} cikkből · {intel.diversity.unclustered} még nincs csoportban</p></article>
      </div>{propagation.length?<ul className={styles.compactList}>{propagation.map(cluster=><li key={cluster.id}><button onClick={()=>filter("cluster",cluster.id)}>Témacsoport #{cluster.id}</button><span>{cluster.count} cikk · {cluster.sources} forrás</span></li>)}</ul>:<p className={styles.compactEmpty}>Nincs legalább két cikkből álló terjedési minta.</p>}<p className={styles.caption}>Egyetlen cikk nem számít terjedési mintának. A témacsoport a rendszer által észlelt együttállás, nem másolási bizonyíték.</p></>}

      {active==="sources"&&<><h3>Források röviden</h3>{intel.sourceStats.length?<div className={styles.sourceCards}>{intel.sourceStats.map(source=>{
        const gate=sourceClickbaitQuality(source.clickbait.currentSample,source.count);
        const focus=source.focus.filter(item=>isKnownCategory(item.category)&&item.count>=3).slice(0,2);
        return <article key={source.source}><button onClick={()=>filter("source",source.source)}>{source.source}</button><strong>{source.count} cikk</strong><p>{source.firstClusters} első · {source.followedClusters} követő cluster</p><p>Clickbait: {gate.canVisualize&&source.clickbait.current!==null?source.clickbait.current.toFixed(1)+" / 100":`${gate.analyzed} / ${gate.eligible} mérve · nincs elég adat`}</p><p>{focus.length?focus.map(item=>`${item.category} ${(100*item.share).toFixed(0)}%`).join(" · "):"Nincs elég kategóriaadat"}</p></article>;
      })}</div>:<p className={styles.compactEmpty}>Nincs forrásadat.</p>}</>}

      {active==="clickbait"&&<><h3>Clickbait mérési lefedettség</h3><p className={styles.caption}>Rangsor csak legalább 5 elemzett cikk és 20%-os forrásonkénti lefedettség mellett készül.</p><div className={styles.compactList}>{data.views.clickbait.sources.map(source=>{
        const gate=sourceClickbaitQuality(source.quality.analyzed,source.quality.eligible);
        return <p key={source.source}><button onClick={()=>filter("source",source.source)}>{source.source}</button><span>{gate.analyzed} / {gate.eligible} elemezve · {gate.canVisualize&&source.ratio!==null?`${(100*source.ratio).toFixed(1)}% clickbait arány`:"nincs elég adat"}</span></p>;
      })}</div></>}

      {active==="keywords"&&<><h3>Kulcsszó-életciklus</h3>{lifecycle.length?<ul className={styles.compactList}>{lifecycle.map(keyword=><li key={keyword.keyword}><button onClick={()=>filter("keyword",keyword.keyword)}>{keyword.keyword}</button><span>{labels[keyword.state]||keyword.state} · {keyword.buckets.join(" → ")}</span></li>)}</ul>:<p className={styles.compactEmpty}>Nincs legalább {INSIGHTS_QUALITY_POLICY.minLifecycleMentions} említésből álló életciklus.</p>}</>}

      {active==="events"&&<><h3>Több forrásban megjelenő témák</h3>{intel.emerging.length?<ul className={styles.compactList}>{intel.emerging.slice(0,5).map(event=><li key={event.id}><button onClick={()=>filter("cluster",event.id)}>Témacsoport #{event.id}</button><span>{event.sources} forrás · {event.recentCount} friss cikk</span></li>)}</ul>:<p className={styles.compactEmpty}>Nincs több forrással alátámasztott új jelzés.</p>}{data.v2Events.enabled&&<div className={styles.v2Evidence}><h4>V2 eseménybizonyítékok</h4><ul>{data.v2Events.items.map(event=><li key={event.id}><button onClick={()=>setEventId(String(event.id))}>Esemény #{event.id}</button> · {event.articles} cikk · {event.sources} forrás</li>)}</ul><label>Eseményazonosító <input inputMode="numeric" value={eventId} onChange={event=>setEventId(/^\d+$/.test(event.target.value)?event.target.value:"")} /></label>{comparison.isLoading?<p>Betöltés…</p>:comparison.error?<p>A bizonyíték nem érhető el.</p>:comparison.data?<Comparison value={comparison.data}/>:null}</div>}</>}

      {active==="coverage"&&<><h3>Adatgyűjtési lefedettség</h3>{intel.coverage.length?<><p>{intel.coverage.length} rendszeresen megfigyelt forrásból {intel.coverage.filter(source=>source.missing).length} nem adott új publikációt az elmúlt 24 órában.</p><ul className={styles.compactList}>{intel.coverage.filter(source=>source.missing).map(source=><li key={source.source}><strong>{source.source}</strong><span>utolsó megjelenés: {date(source.lastPublishedAt)}</span></li>)}</ul></>:<p className={styles.compactEmpty}>Nincs elegendő előzmény a lefedettség megállapításához.</p>}<p className={styles.caption}>A hiány oka lehet szerkesztőségi szünet vagy adatgyűjtési késés; a felület nem talál ki okot.</p></>}
    </div>
  </section>;
}

function Comparison({value}:{value:unknown}) {
  const claims=(value as {data?:{claims?:unknown[]}})?.data?.claims;
  if(!Array.isArray(claims)) return <p>Nincs megfelelő V2 állításadat.</p>;
  return <p>{claims.length} forráshoz kötött állítás érhető el. Automatikus igazságnyertes nincs.</p>;
}
