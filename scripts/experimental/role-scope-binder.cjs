"use strict";
// Research-only successor. No production writer, network, model or gold imports.
const old=require('./morph-clause-binder.cjs');
const {validAnnotation}=require('./morph-worker-client.cjs');
const norm=s=>String(s||'').toLocaleLowerCase('hu').replace(/\s+/gu,' ').trim();
const ev=(raw,start,end)=>({start,end,textSpan:raw.slice(start,end)});
const REPORT=new Set(['mond','közöl','ír','állít','tagad','cáfol','elismer','beismer','ígér','megígér','kérdez','beszél','tájékoztat','küld']);
const LOC=new Set(['Ine','Sup','Ade','Ill','Ela','Del','All']);
const GENERIC=new Set(['iskola','kórház','klinika','rendelő','raktár','minisztérium','rendőrség','bíróság','hatóság','hivatal','labor','intézet','vállalat','gyártó','egyetem','csapat','hőmérséklet','ár','termelés','egyenleg','készlet','kapacitás','terhelés','eredmény']);
const PRONOUN=/^(?:ő|ők|kettej(?:ük|üknek)|valaki|szerint(?:e|ük)|másik|első|egyikük|neki|vele|tőle)$/iu;
const MEASUREMENT=new Set(['mér','van','lesz','lehet','emelkedik','csökken','nő','változik','süllyed']);
const UNITS={fok:['C','temperature'],forint:['HUF','money'],euró:['EUR','money'],százalék:['%','percentage_share'],százalékpont:['pp','percentage_point_delta'],gól:['gól','count'],pont:['pont','count'],darab:['darab','count'],doboz:['doboz','count'],beteg:['beteg','count'],irat:['irat','count'],busz:['busz','count'],járat:['járat','count'],megawatt:['MW','power'],kilométer:['km','distance'],év:['év','duration'],éves:['év','age'],tanuló:['tanuló','count'],szavazat:['szavazat','count']};
function tokensIn(a,start,end){return a.tokens.filter(t=>t.start>=start&&t.end<=end);}
function verb(t){return ['VERB','AUX'].includes(t.pos)&&!['Inf','Part'].includes(t.morph.VerbForm);}
function mixedName(a,e){const ts=tokensIn(a,e.start,e.end);return e.label==='PER'&&ts.length>1&&ts.at(-1).morph.Case!=='Nom'&&ts.slice(0,-1).some(t=>t.morph.Case==='Nom');}
function namedEntities(raw,a){const candidates=old.fuseEntities(raw,a).filter(e=>{
 const ts=tokensIn(a,e.start,e.end);return !a.entities.some(x=>x.start===e.start&&x.end===e.end&&mixedName(a,x))&&!PRONOUN.test(e.mention)&&!GENERIC.has(norm(ts.map(t=>t.lemma).join(' ')))&&ts.every(t=>!['PRON','CCONJ','SCONJ'].includes(t.pos))&&/^[\p{L}\p{N}]/u.test(e.mention)&&ts.some(t=>t.pos==='PROPN');
 });
 const bases=candidates.filter(e=>e.case==='Nom');
 return candidates.map(e=>{const ts=tokensIn(a,e.start,e.end);const lemma=norm(ts.map(t=>t.lemma).join(' '));const observed=bases.filter(b=>b.type===e.type&&norm(b.mention)===lemma);const direct=e.case==='Nom'&&norm(e.mention)===lemma;const canonicalIdentity=direct?norm(e.mention):observed.length===1?norm(observed[0].mention):null;return {...e,normalized:canonicalIdentity||norm(e.mention),canonicalIdentity,identityStatus:canonicalIdentity?'resolved':'surface_only',identityKey:canonicalIdentity?e.type+'|'+canonicalIdentity:null};});
}
function references(raw,a,entities){const refs=entities.map(e=>({...e,named:true}));
 for(const t of a.tokens){if(!['NOUN','PROPN','PRON'].includes(t.pos)&&!PRONOUN.test(t.text)||refs.some(e=>t.start>=e.start&&t.end<=e.end)||a.entities.some(e=>mixedName(a,e)&&t.start>=e.start&&t.end<=e.end))continue;const lemma=norm(t.lemma),pronoun=t.pos==='PRON'||PRONOUN.test(t.text);refs.push({mention:t.text,normalized:pronoun||t.pos==='PROPN'&&t.morph.Case!=='Nom'?norm(t.text):lemma,canonicalIdentity:null,type:'referent',named:false,case:t.morph.Case||null,start:t.start,end:t.end,evidenceSpan:ev(raw,t.start,t.end),sourceRole:/rendőrség|bíróság|hatóság|minisztérium/u.test(lemma)?'official':'reported',pronoun});}
 return refs.sort((a,b)=>a.start-b.start);
}
function clauses(raw,a){let rows=old.segment(raw,a);
 // A parser sentence may start with the closing quote and continue with a
 // new sentence. Isolate that delimiter before coalescing quote fragments.
 for(const q of raw.matchAll(/[„"]([^”"\n]+)[”"]/gu)){
  const end=q.index+q[0].length;
  const i=rows.findIndex(r=>r.start<end&&r.end>end);
  if(i>=0){const r=rows[i],left=r.tokens.filter(t=>t.end<=end),right=r.tokens.filter(t=>t.start>=end);
   if(left.length&&right.length)rows.splice(i,1,...[left,right].map(tokens=>({...r,start:tokens[0].start,end:tokens.at(-1).end,tokens,evidenceSpan:ev(raw,tokens[0].start,tokens.at(-1).end)})));
  }
 }
 for(let i=0;i<rows.length-1;i++){const l=rows[i],r=rows[i+1];if(l.sentence===r.sentence&&l.tokens.some(t=>REPORT.has(norm(t.lemma)))&&/^hogy\b/iu.test(raw.slice(r.start,r.end))){rows.splice(i,2,{...l,end:r.end,tokens:tokensIn(a,l.start,r.end),evidenceSpan:ev(raw,l.start,r.end)});}}
 // Quote+reporting clauses are one scoped representation, independent of the
 // direction of the speaker label. Do not fuse a subsequent contrasting clause.
 for(const q of raw.matchAll(/[„"]([^”"\n]+)[”"]/gu)){const start=q.index,end=start+q[0].length;const touching=rows.map((r,i)=>r.start<end&&r.end>start?i:-1).filter(i=>i>=0);if(!touching.length)continue;let lo=touching[0],hi=touching.at(-1);const before=rows[lo-1],after=rows[hi+1];if(before&&!before.quote&&!/[.!?]$/u.test(raw.slice(before.start,before.end))&&before.tokens.some(t=>REPORT.has(norm(t.lemma)))&&/^[\s:–—-]*$/u.test(raw.slice(before.end,start)))lo--;if(after&&(/[–—-]/u.test(raw.slice(end,after.start))||/^[–—-]$/u.test(after.tokens[0].text))&&after.tokens.some(t=>REPORT.has(norm(t.lemma))||norm(t.lemma)==='tesz'&&after.tokens.some(p=>p.headStart===t.start&&p.text==='hozzá'))&&/^[\s.,:–—-]*$/u.test(raw.slice(end,after.start)))hi++;
 const first=rows[lo],last=rows[hi],tokens=tokensIn(a,first.start,last.end);rows.splice(lo,hi-lo+1,{...first,end:last.end,tokens,evidenceSpan:ev(raw,first.start,last.end),quote:{start:start+1,end:end-1,textSpan:raw.slice(start+1,end-1)}});
 }
 // Unquoted dash-before-speaker form; textual speech and nominative speaker
 // must both be present. Ambiguous multi-reporting clauses abstain later.
 for(let i=0;i<rows.length-1;i++){const l=rows[i],r=rows[i+1];if(l.sentence===r.sentence&&/^[\s–—-]+$/u.test(raw.slice(l.end,r.start))&&r.tokens.some(t=>REPORT.has(norm(t.lemma)))&&!l.tokens.some(t=>REPORT.has(norm(t.lemma)))){rows.splice(i,2,{...l,end:r.end,tokens:tokensIn(a,l.start,r.end),evidenceSpan:ev(raw,l.start,r.end),quote:{...l.evidenceSpan}});}}
 return rows.filter(r=>r.tokens.some(t=>/[\p{L}\p{N}]/u.test(t.text)));
}
function extractNumbers(raw,c,a){const result=[];const text=raw.slice(c.start,c.end);
 const re=/(?<![\p{L}\p{N}])(?:(mínusz|plusz)\s+|([+−–-])\s*)?(\d+(?:[,.]\d+)?)(?:\s*(ezer|millió|milliárd))?(%|-(?:ről|ról|ra|re|ban|ben|ot|et|at|öt))?/gu;
 for(const m of text.matchAll(re)){let start=c.start+m.index,end=start+m[0].length;const sign=m[1]==='mínusz'||m[2]&&m[2]!=='+'?-1:1;let value=sign*Number(m[3].replace(',','.'))*({ezer:1e3,millió:1e6,milliárd:1e9}[m[4]]||1);const numericToken=a.tokens.find(t=>t.start<=start+m[0].length-1&&t.end>=end)||a.tokens.find(t=>t.start>=start&&t.start<end);const next=a.tokens.find(t=>t.start>=end&&!/^[-%]/u.test(t.text));const unitInfo=m[5]==='%'?['%','percentage_share']:next&&next.start-end<3?UNITS[norm(next.lemma)]||UNITS[norm(next.text)]:null;
 if(unitInfo&&m[5]!=='%'&&next)end=next.end;
 const prior=text.slice(Math.max(0,m.index-30),m.index),suffix=m[5]||'',context=raw.slice(start,Math.min(c.end,end+40));let semanticKind=unitInfo?.[1]||'unknown',valueKind=sign<0||m[2]==='+'?'signed_absolute':'absolute';
 const from=/-(?:ról|ről)$/u.test(suffix),to=/-(?:ra|re)$/u.test(suffix);
 if(from||to)valueKind=from?'from':'to';
 const unitToken=unitInfo&&m[5]!=='%'?next:null;const isDelta=unitToken?.morph.Case==='Ins'&&c.tokens.some(t=>['csökken','emelkedik','nő','fogy','növekszik','süllyed'].includes(norm(t.lemma)));
 let direction=null;if(isDelta){direction=c.tokens.some(t=>['csökken','fogy','süllyed'].includes(norm(t.lemma)))?'decrease':'increase';valueKind='delta';value=Math.abs(value)*(direction==='decrease'?-1:1);semanticKind=unitInfo?.[0]==='pp'?'percentage_point_delta':'delta';}
 if(/(?:legalább|minimum)\s*$/u.test(prior))semanticKind='lower_bound';if(/(?:legfeljebb|maximum)\s*$/u.test(prior))semanticKind='upper_bound';
 if(/éves/u.test(context.slice(0,24)))semanticKind='age';if(/-(?:ban|ben)$/u.test(suffix)&&Math.abs(value)>=1800&&Math.abs(value)<=2200)semanticKind='year';
 const tokenSign=numericToken?.text?.match(/^([−–+-])/u)?.[1];const signAmbiguous=Boolean(tokenSign&&((tokenSign==='+'?1:-1)!==sign))||/\d\s*[-–−]\s*$/u.test(prior)||/^\s*[-–−]\s*\d/u.test(raw.slice(end,c.end))&&!from;
 result.push({value,canonicalValue:value,sign:Math.sign(value),explicitSign:Boolean(m[1]||m[2]),direction,valueKind,transition:from?'from':to?'to':null,unit:unitInfo?.[0]||null,semanticKind,start,end,raw:raw.slice(start,end),evidenceSpan:ev(raw,start,end),binding:'unresolved',unresolvedReasons:signAmbiguous?['ambiguous_sign_or_range']:[],ownerType:'unresolved',owner:null,property:null,proposition:ev(raw,c.start,c.end)});
 }
 const from=result.find(n=>n.transition==='from'),to=result.find(n=>n.transition==='to');if(from&&to&&result.filter(n=>n.transition).length===2){for(const n of [from,to]){n.change={from:from.value,to:to.value,delta:to.value-from.value,evidenceSpan:ev(raw,from.start,to.end)};}}
 if(result.length===2&&/\bközött\b/u.test(text)&&/(?<!\p{L})és(?!\p{L})/u.test(raw.slice(result[0].end,result[1].start))){for(const n of result){n.valueKind='range_endpoint';n.semanticKind='range';n.range={lower:Math.min(...result.map(x=>x.value)),upper:Math.max(...result.map(x=>x.value)),evidenceSpan:ev(raw,result[0].start,result[1].end)};if(!n.unit&&result[1].unit){n.unit=result[1].unit;n.unitEvidence=result[1].evidenceSpan;}}}
 return result;
}
function single(items){return items.length===1?items[0]:null;}
function chooseActor(refs){return single(refs.filter(r=>r.case==='Nom'&&!r.pronoun&&(r.type==='person'||r.type==='organization'||r.type==='referent'&&['rendőrség','bíróság','hatóság','minisztérium','vállalat','gyártó','csapat'].includes(r.normalized))));}
function bind(raw,a){if(!validAnnotation(raw,a))throw Error('invalid_linguistic_annotation');const entities=namedEntities(raw,a),refs=references(raw,a,entities),cs=clauses(raw,a),frames=[];
 for(const c of cs){const local=refs.filter(r=>r.start>=c.start&&r.end<=c.end),ts=c.tokens,reports=ts.filter(t=>REPORT.has(norm(t.lemma))),report=reports[0]||null,according=ts.find(t=>norm(t.lemma)==='szerint');const hogy=report?ts.find(t=>norm(t.lemma)==='hogy'&&t.start>report.end):null;
 const content=c.quote||ev(raw,hogy?hogy.end:according?according.end:c.start,c.end);const reportRefs=local.filter(r=>c.quote?(r.end<=content.start||r.start>=content.end):hogy?r.end<=hogy.start:according?r.end<=according.start:true);
 let reportingActor=report?chooseActor(reportRefs):according?single(reportRefs.filter(r=>r.case==='Nom'&&!r.pronoun)):null;
 const recipientCandidates=report?reportRefs.filter(r=>['Dat','Ins','Ela'].includes(r.case)||/^(?:neki|vele|tőle)$/iu.test(r.mention)||norm(report?.lemma)==='tájékoztat'&&r.case==='Acc'):[];const recipient=single(recipientCandidates);
 const contentRefs=local.filter(r=>r.start>=content.start&&r.end<=content.end&&!recipientCandidates.includes(r));const locations=contentRefs.filter(r=>!r.pronoun&&(LOC.has(r.case)||r.type==='location')&&r.normalized!=='eset');
 let actor=chooseActor(contentRefs);if(report&&!hogy&&!c.quote)actor=reportingActor;
 const previous=frames.at(-1),sameSentence=previous?.sentence===c.sentence;const contrast=ts.some(t=>['de','viszont','azonban','hanem'].includes(norm(t.lemma)));const contentVerbs=ts.filter(t=>t.start>=content.start&&t.end<=content.end&&verb(t)&&!REPORT.has(norm(t.lemma)));const actionToken=contentVerbs.find(t=>t.pos==='VERB')||contentVerbs[0]||report;const action=actionToken?norm(actionToken.lemma):null;
 if(!actor&&report&&hogy&&['tagad','elismer','beismer'].includes(norm(report.lemma))&&['lop','kér','másol','hamisít','csal','követ','fizet'].includes(action)&&contentRefs.every(r=>r.case!=='Nom'))actor=reportingActor;
 if(!reportingActor&&report&&sameSentence&&previous.reportingActor&&reports.length===1&&reportRefs.every(r=>r.case!=='Nom')&&['tagad','cáfol','elismer'].includes(norm(report.lemma))){reportingActor=previous.reportingActor;if(!actor&&['lop','kér','másol','hamisít','csal','követ','fizet'].includes(action))actor=reportingActor;}
 const logical=raw.slice(content.start,content.end).match(/\b(?:ha|amennyiben)\b|abban az esetben|feltéve,?\s+hogy/iu);let conditionality=Boolean(logical),conditionalTrigger=logical?ev(raw,content.start+logical.index,content.start+logical.index+logical[0].length):null;
 if(!conditionality&&sameSentence&&previous.conditionAntecedent&&!contrast){conditionality=true;conditionalTrigger=previous.conditionalTrigger;if(!actor&&contentRefs.every(r=>r.case!=='Nom'))actor=previous.actor;}
 const grammaticalMood=[...new Set(ts.filter(verb).map(t=>t.morph.Mood).filter(Boolean))];const denied=report&&['tagad','cáfol'].includes(norm(report.lemma));const negated=ts.some(t=>t.start>=content.start&&['nem','sem'].includes(norm(t.text)));const polarity=denied||negated?'denied':'asserted';const modalities=[];if(report||according)modalities.push('reported');if(report&&['ígér','megígér'].includes(norm(report.lemma)))modalities.push('promised');if(grammaticalMood.includes('Cnd'))modalities.push(ts.some(t=>norm(t.text)==='volna')?'counterfactual':'hypothetical');if(ts.some(t=>/^(?:várhatóan|valószínűleg)$/iu.test(t.text)))modalities.push('expected');if(ts.some(t=>t.morph.Mood==='Pot'||t.morph.Potential==='Pot'))modalities.push('possible');if(conditionality)modalities.push('conditional');if(!modalities.length)modalities.push('asserted');
 const risks=[];if(reports.length>1)risks.push('multiple_reporting_predicates');if(report&&according)risks.push('nested_attribution');if((report||according)&&!reportingActor)risks.push('reporting_actor_unresolved');if(report&&ts.some(t=>t.end<=report.start&&['nem','sem'].includes(norm(t.text))))risks.push('negated_reporting_predicate');if(!action)risks.push('missing_action');if(contentVerbs.filter(t=>t.pos==='VERB').length>1)risks.push('multiple_content_predicates');if(recipientCandidates.length>1)risks.push('multiple_recipient_candidates');
 if(a.entities.some(e=>e.start>=c.start&&e.end<=c.end&&mixedName(a,e)))risks.push('mixed_case_name_boundary');
 const numericArguments=extractNumbers(raw,c,a);const frame={sentence:c.sentence,actor,actorStatus:actor?'resolved':'unresolved',subject:actor,location:locations.map(r=>({...r,role:'location'})),reportingActor,source:reportingActor,recipient,recipientCandidates,reportingVerb:report?norm(report.lemma):according?'szerint':null,content,attribution:reportingActor?{label:reportingActor.mention,normalized:reportingActor.normalized,sourceRole:reportingActor.sourceRole||'reported',evidenceSpan:reportingActor.evidenceSpan,propositionSpan:content}:null,action,actionSpan:actionToken?ev(raw,actionToken.start,actionToken.end):null,object:contentRefs.filter(r=>r.case==='Acc'&&!r.pronoun).map(r=>r.normalized),numericArguments,grammaticalMood,conditionality,conditionalTrigger,conditionAntecedent:Boolean(logical),hypotheticalContext:grammaticalMood.includes('Cnd'),reportingContext:Boolean(report||according),modalities,modality:conditionality?'conditional':modalities[0],polarity,status:conditionality?'conditional':modalities.includes('promised')?'planned':'reported',binding:'unresolved',unresolvedReasons:risks,evidenceSpan:ev(raw,c.start,c.end),propositionSpan:ev(raw,c.start,c.end),canonicalProjectionAllowed:false};
 for(const n of numericArguments){const before=ts.filter(t=>t.end<=n.start),after=ts.filter(t=>t.start>=n.end);const afterBoundary=after.find(t=>['után','követően','előtt'].includes(norm(t.lemma)));const process=after.find(t=>/feldolgoz|számlál|ellenőrz|vizsgálat|teljesít|elkészül/u.test(norm(t.lemma))&&t.start-n.end<65);const processBefore=before.at(-1);let owner=null,ownerType=null,property=null;
   if(n.unit==='%'&&(process&&afterBoundary&&process.end<=afterBoundary.start||process&&process.start-n.end<20||processBefore&&/feldolgozottság|teljesítettség/u.test(norm(processBefore.lemma)))&&!local.some(r=>r.named&&r.start>=n.end&&r.end<=(process?.start??n.end))){const p=process||processBefore;owner={label:norm(p.lemma),evidenceSpan:ev(raw,p.start,p.end)};ownerType='process';property='completion';n.semanticKind='process_percentage';}
   const nearTokens=ts.filter(t=>t.start>=n.start-20&&t.end<=n.end+24&&!local.some(r=>r.named&&r.start>Math.min(t.end,n.end)&&r.end<Math.max(t.start,n.start)));const tariff=nearTokens.find(t=>['vám','tarifa'].includes(norm(t.lemma)));const threshold=nearTokens.find(t=>['küszöb','határérték'].includes(norm(t.lemma)));
   if(!owner&&tariff){owner={label:norm(tariff.lemma),evidenceSpan:ev(raw,tariff.start,tariff.end)};ownerType='policy';property='tariff_rate';n.semanticKind='tariff_rate';}
   if(!owner&&threshold){owner={label:norm(threshold.lemma),evidenceSpan:ev(raw,threshold.start,threshold.end)};ownerType='threshold';property='threshold';}
   if(!owner&&n.semanticKind==='year'){owner={label:'calendar_year',evidenceSpan:n.evidenceSpan};ownerType='time';property='year';}
   const population=before.filter(t=>['választó','lakos','népesség','dolgozó','beteg','szavazó'].includes(norm(t.lemma))).at(-1);
   if(!owner&&n.unit==='%'&&population&&n.start-population.end<35){owner={label:norm(population.lemma),evidenceSpan:ev(raw,population.start,population.end)};ownerType='population';property='share';}
   if(!owner&&actor){owner=actor;ownerType='entity';property=n.semanticKind==='age'?'age':n.unit==='%'?'share':n.unit==='pp'?'percentage_point_change':n.unit==='C'?'temperature':n.unit==='HUF'||n.unit==='EUR'?'money':n.unit||'unknown';}
   if(!owner&&locations.length===1&&MEASUREMENT.has(action)&&['C','km'].includes(n.unit)){owner=locations[0];ownerType='location';property=n.unit==='C'?'temperature':'distance';}
   const propertyHeads=contentRefs.filter(r=>r.case==='Nom'&&r.type==='referent'&&!r.pronoun&&r.end<=n.start&&['ár','egyenleg','készlet','hőmérséklet','termelés','kapacitás','terhelés','különbség','gólkülönbség','támogatottság'].includes(r.normalized));
   if(!owner&&propertyHeads.length===1){owner={label:propertyHeads[0].normalized,evidenceSpan:propertyHeads[0].evidenceSpan};ownerType='property';property=propertyHeads[0].normalized;}
   n.owner=owner;n.ownerType=ownerType||'unresolved';n.property=property;n.subject=ownerType==='entity'?actor:null;
   if(!owner)n.unresolvedReasons.push('numeric_owner_unresolved');if(!n.unit&&n.semanticKind!=='year'&&!n.transition)n.unresolvedReasons.push('unit_unresolved');if(risks.length)n.unresolvedReasons.push('unsafe_proposition_scope');n.binding=n.unresolvedReasons.length?'unresolved':'resolved';
 }
 if(!actor)risks.push('actor_unresolved');if(numericArguments.some(n=>n.binding==='unresolved'))risks.push('numeric_binding_unresolved');frame.binding=risks.length?'unresolved':'resolved';frames.push(frame);
 }
 // Postposed conditions constrain their immediately preceding consequent.
 for(let i=1;i<frames.length;i++){const f=frames[i],p=frames[i-1];if(f.conditionAntecedent&&p.sentence===f.sentence&&/^(?:ha\b|amennyiben\b|feltéve\b)/iu.test(f.content.textSpan.trim())&&!/\b(?:de|viszont|azonban)\b/iu.test(f.content.textSpan)){p.conditionality=true;p.conditionalTrigger=f.conditionalTrigger;p.status='conditional';p.modality='conditional';if(!p.modalities.includes('conditional'))p.modalities.push('conditional');}}
 // Conservative coordinated ellipsis. A missing predicate can inherit only
 // an unqualified, identical predicate from adjacent numerical siblings.
 for(let i=0;i<frames.length;i++){const f=frames[i];if(!f.numericArguments.length)continue;const compatible=g=>g&&g.sentence===f.sentence&&g.numericArguments.length&&!g.reportingContext&&g.conditionality===f.conditionality&&g.polarity===f.polarity&&g.modalities.every(m=>m==='asserted');let lo=i,hi=i;while(compatible(f)&&compatible(frames[lo-1]))lo--;while(compatible(f)&&compatible(frames[hi+1]))hi++;const group=frames.slice(lo,hi+1),actions=[...new Set(group.map(g=>g.action).filter(Boolean))];if(!f.action&&actions.length===1){const donor=group.find(g=>g.action);f.action=donor.action;f.actionSpan=donor.actionSpan;f.actionInherited=true;f.unresolvedReasons=f.unresolvedReasons.filter(r=>r!=='missing_action');for(const n of f.numericArguments){if(!f.unresolvedReasons.some(r=>!['actor_unresolved','numeric_binding_unresolved'].includes(r)))n.unresolvedReasons=n.unresolvedReasons.filter(r=>r!=='unsafe_proposition_scope');n.binding=n.unresolvedReasons.length?'unresolved':'resolved';}if(f.numericArguments.every(n=>n.binding==='resolved'))f.unresolvedReasons=f.unresolvedReasons.filter(r=>r!=='numeric_binding_unresolved');f.binding=f.unresolvedReasons.length?'unresolved':'resolved';}}
 return{entities,frames,canonical:[],conflicts:[],projectionState:'disabled_research_only',version:'role-scope-research-1'};
}
module.exports={bind,namedEntities,references,clauses,extractNumbers};
