"use strict";
// Research-only loss-prevention gate. No canonical compound schema is assumed.
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const span=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const timeUnits={óra:'hour',perc:'minute',másodperc:'second',nap:'day',hét:'week',hónap:'month',év:'year'};
const periodic={napi:'day',naponta:'day',heti:'week',hetente:'week',havi:'month',havonta:'month',évente:'year'};
function denominator(t){
 const slash=t.text.match(/^([^/\s]+)\/([^/\s-]+)(?:-.*)?$/u);
 if(slash)return {kind:'slash',unit:slash[2],numerator:slash[1]};
 if(t.morph?.Case==='Dis'||/(?:onként|enként|önként|ánként|énként|ónként|őnként)$/u.test(t.text.toLocaleLowerCase('hu'))){
  const lemma=norm(t),stem=lemma.endsWith('ként')?lemma.replace(/(?:onként|enként|önként|nként)$/u,''):lemma;
  return {kind:'distributive',unit:timeUnits[stem]||({kiló:'kg',kilogramm:'kg'})[stem]||stem};
 }
 if(periodic[norm(t)])return {kind:'periodic',unit:periodic[norm(t)]};
 return null;
}
function guardCompoundRates(raw,a,result){
 const map=new Map(a.tokens.map(t=>[t.start,t]));
 for(const f of result.frames){
  const ts=a.tokens.filter(t=>t.start>=f.content.start&&t.end<=f.content.end);
  const ds=ts.map(t=>({token:t,denominator:denominator(t)})).filter(x=>x.denominator);
  for(const m of raw.slice(f.content.start,f.content.end).matchAll(/[\p{L}]{2,}(?:onként|enként|önként|ánként|énként|ónként|őnként)/giu)){
   const start=f.content.start+m.index,end=start+m[0].length;
   if(ds.some(d=>d.token.start===start))continue;
   const token={start,end,text:m[0],lemma:m[0],morph:{Case:'Dis'}};
   ds.push({token,denominator:denominator(token)});
  }
  // A slash dimension remains evidence even when the parser splits or mistags
  // it. Detection is structural, not a list of supported physical units.
  for(const m of raw.slice(f.content.start,f.content.end).matchAll(/([\p{L}%²³]+)\s*\/\s*(?:(\d+)\s*)?([\p{L}²³]+)/gu)){
   const start=f.content.start+m.index,end=start+m[0].length;
   const existing=ds.find(d=>d.token.start>=start&&d.token.start<end);
   if(existing){existing.denominator.scale=m[2]?Number(m[2]):1;existing.denominator.unit=m[3];existing.denominator.numerator=m[1];existing.token={...existing.token,start,end,text:raw.slice(start,end)};continue;}
   const anchor=ts.find(t=>t.start>=start&&t.start<end);
   ds.push({token:{...anchor,start,end,text:raw.slice(start,end)},denominator:{kind:'slash',unit:m[3],numerator:m[1],scale:m[2]?Number(m[2]):1}});
  }
  if(!ds.length)continue;
  const path=t=>{const edges=[],seen=new Set();while(t&&map.has(t.headStart)&&!seen.has(t.start)){seen.add(t.start);const h=map.get(t.headStart);if(h.start===t.start)break;if(h.start<f.content.start||h.end>f.content.end)break;edges.push({relation:t.dep,sourceSpan:span(raw,t.start,t.end),targetSpan:span(raw,h.start,h.end)});t=h;}return edges;};
  const candidates=[...f.numericArguments];
  // Preserve otherwise unrepresented inflected values as unresolved candidates.
  for(const t of ts){const m=t.text.match(/^(\d+(?:[,.]\d+)?)(?:-(?:zal|zel|cal|cel|tal|tel|val|vel))?$/u);if(!m||candidates.some(n=>t.start>=n.start&&t.start<n.end))continue;
   candidates.push({start:t.start,end:t.end,value:Number(m[1].replace(',','.')),unit:null,semanticKind:'unknown',evidenceSpan:span(raw,t.start,t.end),unresolvedReasons:[]});}
  for(const n of candidates){
   if(['calendar_date','clock_time','year','ordinal','rank','age','duration'].includes(n.semanticKind))continue;
   const t=map.get(n.start)||{start:n.start,end:n.end,text:raw.slice(n.start,n.end)};
   const numeratorPath=path(t),nodes=new Set([t.start,...numeratorPath.map(e=>e.targetSpan.start)]);
   // Shared governing structure licenses a candidate, never a positive rate.
   // If multiple quantities share it, each is conservatively unresolved.
   const linked=ds.filter(d=>path(d.token).some(e=>nodes.has(e.sourceSpan.start)||nodes.has(e.targetSpan.start))||nodes.has(d.token.start));
   if(!linked.length){
    // A rate marker in the same frame still forbids silently discarding it.
    // It is retained only as unproven scope, not a resolved semantic edge.
    linked.push(...ds);
   }
   const head=map.get(t.headStart),base=linked.find(d=>d.denominator.kind==='slash')?.denominator.numerator||(['count','person','item'].includes(n.unit)&&head?.pos==='NOUN'?norm(head):n.unit)||(['NOUN','PROPN'].includes(head?.pos)?norm(head):null);
   const qualifying=ts.filter(q=>{
    const l=norm(q);return ['legfeljebb','maximum','legalább','minimum','fölött','felett','alatt','több','kevesebb'].includes(l)||q.morph?.Degree==='Cmp';
   });
   const qualifierItems=qualifying.map(q=>({kind:['legfeljebb','maximum'].includes(norm(q))?'upper_bound':['legalább','minimum','fölött','felett'].includes(norm(q))?'lower_bound':norm(q)==='alatt'?'upper_comparison':'comparative_delta',marker:norm(q),evidenceSpan:span(raw,q.start,q.end),dependencyPath:path(q)}));
   const governing=ts.find(q=>q.start===f.actionSpan?.start);
   if(norm(governing)==='elér'&&f.conditionAntecedent)qualifierItems.push({kind:'threshold',marker:'conditional_reaches',evidenceSpan:span(raw,governing.start,governing.end),dependencyPath:path(governing)});
   const start=Math.min(n.start,...linked.map(d=>d.token.start),...qualifying.map(q=>q.start));
   const end=Math.max(n.end,head&&head.start>t.start&&['NOUN','PROPN'].includes(head.pos)?head.end:n.end,...linked.map(d=>d.token.end),...qualifying.map(q=>q.end));
   n.compound={numerator:{value:n.value,baseUnit:base,originalKind:n.semanticKind,evidenceSpan:n.evidenceSpan},denominators:linked.map(d=>({unit:d.denominator.unit,scale:d.denominator.scale||1,relation:'per',form:d.denominator.kind,evidenceSpan:span(raw,d.token.start,d.token.end),dependencyPath:path(d.token)})),relation:'per',qualifiers:qualifierItems,evidenceSpan:span(raw,start,end),numeratorDependencyPath:numeratorPath,scopeStatus:'candidate_only',frameId:f.frameId};
   n.start=start;n.end=end;n.raw=raw.slice(start,end);n.evidenceSpan=span(raw,start,end);n.unit={numerator:base,denominator:linked.length===1?linked[0].denominator.unit:null};
   n.semanticKind='compound_rate';n.binding='unresolved';n.owner=n.subject=null;n.ownerType='unresolved';delete n.bindingEvidence;
   n.unresolvedReasons=[...(n.unresolvedReasons||[]),'compound_rate_projection_not_supported'];
  }
  f.numericArguments=candidates.sort((x,y)=>x.start-y.start);f.binding='unresolved';f.unresolvedReasons.push('compound_rate_requires_lossless_resolution');
 }
 return result;
}
module.exports={guardCompoundRates};
