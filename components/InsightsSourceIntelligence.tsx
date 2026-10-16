"use client";
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import type { IntelligenceSnapshot } from '@/hooks/useInsightsSnapshot';
import styles from './InsightsDashboard.module.css';
const labels:Record<string,string>={new:'új',rising:'emelkedő',stable:'stabil',slowing:'növekedése lassul',declining:'csökkenő',fading:'kifutó',insufficient:'kevés adat'};
const date=(s:string)=>new Date(s).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'});
async function readComparison(url:string) {const r=await fetch(url);if(!r.ok)throw Error(`comparison_${r.status}`);const json=await r.json();return json;}
export default function InsightsSourceIntelligence({data}:{data:IntelligenceSnapshot}) {
  const router=useRouter(),path=usePathname(),search=useSearchParams();
  const [eventId,setEventId]=useState('');
  const comparison=useSWR(eventId?`/api/v2/source-comparison?eventId=${encodeURIComponent(eventId)}&detail=claims`:null,readComparison);
  function filter(field:string,value:string){const q=new URLSearchParams(search.toString());q.set(field,value);router.push(`${path}?${q}`,{scroll:false});}
  const intel=data.intelligence,velocity=intel.velocity;
  return <section className={styles.intelligence}>
    <div className={styles.card}><h2>Hírciklus-sebesség</h2><p>{velocity.count} publikált hír az utolsó teljes órában ({date(velocity.start)} – {date(velocity.end)})</p><p>{velocity.baseline===null?'Nincs elegendő történet a szokatlanság megállapításához.':`Azonos budapesti napszak és hétköznap mediánja: ${velocity.baseline} · ${velocity.baselineSamples} minta.`}</p>{velocity.anomalous&&<strong>Szokatlanul magas publikálási aktivitás · {velocity.sources} forrás</strong>}<p className={styles.caption}>A megkezdett óra nem teljes minta. Feldolgozási késés mediánja: {velocity.medianProcessingDelayMinutes===null?'nincs mérés':velocity.medianProcessingDelayMinutes.toFixed(0)+' perc'}. A hiányos adatgyűjtés a történeti összevetést is torzíthatja.</p></div>
    <div className={styles.card}><h2>Sok cikk, hány eseménycsoport?</h2><p>{intel.diversity.articles} cikk · {intel.diversity.clusters} megfigyelt cluster · {intel.diversity.newClusters} ebben az időszakban indult cluster · {intel.diversity.unclustered} még nincs clusterhez rendelve.</p><p className={styles.caption}>A cluster a rendszer csoportosítása, nem bizonyítja önmagában egy külön valós esemény létét.</p></div>
    <div className={styles.card}><h2>Forrásfigyelő</h2><p className={styles.caption}>Az „első” az UTOM által figyelt források közül elsőként megjelentet jelenti. A későbbi megjelenés témakövetés, nem bizonyít másolást.</p>
      {intel.sourceStats.length?<div className={styles.tableScroll}><table><thead><tr><th>Forrás / cikk</th><th>Clickbait</th><th>Első / követő cluster</th><th>Reakcióidő medián</th><th>Saját kategóriafókusz (összes kategória)</th></tr></thead><tbody>{intel.sourceStats.map(s=><tr key={s.source}><td><button onClick={()=>filter('source',s.source)}>{s.source}</button><br/>{s.count} cikk</td><td>{s.clickbait.current===null?'Nincs mérés':s.clickbait.current.toFixed(1)+' / 100'}<br/>{s.clickbait.currentSample} elemzett<br/>{s.clickbait.delta===null?'Nincs összehasonlítás':`${s.clickbait.delta.toFixed(1)} pont változás (${s.clickbait.previousSample} előző mérés)`}</td><td>{s.firstClusters} / {s.followedClusters}</td><td>{s.medianDelay===null?'Nincs mérés':s.medianDelay.toFixed(1)+' perc'}<br/>{s.delaySample} mérés</td><td>{s.focus.slice(0,3).map(f=><p key={f.category}><button onClick={()=>filter('category',f.category)}>{f.category}</button> {(100*f.share).toFixed(0)}%{f.shareRatio!==null&&f.historySample>=20?` · ${f.shareRatio.toFixed(1)}× saját előző 30 napos részarány`: ' · nincs elég előzmény'}</p>)}</td></tr>)}</tbody></table></div>:<p>Nincs forrásadat.</p>}
    </div>
    <div className={styles.card}><h2>Clickbait arány · látható mintanagysággal</h2>{data.views.clickbait.sources.map(s=><p key={s.source}><button onClick={()=>filter('source',s.source)}>{s.source}</button>: {s.ratio===null?'nincs mérés':`${(100*s.ratio).toFixed(1)}% · ${s.clickbait}/${s.total} cikk`} · {s.quality.analyzed}/{s.quality.eligible} lefedettség{s.quality.lowSample?' · alacsony mintanagyság':''}</p>)}</div>
    <div className={styles.card}><h2>Kulcsszó-életciklus · megfigyelés</h2><ul>{intel.keywordStates.map(k=><li key={k.keyword}><button onClick={()=>filter('keyword',k.keyword)}>{k.keyword}</button> · {labels[k.state]} · négy egymást követő részablak: {k.buckets.join(' → ')}</li>)}</ul></div>
    <div className={styles.card}><h2>Kialakuló eseménycsoportok</h2>{intel.emerging.length?<ul>{intel.emerging.map(c=><li key={c.id}><button onClick={()=>filter('cluster',c.id)}>Cluster #{c.id}</button> · {c.sources} forrás · {c.recentCount} cikk az elmúlt 90 percben, előtte {c.previousCount} · első megfigyelés {date(c.firstObservedAt)}</li>)}</ul>:<p>Nincs több forrással alátámasztott új jelzés.</p>}</div>
    <details className={styles.card}><summary>Az elsőként látott hír útja és források hangulata</summary><p>{intel.clusters.length} csoport idővonala látható a {intel.clusterTotal} közül. Egy konkrét cluster kiválasztásával annak idővonala kérhető le.</p>{intel.clusters.slice(0,20).map(c=><details key={c.id}><summary>Cluster #{c.id} · {c.count} cikk</summary><ul>{c.timeline.map((r:any)=><li key={r.id}>{date(r.at)} · {r.source||'ismeretlen'} · {r.href?<a href={r.href}>{r.title}</a>:r.title}</li>)}</ul>{c.timelineTotal>c.timeline.length&&<p>Az első {c.timeline.length} megjelenés látható a {c.timelineTotal} közül.</p>}<p>Utolsó 90 perc hangulata, ugyanazon clusterben:</p>{c.sentiments.map(s=><p key={s.source}>{s.source}: {s.average===null?'nincs mérés':s.average.toFixed(2)} · {s.sample} cikk{s.sample<20?' · alacsony minta':''}</p>)}</details>)}</details>
    <div className={styles.card}><h2>Mennyit látunk a hírtérből?</h2><p className={styles.caption}>Teljes forrásminta; a kategória- és kulcsszószűrőtől független adatgyűjtési lefedettség.</p>{intel.coverage.length===0?<p>Nincs elegendő előzmény a megszokott források azonosításához.</p>:<><p>{intel.coverage.length} rendszeresen megfigyelt forrásból {intel.coverage.filter(s=>s.missing).length} nem adott az elmúlt 24 órában új publikációt a mintában.</p>{intel.coverage.filter(s=>s.missing).map(s=><p key={s.source}>{s.source}: utolsó megjelenés {date(s.lastPublishedAt)}. Lehet szerkesztőségi szünet vagy adatgyűjtési késés; az ok nincs bizonyítva.</p>)}</>}</div>
    <details className={styles.card}><summary>Ugyanaz a szám, eltérő állítás — V2 bizonyítékok</summary>
      {data.v2Events.enabled?<ul>{data.v2Events.items.map(e=><li key={e.id}><button onClick={()=>setEventId(String(e.id))}>Esemény #{e.id}</button> · {e.articles} cikk · {e.sources} forrás · {e.status}</li>)}</ul>:<p>{data.v2Events.reason}</p>}
      <p>Meglévő V2 eseményazonosító alapján. A clusterazonosító nem V2 eseményazonosító.</p><label>Eseményazonosító <input inputMode="numeric" value={eventId} onChange={e=>setEventId(/^[1-9]\d*$/.test(e.target.value)?e.target.value:'')} /></label>{comparison.isLoading?<p>Betöltés…</p>:comparison.error?<p>A V2 összehasonlítás kikapcsolt, nem elérhető, vagy az esemény nem található.</p>:comparison.data?<Comparison value={comparison.data} />:<p>Automatikus igazságnyertes nincs. Csak a meglévő V2-adatokat jelenítjük meg.</p>}</details>
  </section>;
}

function Comparison({value}:{value:unknown}) {
  const envelope=value as {data?:{claims?:unknown[]}};
  const data=envelope?.data;
  if(!data||!Array.isArray(data.claims))return <p>Nincs megfelelő V2 állításadat.</p>;
  return <><p>Forrásokhoz kötött állítások; eltérő érték nem jelent automatikusan ellentmondást. Időbeli hatály és attribúció is számít.</p>{data.claims.map((raw,index)=>{
    const claim=raw as {predicate?:string;observations?:{source?:{name?:string};values?:{value?:unknown;unit?:string}[];temporal?:unknown;attribution?:unknown;evidenceCount?:number;claimIds?:number[]}[]};
    if(!claim || !Array.isArray(claim.observations))return null;
    const observations=claim.observations.filter(o=>o && Array.isArray(o.values)&&o.values.some(v=>v && typeof v.value==='number'));
    if(!observations.length)return null;
    return <div key={index}><h3>{claim.predicate||'Numerikus állítás'}</h3>{observations.map((o,i)=><p key={i}>{o.source?.name||'Ismeretlen'}: {o.values!.map(v=>`${String(v.value)} ${v.unit||''}`).join(', ')} · {o.evidenceCount||0} bizonyíték · állítások: {o.claimIds?.join(', ')}<br/>Időbeli hatály: {JSON.stringify(o.temporal)}<br/>Attribúció: {JSON.stringify(o.attribution)}</p>)}</div>;
  })}</>;
}
