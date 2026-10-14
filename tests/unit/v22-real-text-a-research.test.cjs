"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const inputs=require('../fixtures/real-text-a/development-annotations.json');
// Historical morphology-stage fixtures; dependency safety is a separate gate.
let {bind:bindDependency, bindMorphologyStage:bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
let base=require('../../scripts/experimental/role-scope-binder.cjs');
const closure=require('../fixtures/real-text-a/safety-closure-annotations.json');
const dependencyExtra=require('../fixtures/real-text-a/dependency-extra-annotations.json');
const close=id=>{const x=structuredClone(closure.find(x=>x.id===id));return bind(x.text,x.annotation);};
const run=id=>{const x=structuredClone(inputs.find(x=>x.id===id));return bind(x.text,x.annotation).frames;};
for(const x of inputs)test('real text A evidence and research boundary: '+x.id,()=>{
 const out=bind(x.text,x.annotation);
 function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);} 
 walk(out);assert.deepEqual(out.canonical,[]);assert.equal(out.projectionState,'disabled_research_only');
 for(const f of out.frames)assert.equal(f.canonicalProjectionAllowed,false);
});
test('dependency-backed numeric bindings stay attached to the correct nominal head',()=>{
 const lookup=id=>{const x=structuredClone(dependencyExtra.find(x=>x.id===id));return bindDependency(x.text,x.annotation).frames[0];};
 assert.deepEqual(lookup('money_adj').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[38000000,'money','szerződés']]);
 assert.deepEqual(lookup('share').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[30,'percentage','részesedést']]);
 assert.deepEqual(lookup('age_measurement').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[38,'age','férfi'],[120,'measurement','kilométert']]);
 assert.equal(lookup('disjunctive_actor').actor,null);
 assert.equal(lookup('disjunctive_actor').binding,'unresolved');
});
test('reset research module state after dependency-backed numeric bindings',()=>{
 for(const mod of ['../../scripts/experimental/real-text-a-binder.cjs','../../scripts/experimental/role-scope-binder.cjs','../../scripts/experimental/contrast-correction.cjs','../../scripts/experimental/attribution-chain.cjs','../../scripts/experimental/dependency-binding.cjs'])delete require.cache[require.resolve(mod)];
 ({bind:bindDependency, bindMorphologyStage:bind}=require('../../scripts/experimental/real-text-a-binder.cjs'));
 base=require('../../scripts/experimental/role-scope-binder.cjs');
});
test('possessors, targets and implicit actors do not resolve as named actors',()=>{
 for(const id of ['possessor','possessor_object','target','topic','postposition','implicit','recipient_not_actor','multiple','location'])assert.ok(run(id).every(f=>!f.actor),id);
 assert.equal(run('explicit')[0].actor.mention,'Márton');
 const x=structuredClone(inputs.find(x=>x.id==='possessor'));assert.equal(base.bind(x.text,x.annotation).frames[0].actor.mention,'Márton');
});
test('recipient needs reporting valency and a personal referent',()=>{
 for(const id of ['report_conversation','report_ins','report_ela','report_apposition','report_target'])assert.ok(run(id).every(f=>!f.recipient),id);
 assert.equal(run('report_dative')[0].recipient.mention,'Eszternek');
 assert.equal(run('report_pronoun')[0].recipient.mention,'vele');
 assert.equal(run('quote_target')[0].source,null);
 assert.equal(run('quote_boundary')[1].source.mention,'Márton');
 assert.equal(run('quote_no_speaker')[1].source,null);
});
test('sentence duration, age and year/tariff stay distinct',()=>{
 assert.equal(run('duration')[0].numericArguments[0].semanticKind,'duration');
 assert.equal(run('duration_contract')[0].numericArguments[0].semanticKind,'duration');
 assert.deepEqual(run('age_duration')[0].numericArguments.map(n=>n.semanticKind),['age','duration']);
 for(const id of ['year_tariff','year_tariff_words']){const ns=run(id)[0].numericArguments;assert.deepEqual(ns.map(n=>n.semanticKind),['year','tariff_rate']);assert.equal(ns[1].unit,'%');}
 assert.equal(run('measurement')[0].numericArguments[0].value,-12);
 assert.equal(run('money')[0].numericArguments[0].unit,'HUF');
 assert.equal(run('share')[0].numericArguments[0].property,'share');
 assert.equal(run('threshold')[0].numericArguments[0].semanticKind,'threshold');
});
test('negation belongs to its predicate rather than the whole sentence',()=>{
 assert.deepEqual(run('negative_pair').map(f=>f.polarity),['denied','asserted']);
 assert.deepEqual(run('despite').map(f=>f.polarity),['denied','asserted']);
 assert.deepEqual(run('relative').map(f=>f.polarity),['denied','asserted']);
 for(const id of ['incidental','not_hidden','not_small','not_only'])assert.ok(run(id).every(f=>f.polarity==='asserted'),id);
 for(const id of ['quote_negative','negative_existential','neither'])assert.equal(run(id)[0].polarity,'denied',id);
 assert.equal(run('report_denied')[0].polarity,'unresolved');
});
test('age never inherits the payer when the age modifies a different referent',()=>{
 const f=close('age_recipient').frames[0];
 assert.equal(f.numericArguments[0].owner,null);
 assert.equal(f.numericArguments[0].binding,'unresolved');
 assert.equal(f.numericArguments[1].owner.mention,'Márton');
 assert.equal(f.binding,'unresolved');
 const x=structuredClone(closure.find(x=>x.id==='age_recipient'));
 x.annotation.entities.find(e=>e.text==='Eszternek').label='PER';
 const age=bind(x.text,x.annotation).frames[0].numericArguments[0];
 assert.equal(age.owner.mention,'Eszternek');
 assert.equal(age.property,'age');
 assert.equal(age.binding,'resolved');
});
test('nested attribution is explicit while direct source and actor remain separate',()=>{
 assert.equal(close('nested_source').frames[0].source,null);
 assert.deepEqual(close('nested_source').attributionChains[0].edges.map(e=>e.source.mention),['lap','Márton']);
 assert.equal(close('nested_source').frames[0].claimOwner.mention,'Márton');
 const f=close('source_actor').frames[0];
 assert.equal(f.source.mention,'Márton'); assert.equal(f.actor.mention,'Eszter');
 assert.equal(f.numericArguments[0].owner.mention,'Eszter');
});
test('nominal amounts and possessive company heads do not inherit a person owner',()=>{
 assert.ok(close('possessive_gap').frames.every(f=>!f.actor));
 assert.ok(close('ambiguous_number').frames.flatMap(f=>f.numericArguments).every(n=>!n.owner&&n.binding==='unresolved'));
});
test('contrast and conditions remain local and ambiguous contrasts abstain',()=>{
 assert.equal(close('contrast_actor').frames[0].actor.mention,'Eszter');
 assert.equal(close('contrast_actor').contrasts[0].rejected.value,'márton');
 assert.deepEqual(close('contrast_number').frames.flatMap(f=>f.numericArguments).map(n=>[n.value,n.binding]),[[20,'resolved']]);
 assert.equal(close('contrast_number').contrasts[0].rejected.value,10);
 assert.deepEqual(close('condition').frames.map(f=>f.conditionality),[true,true,false]);
});
test('title and organization boundaries remain distinct and all binding evidence is exact',()=>{
 assert.deepEqual(close('title').entities.map(e=>e.mention),['Eszter']);
 assert.deepEqual(close('org_person').entities.map(e=>e.mention),['Kovács Anna','Tölgy Bank']);
 for(const x of closure){const out=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(out);assert.deepEqual(out.canonical,[]);for(const f of out.frames){if(f.actor)assert.ok(f.actorEvidence);for(const n of f.numericArguments)if(n.binding==='resolved')assert.ok(n.bindingEvidence);}}
});
test('passive subjects and overextended person names are not asserted as actors',()=>{
 const passive=structuredClone(inputs.find(x=>x.id==='explicit'));
 passive.annotation.tokens.find(t=>t.pos==='VERB').morph.Voice='Pass';
 assert.equal(bind(passive.text,passive.annotation).frames[0].actor,null);
 const title=structuredClone(closure.find(x=>x.id==='title'));
 const head=title.annotation.tokens.find(t=>t.lemma==='elnök');
 title.annotation.entities[0].end=head.end;
 title.annotation.entities[0].text=title.text.slice(0,head.end);
 const out=bind(title.text,title.annotation);
 assert.deepEqual(out.entities,[]);
 assert.equal(out.frames[0].actor,null);
});