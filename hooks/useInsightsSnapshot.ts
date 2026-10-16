"use client";
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import type { getInsightsSnapshot } from '@/lib/insights-snapshot';
export type IntelligenceSnapshot = Awaited<ReturnType<typeof getInsightsSnapshot>>;
export async function fetchSnapshot(url: string): Promise<IntelligenceSnapshot> {
  const response=await fetch(url,{cache:'no-store'});
  if(!response.ok)throw new Error(`insights_${response.status}`);
  const data=await response.json();
  const arrays = [data?.highlights, data?.evidence?.items, data?.evidence?.sources,
    data?.movers?.rising, data?.movers?.falling, data?.views?.overview?.categories,
    data?.views?.timeseries?.categories, data?.views?.clickbait?.sources,
    data?.intelligence?.sourceStats, data?.intelligence?.clusters, data?.intelligence?.emerging,
    data?.intelligence?.keywordStates, data?.intelligence?.coverage, data?.v2Events?.items];
  const objects = [data?.window, data?.filters, data?.counts, data?.processing,
    data?.sentimentChange, data?.quality?.summary, data?.quality?.sentiment,
    data?.quality?.clickbait, data?.intelligence?.velocity, data?.intelligence?.diversity];
  if(data?.success!==true || data.contractVersion!=='insights-publication-v1'
    || arrays.some(value=>!Array.isArray(value))
    || objects.some(value=>!value || typeof value!=='object' || Array.isArray(value)))throw new Error('invalid_insights_snapshot');
  return data;
}
export function useInsightsSnapshot() {
  const search=useSearchParams();
  const query=new URLSearchParams();
  query.set('period',search.get('period')||'24h');
  for(const field of ['category','source','keyword','cluster'])if(search.has(field))query.set(field,search.get(field)!);
  return useSWR(`/api/premium-insights/intelligence?${query}`,fetchSnapshot,{keepPreviousData:false,revalidateOnFocus:false,refreshInterval:60000});
}
