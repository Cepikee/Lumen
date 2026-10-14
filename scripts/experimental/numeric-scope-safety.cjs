"use strict";
// Research-only assertion gate. Qualifiers are retained as candidates rather
// than flattened into equalities. This module never promotes an unresolved edge.
const lower = s => String(s || '').toLocaleLowerCase('hu');
const span = (raw,start,end) => ({start,end,textSpan:raw.slice(start,end)});
const verbal = t => t && ['VERB','AUX'].includes(t.pos);
const number = s => Number(s.replace(',','.'));

function guardNumericScope(raw, annotation, result) {
 const map = new Map(annotation.tokens.map(t=>[t.start,t]));
 for (const f of result.frames) {
  const ts=annotation.tokens.filter(t=>t.start>=f.content.start&&t.end<=f.content.end);
  const predicate=map.get(f.actionSpan?.start);
  const path=t=>{
   const edges=[],seen=new Set();
   while(t&&!seen.has(t.start)) {
    seen.add(t.start);const h=map.get(t.headStart);
    if(!h||h.start===t.start||h.start<f.content.start||h.end>f.content.end)break;
    edges.push({relation:t.dep,sourceSpan:span(raw,t.start,t.end),targetSpan:span(raw,h.start,h.end)});
    if(verbal(h)&&h!==predicate&&h.morph?.VerbForm!=='Inf')break;
    t=h;
   }
   return edges;
  };
  // Only the governing predicate and its local auxiliaries/infinitival
  // complement participate. A sibling finite verb must not leak modality.
  const family=ts.filter(t=>t===predicate||verbal(t)&&predicate&&
   ((t.headStart===predicate.start&&['aux','cop','xcomp'].includes(t.dep)&&
     (t.pos==='AUX'||t.morph?.VerbForm==='Inf'))||
    predicate.headStart===t.start&&['aux','cop','xcomp'].includes(predicate.dep)));
  const modal=[];
  const addModal=(kind,t,rule)=>{if(!modal.some(q=>q.kind===kind&&q.evidenceSpan.start===t.start))
   modal.push({kind,rule,evidenceSpan:span(raw,t.start,t.end),dependencyPath:path(t)});};
  for(const t of family) {
   const l=lower(t.lemma),word=lower(t.text);
   const lexicalHat=/^(?:(?:át|be|meg|ki|el|fel|rá|vissza))?hat$/u.test(l);
   // Pot is preferred; the local finite wordform guards parsers which retain
   // -hat/-het in the lemma but incorrectly label its mood indicative.
   if(t.morph?.Mood==='Pot'||/^(?:lehet)(?:ne|nének|nek)?$/u.test(word)||
      !lexicalHat&&verbal(t)&&t.morph?.VerbForm==='Fin'&&/\p{L}{2,}(?:hat|het)(?:ok|ek|om|em|sz|ja|i|unk|ünk|nak|nek|tok|tek|ják|ik|na|ne|ná|né)?$/u.test(word))
    addModal('possible',t,t.morph?.Mood==='Pot'?'potential_morphology':'finite_potential_wordform_candidate');
   if(t.morph?.Mood==='Cnd')addModal('conditional',t,'governing_conditional_morphology');
   if(l==='kell')addModal('required',t,'governing_modal_with_local_complement');
   if(l==='fog'&&t.pos==='AUX'&&family.some(x=>x.morph?.VerbForm==='Inf'))addModal('future',t,'future_auxiliary_infinitive');
  }
  for(const t of ts)if(lower(t.text)==='várhatóan'&&family.some(p=>t.headStart===p.start))addModal('expected',t,'governing_adverbial_modifier');
  if(f.conditionality||f.conditionAntecedent) {
   const t=ts.find(t=>lower(t.text)==='ha');
   if(t)addModal('conditional',t,'clause_condition_marker');
  }
  const conditions=[];
  if(f.conditionality&&f.conditionalTrigger&&raw.slice(f.conditionalTrigger.start,f.conditionalTrigger.end)===f.conditionalTrigger.textSpan){
   const antecedent=result.frames.find(x=>x.conditionAntecedent&&x.conditionalTrigger?.start===f.conditionalTrigger.start);
   conditions.push({kind:'conditional',rule:'inherited_bounded_clause_condition',binding:'scoped',evidenceSpan:f.conditionalTrigger,...(antecedent?{antecedentSpan:antecedent.content}:{})});
  }
  // Nominal condition adjuncts are not finite ha-clauses. Retain their full
  // local subtree; a broken dependency permits only an unresolved candidate.
  for(const t of ts){
   const word=lower(t.text),head=map.get(t.headStart);
   const conditionalHead=word==='esetén'||word==='feltéve'||
    (['között','mellett'].includes(word)&&head&&/^(körülmény|feltétel|terhelés)/u.test(lower(head.lemma)));
   if(!conditionalHead)continue;
   const root=['között','mellett'].includes(word)?head:t;
   const descendants=ts.filter(x=>x===root||path(x).some(e=>e.targetSpan.start===root.start));
   const start=Math.min(t.start,...descendants.map(x=>x.start));
   const end=Math.max(t.end,...descendants.map(x=>x.end));
   const linked=path(root).some(e=>e.targetSpan.start===predicate?.start);
   conditions.push({kind:'conditional',rule:'local_nominal_condition',binding:linked?'scoped':'unresolved',evidenceSpan:span(raw,start,end),dependencyPath:path(root)});
  }
  if(conditions.length&&f.numericArguments.length){
   f.conditionality=true;
   for(const c of conditions)if(!modal.some(m=>m.kind==='conditional'&&m.evidenceSpan.start===c.evidenceSpan.start))modal.push({kind:'conditional',rule:c.rule,evidenceSpan:c.evidenceSpan,dependencyPath:c.dependencyPath||[]});
  }
  if(modal.length) {
   f.semanticScope={modalities:modal,conditions,frameId:f.frameId,clauseSpan:f.content,projectionAllowed:false};
   f.modalities=[...new Set([...(f.modalities||[]).filter(m=>m!=='asserted'),...modal.map(q=>q.kind)])];
   f.modality=modal[0].kind;
   if(modal.some(q=>['possible','conditional'].includes(q.kind)))f.hypotheticalContext=true;
   f.status='qualified_proposition';
  }

  // Ranges are structured candidates, never two independent actual values.
  const ranges=[];
  const rangePattern=/(\d+(?:[,.]\d+)?)\s*(?:[––-]|és)\s*(\d+(?:[,.]\d+)?)(\s+(?:[\p{L}²³]+\s+){0,2}között(?:i)?)?/gu;
  for(const m of raw.slice(f.content.start,f.content.end).matchAll(rangePattern)) {
   if(m[0].includes('és')&&!m[3])continue;
   const start=f.content.start+m.index,end=start+m[0].length;
   // Do not read ISO-like dates, inflections, or identifiers as ranges.
   if(/[\p{L}\d-]/u.test(raw[start-1]||'')||/[\p{L}\d-]/u.test(raw[end]||''))continue;
   const value={lower:number(m[1]),upper:number(m[2])};
   const r={operator:'range',value,validOrder:value.lower<=value.upper,evidenceSpan:span(raw,start,end)};ranges.push(r);
   if(!f.numericArguments.some(n=>n.start<end&&n.end>start))f.numericArguments.push({start,end,raw:raw.slice(start,end),value,unit:null,semanticKind:'unknown',binding:'unresolved',owner:null,ownerType:'unresolved',unresolvedReasons:['range_target_unproven'],evidenceSpan:r.evidenceSpan});
  }
  const sentence=annotation.sentences?.find(s=>s.start<=f.content.start&&s.end>=f.content.end);
  const rangeScope=sentence||f.content;
  for(const re of [/(\d+(?:[,.]\d+)?)-(?:tól|től)\s+(\d+(?:[,.]\d+)?)-ig/gu, /legalább\s+(\d+(?:[,.]\d+)?)(?:\s+[\p{L}²³]+){0,2}\s*,\s*legfeljebb\s+(\d+(?:[,.]\d+)?)/giu]){
   for(const m of raw.slice(rangeScope.start,rangeScope.end).matchAll(re)){
    const start=rangeScope.start+m.index,end=start+m[0].length;
    if(start>=f.content.end||end<=f.content.start)continue;
    const value={lower:number(m[1]),upper:number(m[2])};
    ranges.push({operator:'range',value,validOrder:value.lower<=value.upper,evidenceSpan:span(raw,start,end)});
    if(start>=f.content.start&&end<=f.content.end&&!f.numericArguments.some(n=>n.start<end&&n.end>start))
     f.numericArguments.push({start,end,raw:raw.slice(start,end),value,unit:null,semanticKind:'unknown',binding:'unresolved',owner:null,ownerType:'unresolved',unresolvedReasons:['range_target_unproven'],evidenceSpan:span(raw,start,end)});
   }
  }
  for(const n of f.numericArguments) {
   const original=n.compound?.numerator.evidenceSpan||n.evidenceSpan;
   const token=ts.find(t=>t.start===original.start)||ts.find(t=>t.start>=original.start&&t.end<=original.end&&/\d/u.test(t.text));
   const numericStart=token?.start??original.start;
   const qualifiers=[];
   const add=(operator,s,e,extra={})=>qualifiers.push({operator,evidenceSpan:span(raw,s,e),...extra});
   const prefix=raw.slice(f.content.start,numericStart);
   const pre=prefix.match(/(?:^|\s)(legfeljebb|maximum|legalább|minimum|több mint|kevesebb mint|körülbelül|mintegy|közel|pontosan|akár)\s*$/iu);
   if(pre){const marker=lower(pre[1]);const op={legfeljebb:'less_or_equal',maximum:'maximum',legalább:'greater_or_equal',minimum:'minimum','több mint':'greater_than','kevesebb mint':'less_than',körülbelül:'approximately',mintegy:'approximately',közel:'approximately',pontosan:'equal',akár:'possible_extent'}[marker];
    add(op,numericStart-pre[0].length+pre[0].indexOf(pre[1]),numericStart,{marker});}
   const nodes=new Set([token?.start,...path(token).map(e=>e.targetSpan.start)]);
   for(const t of ts) {
    if(!['ADP','ADV'].includes(t.pos)||!nodes.has(t.headStart))continue;
    const op={képest:'reference',fölött:'greater_than',felett:'greater_than',fölé:'greater_than',felé:'greater_than',alatt:'less_than',alá:'less_than'}[lower(t.text)];
    // "3 órán át/alatt" is duration, not a numeric upper threshold.
    if(op&&!(lower(t.text)==='alatt'&&['duration','calendar_date','year'].includes(n.semanticKind)))add(op,t.start,t.end,{rule:'numeric_head_postposition',dependencyPath:path(t)});
   }
   for(const r of ranges)if(n.start<r.evidenceSpan.end&&n.end>r.evidenceSpan.start)qualifiers.push(r);
   // Surface and parsed dimensional evidence disagree: retain a candidate,
   // do not turn an inflected measurement unit into a counted object.
   const unitToken=ts.find(t=>t.start>=numericStart&&t.start<=original.end&&/^fok(?:hoz|ban|ot|ra|ról|kal|on|nál)?$/iu.test(t.text));
   const dimensionMismatch=unitToken&&n.semanticKind==='count';
   if(dimensionMismatch)add('dimension_unresolved',unitToken.start,unitToken.end,{candidateDimension:'degree_measurement',parsedLemma:unitToken.lemma});
   const unit=ts.find(t=>t.start>=numericStart&&t.end<=n.end&&/^százalék/iu.test(t.text));
   const connected=predicate&&nodes.has(predicate.start);
   const particle=predicate&&ts.find(t=>t.headStart===predicate.start&&t.dep==='compound:preverb');
   const predicateLemma=lower(predicate?.lemma),composed=particle?lower(particle.text)+predicateLemma:predicateLemma;
   const threshold=predicate&&/^(meghalad|elmarad)/u.test(composed);
   if(threshold&&connected){
    const differential=ts.some(t=>t.start>=numericStart&&t.end<=original.end&&t.morph?.Case==='Ins');
    add(differential?'reference':/^meghalad/u.test(composed)?'greater_than':'less_than',predicate.start,predicate.end,{rule:differential?'comparative_difference_target_unproven':'governing_threshold_predicate',dependencyPath:path(token),...(particle?{particleSpan:span(raw,particle.start,particle.end)}:{})});
   }
   if(unit&&predicate&&connected&&/^(nő|növekszik|emelkedik|csökken|esik|bővül|zsugorodik|gyarapodik)$/u.test(lower(predicate.lemma))) {
    const post=ts.find(t=>t.headStart===unit.start&&['fölé','alá'].includes(lower(t.text)));
    const role=unit.morph?.Case==='Ins'?'change_magnitude':unit.morph?.Case==='Sbl'||post?'resulting_level':null;
    if(role)add(role,unit.start,unit.end,{direction:['csökken','esik','zsugorodik'].includes(lower(predicate.lemma))?'decrease':'increase',predicateSpan:f.actionSpan,dependencyPath:path(unit)});
   }
   const comparison=ts.find(t=>lower(t.lemma)==='több'&&t.start<numericStart&&nodes.has(t.headStart));
   if(comparison&&!pre)add('greater_than',comparison.start,comparison.end,{rule:'comparative_numeric_head'});
   const branch=(f.contrasts||result.contrasts||[]).flatMap(c=>['rejected','accepted'].map(k=>({kind:k,value:c[k]}))).find(b=>b.value?.evidenceSpan&&numericStart>=b.value.evidenceSpan.start&&numericStart<b.value.evidenceSpan.end);
   const pendingContrast=(result.contrasts||[]).find(c=>c.binding==='unresolved'&&numericStart>=c.scope.start&&numericStart<c.scope.end);
   const contrastBranch=branch?.kind||(pendingContrast?'unresolved':null);
   const nonEquality=qualifiers.some(q=>q.operator!=='equal');
   const negative=f.polarity!=='asserted';
   const qualified=nonEquality||modal.length>0||negative||f.conditionality||f.conditionAntecedent||branch?.kind==='rejected';
   n.semanticScope={comparison:qualifiers.length?qualifiers:[{operator:'equal',evidenceSpan:original,rule:'unqualified_numeric_candidate'}],modalities:modal,conditions,polarity:f.polarity,conditionality:Boolean(f.conditionality),conditionAntecedent:Boolean(f.conditionAntecedent),contrastBranch,frameId:f.frameId,clauseSpan:f.content,predicateSpan:f.actionSpan,numericDependencyPath:path(token),unconditionalEqualityAllowed:!qualified&&!pendingContrast&&n.binding==='resolved',assertionStatus:qualified||pendingContrast?'qualified_only':'unqualified_candidate',projectionAllowed:false};
   // A resolved attachment may retain a lossless qualified representation.
   // A dimension conflict/reference or range with unproven shared target cannot.
   const unsafePath=n.binding==='resolved'&&!['year','calendar_date','clock_time','duration','ordinal','rank'].includes(n.semanticKind)&&!branch&&!connected;
   const mustAbstain=unsafePath||conditions.some(c=>c.binding==='unresolved')||dimensionMismatch||qualifiers.some(q=>['reference','range'].includes(q.operator))||branch?.kind==='rejected'||pendingContrast;
   if(mustAbstain) {
    n.binding='unresolved';
    n.semanticScope.unconditionalEqualityAllowed=false;
    n.semanticScope.assertionStatus='qualified_only';
    n.unresolvedReasons=[...new Set([...(n.unresolvedReasons||[]),'numeric_semantic_scope_requires_qualified_resolution'])];
    if(n.bindingEvidence)n.bindingEvidence={...n.bindingEvidence,resolutionStatus:'unresolved',attachmentOnly:true};
    f.binding='unresolved';
    f.unresolvedReasons=[...new Set([...(f.unresolvedReasons||[]),'numeric_semantic_scope_unresolved'])];
   }
  }
 }
 // On a contrast the existing binder could not prove, retain branch-local
 // qualifier candidates without inventing acceptance or shared-unit inheritance.
 for(const c of result.contrasts||[])if(c.binding==='unresolved') {
  const candidates=result.frames.flatMap(f=>f.numericArguments).filter(n=>n.start>=c.scope.start&&n.start<c.scope.end);
  if(candidates.some(n=>n.semanticScope.comparison.some(q=>q.operator!=='equal')))
   c.numericScopeCandidates=candidates.map(n=>({value:n.value,binding:'unresolved',evidenceSpan:n.evidenceSpan,semanticScope:n.semanticScope}));
 }
 return result;
}
module.exports={guardNumericScope};
