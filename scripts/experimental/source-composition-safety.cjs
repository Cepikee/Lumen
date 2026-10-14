"use strict";
// Research-only composition of evidence/report nominals. No identity inference.
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const span=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
// Productive event nominal morphology plus a reporting participle derivation.
// This is a positive construction grammar, not a list of forbidden source words.
const eventNominal=t=>t?.pos==='NOUN'&&(/(?:ás|és)$/u.test(norm(t))||/^(?:be)?számoló$/u.test(norm(t)));
// A positive semantic class only. It licenses nothing without an evidential
// dependency path, a claim frame and an unambiguous possessive NP below.
const informationArtifact=t=>eventNominal(t)||t?.pos==='NOUN'&&/^(árjegyzék|jelentés|közlemény|beszámoló|tájékoztató|dokumentum|adatsor|kimutatás|jegyzőkönyv|közlés|értesülés|nyilatkozat)$/u.test(norm(t));
const reportingVerb=t=>t?.pos==='VERB'&&/^(?:bejelent|mond|elmond|közöl|ír|állít|jelez|tagad|cáfol)$/u.test(norm(t));
function composeSources(raw,a,result){
 const map=new Map(a.tokens.map(t=>[t.start,t]));
 const ref=(head,ts,evidentialCase=null)=>{
  if(!head||!['NOUN','PROPN'].includes(head.pos)||!['Nom','Gen'].includes(head.morph?.Case)||informationArtifact(head))return null;
  const members=[head];
  for(let i=0;i<members.length;i++){
   const h=members[i],children=ts.filter(t=>t.headStart===h.start&&t!==h);
   if(children.some(t=>t.dep==='conj'||t.dep==='case'&&t!==evidentialCase||t.pos==='PRON'))return null;
   for(const t of children.filter(t=>t.dep==='flat:name'||t.dep==='nmod:att'&&h.morph?.['Person[psor]'])){
    if(!['NOUN','PROPN'].includes(t.pos)||informationArtifact(t)||members.includes(t))return null;
    members.push(t);
   }
  }
  members.sort((x,y)=>x.start-y.start);const start=members[0].start,end=members.at(-1).end;
  if(ts.some(t=>t.start>=start&&t.end<=end&&!members.includes(t)&&t.pos!=='DET'))return null;
  if(a.entities.some(e=>e.label==='LOC'&&e.start===start&&e.end===end))return null;
  return {mention:raw.slice(start,end),normalized:members.map(norm).join(' '),start,end,type:'local_source',identityStatus:'observed_local_referent',evidenceSpan:span(raw,start,end)};
 };
 result.reportingNominalRelations=[];
 for(const s of a.sentences){
  const ts=a.tokens.filter(t=>t.start>=s.start&&t.end<=s.end);
  for(const marker of ts.filter(t=>norm(t)==='szerint'||t.text.toLocaleLowerCase('hu')==='alapján')){
   const according=norm(marker)==='szerint';
   const heads=according&&marker.dep==='case'?[map.get(marker.headStart)]:ts.filter(t=>t.headStart===marker.start&&t.dep==='nmod:att');
   if(heads.length!==1||!informationArtifact(heads[0]))continue;
   const nominal=heads[0],governor=map.get(according?nominal.headStart:marker.headStart);
   if(!governor||governor.start<s.start||governor.end>s.end)continue;
   const owners=ts.filter(t=>t.headStart===nominal.start&&['nmod:att','nmod:poss'].includes(t.dep));
   const negated=ts.some(t=>['nem','sem'].includes(norm(t))&&[nominal.start,marker.start,...owners.map(o=>o.start)].includes(t.headStart));
   const nestedTargetIds=(result.attributionChains||[]).filter(c=>(c.edges||[]).some(e=>e.verbSpan?.start===governor.start)).flatMap(c=>c.propositionIds||[]);
   const claimTargets=result.frames.filter(f=>(f.actionSpan?.start===governor.start||nestedTargetIds.includes(f.frameId))&&f.content.start>=s.start&&f.content.end<=s.end);
   const linked=according?nominal.dep==='obl':marker.dep==='obl';
   const claimProven=linked&&['VERB','AUX'].includes(governor.pos)&&governor.start!==nominal.start&&claimTargets.length===1;
   const source=claimProven&&!negated&&nominal.morph?.['Person[psor]']&&owners.length===1?ref(owners[0],ts):null;
   const id=`nominal-source:${nominal.start}`,relation={id,source,reportingNominal:span(raw,nominal.start,nominal.end),markerSpan:span(raw,marker.start,marker.end),predicateSpan:span(raw,governor.start,governor.end),binding:source?'resolved':'unresolved',rule:'possessive_np_event_nominal_evidential_marker',evidenceSpan:span(raw,source?.start??nominal.start,marker.end),dependencyEvidence:[{relation:marker.dep,sourceSpan:span(raw,marker.start,marker.end),targetSpan:span(raw,marker.headStart,map.get(marker.headStart)?.end??marker.end)}],unresolvedReasons:source?[]:['source_bearing_possessor_unproven']};
   if(source)relation.dependencyEvidence.push({relation:owners[0].dep,sourceSpan:source.evidenceSpan,targetSpan:relation.reportingNominal});
   relation.sourceArtifact=relation.reportingNominal;
   relation.claimFrameIds=claimTargets.map(f=>f.frameId);
   relation.rule='possessive_information_artifact_evidential_claim_path';
   relation.dependencyEvidence.push({relation:according?nominal.dep:marker.dep,sourceSpan:according?relation.reportingNominal:relation.markerSpan,targetSpan:relation.predicateSpan});
   if(!claimProven)relation.unresolvedReasons.push('artifact_claim_target_unproven');
   result.reportingNominalRelations.push(relation);
   // Two evidentials on the same claim are ordered, not flattened: an outer
   // according-to source reports an inner artifact's originating entity.
   const outerMarkers=ts.filter(t=>norm(t)==='szerint'&&t.dep==='case'&&t.end<=nominal.start&&t!==marker);
   const outerCandidates=outerMarkers.map(m=>({m,h:map.get(m.headStart)})).filter(x=>x.h?.dep==='obl'&&x.h.headStart===governor.start&&!informationArtifact(x.h));
   if(outerCandidates.length){
    const outerNegated=outerCandidates.some(x=>ts.some(t=>['nem','sem'].includes(norm(t))&&[x.h.start,x.m.start].includes(t.headStart)));
    const outer=outerCandidates.length===1&&!outerNegated?ref(outerCandidates[0].h,ts,outerCandidates[0].m):null;
    const chainId=`artifact-chain:${nominal.start}`,complete=Boolean(outer&&source&&claimProven);
    result.attributionChains.push({id:chainId,binding:complete?'resolved':'unresolved',rule:'outer_evidential_then_possessive_artifact',unresolvedReasons:complete?[]:['ordered_artifact_source_unproven'],edges:[
     {id:chainId+':0',depth:0,parentAttributionId:null,targetId:chainId+':1',source:outer,verbSpan:span(raw,outerCandidates[0].m.start,outerCandidates[0].m.end),binding:outer?'resolved':'unresolved',role:'outer_reporting_source'},
     {id:chainId+':1',depth:1,parentAttributionId:chainId+':0',targetIds:relation.claimFrameIds,source,sourceArtifact:relation.sourceArtifact,reportingNominalRelationId:id,verbSpan:relation.markerSpan,binding:source?'resolved':'unresolved',role:'claim_source'}
    ],propositionIds:relation.claimFrameIds});
   }
   const isNominalSource=r=>r?.evidenceSpan&&r.evidenceSpan.start<=nominal.start&&r.evidenceSpan.end>=nominal.end;
   // Sanitize every source-bearing representation, including old chain edges.
   for(const c of result.attributionChains||[])for(const e of c.edges||[])if(isNominalSource(e.source)){
    e.source=source;e.reportingNominalRelationId=id;e.binding=source?'resolved':'unresolved';
    if(!source){c.binding='unresolved';c.unresolvedReasons=[...new Set([...(c.unresolvedReasons||[]),'source_bearing_possessor_unproven'])];}
   }
   for(const f of result.frames){
    const direct=f.actionSpan?.start===governor.start;
    const bad=isNominalSource(f.source)||isNominalSource(f.claimOwner);
    if(!bad&&!direct)continue;
    // A recovered inner speaker must not be replaced with an outer source.
    if(!bad&&f.source&&!isNominalSource(f.source))continue;
    f.source=f.reportingActor=source;
    if(isNominalSource(f.claimOwner))f.claimOwner=source;
    f.sourceEvidence={rule:relation.rule,sourceSpan:source?.evidenceSpan??null,reportingNominalSpan:relation.reportingNominal,markerSpan:relation.markerSpan,dependencyPath:relation.dependencyEvidence,frameId:f.frameId,resolutionStatus:source?'resolved':'unresolved'};
    f.attribution=source?{label:source.mention,normalized:source.normalized,evidenceSpan:source.evidenceSpan,propositionSpan:f.content}:null;
    f.reportingNominalRelationId=id;
    if(!source){f.binding='unresolved';f.unresolvedReasons=[...new Set([...(f.unresolvedReasons||[]),'source_bearing_possessor_unproven'])];}
   }
   // Keep a nested speaker separately. Only explicit dependency complements
   // license a complete chain; quotations and parser ambiguity remain partial.
   if(reportingVerb(governor)&&!(norm(governor)==='ír'&&ts.some(t=>t.headStart===governor.start&&norm(t)==='alá'))){
    const subjects=ts.filter(t=>t.headStart===governor.start&&t.dep==='nsubj');
    const inner=subjects.length===1?ref(subjects[0],ts):null;
    const complements=ts.filter(t=>t.headStart===governor.start&&/^ccomp/u.test(t.dep)&&['VERB','AUX'].includes(t.pos)&&ts.some(m=>m.headStart===t.start&&m.dep==='mark'&&norm(m)==='hogy'));
    const targets=result.frames.filter(f=>complements.some(p=>f.actionSpan?.start===p.start));
    const negativeReport=ts.some(t=>t.headStart===governor.start&&['nem','sem'].includes(norm(t)));
    const complete=Boolean(source&&inner&&!negativeReport&&complements.length===1&&targets.length===1);
    const recipients=ts.filter(t=>t.headStart===governor.start&&['iobj','obl'].includes(t.dep)&&t.morph?.Case==='Dat');
    const recipient=recipients.length===1?{mention:recipients[0].text,role:'recipient',evidenceSpan:span(raw,recipients[0].start,recipients[0].end)}:null;
    relation.innerSpeaker=inner;relation.claimFrameIds=[...new Set([...relation.claimFrameIds,...targets.map(f=>f.frameId)])];
    // Do not replace an existing correct chain. Its nominal edge was sanitized above.
    if(!(result.attributionChains||[]).some(c=>(c.edges||[]).some(e=>e.verbSpan?.start===governor.start))){
     const chainId=`composed:${nominal.start}`;
     result.attributionChains.push({id:chainId,binding:complete?'resolved':'unresolved',rule:'possessive_report_then_explicit_speaker_complement',unresolvedReasons:complete?[]:['nested_claim_scope_unproven'],edges:[{id:chainId+':0',depth:0,parentAttributionId:null,targetId:chainId+':1',source,reportingNominalRelationId:id,verbSpan:relation.markerSpan,binding:source?'resolved':'unresolved',role:'outer_reporting_source'},{id:chainId+':1',depth:1,parentAttributionId:chainId+':0',targetIds:targets.map(f=>f.frameId),source:inner,recipient,verbSpan:relation.predicateSpan,binding:complete?'resolved':'unresolved',role:'claim_source',dependencyEvidence:[...(inner?[{relation:'nsubj',sourceSpan:inner.evidenceSpan,targetSpan:relation.predicateSpan}]:[]),...complements.map(p=>({relation:p.dep,sourceSpan:span(raw,p.start,p.end),targetSpan:relation.predicateSpan}))]}],propositionIds:targets.map(f=>f.frameId)});
    }
   }
  }
 }
 return result;
}
module.exports={composeSources};
