"use strict";
// Research-only local temporal/ordinal arguments. Lexical maps decode values;
// dependency and case evidence, not these maps alone, license a binding.
const norm=t=>String(t?.lemma||t?.text||'').toLocaleLowerCase('hu');
const months=Object.fromEntries('január február március április május június július augusztus szeptember október november december'.split(' ').map((x,i)=>[x,i+1]));
const weekdays='hétfő kedd szerda csütörtök péntek szombat vasárnap'.split(' ');
const card={egy:1,két:2,kettő:2,három:3,négy:4,öt:5,hat:6,hét:7,nyolc:8,kilenc:9,tíz:10};
const ord={első:1,második:2,harmadik:3,negyedik:4,ötödik:5,hatodik:6,hetedik:7,nyolcadik:8,kilencedik:9,tizedik:10};
const durationUnits={év:'year',hét:'week',nap:'day',óra:'hour',perc:'minute'};
const ev=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const number=t=>/^\d+$/u.test(t?.text||'')?Number(t.text):card[norm(t)];
const ordinalValue=t=>t?.morph.NumType==='Ord'?(ord[norm(t)]??(/^\d+\.$/u.test(t.text)?Number(t.text.slice(0,-1)):undefined)):undefined;
function calendar(ts){
 let i=0,year=null;
 if(/^\d{4}\.?$/u.test(ts[0]?.text||'')&&months[norm(ts[1])])year=Number(ts[i++].text.replace('.',''));
 const monthToken=ts[i],month=months[norm(monthToken)];if(!month)return null;i++;
 let day=null,part=null,head=monthToken;
 const d=ts[i]?.text.match(/^(\d{1,2})(?:\.|-(?:án|én|ig))$/u);
 if(d){day=Number(d[1]);head=ts[i++];}
 else if(['eleje','vég'].includes(norm(ts[i]))){part=norm(ts[i])==='vég'?'end':'start';head=ts[i++];}
 const max=day==null?31:new Date(Date.UTC(year||2000,month,0)).getUTCDate();
 return {value:{year,month,day,part},head,start:ts[0].start,end:head.end,length:i,valid:(!year||year>0)&&(!day||day<=max)&&day!==0,monthToken,yearToken:year?ts[0]:null};
}
function bindTemporal(raw,a,f){
 const ts=a.tokens.filter(t=>t.start>=f.content.start&&t.end<=f.content.end),map=new Map(a.tokens.map(t=>[t.start,t]));
 const predicate=map.get(f.actionSpan?.start),out=[];
 const children=t=>a.tokens.filter(x=>x.headStart===t.start&&x.start!==t.start);
 function route(t,ordinalTarget=false){
  if(!predicate)return null;const seen=new Set(),edges=[];
  while(t&&t.start!==predicate.start&&edges.length<8){
   if(seen.has(t.start))return null;seen.add(t.start);
   if(predicate.dep==='cop'&&predicate.headStart===t.start){edges.push({relation:'cop:reverse',sourceSpan:ev(raw,t.start,t.end),targetSpan:ev(raw,predicate.start,predicate.end)});return edges;}
   const h=map.get(t.headStart);if(!h||h.start===t.start||h.start<f.content.start||h.end>f.content.end||!(/^(amod:att|nmod:att|nummod|obl|obj(?::lvc)?|xcomp)$/u.test(t.dep)||ordinalTarget&&t.pos==='NOUN'&&t.dep==='nsubj'&&h.start===predicate.start))return null;
   edges.push({relation:t.dep,sourceSpan:ev(raw,t.start,t.end),targetSpan:ev(raw,h.start,h.end)});t=h;
  }
  return t?.start===predicate.start?edges:null;
 }
 function add(start,end,value,kind,unit,head,proved,role,extra=[]){
  const path=route(head,kind==='ordinal'),resolved=Boolean(proved&&path?.length);
  out.push({start,end,raw:raw.slice(start,end),value,canonicalValue:value,semanticKind:kind,unit,property:role||kind,temporalRole:role||null,evidenceSpan:ev(raw,start,end),binding:resolved?'resolved':'unresolved',ownerType:resolved?'semantic_argument':'unresolved',owner:resolved?{mention:raw.slice(head.start,head.end),evidenceSpan:ev(raw,head.start,head.end)}:null,subject:null,unresolvedReasons:resolved?[]:['temporal_role_or_attachment_unproven'],...(resolved?{bindingEvidence:{sourceSpan:ev(raw,start,end),targetSpan:ev(raw,predicate.start,predicate.end),dependencyPath:[...extra,...path],frameId:f.frameId,semanticRole:role||kind,resolutionStatus:'resolved',rule:'local_temporal_case_and_governing_structure'}}:{})});
 }
 for(let i=0;i<ts.length;i++){
  const t=ts[i],date=calendar(ts.slice(i));
  if(date){
   const links=[date.monthToken,date.yearToken].filter(x=>x&&x.start!==date.head.start);
   const linkOK=links.every(x=>x.headStart===date.head.start||x.headStart===date.monthToken.start);
   const suffix=['Sup','Ter','Ine'].includes(date.head.morph.Case),cop=predicate?.dep==='cop'&&predicate.headStart===date.head.start;
   add(date.start,date.end,date.value,'calendar_date','calendar',date.head,date.valid&&linkOK&&(suffix||cop),date.head.morph.Case==='Ter'?'boundary':'date',links.map(x=>({relation:x.dep,sourceSpan:ev(raw,x.start,x.end),targetSpan:ev(raw,map.get(x.headStart).start,map.get(x.headStart).end)})));
   i+=date.length-1;continue;
  }
  if(weekdays.includes(norm(t))&&t.morph.Case==='Ter'){add(t.start,t.end,{weekday:norm(t)},'calendar_date','calendar',t,true,'boundary');continue;}
  const clock=t.text.match(/^(\d{1,2}):(\d{2})-(kor|ig)$/u);
  if(clock){add(t.start,t.end,{hour:Number(clock[1]),minute:Number(clock[2])},'clock_time','clock',t,Number(clock[1])<24&&Number(clock[2])<60&&['Tem','Ter'].includes(t.morph.Case),clock[3]==='ig'?'boundary':'time');continue;}
  const value=number(t),u=ts[i+1],unit=durationUnits[norm(u)];
  if(value!==undefined&&unit){
   const markers=children(u).filter(x=>x.dep==='case'&&['át','keresztül','alatt'].includes(norm(x)));
   const local=t.headStart===u.start&&['nummod','amod:att'].includes(t.dep);
   const opening=predicate&&norm(predicate)==='tart'&&children(predicate).some(x=>norm(x)==='nyitva'&&x.dep.startsWith('advmod'));
   if(unit==='hour'&&(u.morph.Case==='Tem'||u.morph.Case==='Ter'&&opening))add(t.start,u.end,{hour:value,minute:0},'clock_time','clock',u,local&&value>=0&&value<24,u.morph.Case==='Ter'?'boundary':'time');
   else {const terminative=u.morph.Case==='Ter'||/ig$/u.test(u.text);const durationSubject=predicate&&children(predicate).some(x=>x.dep==='nsubj'&&['késés','időtartam'].includes(norm(x)));const duration=markers.length===1||terminative&&(unit!=='hour'||norm(predicate)==='tart'&&durationSubject&&!opening);add(t.start,Math.max(u.end,...markers.map(x=>x.end)),value,'duration',unit,u,local&&duration,'duration');}
   i++;continue;
  }
  const compound=norm(t).match(/^(egy|két|három|négy|öt|hat|hét|nyolc|kilenc|tíz)(órás|napos|hetes)$/u);
  if(compound){add(t.start,t.end,card[compound[1]],'duration',{órás:'hour',napos:'day',hetes:'week'}[compound[2]],t,t.dep==='amod:att'&&map.get(t.headStart)?.pos==='NOUN','duration');continue;}
  const ordinal=ordinalValue(t);
  if(ordinal!==undefined){
   const h=map.get(t.headStart),advance=norm(predicate)==='lép'&&h?.morph.Case==='Sbl'&&children(predicate).some(x=>norm(x)==='előre'&&x.dep==='compound:preverb');
   const explicit=h&&norm(h)==='hely'&&(['végez','szerez','áll'].includes(norm(predicate))||advance)&&['obl','obj'].includes(h.dep);
   const corrected=f.contrasts?.find(c=>c.binding==='resolved'&&c.slot==='rank'&&c.accepted.evidenceSpan.start===t.start&&t.dep==='conj'&&t.headStart===c.rejected.evidenceSpan.start);
   const subjectHead=corrected?map.get(t.headStart):t;
   const subjects=ts.filter(x=>x.dep==='nsubj'&&x.headStart===(explicit?predicate?.start:subjectHead.start)&&x.morph.Case==='Nom'&&!children(x).some(z=>z.dep==='case'));
   const unique=subjects.length===1&&!ts.some(x=>x.pos==='CCONJ'||x.dep==='conj'&&!corrected)&&subjects[0];
   // A proven correction contributes one cc/conj pair; other coordination
   // remains ambiguous, even if the parser labels a second name flat:name.
   const correctedSubject=corrected&&subjects.length===1&&!ts.some(x=>x.pos==='CCONJ'&&norm(x)!=='hanem')&&subjects[0];
   const subject=unique||correctedSubject;
   const typed=subject&&a.entities.some(e=>['PER','ORG'].includes(e.label)&&subject.start>=e.start&&subject.end<=e.end);
   const elliptic=predicate?.dep==='cop'&&predicate.headStart===t.start&&norm(predicate)==='lesz'&&t.morph.Case==='Nom'&&(t.dep==='ROOT'||corrected)&&typed;
   const rank=Boolean(explicit||elliptic);
   add(t.start,!elliptic&&h&&h.start>t.start?h.end:t.end,ordinal,rank?'rank':'ordinal','position',t,elliptic||t.dep==='amod:att'&&h?.pos==='NOUN',rank?'placement':'ordinal');
   const n=out.at(-1);
   if(!rank&&n.binding==='resolved'){n.owner={mention:raw.slice(h.start,h.end),evidenceSpan:ev(raw,h.start,h.end)};n.ownerType='ordinal_target';}
   if(rank&&n.binding==='resolved'){
    if(!subject){n.binding='unresolved';n.owner=null;n.ownerType='unresolved';delete n.bindingEvidence;n.unresolvedReasons.push('rank_owner_unproven');}
    else {n.owner={mention:raw.slice(subject.start,subject.end),evidenceSpan:ev(raw,subject.start,subject.end)};n.ownerType='ranked_entity';n.bindingEvidence.rule=elliptic?'ordinal_predicate_copula_unique_typed_subject':'explicit_placement_nominal_and_subject';n.bindingEvidence.subjectSpan=n.owner.evidenceSpan;n.bindingEvidence.dependencyPath.push({relation:'nsubj',sourceSpan:n.owner.evidenceSpan,targetSpan:ev(raw,explicit?predicate.start:subjectHead.start,explicit?predicate.end:subjectHead.end)});}
   }
  }
 }
 return out;
}
module.exports={calendar,bindTemporal,ordinalValue};
