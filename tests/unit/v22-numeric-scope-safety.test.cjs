"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/numeric-scope-annotations.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const input=id=>structuredClone(cases.find(x=>x.id===id));
const result=id=>{const x=input(id);return bind(x.text,x.annotation);};
const args=id=>result(id).frames.flatMap(f=>f.numericArguments);
const has=(n,op)=>n.semanticScope.comparison.some(q=>q.operator===op);
for(const [id,op] of [
 ['upper','less_or_equal'],['maximum','maximum'],['lower','greater_or_equal'],['minimum','minimum'],
 ['greater','greater_than'],['less','less_than'],['approx','approximately'],['about','approximately'],
 ['range_dash','range'],['range_words','range'],['money_bound','less_or_equal'],['money_greater','greater_than'],
 ['percent_upper','less_or_equal'],['percent_lower','greater_or_equal'],['percent_greater','greater_than'],
 ['rate_max','maximum'],['rate_above','greater_than'],['rate_below','less_than']
])test(`C01 retains scoped operator: ${id}`,()=>{
 const ns=args(id);assert.ok(ns.length);assert.ok(ns.some(n=>has(n,op)));
 for(const n of ns.filter(n=>has(n,op))){assert.equal(n.semanticScope.unconditionalEqualityAllowed,false);assert.equal(n.semanticScope.assertionStatus,'qualified_only');assert.ok(n.semanticScope.comparison.find(q=>q.operator===op).evidenceSpan.textSpan.trim());}
});
for(const [id,kind] of [['potential','possible'],['capacity','possible'],['conditional','conditional'],['future','future'],['bounded_possible','possible'],['lehet','possible'],['lehetne','conditional'],['must','required'],['should','required'],['expected','expected'],['money_possible','possible'],['rate_possible','possible'],['attributed','possible'],['year','possible']])test(`C01 governing modality: ${id}`,()=>{
 const r=result(id),ns=r.frames.flatMap(f=>f.numericArguments);assert.ok(ns.length);
 assert.ok(ns.some(n=>n.semanticScope.modalities.some(m=>m.kind===kind)));
 for(const n of ns){assert.equal(n.semanticScope.unconditionalEqualityAllowed,false);assert.ok(n.semanticScope.predicateSpan);}
 assert.ok(r.frames.some(f=>f.semanticScope.modalities.some(m=>m.kind===kind)));
});
test('C01 bare and explicit equalities retain previous attachment semantics',()=>{
 for(const id of ['equal','exact','money_exact']){const n=args(id)[0];assert.ok(has(n,'equal'));assert.deepEqual(n.semanticScope.modalities,[]);}
 for(const id of ['exact','money_exact']){const n=args(id)[0];assert.equal(n.binding,'resolved');assert.equal(n.semanticScope.unconditionalEqualityAllowed,true);}
 assert.equal(args('equal')[0].binding,'unresolved'); // NLP amod, not evidence for a new attachment.
});
test('C01 percentage change and resulting level remain distinct',()=>{
 const delta=args('percent_delta')[0],level=args('percent_level')[0];
 assert.equal(delta.semanticKind,'percentage');assert.ok(has(delta,'change_magnitude'));assert.ok(has(level,'resulting_level'));
 assert.equal(delta.semanticScope.comparison[0].direction,'increase');
 assert.equal(delta.semanticScope.unconditionalEqualityAllowed,false);
});
test('C01 preserves negative comparison without reversing it into equality',()=>{
 const r=result('negated'),n=r.frames[0].numericArguments[0];assert.ok(has(n,'greater_than'));assert.equal(n.semanticScope.polarity,'denied');assert.equal(n.semanticScope.unconditionalEqualityAllowed,false);assert.ok(n.semanticScope.modalities.some(m=>m.kind==='possible'));
});
test('C01 ambiguous bounded correction keeps separate branch-local operators and abstains',()=>{
 const r=result('contrast'),ns=r.frames.flatMap(f=>f.numericArguments);assert.deepEqual(ns.map(n=>n.value),[11,16]);
 for(const n of ns){assert.equal(n.binding,'unresolved');assert.ok(has(n,'less_or_equal'));assert.equal(n.semanticScope.unconditionalEqualityAllowed,false);}
 assert.notEqual(ns[0].semanticScope.comparison[0].evidenceSpan.start,ns[1].semanticScope.comparison[0].evidenceSpan.start);
 assert.equal(r.contrasts[0].binding,'unresolved');
});
test('C01 measurement reference cannot be a resolved count despite broken parser lemma',()=>{
 const ns=args('reference');assert.equal(ns[0].binding,'unresolved');assert.ok(has(ns[0],'reference'));assert.ok(has(ns[0],'dimension_unresolved'));assert.equal(ns[0].bindingEvidence.resolutionStatus,'unresolved');
 assert.ok(ns[1].semanticScope.modalities.some(m=>m.kind==='possible'));assert.equal(ns[1].semanticScope.unconditionalEqualityAllowed,false);
});
test('C01 sibling finite predicates do not inherit possibility or obligation',()=>{
 const r=result('sibling');assert.ok(r.frames[0].semanticScope.modalities.some(m=>m.kind==='possible'));assert.deepEqual(r.frames[1].numericArguments[0].semanticScope.modalities,[]);
 const s=result('aux_sibling');assert.equal(s.frames[0].numericArguments[0].semanticScope.unconditionalEqualityAllowed,true);assert.ok(s.frames[1].semanticScope.modalities.some(m=>m.kind==='required'));
});
test('C01 future assertion is not possibility',()=>{const m=args('future')[0].semanticScope.modalities;assert.ok(m.some(m=>m.kind==='future'));assert.ok(!m.some(m=>m.kind==='possible'));});
test('C01 source and quantity qualifiers remain independent',()=>{const f=result('attributed').frames[0];assert.equal(f.source.mention,'tanács');assert.equal(f.numericArguments[0].value,23000000);assert.ok(has(f.numericArguments[0],'possible_extent'));});
test('C01 range endpoints are not independent positive counts',()=>{for(const id of ['range_dash','range_words'])for(const n of args(id)){assert.equal(n.binding,'unresolved');const r=n.semanticScope.comparison.find(q=>q.operator==='range');assert.deepEqual(r.value,{lower:70,upper:83});}});
test('C01 B01 denominator remains lossless with simultaneous qualifiers',()=>{
 for(const id of ['rate_equal','rate_max','rate_above','rate_below','rate_possible']){const n=args(id)[0];assert.equal(n.binding,'unresolved');assert.equal(n.unit.denominator,'h');assert.equal(n.semanticKind,'compound_rate');}
});
test('C01 lower/upper bound coexist with morphology, not equality',()=>{const n=args('bounded_possible')[0];assert.ok(has(n,'less_or_equal'));assert.ok(n.semanticScope.modalities.some(m=>m.kind==='possible'));assert.equal(n.semanticScope.unconditionalEqualityAllowed,false);});
test('C01 finite morphology fallback works when parser incorrectly reports indicative',()=>{const x=input('potential');x.annotation.tokens.find(t=>t.text==='alkalmazhat').morph.Mood='Ind';const n=bind(x.text,x.annotation).frames[0].numericArguments[0];assert.ok(n.semanticScope.modalities.some(m=>m.kind==='possible'));});
test('C01 lexical non-modal control does not gain possibility',()=>{assert.ok(args('lexical_control').every(n=>n.semanticScope.modalities.length===0));});
test('C01 reversed range remains an invalid unresolved candidate, never equality',()=>{
 const x=input('range_dash');x.text=x.text.replace('70–83','83–70');
 for(const group of ['tokens','sentences','entities'])for(const t of x.annotation[group])t.text=x.text.slice(t.start,t.end);
 const ns=bind(x.text,x.annotation).frames.flatMap(f=>f.numericArguments);assert.ok(ns.length);
 for(const n of ns){assert.equal(n.binding,'unresolved');assert.equal(n.semanticScope.comparison[0].validOrder,false);}
});
test('C01 unresolved correction exposes scoped candidates without invented accepted role',()=>{
 const c=result('contrast').contrasts[0];assert.equal(c.binding,'unresolved');assert.equal(c.numericScopeCandidates.length,2);
 for(const n of c.numericScopeCandidates){assert.equal(n.semanticScope.contrastBranch,'unresolved');assert.ok(has(n,'less_or_equal'));assert.equal(n.semanticScope.projectionAllowed,false);}
});
test('C01 source-side potential cannot leak across a reporting complement',()=>{
 const {guardNumericScope}=require('../../scripts/experimental/numeric-scope-safety.cjs');
 const raw='A tanács közölhet adatot, de a műhely pontosan 46 dobozt tárol.';
 const p=raw.indexOf('tárol'),n=raw.indexOf('46'),h=raw.indexOf('doboz'),s=raw.indexOf('közölhet');
 const sp=(start,end)=>({start,end,textSpan:raw.slice(start,end)});
 const a={tokens:[{start:s,end:s+8,text:'közölhet',lemma:'közölhet',pos:'VERB',morph:{VerbForm:'Fin',Mood:'Pot'},headStart:s,dep:'ROOT'},{start:n,end:n+2,text:'46',lemma:'46',pos:'NUM',morph:{},headStart:h,dep:'nummod'},{start:h,end:h+6,text:'dobozt',lemma:'doboz',pos:'NOUN',morph:{},headStart:p,dep:'obj'},{start:p,end:p+5,text:'tárol',lemma:'tárol',pos:'VERB',morph:{VerbForm:'Fin',Mood:'Ind'},headStart:s,dep:'conj'}]};
 const out=guardNumericScope(raw,a,{frames:[{content:sp(raw.indexOf('de'),raw.length),actionSpan:sp(p,p+5),frameId:'local',polarity:'asserted',numericArguments:[{start:n,end:h+6,evidenceSpan:sp(n,h+6),binding:'resolved'}]}]});
 assert.deepEqual(out.frames[0].numericArguments[0].semanticScope.modalities,[]);assert.equal(out.frames[0].numericArguments[0].semanticScope.unconditionalEqualityAllowed,true);
});
test('C01 all semantic evidence includes exact raw spans, scope and no canonical projection',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);for(const f of r.frames)for(const n of f.numericArguments){assert.equal(n.semanticScope.projectionAllowed,false);assert.equal(n.semanticScope.frameId,f.frameId);}}
});
