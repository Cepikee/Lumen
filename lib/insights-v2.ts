import { db } from './db';
import { mysqlUtc } from './business-time';
import { isV2Enabled } from './v2/feature-flags';
type Membership = {eventId:number;articleId:number;status:string};
const cache=new Map<number,Promise<Membership[]>>();
export async function insightsEvents(rows: {id:number;source:string;published:number}[], start:number,end:number) {
  if(!isV2Enabled() || process.env.UTOM_INSIGHTS_V2_EVENTS!=='1')return {enabled:false,reason:'A V2 engedélyezése, a tagsági lefedettség validálása és UTOM_INSIGHTS_V2_EVENTS=1 szükséges.',items:[] as {id:number;status:string;articles:number;sources:number;firstObservedAt:string}[]};
  try {
    let task=cache.get(end);
    if(!task){
      while(cache.size>=4)cache.delete(cache.keys().next().value!);
      task=(async()=>{
        const [result]=await db.query(`SELECT ea.event_id eventId,ea.article_id articleId,e.status
          FROM v2_event_articles ea JOIN v2_events e ON e.id=ea.event_id JOIN articles a ON a.id=ea.article_id
          WHERE a.published_at>=? AND a.published_at<? AND e.status NOT IN ('archived','retracted','expired','superseded')
          ORDER BY ea.event_id,ea.article_id LIMIT 50001`,[mysqlUtc(new Date(end-180*86400000)),mysqlUtc(new Date(end))]);
        const all=result as Membership[];if(all.length>50000)throw Error('capacity');return all;
      })();cache.set(end,task);
    }
    const selected=new Map(rows.filter(r=>r.published>=start&&r.published<end).map(r=>[r.id,r]));
    const events=new Map<number,{status:string;ids:Set<number>;sources:Set<string>;first:number}>();
    for(const m of await task){const a=selected.get(Number(m.articleId));if(!a)continue;const event=events.get(Number(m.eventId))||{status:m.status,ids:new Set<number>(),sources:new Set<string>(),first:a.published};event.ids.add(a.id);if(a.source)event.sources.add(a.source);event.first=Math.min(event.first,a.published);events.set(Number(m.eventId),event);}
    return {enabled:true,reason:null,items:[...events].map(([id,e])=>({id,status:e.status,articles:e.ids.size,sources:e.sources.size,firstObservedAt:new Date(e.first).toISOString()})).sort((a,b)=>b.sources-a.sources||b.articles-a.articles||a.id-b.id)};
  }catch{cache.delete(end);return {enabled:false,reason:'A V2 eseményadat nem teljes vagy nem elérhető.',items:[]};}
}
