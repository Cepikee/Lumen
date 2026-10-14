"use strict";
// Research-only, same-predicate alternatives. No canonical writes.
const span = (raw,start,end) => ({start,end,textSpan:raw.slice(start,end)});
const norm = t => String(t?.lemma || t?.text || '').toLocaleLowerCase('hu');
const finite = t => ['VERB','AUX'].includes(t.pos) && t.morph.VerbForm === 'Fin';
const scales = {ezer:1e3,millió:1e6,milliárd:1e9};
const units = {forint:'HUF',euró:'EUR',ember:'person',állás:'job',darab:'item',doboz:'box',százalék:'%',kilométer:'km',méter:'m'};
const reports = new Set(['mond','közöl','állít','ír','jelent']);
const {validAnnotation}=require('./morph-worker-client.cjs');
const {calendar,ordinalValue}=require('./temporal-binding.cjs');
function numeric(ts) {
  if(ts.length===1&&ordinalValue(ts[0])!==undefined)return {value:ordinalValue(ts[0]),ordinal:true,scale:1,unit:'position',year:false,case:ts[0].morph.Case};
  const date=calendar(ts);if(date&&date.valid&&date.length===ts.length)return {value:date.value,calendar:true,scale:1,unit:'calendar',year:false,case:date.head.morph.Case};
  const m = ts[0]?.text.match(/^(\d+(?:[,.]\d+)?)(?:-(ban|ben))?$/u);
  if (!m) return null;
  let i=1, scale=1;
  if (scales[norm(ts[i])]) scale=scales[norm(ts[i++])];
  let unit=units[norm(ts[i])]; const unitToken=ts[i]; if (unit) i++;
  else if(ts[i]?.pos==='NOUN'&&!['év','hét','nap','óra','perc','másodperc','liter','kilogramm','fok','százalékpont'].includes(norm(ts[i]))&&(ts[0].dep==='conj'||['nummod','amod:att'].includes(ts[0].dep)&&ts[0].headStart===ts[i].start)){
    // Generic counted noun; dependency layer must prove the accepted route.
    unit='count';i++;
  }
  // A denomination can modify an explicit measured target, e.g. HUF support.
  // Keep only one governed nominal; unrelated trailing material still abstains.
  if(i===ts.length-1&&unitToken&&['HUF','EUR'].includes(unit)&&unitToken.dep==='nmod:att'&&unitToken.headStart===ts[i].start&&ts[i].pos==='NOUN'&&['obj','obl'].includes(ts[i].dep))i++;
  if (i!==ts.length) return null;
  return {value:Number(m[1].replace(',','.'))*scale,scale,unit:unit||null,year:Boolean(m[2]),case:ts.at(-1).morph.Case};
}
function nominal(ts,a) {
  const words=ts.filter(t=>t.pos!=='DET');
  if (!words.length || words.some(t=>!['PROPN','NOUN'].includes(t.pos)||t.morph['Person[psor]'])) return null;
  const entity=a.entities.find(e=>e.start===words[0].start&&e.end===words.at(-1).end&&['PER','ORG'].includes(e.label));
  if (!entity && words.length!==1) return null;
  const cases=new Set(words.map(t=>t.morph.Case));
  if (cases.size!==1 || !['Nom','Acc'].includes(words.at(-1).morph.Case)) return null;
  return {value:words.map(norm).join(' '),case:words.at(-1).morph.Case};
}
function restoreEvidence(value,raw) {
  if (!value || typeof value!=='object') return;
  if (typeof value.textSpan==='string') value.textSpan=raw.slice(value.start,value.end);
  for (const child of Object.values(value)) restoreEvidence(child,raw);
}
function bindContrasts(raw,a,core) {
  if(!validAnnotation(raw,a))throw Error('invalid_linguistic_annotation');
  const plans=[];
  for (const s of a.sentences) {
    const ts=a.tokens.filter(t=>t.start>=s.start&&t.end<=s.end);
    const hs=ts.filter(t=>norm(t)==='hanem'), ns=ts.filter(t=>norm(t)==='nem');
    if (!hs.length || !ns.length) continue;
    const p={sentence:s,binding:'unresolved',reason:'ambiguous_contrast_scope'}; plans.push(p);
    const verbs=ts.filter(finite);
    if (hs.length!==1 || ns.length!==1 || verbs.length!==1 || verbs[0].morph.Voice==='Pass' || /[„”"]/u.test(s.text)) continue;
    const h=hs[0], n=ns[0], v=verbs[0];
    if (!(n.end<h.start&&h.end<v.start) || ts.some(t=>['ha','amennyiben','hogy','de','és','vagy'].includes(norm(t)))) continue;
    const left=ts.filter(t=>t.start>=n.end&&t.end<=h.start&&t.text!==',');
    const right=ts.filter(t=>t.start>=h.end&&t.end<=v.start);
    if (!left.length || !right.length) continue;
    let x=numeric(left), y=numeric(right), slot;
    if(x&&y) {
      if(Boolean(x.ordinal)!==Boolean(y.ordinal)||Boolean(x.calendar)!==Boolean(y.calendar)||x.year!==y.year || x.unit&&x.unit!==y.unit || !y.year&&!y.unit) continue;
      if(x.ordinal){if(v.dep!=='cop'||v.headStart!==right[0].start)continue;slot='rank';}
      else if(x.calendar){if(x.case!==y.case)continue;slot='date/time';}
      else if(x.year) {if(x.value<1000||y.value<1000||x.value>9999||y.value>9999)continue;slot='date/time';}
      else {
        if(!x.unit){if(x.scale===1){x.value*=y.scale;x.scale=y.scale;}x.unit=y.unit;}
        slot=['HUF','EUR'].includes(y.unit)?'amount':'number';
      }
    } else {
      x=nominal(left,a);y=nominal(right,a);
      if(!x||!y||x.case!==y.case)continue;
      slot=x.case==='Acc'?'object':reports.has(norm(v))?'attribution source':'actor';
      // "írta alá" is signing, not a reporting source.
      if(slot==='attribution source'&&norm(v)==='ír'&&ts.some(t=>norm(t)==='alá'))slot='actor';
    }
    Object.assign(p,{binding:'resolved',reason:'parallel_alternatives_single_finite_predicate',slot,n,h,v,
      rejected:{...x,status:'rejected',evidenceSpan:span(raw,left[0].start,left.at(-1).end)},
      accepted:{...y,status:'accepted',evidenceSpan:span(raw,right[0].start,right.at(-1).end)}});
  }
  if(!plans.length)return core(raw,a);
  let masked=raw;
  for(const p of plans.filter(p=>p.binding==='resolved'))masked=masked.slice(0,p.n.start)+' '.repeat(p.h.end-p.n.start)+masked.slice(p.h.end);
  const annotation={...a,tokens:a.tokens.filter(t=>masked.slice(t.start,t.end).trim()),entities:a.entities.filter(e=>masked.slice(e.start,e.end)===e.text),sentences:a.sentences.map(s=>({...s,text:masked.slice(s.start,s.end)}))};
  const out=core(masked,annotation);restoreEvidence(out,raw);
  out.contrasts=[];
  for(const p of plans){
    let frames=out.frames.filter(f=>f.evidenceSpan.start>=p.sentence.start&&f.evidenceSpan.end<=p.sentence.end);
    // A year-leading masked sentence can be mistaken for publication metadata
    // by the legacy segmenter. Recover only its original explicit predicate.
    if(!frames.length&&p.binding==='resolved'&&p.slot==='date/time'){
      frames=core(raw,a).frames.filter(f=>f.actionSpan?.start===p.v.start);
      out.frames.push(...frames);
    }
    const contrast={binding:p.binding,rule:p.reason,slot:p.slot||null,evidenceSpan:span(raw,p.sentence.start,p.sentence.end),scope:{start:p.sentence.start,end:p.sentence.end},rejected:p.rejected||null,accepted:p.accepted||null};
    out.contrasts.push(contrast);
    if(p.binding!=='resolved'||frames.length!==1){
      contrast.binding='unresolved';
      for(const f of frames){f.binding='unresolved';f.unresolvedReasons.push('ambiguous_contrast_scope');f.actor=f.subject=f.source=f.reportingActor=f.attribution=null;f.actorStatus='unresolved';delete f.actorEvidence;delete f.sourceEvidence;for(const n of f.numericArguments){n.binding='unresolved';n.owner=n.subject=null;n.ownerType='unresolved';delete n.bindingEvidence;n.unresolvedReasons.push('ambiguous_contrast_scope');}}
      continue;
    }
    const f=frames[0];f.contrasts=[contrast];f.polarity='asserted';contrast.frameId=`contrast:${p.sentence.start}:${p.sentence.end}`;
    f.frameId=contrast.frameId;
    if(p.rejected.unit)contrast.rejected.unitEvidence=p.accepted.evidenceSpan;
    if((p.slot==='actor'&&!f.actor)||(p.slot==='attribution source'&&!f.source)){
      contrast.binding='unresolved';f.binding='unresolved';f.unresolvedReasons.push('contrast_role_unresolved');continue;
    }
    if(norm(p.v)==='ír'&&a.tokens.some(t=>t.start>=p.v.end&&t.end<=p.sentence.end&&norm(t)==='alá')){
      f.action='aláír'; f.source=f.reportingActor=f.attribution=null; f.reportingVerb=null; f.reportingContext=false;
      delete f.sourceEvidence; f.modalities=f.modalities.filter(m=>m!=='reported');if(!f.modalities.length)f.modalities=['asserted'];f.modality=f.modalities[0];
    }
    if(['number','amount','date/time','rank'].includes(p.slot)){
      const ev=p.accepted.evidenceSpan;
      f.numericArguments=f.numericArguments.filter(n=>n.start<ev.start||n.start>=ev.end);
      f.numericArguments.push({value:p.accepted.value,canonicalValue:p.accepted.value,unit:p.accepted.unit,semanticKind:p.slot==='rank'?'rank':p.accepted.calendar?'calendar_date':p.slot==='amount'?'money':p.slot==='date/time'?'year':p.accepted.unit==='%'?'percentage':['km','m'].includes(p.accepted.unit)?'measurement':'count',status:'accepted',binding:'resolved',ownerType:'semantic_role',owner:{label:p.slot,evidenceSpan:ev},subject:null,property:p.slot,unresolvedReasons:[],start:ev.start,end:ev.end,raw:ev.textSpan,evidenceSpan:ev,bindingEvidence:{rule:p.reason,clauseSpan:contrast.evidenceSpan,predicateSpan:f.actionSpan,ownerSpan:ev},contrastFrameId:contrast.frameId});
      f.unresolvedReasons=f.unresolvedReasons.filter(r=>r!=='numeric_binding_unresolved');
    }
    f.binding=f.unresolvedReasons.length?'unresolved':'resolved';
  }
  out.frames.sort((x,y)=>x.evidenceSpan.start-y.evidenceSpan.start);
  return out;
}
module.exports={bindContrasts};
