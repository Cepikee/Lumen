import { validateHistory, type TrendHistory } from "./trend-intelligence";
export type TrendScope = { period:string;sources:string[];categories:string[];startDate?:string;endDate?:string;asOf?:string };
const cache = new Map<string,{expires:number;data:TrendHistory}>();
export function intelligenceParams(scope:TrendScope, keyword?:string,category?:string) {
  const q = new URLSearchParams({contract:"v2",period:scope.period});
  if(keyword) q.set("keyword",keyword);
  if(category!==undefined) q.set("category",category);
  if(scope.sources.length) q.set("sources",scope.sources.join(","));
  if(scope.categories.length) q.set("categories",scope.categories.join(","));
  if(scope.period==="custom") {q.set("startDate",scope.startDate??"");q.set("endDate",scope.endDate??"");}
  if(scope.asOf) q.set("asOf",scope.asOf);
  return q;
}
export async function loadTrendHistory(scope:TrendScope,keyword:string,category:string,signal:AbortSignal) {
  const url = `/api/trend-history?${intelligenceParams(scope,keyword,category)}`;
  const cached=cache.get(url);
  if(cached && cached.expires>Date.now()) {signal.throwIfAborted();return cached.data;}
  const response=await fetch(url,{signal,cache:"no-store"});
  if(!response.ok) throw new Error(`history_http_${response.status}`);
  const data=validateHistory(await response.json()); signal.throwIfAborted();
  if(data.keyword.toLocaleLowerCase("hu-HU")!==keyword.toLocaleLowerCase("hu-HU") || data.category?.toLocaleLowerCase("hu-HU")!==category.toLocaleLowerCase("hu-HU")) throw new Error("history_identity_mismatch");
  if(cache.size>=64) cache.delete(cache.keys().next().value!);
  cache.set(url,{data,expires:Date.now()+30000});return data;
}
export async function loadVisibleHistories<T>(items:T[],signal:AbortSignal,load:(item:T)=>Promise<void>) {
  let index=0;
  await Promise.all(Array.from({length:Math.min(3,items.length)},async()=>{
    while(!signal.aborted && index<items.length) {const item=items[index++];await load(item);}
  }));
}
