"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/source-composition-annotations.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const input=id=>structuredClone(cases.find(x=>x.id===id));
const run=id=>{const x=input(id);return bind(x.text,x.annotation);};
const expected={paper:'hetilap',institution:'hatóság',police:'kapitányság',person:'Judit',company:'vállalat',nested:'hetilap',recipient:'hivatal',actor:'kapitányság',numeric:'vállalat',negation:'hivatal',modal:'hetilap',money:'hatóság',temporal:'hivatal',contrast:'hivatal',quote:'hivatal',named:'Esti Krónika',nested_possessor:'cég vezetőjének'};
for(const [id,source]of Object.entries(expected))test(`C02 structurally composed source: ${id}`,()=>{
 const r=run(id),relation=r.reportingNominalRelations[0];assert.equal(relation.source.mention,source);assert.equal(relation.binding,'resolved');assert.ok(relation.dependencyEvidence.length>=2);
 for(const f of r.frames)assert.notEqual(f.source?.mention,relation.reportingNominal.textSpan);
 for(const c of r.attributionChains)for(const e of c.edges)assert.notEqual(e.source?.mention,relation.reportingNominal.textSpan);
});
for(const id of ['bare_plural','bare_report','bare_statement','multiple','ambiguous','pronoun'])test(`C02 unsupported source identity abstains: ${id}`,()=>{const r=run(id);assert.equal(r.reportingNominalRelations[0].binding,'unresolved');assert.equal(r.reportingNominalRelations[0].source,null);assert.ok(r.frames.every(f=>!f.source));});
test('C02 nested chain preserves source order and explicit inner proposition target',()=>{const c=run('nested').attributionChains[0];assert.equal(c.binding,'resolved');assert.deepEqual(c.edges.map(e=>e.source.mention),['hetilap','szóvivő']);assert.equal(c.edges[1].parentAttributionId,c.edges[0].id);});
test('C02 recipient is never promoted to source',()=>{const r=run('recipient');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['hivatal','szóvivő']);assert.ok(r.frames.every(f=>f.source?.mention!=='lapnak'));});
test('C02 source does not replace actor or numeric owner',()=>{
 const a=run('actor');assert.ok(a.frames.every(f=>!f.actor||f.actor.mention!=='kapitányság'));
 const n=run('numeric').frames.flatMap(f=>f.numericArguments);assert.ok(n.length);assert.ok(n.every(n=>n.owner?.mention!=='vállalat'));
});
test('C02 preserves C01 modal money and temporal qualifiers',()=>{for(const id of ['modal','temporal']){const n=run(id).frames.flatMap(f=>f.numericArguments);assert.ok(n.length);assert.ok(n.some(n=>n.semanticScope.modalities.some(m=>m.kind==='possible')));assert.ok(n.every(n=>!n.semanticScope.unconditionalEqualityAllowed));}});
test('C02 negative proposition remains denied',()=>{assert.equal(run('negation').frames[0].polarity,'denied');});
test('C02 non-reporting object use creates no attribution',()=>{const r=run('nonreport');assert.deepEqual(r.reportingNominalRelations,[]);assert.ok(r.frames.every(f=>!f.source));});
test('C02 possessive person-role is not mistaken for an event nominal',()=>{assert.deepEqual(run('possessive_role').reportingNominalRelations,[]);});
test('C02 independent sentences retain independent sources',()=>{const r=run('two');assert.deepEqual(r.reportingNominalRelations.map(r=>r.source.mention),['hivatal','vállalat']);assert.deepEqual(r.frames.map(f=>f.source?.mention),['hivatal','vállalat']);});
test('C02 attribution does not cross sentence boundary',()=>{const r=run('boundary');assert.equal(r.frames[0].source.mention,'hivatal');assert.equal(r.frames[1].source,null);});
test('C02 detached possessor cannot resolve by surface adjacency',()=>{const x=input('institution');x.annotation.tokens.find(t=>t.text==='hatóság').headStart=2;const r=bind(x.text,x.annotation);assert.equal(r.reportingNominalRelations[0].source,null);assert.ok(r.frames.every(f=>!f.source));});
test('C02 exact evidence, separate reporting nominal and canonical OFF',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);const walk=v=>{if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);};walk(r);assert.deepEqual(r.canonical,[]);}
});
test('C02 negated reporting predicate never creates a positive resolved nested chain',()=>{
 const x=require('../fixtures/real-text-a/source-composition-extra.json').find(x=>x.id==='negative_report');const r=bind(x.text,x.annotation);
 assert.ok(r.attributionChains.length);assert.ok(r.attributionChains.every(c=>c.binding==='unresolved'));
});
test('C02 productive nominal derivation works beyond the original reporting examples',()=>{
 const x=require('../fixtures/real-text-a/source-composition-extra.json').find(x=>x.id==='unknown_evidence');const r=bind(x.text,x.annotation);
 assert.equal(r.reportingNominalRelations[0].source.mention,'kutató');assert.equal(r.frames[0].source.mention,'kutató');
});
