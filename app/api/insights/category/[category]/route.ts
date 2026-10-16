import { NextResponse } from "next/server";
import { securityCheck } from "@/lib/security";
import { snapshotRows } from "@/lib/insights-snapshot";
import { queryOptions, select, buildSnapshot, group } from "@/lib/insights-intelligence";

export async function GET(req: Request, context: {params: Promise<{category:string}>}) {
  const sec=await securityCheck(req); if(sec)return sec;
  try {
    const category=(await context.params).category;
    const params=new URL(req.url).searchParams;
    params.set('category',category);
    const sort=params.get('sort') || 'latest';
    if(!['latest','popular'].includes(sort))throw new Error('invalid_sort');
    const limit=Number(params.get('limit')||20);
    if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw new Error('invalid_limit');
    const options=queryOptions(params);
    const rows=await snapshotRows(options.end,params.has('asOf'));
    const selected=select(rows,options).sort((a:any,b:any)=>(sort==='popular' ? (b.score??0)-(a.score??0) : 0)||b.published-a.published||b.id-a.id);
    const snapshot=buildSnapshot(rows,options);
    const sources=[...group(selected,'source')].map(([source,list])=>({source,count:list.length}));
    const ringSources=sources.map(s=>({name:s.source,label:s.source,count:s.count,percent:selected.length?s.count/selected.length*100:0}));
    const points=snapshot.views.timeseries.categories.flatMap(c=>c.points);
    return NextResponse.json({success:true,window:snapshot.window,quality:snapshot.quality,
      meta:{category,articleCount:selected.length,sourceCount:sources.length,lastUpdated:selected[0]?new Date(selected[0].published).toISOString():null},
      summary:{trendScore:selected.length,trendSeries:points.map(p=>p.count),trendLabels:points.map(p=>p.date)},
      items:selected.slice((options.page-1)*limit,options.page*limit).map((r:any)=>({id:String(r.summaryId||r.id),title:r.title,category:r.category,published_at:new Date(r.published).toISOString(),dominantSource:r.source,sources:1,score:r.score??0,excerpt:r.summaryId?'':'Összefoglaló még nem készült.',href:r.summaryId?`/cikk/${r.summaryId}`:null})),
      sources,ringSources,page:options.page,limit,total:selected.length});
  } catch(error) {
    const message=error instanceof Error?error.message:'';
    return NextResponse.json({success:false,error:message.startsWith('invalid_')||message==='snapshot_expired'?message:'insights_unavailable'},{status:message.startsWith('invalid_')?400:message==='snapshot_expired'?410:503});
  }
}
