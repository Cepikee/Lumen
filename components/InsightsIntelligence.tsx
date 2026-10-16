"use client";
import { useState } from 'react';
import { usePathname,useRouter,useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchSnapshot, type IntelligenceSnapshot } from '@/hooks/useInsightsSnapshot';
import UtomModal from './UtomModal';
import styles from './InsightsDashboard.module.css';

const date=(s:string)=>new Date(s).toLocaleString('hu-HU',{timeZone:'Europe/Budapest'});
export function Quality({value}:{value:{eligible:number;analyzed:number;missing:number;state:string;lowSample:boolean;ageMinutes:number|null}}) {
  return <p className={styles.caption}>{value.analyzed} / {value.eligible} cikk elemzett · {value.missing} hiányzó mérés · {value.state==='complete'?'teljes':value.state==='partial'?'részleges':'nincs mérés'}{value.lowSample?' · Alacsony mintanagyság':''}{value.ageMinutes!==null?` · Utolsó mérés ${value.ageMinutes} perce`:''}</p>;
}
export default function InsightsIntelligence({data,error,loading}:{data?:IntelligenceSnapshot;error?:unknown;loading:boolean}) {
  const router=useRouter(),path=usePathname(),search=useSearchParams();
  const [evidence,setEvidence]=useState<string|null>(null);
  const details=useSWR(evidence,fetchSnapshot,{keepPreviousData:false,revalidateOnFocus:false});
  function filter(field:string,value:string) {const q=new URLSearchParams(search.toString());if(value)q.set(field,value);else q.delete(field);q.delete('page');router.push(`${path}?${q}`,{scroll:false});}
  function inspect(field?:string,value?:string,phase='current') {
    if(!data)return;
    const q=new URLSearchParams({period:data.window.period,asOf:data.window.end,phase});
    for(const [k,v] of Object.entries(data.filters))q.set(k,String(v));
    if(field&&value)q.set(field,value);
    setEvidence(`/api/premium-insights/intelligence?${q}`);
  }
  if(loading)return <p role="status">Összehasonlítható adatok betöltése…</p>;
  if(error||!data)return <p role="alert">Az elemzés nem érhető el. A hiányzó adat nem jelent nulla aktivitást.</p>;
  const change=(m:{absolute:number;percent:number|null;isNew:boolean})=>m.isNew?'Új':`${m.absolute>0?'+':''}${m.absolute} cikk (${m.percent===null?'nincs előzmény':m.percent.toFixed(0)+'%'})`;
  return <section className={styles.intelligence}>
    <div className={styles.card}><h2>Mi változott?</h2><p className={styles.caption}>Publikálás alapján · Budapest · {date(data.window.start)} – {date(data.window.end)} · az előző azonos hosszúságú időszakhoz képest</p>
      <div className={styles.filterRow}><label>Kategória <input aria-label="Kategóriaszűrő" defaultValue={search.get('category')||''} key={'c'+search.get('category')} onBlur={e=>filter('category',e.target.value.trim())} placeholder="pl. Gazdaság" /></label><label>Forrás <input aria-label="Forrásszűrő" defaultValue={search.get('source')||''} key={'s'+search.get('source')} onBlur={e=>filter('source',e.target.value.trim())} placeholder="pl. telex.hu" /></label>{Object.entries(data.filters).map(([k,v])=><button key={k} onClick={()=>filter(k,'')}>{String(v)} ×</button>)}</div>
      {data.highlights.length ? <ul>{data.highlights.map(h=><li key={h.type+h.name}><button onClick={()=>inspect(h.type,h.name)}>{h.name}: {change(h)}</button> · {h.previous} → {h.current} cikk · {h.sources} forrás</li>)}</ul>:<p>Nincs megfelelő mintával alátámasztott kiemelkedő változás.</p>}
      {data.sentimentChange.percentagePoints!==null && <p>Negatív hangulat: {data.sentimentChange.percentagePoints.toFixed(1)} százalékpont változás · {data.sentimentChange.previousSample} → {data.sentimentChange.currentSample} elemzett cikk</p>}
      <Quality value={data.quality.summary}/><button onClick={()=>inspect()}>A {data.counts.current} cikk és a számítás megtekintése</button>
      <p className={styles.caption}>Publikált: {data.processing.published} · feldolgozott: {data.processing.processed} · ebből korábban publikált: {data.processing.olderPublished}. A feldolgozási hullám nem hírfelfutás. A feldolgozási minta legfeljebb 180 napja megjelent cikkekre terjed ki.</p>
    </div>
    <div className={styles.detailsGrid}>{(['rising','falling'] as const).map(direction=><div className={styles.card} key={direction}><h2>{direction==='rising'?'Növekvő':'Visszaeső'} kulcsszavak</h2>{data.movers[direction].length?<ul>{data.movers[direction].slice(0,8).map(m=><li key={m.name}><button onClick={()=>inspect('keyword',m.name,direction==='falling'?'previous':'current')}>{m.name}</button> · {m.previous} → {m.current} · {change(m)} · {m.sources} jelenlegi forrás</li>)}</ul>:<p>Nincs megfelelő mintájú változás.</p>}</div>)}</div>
    <UtomModal show={!!evidence} onClose={()=>setEvidence(null)} title="A mérés mögötti cikkek">
      {details.isLoading?<p>Betöltés…</p>:details.error?<p role="alert">A bizonyítéklista nem érhető el.</p>:details.data&&<>
        <p>{date(new URL(evidence!,'http://local').searchParams.get('phase')==='previous'?details.data.window.previousStart:details.data.window.start)} – {date(new URL(evidence!,'http://local').searchParams.get('phase')==='previous'?details.data.window.start:details.data.window.end)} · publikálási idő · {new URL(evidence!,'http://local').searchParams.get('phase')==='previous'?'Előző időszak (a kezdőpont előtti azonos hosszúságú ablak)':'Jelenlegi időszak'}</p>
        <p>{details.data.evidence.total} cikk · {details.data.evidence.sources.length} forrás. A változás: jelenlegi mínusz előző; relatív változás: különbség / előző.</p>
        <ul>{details.data.evidence.items.map((r:any)=><li key={r.id}>{r.href?<a href={r.href}>{r.title}</a>:<span>{r.title} — összefoglaló még nincs</span>} · {r.source||'Ismeretlen forrás'} · {date(r.publishedAt)}</li>)}</ul>
        <div className={styles.filterRow}>{[-1,1].map(step=><button key={step} disabled={details.data!.evidence.page+step<1||details.data!.evidence.page+step>details.data!.evidence.pages} onClick={()=>{const u=new URL(evidence!,'http://local');u.searchParams.set('page',String(details.data!.evidence.page+step));setEvidence(u.pathname+u.search);}}>{step<0?'Előző':'Következő'}</button>)}</div>
      </>}
    </UtomModal>
  </section>;
}
