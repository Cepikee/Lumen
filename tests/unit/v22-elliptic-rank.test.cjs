"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/rank-annotations.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
const nums=id=>run(id).frames.flatMap(f=>f.numericArguments);
for(const [id,value,owner] of [['simple',4,'Eszter'],['other',2,'Bálint'],['explicit',5,'Eszter'],['advance',2,'Eszter']])test(`rank result and structural owner: ${id}`,()=>{
 const n=nums(id)[0];assert.equal(n.binding,'resolved');assert.equal(n.semanticKind,'rank');assert.equal(n.value,value);assert.equal(n.owner.mention,owner);assert.ok(n.bindingEvidence.dependencyPath.some(e=>e.relation==='nsubj'));
});
for(const id of ['round','occasion','day','district'])test(`nominal modifier is not a placement: ${id}`,()=>{const ns=nums(id);assert.equal(ns.length,1);assert.equal(ns[0].semanticKind,'ordinal');assert.ok(!ns.some(n=>n.semanticKind==='rank'));});
test('ordinal round and elliptic result have separate values and targets',()=>{const ns=nums('mixed');assert.deepEqual(ns.map(n=>[n.value,n.semanticKind]),[[3,'ordinal'],[2,'rank']]);assert.equal(ns[1].owner.mention,'Eszter');assert.notEqual(ns[0].owner.evidenceSpan.start,ns[1].owner.evidenceSpan.start);});
test('attributing person is not the ranked subject',()=>{const r=run('multiple'),f=r.frames[0];assert.equal(f.source.mention,'Bálint');assert.equal(f.numericArguments[0].owner.mention,'Eszter');assert.equal(f.numericArguments[0].binding,'resolved');});
test('parser lacks subject edge: attribution is retained without inventing rank owner',()=>{const r=run('source');assert.equal(r.frames[0].source.mention,'szövetség');assert.ok(nums('source').every(n=>n.binding==='unresolved'));});
test('rank correction resolves only accepted alternative with its owner',()=>{const r=run('contrast');assert.equal(r.contrasts[0].rejected.value,4);assert.equal(r.contrasts[0].accepted.value,2);const ns=r.frames.flatMap(f=>f.numericArguments);assert.deepEqual(ns.map(n=>[n.value,n.semanticKind,n.binding]),[[2,'rank','resolved']]);assert.equal(ns[0].owner.mention,'Eszter');assert.ok(r.frames.every(f=>f.polarity==='asserted'));});
test('implicit owner contrast preserves alternatives but abstains on positive binding',()=>{const r=run('implicit');assert.equal(r.contrasts[0].rejected.value,4);assert.equal(r.contrasts[0].accepted.value,2);assert.deepEqual(nums('implicit').map(n=>[n.value,n.binding]),[[2,'unresolved']]);});
for(const id of ['ambiguous','coordination'])test(`predicative uncertainty abstains: ${id}`,()=>{assert.ok(nums(id).length);assert.ok(nums(id).every(n=>n.binding==='unresolved'));});
test('adversarial calendar, ordinal and count are never recast as the elliptic ranking',()=>{const ns=nums('numbers');assert.equal(ns.find(n=>n.value===2027).semanticKind,'year');assert.equal(ns.find(n=>n.value===3).semanticKind,'ordinal');assert.notEqual(ns.find(n=>n.value===12).semanticKind,'rank');assert.ok(ns.every(n=>n.binding==='unresolved'||n.semanticKind==='ordinal'));});
test('copula and subject evidence are both necessary',()=>{
 for(const mutation of ['subject','copula','entity']){const x=structuredClone(cases.find(x=>x.id==='simple'));
 if(mutation==='subject')x.annotation.tokens[0].dep='nmod:att';else if(mutation==='copula')x.annotation.tokens.find(t=>t.dep==='cop').dep='advcl';else x.annotation.entities=[];
 const r=bind(x.text,x.annotation);assert.ok(r.frames.flatMap(f=>f.numericArguments).every(n=>n.binding!=='resolved'||n.semanticKind!=='rank'));}
});
test('all new rank evidence remains raw-source exact and canonical projection disabled',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);for(const f of r.frames)for(const n of f.numericArguments)if(n.binding==='resolved'&&n.semanticKind==='rank'){assert.ok(n.owner);assert.equal(n.bindingEvidence.frameId,f.frameId);assert.ok(n.bindingEvidence.rule);}}
});
