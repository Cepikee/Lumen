"use strict";
// Experimental, dependency-free binding over linguistic candidates. No DB imports.
const semantic=require('../../lib/v2/deterministic-semantic');
const {validAnnotation}=require('./morph-worker-client.cjs');
const norm=s=>String(s||'').toLocaleLowerCase('hu').replace(/\s+/gu,' ').trim();
const REPORT=new Set(['mond','közöl','ír','állít','tagad','cáfol','elismer','beismer','ígér','megígér']);
const BREAK=new Set(['míg','pedig','viszont','azonban','de','illetve','és','hanem','miközben','bár','ha','amennyiben','aki','amely']);
const CONTRAST=new Set(['de','viszont','azonban','hanem','miközben','bár']);
const LOC_CASE=new Set(['Ine','Sup','Ade','Ill','Del','Ela','All']);
const TYPE={PER:'person',ORG:'organization',LOC:'location',MISC:'other'};
const WORD_NUM={egy:1,egyet:1,két:2,kettő:2,kettőt:2,három:3,hármat:3,négy:4,öt:5,hat:6,hét:7,nyolc:8,kilenc:9,tíz:10};
const UNIT={százalék:['%','percentage_share'],százalékpont:['pp','percentage_point_delta'],forint:['HUF','money'],euró:['EUR','money'],fok:['C','temperature'],gól:['gól','count'],beteg:['beteg','count'],tanuló:['tanuló','count'],diák:['diák','count'],megawatt:['MW','count'],kilométer:['km','distance'],év:['év','duration'],óra:['óra','duration'],szerződés:['szerződés','count'],irat:['irat','count'],üzem:['üzem','count'],járat:['járat','count'],busz:['busz','count'],pótlóbusz:['pótlóbusz','count'],eszköz:['eszköz','count'],minta:['minta','count'],szavazat:['szavazat','count'],pont:['pont','count']};
function evidence(raw,start,end){return{start,end,textSpan:raw.slice(start,end)};}
function role(name){const n=norm(name);if(/reuters|cnn|guardian|hvg|telex|hírügynökség|napilap/u.test(n))return'media';if(/rendőrség|hatóság/u.test(n))return'authority';if(/bíróság|törvényszék/u.test(n))return'court';if(/minisztérium|hivatal|egyetem|kórház|klinika|iskola|intézet/u.test(n))return'institution';if(/kft|zrt|nyrt/u.test(n))return'company';if(/párt/u.test(n))return'political_party';return null;}
function fuseEntities(raw,a){const masked=semantic.segmentArticleText(raw,{preserveOffsets:true});const entities=[];
  for(const e of a.entities){if(TYPE[e.label]==='other'||/[\r\n]/u.test(e.text)||!masked.slice(e.start,e.end).trim())continue;const ts=a.tokens.filter(t=>t.start>=e.start&&t.end<=e.end);if(!ts.length||ts.some(t=>['CCONJ','SCONJ','PRON'].includes(t.pos)))continue;
    // A locative suffix following nominative person tokens signals uncertain fusion.
    if(ts.length>2&&ts.some(t=>LOC_CASE.has(t.morph.Case))&&ts.slice(0,-1).some(t=>t.morph.Case==='Nom')&&!role(e.text))continue;
    const canonical=norm(ts.map(t=>t.lemma).join(' '));const subtype=role(canonical);const entity={mention:e.text,normalized:canonical,type:subtype?'organization':TYPE[e.label],subtype,sourceRole:subtype==='media'?'media':['authority','institution','court'].includes(subtype)?'official':null,start:e.start,end:e.end,case:ts.at(-1).morph.Case||null,evidenceSpan:evidence(raw,e.start,e.end)};entities.push(entity);
  }
  // Generic institutional heads are entities even when NER omits lowercase mentions.
  for(const t of a.tokens){const subtype=role(t.lemma);if(!['authority','court','institution'].includes(subtype)||entities.some(e=>e.start<=t.start&&e.end>=t.end)||!masked.slice(t.start,t.end).trim())continue;entities.push({mention:t.text,normalized:norm(t.lemma),type:'organization',subtype,sourceRole:'official',case:t.morph.Case||null,start:t.start,end:t.end,evidenceSpan:evidence(raw,t.start,t.end)});}
  // Full lemma identity only. Surname-only aliases never merge with a full name.
  for(const e of entities)e.identityKey=e.type+'|'+e.normalized;
  return entities.sort((x,y)=>x.start-y.start);
}
function isVerb(t){return ['VERB','AUX'].includes(t.pos)&&!['Inf','Part'].includes(t.morph.VerbForm);}
function hasNumeric(tokens){return tokens.some(t=>t.pos==='NUM'||WORD_NUM[norm(t.text)]!=null||/\d/u.test(t.text));}
function segment(raw,a){const masked=semantic.segmentArticleText(raw,{preserveOffsets:true});const clauses=[];
  for(let si=0;si<a.sentences.length;si++){const s=a.sentences[si];const ts=a.tokens.filter(t=>t.start>=s.start&&t.end<=s.end);let begin=0;
    const push=(end)=>{const tokens=ts.slice(begin,end).filter(t=>masked.slice(t.start,t.end).trim());if(tokens.length){const first=tokens[0],last=tokens.at(-1);clauses.push({sentence:si,start:first.start,end:last.end,tokens,evidenceSpan:evidence(raw,first.start,last.end)});}begin=end;};
    for(let i=0;i<ts.length;i++){const t=ts[i],left=ts.slice(begin,i),right=ts.slice(i+1);if(!left.length||!right.length)continue;
      const reporting=left.some(x=>REPORT.has(norm(x.lemma)));const marker=norm(right[0].text);
      // Keep reporting verb + hogy complement together. Split contrast siblings.
      if([',',';',':','—','–'].includes(t.text)){if(marker==='hogy'&&reporting)continue;const nominalContrast=CONTRAST.has(marker)&&right.some(x=>x.pos==='NOUN')&&right.some(x=>['nem','sem'].includes(norm(x.lemma)));const meaningful=(left.some(isVerb)||hasNumeric(left))&&(right.some(isVerb)||hasNumeric(right)||nominalContrast);if(meaningful){push(i);begin=i+1;}}
      else if(BREAK.has(norm(t.text))&&left.some(isVerb)&&right.some(isVerb)&&i>begin+1){push(i);}
    }push(ts.length);
  }return clauses;
}
function numericArgs(raw,tokens){const result=[];
  for(let i=0;i<tokens.length;i++){const t=tokens[i];const bare=t.text.replace(/(?:%-ot|%-át|%|-(?:et|at|ot|öt))$/u,'');let value=/^\d+(?:[,.]\d+)?$/u.test(bare)?Number(bare.replace(',','.')):WORD_NUM[norm(t.lemma)]??WORD_NUM[norm(t.text)];if(value==null)continue;
    // Calendar years retain temporal semantics rather than unit borrowing.
    if(value>=1800&&value<=2200&&/ben|ban/u.test(t.text))continue;
    let end=t.end,scale=1,j=i+1;if(['ezer','millió','milliárd'].includes(norm(tokens[j]?.lemma))){scale={ezer:1e3,millió:1e6,milliárd:1e9}[norm(tokens[j].lemma)];end=tokens[j].end;j++;}
    const next=tokens[j],u=/%/u.test(t.text)?['%','percentage_share']:UNIT[norm(next?.lemma)];if(u&&next&&!/%/u.test(t.text)){end=next.end;i=j;}else if(scale!==1)i=j-1;
    const context=raw.slice(Math.max(tokens[0].start,t.start-28),Math.min(tokens.at(-1).end,end+35));let kind=u?.[1]||null;
    if(kind==='percentage_share'&&/vám/u.test(context))kind='tariff_rate';else if(/küszöb|legalább|minimum/u.test(context))kind='lower_bound';else if(/legfeljebb|maximum/u.test(context))kind='upper_bound';else if(/körülbelül|közel|mintegy/u.test(context))kind='approximate';else if(/több|kevesebb|nőtt|csökkent/u.test(context)&&kind==='percentage_point_delta')kind='percentage_point_delta';else if(/hasonló|referencia|összehasonl/u.test(context))kind='comparison';
    result.push({value:value*scale,unit:u?.[0]||null,semanticKind:kind,property:u?norm(next?.lemma):null,raw:raw.slice(t.start,end),start:t.start,end,evidenceSpan:evidence(raw,t.start,end),inheritedUnit:false});
  }return result;
}
function choose(candidates,tokens,numeric){const ranked=candidates.filter(e=>!['Acc','Dat','Ins','Del','Ela','All'].includes(e.case)).map(e=>{const before=e.end<=(numeric[0]?.start??tokens.find(isVerb)?.start??Infinity);return{entity:e,score:0.5+(e.case==='Nom'?0.15:0)+(before?0.15:0)+(e.type==='location'&&numeric.some(n=>n.unit==='C')?0.2:0)};}).sort((x,y)=>y.score-x.score);if(!ranked.length||ranked[1]&&ranked[0].score-ranked[1].score<0.1)return{entity:null,confidence:0,reason:ranked.length?'competing_candidates':'missing_subject'};return{entity:ranked[0].entity,confidence:ranked[0].score,reason:'local_case_and_proposition'};}
function bind(raw,a){if(!validAnnotation(raw,a))throw new Error('invalid_linguistic_annotation');const entities=fuseEntities(raw,a),clauses=segment(raw,a),frames=[];
  for(const c of clauses){const ts=c.tokens;const local=entities.filter(e=>e.start>=c.start&&e.end<=c.end);const numeric=numericArgs(raw,ts);const verbs=ts.filter(isVerb);const reporting=verbs.find(t=>REPORT.has(norm(t.lemma)));const according=ts.find(t=>norm(t.lemma)==='szerint');const sourceBefore=reporting||according;const sources=sourceBefore?local.filter(e=>e.end<=sourceBefore.start):[];const source=sources.length===1?sources[0]:null;
    // Unnamed speakers remain local referents; never invent a named identity.
    if(sourceBefore&&!sources.length){const heads=ts.filter(t=>t.end<=sourceBefore.start&&t.pos==='NOUN'&&t.morph.Case==='Nom');if(heads.length===1){const t=heads[0];sources.push({mention:t.text,normalized:norm(t.lemma),type:'referent',case:'Nom',start:t.start,end:t.end,evidenceSpan:evidence(raw,t.start,t.end)});}}
    const localSource=source||sources.length===1&&sources[0]||null;
    const contentStart=according?according.end:reporting?ts.find(t=>norm(t.lemma)==='hogy'&&t.start>reporting.end)?.end||reporting.end:c.start;
    const nested=Boolean(according&&reporting);
    let actorCandidates=local.filter(e=>!sourceBefore||e.start>=contentStart);if(reporting&&!according&&actorCandidates.length===0&&localSource)actorCandidates=[localSource];
    if(!actorCandidates.length&&!nested){
      for(let ti=0;ti<ts.length;ti++){const t=ts[ti];if(t.start<contentStart||!['NOUN','PROPN'].includes(t.pos)||!['Nom','Ine','Sup','Ade'].includes(t.morph.Case)||UNIT[norm(t.lemma)]&&numeric.some(n=>n.start<=t.start&&n.end>=t.end))continue;
        if(local.some(e=>e.start<=t.start&&e.end>=t.end))continue;
        let first=ti;while(first>0&&['ADJ','PROPN'].includes(ts[first-1].pos)&&ts[first-1].end<=t.start)first--;
        const mention=raw.slice(ts[first].start,t.end),canonical=norm(ts.slice(first,ti+1).map(x=>x.lemma).join(' '));
        actorCandidates.push({mention,normalized:canonical,type:'referent',case:t.morph.Case,start:ts[first].start,end:t.end,identityKey:'local|'+canonical,evidenceSpan:evidence(raw,ts[first].start,t.end)});
      }
    }
    let chosen=choose(actorCandidates,ts,numeric);const actionToken=verbs.filter(t=>!REPORT.has(norm(t.lemma))).at(-1)||reporting||null;let action=actionToken?norm(actionToken.lemma):null;
    const explicitConditional=ts.some(t=>['ha','amennyiben'].includes(norm(t.lemma)))||ts.some(t=>t.morph.Mood==='Cnd');let conditional=explicitConditional;
    const previous=frames.at(-1);const startsContrast=CONTRAST.has(norm(ts[0]?.lemma));const sameSentence=previous?.sentence===c.sentence;
    const reportingContinuation=reporting&&previous?.reportingAction&&local.length===0;
    const explicitNominal=ts.some(t=>['NOUN','PROPN','ADJ','PRON'].includes(t.pos)&&t.morph.Case==='Nom');
    const compatibleInheritedActor=['person','organization'].includes(previous?.subject?.type);
    if(!chosen.entity&&actorCandidates.length===0&&!explicitNominal&&sameSentence&&(!startsContrast||reportingContinuation)&&compatibleInheritedActor&&!previous.ambiguous)chosen={entity:previous.subject,confidence:0.65,reason:'coordinated_subject_inheritance'};
    if(sameSentence&&previous.conditionClause&&!startsContrast)conditional=true;
    const denial=reporting&&['tagad','cáfol'].includes(norm(reporting.lemma));const negative=ts.some(t=>['nem','sem'].includes(norm(t.lemma)))||Boolean(denial);
    const promise=reporting&&['ígér','megígér'].includes(norm(reporting.lemma));const future=ts.some(t=>/^(?:jövőre|holnap|várhatóan)$/u.test(norm(t.text)))||ts.some(t=>t.morph.Mood==='Pot')||promise;
    let attribution=localSource?{label:localSource.mention,normalized:localSource.normalized,sourceRole:localSource.sourceRole||'reported',reportingVerb:reporting?norm(reporting.lemma):'szerint',evidenceSpan:evidence(raw,localSource.start,sourceBefore.end),propositionSpan:evidence(raw,contentStart,c.end)}:null;
    const pronominal=ts.some(t=>/^szerinte$/iu.test(t.text));if(pronominal&&previous?.subject&&sameSentence&&!previous.ambiguous)attribution={label:previous.subject.mention,normalized:previous.subject.normalized,sourceRole:'reported',reportingVerb:'szerinte',propositionSpan:evidence(raw,c.start,c.end)};
    if(reportingContinuation&&chosen.entity)attribution={label:chosen.entity.mention,normalized:chosen.entity.normalized,sourceRole:chosen.entity.sourceRole||'reported',reportingVerb:norm(reporting.lemma),propositionSpan:evidence(raw,contentStart,c.end)};
    const frame={sentence:c.sentence,subject:chosen.entity,actor:chosen.entity,action,actionSpan:actionToken?evidence(raw,actionToken.start,actionToken.end):null,object:ts.filter(t=>t.morph.Case==='Acc'&&t.pos==='NOUN').map(t=>norm(t.lemma)).join('|')||null,target:null,numericArguments:numeric,time:ts.filter(t=>/^(?:tegnap|ma|holnap|jövőre|korábban)$/u.test(norm(t.text))||/\d{4}-(?:ben|ban)/u.test(t.text)).map(t=>t.text),location:local.find(e=>e.type==='location')||null,attribution,polarity:negative?'denied':'asserted',modality:conditional?'conditional':promise?'promise':future?'possible_future':attribution?'reported':'asserted',conditionality:conditional,status:conditional?'conditional':future?'planned':'reported',conditionClause:explicitConditional&&ts.some(t=>['ha','amennyiben'].includes(norm(t.lemma))),reportingAction:reporting?norm(reporting.lemma):null,ambiguous:chosen.reason==='competing_candidates',routingConfidence:chosen.confidence,confidencePurpose:'routing_only',binding:chosen.entity&&action?'resolved':'unresolved',bindingReason:chosen.reason,evidenceSpan:c.evidenceSpan,propositionSpan:c.evidenceSpan,canonicalProjectionAllowed:false};
    if(pronominal&&!attribution)frame.binding='unresolved';
    if(sourceBefore&&!attribution||nested){frame.binding='unresolved';frame.bindingReason=nested?'nested_attribution_unresolved':'unresolved_attribution';frame.safetyBlocked=true;if(nested){frame.attributionCandidates=local.filter(e=>e.end<=contentStart);frame.attribution=null;}}
    frames.push(frame);
  }
  // Verb/unit ellipsis is allowed only across adjacent numeric clauses with one
  // unique action/unit and no competing attribution or conditional scope.
  for(let i=0;i<frames.length;i++){const f=frames[i];if(!f.numericArguments.length)continue;const compatible=g=>g&&g.sentence===f.sentence&&g.numericArguments.length&&g.attribution===null&&!g.safetyBlocked&&g.conditionality===f.conditionality&&g.polarity===f.polarity;let lo=i,hi=i;while(compatible(f)&&compatible(frames[lo-1]))lo--;while(compatible(f)&&compatible(frames[hi+1]))hi++;const group=compatible(f)?frames.slice(lo,hi+1):[f];const actions=[...new Set(group.map(g=>g.action).filter(Boolean))];const units=[...new Set(group.flatMap(g=>g.numericArguments.map(n=>n.unit)).filter(Boolean))];
    if(!f.action&&actions.length===1&&f.subject){const donor=group.find(g=>g.action);f.action=actions[0];f.actionSpan=donor.actionSpan;f.actionInherited=true;}
    for(const n of f.numericArguments){if(!n.unit&&units.length===1&&actions.length<=1){const donor=group.flatMap(g=>g.numericArguments).find(x=>x.unit);n.unit=donor.unit;n.semanticKind=donor.semanticKind;n.property=donor.property;n.inheritedUnit=true;n.unitEvidence=donor.evidenceSpan;}n.subject=f.subject;}
    f.binding=f.subject&&f.action&&f.numericArguments.every(n=>n.unit)?'resolved':'unresolved';if(f.ambiguous||f.safetyBlocked)f.binding='unresolved';
  }
  const seen=new Set();const unique=frames.filter(f=>{const key=JSON.stringify([f.propositionSpan.start,f.propositionSpan.end,f.subject?.identityKey,f.action,f.object,f.polarity,f.modality,f.attribution?.normalized,f.time]);if(seen.has(key))return false;seen.add(key);return true;});
  return{entities,frames:unique,canonical:[],conflicts:[],projectionState:'disabled_research_only'};
}
function baseline(raw,linguistic=null){const entities=linguistic?fuseEntities(raw,linguistic):semantic.extractEntities(raw);return{entities,frames:semantic.extractSemanticFrames(raw,entities),canonical:[],conflicts:[],projectionState:'disabled_research_only'};}
module.exports={bind,baseline,fuseEntities,segment,numericArgs};
