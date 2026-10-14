"use strict";
// Research-only attribution recovery. Communication vocabulary is a necessary
// semantic guard, never sufficient evidence of a source or complement.
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const span=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const reports=new Set(['mond','elmond','közöl','jelez','állít','tagad','cáfol','ír','hozzátesz']);
function recoverSources(raw,a,result,core){
 if(!a.tokens.length||a.tokens.some(t=>typeof t.dep!=='string'||!Number.isInteger(t.headStart)))return result;
 const map=new Map(a.tokens.map(t=>[t.start,t]));
 const report=t=>reports.has(norm(t))||norm(t)==='tesz'&&a.tokens.some(p=>p.headStart===t.start&&p.dep==='compound:preverb'&&p.text==='hozzá');
 const quotes=[...raw.matchAll(/[„"]([^”"\n]+)[”"]/gu)].map(m=>({start:m.index,end:m.index+m[0].length,content:span(raw,m.index+1,m.index+m[0].length-1)}));
 const nounRef=(h,according=false)=>{
  if(!h||!['NOUN','PROPN'].includes(h.pos)||h.morph.Case!=='Nom')return null;
  if(a.tokens.some(t=>t.headStart===h.start&&(t.dep==='case'&&!(according&&norm(t)==='szerint')||t.dep==='conj')))return null;
  const members=[h,...a.tokens.filter(t=>t.headStart===h.start&&['flat:name','nmod:att'].includes(t.dep)&&['NOUN','PROPN'].includes(t.pos))].sort((x,y)=>x.start-y.start);
  const start=members[0].start,end=members.at(-1).end;
  if(a.tokens.some(t=>t.start>=start&&t.end<=end&&!members.includes(t)&&t.pos!=='DET'))return null;
  return {mention:raw.slice(start,end),normalized:members.map(norm).join(' '),start,end,type:'local_source',entityId:null,identityStatus:'observed_local_referent',evidenceSpan:span(raw,start,end)};
 };
 const sourceOf=v=>{const heads=a.tokens.filter(t=>t.headStart===v.start&&t.dep==='nsubj');return heads.length===1?nounRef(heads[0]):null;};
 const jobs=[];
 for(const q of quotes){
  const container=result.frames.find(f=>f.content.start===q.content.start&&f.content.end===q.content.end);
  if(!container)continue;
  const candidates=a.tokens.filter(t=>t.start>=container.evidenceSpan.start&&t.end<=container.evidenceSpan.end&&(t.end<=q.start||t.start>=q.end)&&report(t));
  if(candidates.length===1){
   const v=candidates[0],bridge=raw.slice(Math.min(v.end,q.end),Math.max(v.start,q.start));
   // A nearby reporting sentence is not automatically the quote's speaker.
   const bounded=v.end<=q.start?/[:]|\bhogy\b/u.test(bridge)&&!/[.!?]/u.test(bridge):/^[\s,–—-]+$/u.test(raw.slice(q.end,v.start))&&/[–—-]/u.test(raw.slice(q.end,v.start));
   if(bounded)jobs.push({v,content:q.content,envelope:container.evidenceSpan,quote:true});
  }
 }
 for(const v of a.tokens.filter(report)){
  if(jobs.some(j=>j.v===v)||quotes.some(q=>v.start>=q.start&&v.end<=q.end))continue;
  const sentence=a.sentences.find(s=>v.start>=s.start&&v.end<=s.end);if(!sentence)continue;
  if(result.attributionChains?.some(c=>c.binding==='resolved'&&c.edges.some(e=>e.verbSpan.start===v.start)))continue;
  // Dependency complement plus an explicit complementizer is mandatory.
  const complements=a.tokens.filter(t=>t.headStart===v.start&&/^(ccomp(?::obj)?|conj|advcl)$/u.test(t.dep)&&a.tokens.some(m=>norm(m)==='hogy'&&m.dep==='mark'&&m.headStart===t.start));
  if(complements.length!==1)continue;
  const p=complements[0],marker=a.tokens.find(m=>norm(m)==='hogy'&&m.dep==='mark'&&m.headStart===p.start);
  if(p.start<=v.start||marker.start<=v.start)continue;
  // Do not flatten nested attribution; existing chain grammar owns that path.
  if(a.tokens.some(t=>t.start>=sentence.start&&t.end<=sentence.end&&t!==v&&(report(t)||norm(t)==='szerint')))continue;
  jobs.push({v,content:span(raw,marker.end,sentence.end),envelope:span(raw,sentence.start,sentence.end),quote:false});
 }
 for(const job of jobs){
  const {v,content,envelope}=job,src=sourceOf(v);
  const sourceNegated=a.tokens.some(t=>t.headStart===v.start&&['nem','sem'].includes(norm(t)));
  if(!src||sourceNegated)continue;
  const innerTokens=a.tokens.filter(t=>t.start>=content.start&&t.end<=content.end);
  if(!innerTokens.some(t=>['VERB','AUX'].includes(t.pos)))continue;
  const inner=core(raw,{tokens:innerTokens,entities:a.entities.filter(e=>e.start>=content.start&&e.end<=content.end),sentences:[{start:content.start,end:content.end,text:content.textSpan}]});
  if(!inner.frames.length)continue;
  const outerMarkers=a.tokens.filter(t=>norm(t)==='szerint'&&t.dep==='case'&&map.get(t.headStart)?.headStart===v.start&&t.start>=envelope.start&&t.end<=v.start);
  const outer=outerMarkers.map(m=>({m,src:nounRef(map.get(m.headStart),true)}));
  if(outer.length>1||outer.some(o=>!o.src))continue;
  const chainId=`recovered-source:${v.start}`,verb=norm(v)==='tesz'?'hozzátesz':norm(v);
  const edge=(source,verb,verbSpan,propositionSpan)=>({source,verb,verbSpan,propositionSpan,recipient:null});
  const edges=[...outer.map(o=>edge(o.src,'szerint',span(raw,o.m.start,o.m.end),span(raw,v.start,envelope.end))),edge(src,verb,span(raw,v.start,v.end),content)];
  const recipients=a.tokens.filter(t=>t.headStart===v.start&&['iobj','obl'].includes(t.dep)&&(t.morph.Case==='Dat'||verb==='közöl'&&t.morph.Case==='Ins'||a.tokens.some(m=>m.headStart===t.start&&m.dep==='case'&&norm(m)==='felé')));
  if(recipients.length===1){const t=recipients[0];edges.at(-1).recipient={mention:t.text,role:'recipient',evidenceSpan:span(raw,t.start,t.end)};}
  const chain={id:chainId,binding:'resolved',rule:'dependency_source_and_explicit_complement_or_bounded_quote',unresolvedReasons:[],edges:edges.map((e,i)=>({...e,id:`${chainId}:${i}`,depth:i,parentAttributionId:i?`${chainId}:${i-1}`:null,targetId:i<edges.length-1?`${chainId}:${i+1}`:`${chainId}:proposition:0`,binding:'resolved',role:i===edges.length-1?'claim_source':'outer_reporting_source',rule:'governing_np_reporting_scope'}))};
  const replacedChains=new Set(result.frames.filter(f=>f.evidenceSpan.start<envelope.end&&f.evidenceSpan.end>envelope.start).map(f=>f.attributionChainId).filter(Boolean));
  result.frames=result.frames.filter(f=>!(f.evidenceSpan.start<envelope.end&&f.evidenceSpan.end>envelope.start));
  result.attributionChains=result.attributionChains.filter(c=>!c.edges.some(e=>e.verbSpan.start===v.start)&&!c.propositionIds?.some(id=>inner.frames.some(f=>f.frameId===id)));
  result.attributionChains=result.attributionChains.filter(c=>!replacedChains.has(c.id)||result.frames.some(f=>f.attributionChainId===c.id));
  for(const [i,f]of inner.frames.entries()){
   f.frameId=`${chainId}:proposition:${i}`;f.sentence=a.sentences.findIndex(s=>content.start>=s.start&&content.start<s.end);f.attributionChainId=chainId;
   f.claimOwner=src;f.source=src;f.reportingActor=src;f.reportingVerb=verb;f.recipient=edges.at(-1).recipient;
   f.sourceEvidence={sourceSpan:src.evidenceSpan,reportingPredicateSpan:span(raw,v.start,v.end),clauseSpan:content,frameId:f.frameId,parentAttributionId:chain.edges.at(-1).id,rule:'governing_np_reporting_scope'};
   f.attribution={label:src.mention,normalized:src.normalized,evidenceSpan:src.evidenceSpan,propositionSpan:content};
   f.reportingContext=true;if(!f.modalities.includes('reported'))f.modalities.push('reported');
   const denied=['tagad','cáfol'].includes(verb);if(denied)f.polarity='denied';f.status=denied?'denied_claim':'reported_claim';f.modality=denied?'denied_claim':'reported';
   f.quoteSpan=job.quote?content:null;result.frames.push(f);
  }
  chain.propositionIds=inner.frames.map(f=>f.frameId);chain.edges.at(-1).targetIds=chain.propositionIds;result.attributionChains.push(chain);
 }
 result.frames.sort((x,y)=>x.evidenceSpan.start-y.evidenceSpan.start);
 return result;
}
module.exports={recoverSources};
