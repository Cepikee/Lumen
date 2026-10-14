// Post-first-pass manual adjudication. Never imported by the binder.
const fs=require('node:fs'),crypto=require('node:crypto');const d=__dirname;
const raw=JSON.parse(fs.readFileSync(d+'/FRESH_BLIND_BEFORE_REPAIR_raw.json'));
const gold=JSON.parse(fs.readFileSync(d+'/expected.json'));
const names={C:'CORRECT_RESOLVED',W:'WRONG_RESOLVED',U:'CORRECT_UNRESOLVED',M:'MISSED_DEFENSIBLE_RESOLUTION'};
// Per item: outcome, zero-based frame references, explanation of observed output.
const judgments={
A:[
['C',[0],'actorStatus resolved, actor Takács Réka, action indokol.'],
['M',[0,1],'No attribution chain or source; the named actor does not establish the quote/source/recipient relationship.'],
['M',[1],'Multiple predicates collapsed into tart; polarity unresolved/nested_negation_scope, no separate negated tűz frame.'],
['M',[2],'source null, no nominal relation; possessor roles alone do not identify attribution.'],
['M',[3],'2028 unknown/unresolved; possible preserved but spring and earliest-time role absent.'],
['M',[1],'conditionality false; quoted frame unresolved and no amíg antecedent relation.']],
B:[
['M',[0],'átad actor unresolved despite PERSON entity; no recipient slot.'],
['C',[0],'entities contains exactly Barta Júlia as person, excludes főépítész.'],
['M',[1],'No kilencedik kerület numeric ordinal; ambiguous contrast suppresses branch.'],
['M',[1,2],'contrast unresolved; object candidates are not accepted/rejected resolved roles.'],
['C',[1,2],'helyez conditional with a separate ha antecedent frame and trigger; no asserted execution.'],
['C',[3],'ordinal 1 owner ütem; not placement/person.']],
C:[
['C',[0],'nominal relation resolves exportőrök szövetségének as source distinct from mérlegelése.'],
['W',[0],'8e9 EUR resolved with equal operator; possibility survives but exceeds/lower-bound relation lost.'],
['M',[1],'31% unresolved without owner or share role.'],
['W',[2],'6% resolved as unqualified equal/percentage; relative change and reference period missing from semantic scope.'],
['C',[3],'calendar_date {2027,2,18} resolved on történik publication frame.'],
['C',[3],'clock_time {14,0} resolved on same publication frame.']],
D:[
['C',[0],'organization entity full name excludes üzemvezetője.'],
['M',[0,1],'jelez not recognized as reporting; source and recipient null.'],
['U',[1],'megszüntet actor null, no positive person recovery.'],
['U',[2],'bare feljegyzés source null with source_bearing_possessor_unproven.'],
['C',[2],'73 count owner munkakör on érint frame, not performed layoffs.'],
['C',[3],'hagy polarity denied; 73-count frame asserted separately.']],
E:[
['C',[0],'source hálózatirányító resolved with separate tájékoztatása nominal relation.'],
['M',[0],'compound köbméter/hour preserved but attachment unresolved; no generator owner.'],
['C',[1],'duration 11 hour resolved, less_or_equal and possible; no unconditional equality.'],
['W',[1],'Resolved 11-hour argument has conditionality false; Szélcsend esetén is not retained as a condition. E3 and E4 test separate but correlated qualifiers.'],
['M',[2,3],'volt homograph/contrast unresolved, neither alternative resolved.'],
['M',[0],'fogyaszt actor null; generators not recovered.']],
F:[
['M',[0],'Quote source identifies intermediary révüzem szóvivője only; kikötőmester original-message layer missing.'],
['C',[0],'indul denied; no negation on reporting verb ír.'],
['M',[1],'85 unresolved, no capacity role; no positive actual count promoted.'],
['C',[2],'19 count owner biciklit resolved on ma/szállít frame.'],
['C',[3],'Oct 22 year null and 06:40 resolved on megkezd/beszállás.'],
['M',[0],'Quoted text retained but no temporal boundary for fog clearing.']],
G:[
['M',[0],'átvesz actor null; helyszínelők not bound.'],
['M',[0],'14 isolated unknown/unresolved; intervening lezárt blocks unit attachment.'],
['M',[1,2],'pontosít no reporting source/quote chain, Fekete Dóra entity alone insufficient.'],
['C',[2],'Fekete Dóra one person span without title.'],
['M',[3],'object contrast unresolved; no accepted employee or rejected owner representation.'],
['M',[3],'No source or reporting nominal relation for cáfolata.']],
H:[
['M',[0],'kinyit actor null; neither helpers nor possessor falsely promoted.'],
['M',[1],'közlése relation exists but possessor unproven; source null.'],
['C',[1],'5 utas resolved with greater_or_equal and unconditionalEqualityAllowed false.'],
['M',[3],'40 minute duration typed but attachment unresolved.'],
['U',[3],'leállít actor null.'],
['C',[3,4],'kér helikoptert denied; leállít polarity asserted.']],
I:[
['C',[0],'2 ordinal owner fordulójából, not Sipos Lilla placement.'],
['M',[1],'harmadikként not extracted, relative actor unresolved.'],
['M',[2],'4 placement recognized but rank_owner_unproven.'],
['U',[4],'Második ordinal unresolved, no inferred ranked person.'],
['C',[0],'Sipos Lilla resolved actor of jut.'],
['C',[4],'csapatvezető quote source in recovered chain.']],
J:[
['C',[0],'Full organization entity; kutatója not included in entity name.'],
['C',[0],'actorStatus resolved kutatója; felügyelet not actor. Frame-wide unresolved flag does not erase actor slot.'],
['M',[1],'jegyzőkönyve source null; no labor attribution.'],
['M',[1],'compound gigabit/second preserved but binding unresolved.'],
['W',[2],'12 resolved count, equal, unconditionalEqualityAllowed true from 12 és 18 milliszekundum; 18 separate unknown. Range and measurement dimension lost.'],
['M',[1],'No azonos proposition; polarity unresolved because predicate absent.']],
K:[
['M',[0,1],'Nominal source központ attached to condition frame only; numeric admission proposition source null. Abbreviated source head alone is not counted as wrong identity.'],
['M',[1],'per-day compound candidate retains possibility and condition, but attachment unresolved.'],
['C',[0,1],'conditionAntecedent and conditionality link increased infections to admission clause.'],
['M',[2,3],'Counterfactual volna retained, but no explicit rejected-report link from visszautasít to bezár. No fully resolved positive closure claim.'],
['M',[4],'megkap actor null.'],
['C',[4],'Independent receipt clause asserted/conditionality false, no leaked antecedent.']],
L:[
['M',[0,1],'No attribution source/chain for tankerület request; original gold wording ambiguity noted separately.'],
['C',[1],'péntekig calendar boundary resolved on lead/jelentkezés.'],
['M',[2,3],'Contrast unresolved; rejected 60 and accepted 75000 not established.'],
['M',[3],'HUF/month compound preserved only as unresolved candidate.'],
['M',[4],'No eligibility boundary/condition, frame unresolved.'],
['C',[5],'3 ordinal owner napján, not rank.']],
M:[
['M',[0],'mérései relation exists but source_bearing_possessor_unproven.'],
['M',[0],'7 unknown/unresolved; lexical minus and Celsius not bound, no positive 7-degree measurement.'],
['M',[1],'2–4 range unresolved with no dimension/reference; safe abstention, not a resolved absolute temperature.'],
['C',[1],'Frame modalities expected; no resolved observed maximum.'],
['M',[3],'Object contrast unresolved; no accepted ónos eső versus rejected havazás.'],
['M',[2,3],'hangsúlyoz no source/chain.']],
N:[
['U',[0],'elemez actor null; laboratory location and commissioning group not promoted.'],
['U',[1],'source null and nominal relation source_bearing_possessor_unproven.'],
['M',[1],'0.7 approximately recognized but unresolved count, no mass measurement binding.'],
['M',[2],'9 unresolved count; diameter measurement not resolved.'],
['C',[3],'Explicit negated_reporting_predicate/content_under_negated_report block; polarity unresolved rather than positive proof. This safety decision is satisfied by explicit blocking evidence.'],
['M',[3],'No leader entity/local role/source, only theory object.']],
O:[
['W',[0],'sourceEvidence resolutionStatus resolved promotes árjegyzéke itself to source instead of üzletlánc possessor.'],
['W',[0],'412 HUF resolved equal money, kg denominator lost; raw kilónként never reaches compound representation.'],
['M',[1,2],'Percent contrast unresolved; rejected value not positively resolved.'],
['M',[2,3],'Possible retained but eligibility relative clause not represented as condition. No resolved numeric claim.'],
['M',[4],'3900 unresolved; negative comparison lower bound not structured.'],
['U',[2],'adhat actor null, no person invented.']],
P:[
['M',[0,1],'Actor elnök recovered but source/chain absent; employer promise not composed.'],
['C',[1],'marad fizetés nélkül polarity denied, no positive no-pay claim.'],
['C',[2],'Date/time contrast resolved: 2029 rejected, 2031 accepted; event polarity asserted.'],
['C',[2],'2031 year accepted on megszűnik frame.'],
['M',[3],'24 duration unresolved; minimum and required retained but per-entrant denominator absent.'],
['C',[3],'Required modality and governing-modal evidence on kell/szervezni.']],
Q:[
['U',[0],'Coordinated actor candidates not collapsed to single resolved actor.'],
['U',[1],'Implicit transport actor null.'],
['C',[2],'kiállítás rendezője source, látogatóknak recipient, bounded quote chain.'],
['M',[2],'Pronoun actor contrast unresolved; no accepted gyűjtő or rejected én binding.'],
['C',[3],'3 ordinal targets terem, not person rank.'],
['U',[4],'Standalone Második ordinal unresolved, no ranked entity.']],
R:[
['M',[0],'kötelez actor null despite explicit institution.'],
['C',[0],'Object contrast resolved szakértő accepted/vádlott rejected, asserted event.'],
['M',[1],'beszámol source/recipient absent; original gold recipient ambiguity separately noted.'],
['M',[1],'No PER entity, mixed_case_name_boundary; full inflected name not recovered.'],
['C',[1,2],'beszámol asserted, idéz denied in separate clause.'],
['M',[3],'Sep17 end boundary resolved, Sep8 start omitted; interval not complete.']],
S:[
['C',[0],'Nested possessive source gazdaság agronómusának recovered, becslése separated.'],
['M',[0],'tonna/hektár compound plus possible/conditional retained but attachment unresolved.'],
['M',[2],'No June/July temporal arguments or replacement relation.'],
['M',[3,4],'Numeric correction unresolved; conditional morphology retained but no accepted8/rejected6.'],
['C',[0,1],'possible+conditional, amennyiben antecedent retained.'],
['C',[5],'2 ordinal owner körben, not placement.']],
T:[
['M',[0],'vár actor unresolved despite explicit tárgyalók.'],
['U',[0,2],'Brüsszel LOC entity only, no invented specific institution.'],
['M',[3],'Source contrast unresolved, no accepted küldöttség attribution.'],
['M',[3],'asserted ismertet survives but alternatives not semantically bound.'],
['U',[5],'ambiguous_contrast_scope with rejected/accepted null.'],
['U',[5],'2 unknown unresolved, no positive support amount.']]
};
const labels=gold.map(g=>{const j=judgments[g.snippet]?.[Number(g.id.slice(1))-1];if(!j)throw Error(g.id);const rowIndex=raw.rows.findIndex(r=>r.id===g.snippet);return {...g,label:names[j[0]],reason:j[2],rawRefs:j[1].map(i=>`/rows/${rowIndex}/output/frames/${i}`),snippetRawRef:`/rows/${rowIndex}/output`};});
for(const x of labels)if(x.gold==='UNRESOLVED'&&!['CORRECT_UNRESOLVED','WRONG_RESOLVED'].includes(x.label))throw Error('Gold category mismatch '+x.id);
const write=(n,x)=>fs.writeFileSync(d+'/'+n,typeof x==='string'?x:JSON.stringify(x,null,2),{flag:'wx'});
write('labels.json',{adjudicatedAt:new Date().toISOString(),method:'Assistant manual post-output audit of all 120 frozen items; not independent human expert review. Slot-level labels, no global frame promotion. No gold edits.',goldSha256:crypto.createHash('sha256').update(fs.readFileSync(d+'/expected.json')).digest('hex'),items:labels});
const counts=xs=>Object.fromEntries(Object.values(names).map(k=>[k,xs.filter(x=>x.label===k).length]));const c=counts(labels),resolved=c.CORRECT_RESOLVED+c.WRONG_RESOLVED;
let total=0,exact=0;const unique=new Map(),failures=[];
function spans(x,text,p,id){if(!x||typeof x!=='object')return;if(Number.isInteger(x.start)&&Number.isInteger(x.end)&&typeof x.textSpan==='string'){total++;const ok=x.start>=0&&x.end<=text.length&&x.end>=x.start&&text.slice(x.start,x.end)===x.textSpan;if(ok)exact++;else failures.push({id,path:p,span:x});unique.set(id+'|'+x.start+'|'+x.end+'|'+x.textSpan,ok);}for(const[k,v]of Object.entries(x))if(v&&typeof v==='object')spans(v,text,p+'/'+k,id);}
raw.rows.forEach((r,i)=>spans(r.output,r.text,`/rows/${i}/output`,r.id));
const dimensions=Object.fromEntries([...new Set(gold.map(x=>x.dimension))].map(k=>{const xs=labels.filter(x=>x.dimension===k);return[k,{total:xs.length,...counts(xs)}];}));
const metrics={totalDecisions:labels.length,...c,NOT_APPLICABLE:0,resolved,resolvedPrecision:c.CORRECT_RESOLVED/resolved,resolutionRate:resolved/labels.length,overallCorrectIncludingAbstention:(c.CORRECT_RESOLVED+c.CORRECT_UNRESOLVED)/labels.length,wrongPerResolved:c.WRONG_RESOLVED/resolved,wrongPerTotal:c.WRONG_RESOLVED/labels.length,dimensions,evidence:{totalSpanOccurrences:total,exactRawOffsetMatches:exact,failures,uniqueSpans:unique.size,uniqueExact:[...unique.values()].filter(Boolean).length,accuracy:exact/total},nlpSentenceCount:raw.rows.reduce((n,r)=>n+r.annotation.sentences.length,0),canonicalProjection:raw.rows.every(r=>r.output.canonical.length===0&&r.output.projectionState==='disabled_research_only')?'OFF':'UNEXPECTED'};
write('metrics.json',metrics);
write('human_item_audit.md','# Fresh first-pass item audit\n\nAssistant-performed manual audit, not an independent human review. Frozen denominator 120. Full raw output is immutable. C=correct resolved slot, W=wrong resolved slot, U=correct abstention, M=missed defensible resolution. A frame may remain unresolved while its source/numeric/actor slot is explicitly resolved; those slots are still audited. Missing candidates are not counted as wrong positive bindings. Explicit safety blocking may satisfy a safety-only gold item.\n\n'+labels.map(x=>`## ${x.id} — ${x.label}\n\n**Gold:** ${x.expectation}\n\n**Observed:** ${x.reason}\n\n**Raw pointers:** ${x.rawRefs.join(', ')}; ${x.snippetRawRef} (entities/chains/contrasts/roles).\n`).join('\n'));
console.log(JSON.stringify(metrics,null,2));
