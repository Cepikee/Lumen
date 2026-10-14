"use strict";
const {bindTemporal}=require('./temporal-binding.cjs');
const {genericActorLicense}=require('./actor-licensing.cjs');
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const ev=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const words={egy:1,két:2,kettő:2,három:3,négy:4,öt:5};
const scales={ezer:1e3,millió:1e6,milliárd:1e9};
const units={forint:['HUF','money'],forintos:['HUF','money'],euró:['EUR','money'],eurós:['EUR','money'],ember:['person','count'],dolgozó:['person','count'],darab:['item','count'],százalék:['%','percentage'],százalékos:['%','percentage'],év:['year','duration'],éves:['year','age'],hét:['week','duration'],hetes:['week','duration'],nap:['day','duration'],napos:['day','duration'],óra:['hour','duration'],órás:['hour','duration'],kilométer:['km','measurement'],fok:['C','measurement']};
const changeVerbs=new Set(['növel','nő','emel','csökkent','csökken','drágul']);
// Positive semantic classes, not a suffix rule or a location blacklist.
const actorNominals=new Set(['cég','vállalat','egyetem','intézet','rendőrség','minisztérium','vezérigazgató','igazgató','elnök','szóvivő','kutató']);
function bindDependencies(raw,a,result){
 const has=a.tokens.some(t=>t.headStart!==undefined);
 if(!has){
  // Historical morphology-only fixtures are still readable, but cannot be
  // mistaken for dependency-verified output. Explicit correction grammar is
  // separate evidence; all other old bindings are only candidates.
  result.dependencyStatus='unavailable_legacy_morphology';
  result.dependencyVerified=false;
  for(const f of result.frames){
   f.actor=f.subject=null;f.actorStatus='unresolved';delete f.actorEvidence;
   f.binding='unresolved';f.unresolvedReasons.push('dependency_annotation_missing');
   for(const n of f.numericArguments){n.binding='unresolved';n.owner=n.subject=null;n.ownerType='unresolved';delete n.bindingEvidence;n.unresolvedReasons.push('dependency_annotation_missing');}
  }
  return result;
 }
 const entities=a.entities||[];
 const map=new Map(a.tokens.map(t=>[t.start,t]));
 const valid=a.tokens.every(t=>typeof t.dep==='string'&&map.has(t.headStart)&&a.sentences.some(s=>t.start>=s.start&&t.end<=s.end&&t.headStart>=s.start&&t.headStart<s.end));
 result.dependencyStatus=valid?'available':'invalid';result.dependencyVerified=valid;
 function ref(t){const names=a.tokens.filter(x=>x.headStart===t.start&&x.dep==='flat:name');const end=Math.max(t.end,...names.map(x=>x.end));return {mention:raw.slice(t.start,end),normalized:[t,...names].map(norm).join(' '),start:t.start,end,type:t.pos==='PROPN'?'named_referent':'referent',case:t.morph.Case,evidenceSpan:ev(raw,t.start,end)};}
 function path(t,target){const edges=[],seen=new Set();while(t&&t.start!==target.start&&edges.length<8){if(seen.has(t.start)||t.headStart===t.start)return null;seen.add(t.start);const h=map.get(t.headStart);if(!h)return null;edges.push({relation:t.dep,sourceSpan:ev(raw,t.start,t.end),targetSpan:ev(raw,h.start,h.end)});t=h;}return t?.start===target.start?edges:null;}
 function entityType(t){const e=entities.find(e=>t.start>=e.start&&t.end<=e.end);if(!e)return null;if(e.label==='PER')return'person';if(e.label==='ORG')return'organization';return null;}
 function actorLicensed(t,predicate){return Boolean(entityType(t)||actorNominals.has(norm(t))||genericActorLicense(t,predicate,a.tokens));}
 // Validate the existing chain in place; do not infer new edges by proximity.
 for(const chain of result.attributionChains||[]){
  if(chain.binding!=='resolved')continue;
  for(const edge of chain.edges){
   const v=map.get(edge.verbSpan.start),s=edge.source.evidenceSpan;
   const heads=a.tokens.filter(t=>t.start>=s.start&&t.end<=s.end&&!(t.headStart>=s.start&&t.headStart<s.end));
   const h=heads.length===1?heads[0]:null;
   const governed=v&&h&&(edge.verb==='szerint'?v.dep==='case'&&v.headStart===h.start&&h.headStart>=edge.propositionSpan.start&&h.headStart<edge.propositionSpan.end:edge.verb==='hivatkozva'?h.dep==='obl'&&v.dep==='advcl'&&h.headStart===v.headStart:h.dep==='nsubj'&&h.headStart===v.start);
   if(!valid||!governed){edge.binding='unresolved';chain.binding='unresolved';chain.unresolvedReasons.push('source_dependency_unproven');}
   else edge.structuralEvidence={sourceSpan:ev(raw,h.start,h.end),targetSpan:ev(raw,v.start,v.end),relation:h.dep,markerRelation:v.dep,rule:'governing_source_np_and_reporting_scope'};
  }
 }
 for(const f of result.frames){
  f.frameId ||= `dependency:${f.evidenceSpan.start}:${f.evidenceSpan.end}`;
  if(f.attributionChainId&&result.attributionChains.some(c=>c.id===f.attributionChainId&&c.binding!=='resolved')){
   f.source=f.reportingActor=f.attribution=f.claimOwner=null;delete f.sourceEvidence;
   f.unresolvedReasons.push('source_dependency_unproven');f.binding='unresolved';
  }
  if(f.unresolvedReasons.includes('ambiguous_contrast_scope')||f.contrasts?.some(c=>c.binding!=='resolved')){
   f.actor=f.subject=null;f.actorStatus='unresolved';delete f.actorEvidence;
   f.binding='unresolved';f.unresolvedReasons.push('dependency_blocked_by_ambiguous_contrast');
   for(const n of f.numericArguments){n.binding='unresolved';n.owner=n.subject=null;n.ownerType='unresolved';delete n.bindingEvidence;n.unresolvedReasons.push('dependency_blocked_by_ambiguous_contrast');}
   continue;
  }
  const ts=a.tokens.filter(t=>t.start>=f.content.start&&t.end<=f.content.end);
  const predicate=map.get(f.actionSpan?.start);
  const evidence=(t,target,role,edges)=>({sourceSpan:ev(raw,t.start,t.end),targetSpan:ev(raw,target.start,target.end),dependencyPath:edges,frameId:f.frameId,semanticRole:role,resolutionStatus:'resolved',rule:'dependency_path_with_case_and_scope_checks'});
  if(valid&&predicate&&!f.attributionChainId){
   const according=a.tokens.filter(t=>norm(t)==='szerint'&&t.dep==='case'&&map.get(t.headStart)?.headStart===predicate.start);
   if(according.length===1){const s=map.get(according[0].headStart);f.source=ref(s);f.sourceEvidence=evidence(s,predicate,'attribution_source',path(s,predicate));}
  }
  const rejected=f.contrasts?.flatMap(c=>c?.rejected?.evidenceSpan?[c.rejected.evidenceSpan]:[])||[];
  const excluded=t=>rejected.some(s=>t.start>=s.start&&t.end<=s.end);
  const candidates=[];f.syntacticRoles=[];
  if(valid&&predicate)for(const t of ts){
   if(!['NOUN','PROPN','PRON'].includes(t.pos)||excluded(t))continue;
   const markers=a.tokens.filter(x=>x.headStart===t.start&&x.dep==='case');
   let role=markers.some(x=>['számára','részére'].includes(norm(x)))?'recipient':markers.some(x=>norm(x)==='szerint')?'attribution_source':null;
   const head=map.get(t.headStart);
   if(!role&&t.dep==='nmod:att'&&head?.morph['Person[psor]'])role='possessor';
   if(!role&&t.headStart===predicate.start){if(t.dep==='nsubj:pass'||predicate.morph.Voice==='Pass'&&t.dep==='nsubj')role='patient';else if(t.dep==='nsubj'&&t.morph.Case==='Nom'&&!markers.length&&t.pos!=='PRON'&&actorLicensed(t,predicate))role='actor';else if(t.dep.startsWith('obj'))role='object';else if(t.dep==='obl:agent')role='agent';}
   if(!role&&t.dep==='conj'&&t.morph.Case==='Nom'&&!markers.length&&head?.dep==='nsubj'&&head.headStart===predicate.start&&predicate.morph.Voice!=='Pass'&&f.contrasts?.some(c=>c.binding==='resolved'&&['actor','attribution source'].includes(c.slot)&&c.accepted.evidenceSpan.start===t.start&&c.rejected.evidenceSpan.start===head.start)&&actorLicensed(t,predicate))role='actor';
   if(role){const edges=path(t,predicate);f.syntacticRoles.push({role,referent:ref(t),binding:edges?'resolved':'unresolved',evidence:edges?evidence(t,predicate,role,edges):null});if(role==='actor'&&edges)candidates.push(t);}
  }
  f.actor=f.subject=null;f.actorStatus='unresolved';delete f.actorEvidence;
  if(candidates.length===1&&!ts.some(t=>t.dep==='conj'&&t.headStart===candidates[0].start)){f.actor=f.subject=ref(candidates[0]);f.actorStatus='resolved';f.actorEvidence=evidence(candidates[0],predicate,'actor',path(candidates[0],predicate));const license=genericActorLicense(candidates[0],predicate,ts);if(license)f.actorEvidence.semanticLicense=license;}
  else {f.binding='unresolved';f.unresolvedReasons.push(valid?'dependency_actor_ambiguous_or_implicit':'invalid_dependency_graph');}
  if(predicate){const particle=ts.filter(t=>t.headStart===predicate.start&&t.dep==='compound:preverb');if(particle.length===1)f.action=norm(particle[0])+norm(predicate);}
  const numbers=[];
  for(let i=0;i<ts.length;i++){
   const t=ts[i];if(excluded(t))continue;
   const m=t.text.match(/^(\d+(?:[,.]\d+)?)(?:-(ban|ben))?$/u);
   let value=m?Number(m[1].replace(',','.')):words[norm(t)];if(value===undefined||scales[norm(t)])continue;
   let j=i+1;while(scales[norm(ts[j])])value*=scales[norm(ts[j++])];
   let unitToken=ts[j],u=units[norm(unitToken)];
   // The counted head may have intervening adjectives: NUM -> noun is the
   // evidence, not adjacency or membership of a noun whitelist.
   const countedHead=map.get(t.headStart);
   if(!u&&!m?.[2]&&t.dep==='nummod'&&countedHead?.pos==='NOUN'&&ts.includes(countedHead)&&countedHead.start>t.end){unitToken=countedHead;u=units[norm(unitToken)];}
   let kind=m?.[2]?'year':u?.[1]||'unknown',unit=m?.[2]?'year':u?.[0]||null;
   if(!m?.[2]&&!u&&unitToken&&['NOUN','PROPN'].includes(unitToken.pos)&&t.dep==='nummod'){kind='count';unit='count';}
   const end=(u||kind==='count')&&unitToken?unitToken.end:t.end;
   const n={value,canonicalValue:value,unit,semanticKind:kind,start:t.start,end,raw:raw.slice(t.start,end),evidenceSpan:ev(raw,t.start,end),owner:null,ownerType:'unresolved',subject:null,binding:'unresolved',unresolvedReasons:[]};
   let target=null,edges=null;
   if(valid&&predicate&&kind==='age'&&unitToken&&t.headStart===unitToken.start){const h=map.get(unitToken.headStart);if(h&&unitToken.dep.startsWith('amod')&&ts.includes(h)){
    const person=h.pos==='PROPN'&&entities.some(e=>e.label==='PER'&&h.start>=e.start&&h.end<=e.end)||['férfi','nő','ember','gyerek','gyermek','fiú','lány'].includes(norm(h));
    if(person){target=h;edges=path(t,h);} else if(['büntetés','szerződés','futamidő','szabadságvesztés','időtartam'].includes(norm(h))){kind=n.semanticKind='duration';target=h;edges=path(t,h);}
   }}
   else if(valid&&predicate&&kind!=='unknown'){
    const route=path(t,predicate);
    const permitted=route&&route.length&&route.every(e=>/^(nummod|amod:att|compound|nmod:att|obj(?::lvc)?|obl|nsubj(?::pass)?)$/u.test(e.relation));
    if(permitted&&route.every(e=>e.sourceSpan.start>=f.content.start)){
     if(kind==='year'){target=predicate;edges=route;}
     else if(u&&unitToken&&path(t,unitToken)){
      target=unitToken;edges=route;
      const h=map.get(unitToken.headStart);
      if(h&&h.start!==predicate.start&&['NOUN','PROPN'].includes(h.pos))target=h;
     }
     else if(kind==='count'&&unitToken&&path(t,unitToken)){target=unitToken;edges=route;}
    }
   }
   const changeMagnitude=kind==='percentage'&&unitToken?.morph.Case==='Ins'&&predicate&&changeVerbs.has(norm(predicate));
   if(target&&edges){
    n.owner=ref(target);n.ownerType=kind==='age'?'entity':'semantic_argument';n.property=kind==='percentage'?changeMagnitude?'change_magnitude':norm(unitToken)==='százalékos'?'share':'percentage':kind==='count'?unit==='person'?'headcount':'count':kind;n.subject=kind==='age'?n.owner:null;n.binding='resolved';n.bindingEvidence=evidence(t,target,n.semanticKind,edges);
   }
   else n.unresolvedReasons.push('dependency_numeric_attachment_unproven');
   numbers.push(n);i=j-(u?0:1);
  }
  const corrected=f.numericArguments.filter(n=>n.contrastFrameId);
  for(const n of corrected){
   const t=map.get(n.start),route=t&&predicate&&path(t,predicate);
   const c=f.contrasts.find(c=>c.frameId===n.contrastFrameId);
   const temporalProof=['calendar_date','rank'].includes(n.semanticKind)?bindTemporal(raw,a,f).find(x=>x.start===n.start&&x.end===n.end):null;
   const allowed=valid&&route?.length&&route.every(e=>/^(conj|nummod|amod:att|compound|nmod:att|obj(?::lvc)?|obl|nsubj(?::pass)?)$/u.test(e.relation))&&c?.binding==='resolved'&&(n.semanticKind!=='calendar_date'||temporalProof?.binding==='resolved');
   if(temporalProof)n.temporalRole=temporalProof.temporalRole;
   if(n.semanticKind==='rank'&&valid&&temporalProof?.binding==='resolved'){n.owner=temporalProof.owner;n.ownerType=temporalProof.ownerType;n.bindingEvidence=temporalProof.bindingEvidence;}
   else if(n.semanticKind!=='rank'&&allowed&&n.binding==='resolved')n.bindingEvidence={...evidence(t,predicate,n.semanticKind,route),syntacticReason:'parallel_alternatives_single_finite_predicate'};
   else {n.binding='unresolved';n.owner=n.subject=null;n.ownerType='unresolved';delete n.bindingEvidence;n.unresolvedReasons.push('accepted_contrast_dependency_unproven');}
  }
  f.numericArguments=corrected.length?[...corrected,...numbers.filter(n=>!corrected.some(c=>n.start>=c.start&&n.start<c.end))]:numbers;
  if(valid){const temporal=bindTemporal(raw,a,f).filter(n=>!rejected.some(s=>n.start<s.end&&n.end>s.start)&&!corrected.some(c=>n.start<c.end&&n.end>c.start));f.numericArguments=[...f.numericArguments.filter(n=>!temporal.some(t=>n.start<t.end&&n.end>t.start)),...temporal].sort((x,y)=>x.start-y.start);}
  if(!valid)for(const n of f.numericArguments){n.binding='unresolved';n.owner=n.subject=null;delete n.bindingEvidence;n.unresolvedReasons.push('invalid_dependency_graph');}
  if(f.numericArguments.some(n=>n.binding==='unresolved')){f.binding='unresolved';f.unresolvedReasons.push('dependency_numeric_unresolved');}
 }
 return result;
}
module.exports={bindDependencies};
