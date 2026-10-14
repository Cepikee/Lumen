"use strict";
// Research-only sentence-local attribution grammar. No identity/coreference inference.
const {validAnnotation}=require('./morph-worker-client.cjs');
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const ev=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const reporting=new Set(['mond','közöl','ír','állít','tagad','cáfol','számol']);
function source(raw,ts,a){
  ts=ts.filter(t=>t.pos!=='DET');
  if(!ts.length||ts.some(t=>!['NOUN','PROPN'].includes(t.pos)))return null;
  const head=ts.at(-1);
  if(head.morph.Case!=='Nom')return null;
  const entity=a.entities.find(e=>e.start===ts[0].start&&e.end===head.end&&['PER','ORG'].includes(e.label));
  const possessive=ts.length===2&&head.morph['Person[psor]'];
  if(ts.length>1&&!entity&&!possessive)return null;
  return {mention:raw.slice(ts[0].start,head.end),normalized:ts.map(norm).join(' '),entityId:null,identityStatus:entity?'observed_named_mention':'local_referent',evidenceSpan:ev(raw,ts[0].start,head.end)};
}
function parse(raw,a,s){
  let ts=a.tokens.filter(t=>t.start>=s.start&&t.end<=s.end),edges=[],pending=[];
  const markers=ts.filter(t=>norm(t)==='szerint'||reporting.has(norm(t))||/hivatkoz/u.test(norm(t)));
  if(markers.length<2&&!ts.some(t=>t.morph.Case==='Dat'&&t.pos==='PROPN'))return null;
  if(/[„”"]/u.test(s.text))return {edges:[],reason:'quoted_chain_not_supported'};
  for(let depth=0;depth<5;depth++){
    const i=ts.findIndex(t=>norm(t)==='szerint'||reporting.has(norm(t)));
    if(i<0)break;
    const verb=ts[i],according=norm(verb)==='szerint';
    const conjunction=according?i:ts.findIndex((t,j)=>j>i&&norm(t)==='hogy');
    if(!according&&conjunction<0)break;
    let prefix=ts.slice(0,i),recipient=null,citation=null;
    if(prefix.some(t=>['nem','sem'].includes(norm(t))))return {edges,reason:'negated_reporting_edge'};
    const ci=prefix.findIndex(t=>/hivatkoz/u.test(norm(t)));
    if(ci>=0){
      const target=prefix[ci-1];
      if(!target||target.pos!=='PROPN'||!['Sbl','All'].includes(target.morph.Case))return {edges,reason:'citation_target_unresolved'};
      citation={mention:target.text,normalized:norm(target),entityId:null,identityStatus:'surface_only',evidenceSpan:ev(raw,target.start,target.end)};
      pending=[{source:citation,verb:'hivatkozva',verbSpan:ev(raw,prefix[ci].start,prefix[ci].end)}];
      prefix=prefix.slice(0,ci-1);
    }
    const recipients=ts.slice(0,conjunction).filter(t=>t.pos==='PROPN'&&t.morph.Case==='Dat');
    if(recipients.length>1)return {edges,reason:'recipient_ambiguous'};
    if(!according&&ts.slice(i+1,conjunction).some(t=>t.pos!=='PUNCT'&&!recipients.includes(t)&&!['be'].includes(norm(t))))return {edges,reason:'reporting_tail_unresolved'};
    if(recipients.length){const t=recipients[0];recipient={mention:t.text,normalized:null,role:'recipient/publication',entityId:null,evidenceSpan:ev(raw,t.start,t.end)};prefix=prefix.filter(x=>x!==t);}
    prefix=prefix.filter(t=>!(t.pos==='PRON'&&['azt','arról'].includes(t.text.toLocaleLowerCase('hu'))));
    const src=source(raw,prefix,a);
    if(!src)return {edges,reason:'source_phrase_unresolved'};
    if(norm(verb)==='számol'&&!ts.slice(i+1,conjunction).some(t=>norm(t)==='be'))return {edges,reason:'reporting_predicate_unproven'};
    const start=ts[conjunction+1]?.start;
    if(start==null)return {edges,reason:'proposition_missing'};
    edges.push({source:src,verb:according?'szerint':norm(verb)==='számol'?'beszámol':norm(verb),verbSpan:ev(raw,verb.start,verb.end),recipient,propositionSpan:ev(raw,start,s.end)});
    for(const item of pending)edges.push({...item,recipient:null,propositionSpan:ev(raw,start,s.end)});
    pending=[];ts=ts.slice(conjunction+1);
  }
  if(!edges.length||!ts.length)return null;
  if(ts.some(t=>norm(t)==='szerint')||!ts.some(t=>t.pos==='VERB'))return {edges,reason:'remaining_scope_unresolved'};
  return {edges,start:ts[0].start,end:s.end,reason:null};
}
function bindAttribution(raw,a,core){
  if(!validAnnotation(raw,a))throw Error('invalid_linguistic_annotation');
  const result=core(raw,a);result.attributionChains=[];
  for(let si=0;si<a.sentences.length;si++){
    const s=a.sentences[si],p=parse(raw,a,s);if(!p)continue;
    const chainId=`attribution:${s.start}:${s.end}`;
    const chain={id:chainId,binding:p.reason?'unresolved':'resolved',rule:'explicit_sentence_local_attribution_grammar',unresolvedReasons:p.reason?[p.reason]:[],narration:{kind:'journalist/publisher_narration',publisher:null,evidenceSpan:ev(raw,s.start,s.end)},edges:[]};
    p.edges.forEach((e,i)=>chain.edges.push({...e,id:`${chainId}:${i}`,depth:i,parentAttributionId:i?`${chainId}:${i-1}`:null,targetId:i<p.edges.length-1?`${chainId}:${i+1}`:`${chainId}:proposition`,binding:p.reason?'unresolved':'resolved',rule:'explicit_source_marker_and_complement',role:i===p.edges.length-1?'claim_source':i===0?'outer_reporting_source':'intermediate_attributed_source'}));
    result.attributionChains.push(chain);
    const old=result.frames.filter(f=>f.sentence===si);
    if(p.reason){for(const f of old){f.source=f.reportingActor=f.attribution=null;delete f.sourceEvidence;f.binding='unresolved';f.unresolvedReasons.push(p.reason);f.attributionChainId=chainId;if(p.reason==='negated_reporting_edge'){f.polarity='unresolved';f.status='unconfirmed';}}continue;}
    const annotation={tokens:a.tokens.filter(t=>t.start>=p.start&&t.end<=p.end),entities:a.entities.filter(t=>t.start>=p.start&&t.end<=p.end),sentences:[s]};
    const inner=core(raw,annotation);
    if(!inner.frames.length){chain.binding='unresolved';chain.unresolvedReasons.push('inner_proposition_missing');chain.edges.forEach(e=>e.binding='unresolved');for(const f of old){f.source=f.reportingActor=f.attribution=null;delete f.sourceEvidence;f.binding='unresolved';f.unresolvedReasons.push('inner_proposition_missing');}continue;}
    result.frames=result.frames.filter(f=>f.sentence!==si);
    const denied=p.edges.some(e=>['tagad','cáfol'].includes(e.verb));
    for(const [j,f] of inner.frames.entries()){
      f.sentence=si;f.frameId=`${chainId}:proposition${j?':'+j:''}`;f.attributionChainId=chainId;
      f.claimOwner=p.edges.at(-1).source;
      f.recipient=p.edges.at(-1).recipient||null;
      f.source=f.reportingActor=f.attribution=null;delete f.sourceEvidence;
      f.reportingContext=true;f.status=denied?'denied_claim':'reported_claim';if(denied)f.polarity='denied';
      if(!f.modalities.includes('reported'))f.modalities.push('reported');
      f.modality=denied?'denied_claim':'reported';
      const ts=a.tokens.filter(t=>t.start>=f.content.start&&t.end<=f.content.end);
      const sign=ts.find(t=>norm(t)==='ír'),hire=ts.find(t=>norm(t)==='vesz');
      if(sign&&ts.some(t=>norm(t)==='alá')){f.action='aláír';f.actionSpan=ev(raw,sign.start,sign.end);}
      if(hire&&ts.some(t=>norm(t)==='fel')){f.action='felvesz';f.actionSpan=ev(raw,hire.start,hire.end);}
      // Keep quantified embedded arguments separate from every reporting source.
      for(const n of f.numericArguments){
        const unit=ts.find(t=>t.start>=n.start&&t.end<=n.end+12&&['eurós','dolgozó'].includes(norm(t)));
        if(unit){n.unit=norm(unit)==='eurós'?'EUR':'person';n.semanticKind=n.unit==='EUR'?'money':'count';n.ownerType='semantic_role';n.owner={label:n.semanticKind,evidenceSpan:ev(raw,unit.start,unit.end)};n.subject=null;n.property=n.semanticKind;n.unresolvedReasons=n.unresolvedReasons.filter(r=>!['unit_unresolved','numeric_owner_unresolved','numeric_predicate_attachment_unproven'].includes(r));n.binding=n.unresolvedReasons.length?'unresolved':'resolved';if(n.binding==='resolved')n.bindingEvidence={rule:'explicit_embedded_numeric_unit',numericSpan:n.evidenceSpan,ownerSpan:n.owner.evidenceSpan,clauseSpan:f.content};}
      }
      result.frames.push(f);
    }
    chain.propositionIds=inner.frames.map(f=>f.frameId);
  }
  result.frames.sort((x,y)=>x.evidenceSpan.start-y.evidenceSpan.start);
  return result;
}
module.exports={bindAttribution};
