"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const rows=require('../fixtures/real-text-a/fb02-controlled-annotations.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const {composeSources}=require('../../scripts/experimental/source-composition-safety.cjs');
const {validAnnotation}=require('../../scripts/experimental/morph-worker-client.cjs');
const input=id=>structuredClone(rows.find(r=>r.id===id));
const run=id=>{const r=input(id);return bind(r.text,r.annotation);};
const sources=o=>[...o.frames.map(f=>f.source),...o.attributionChains.flatMap(c=>c.edges.map(e=>e.source))].filter(Boolean);
const types=['price','report','notice','account','brief','document','data','table','minutes','communication','information','statement'];
for(const id of types){
 test(`FB02 possessed information artifact: ${id}`,()=>{const o=run(id),r=o.reportingNominalRelations[0];assert.equal(r.source.mention,'szövetség');assert.equal(r.binding,'resolved');assert.deepEqual(r.sourceArtifact,r.reportingNominal);assert.equal(r.claimFrameIds.length,1);assert.ok(r.dependencyEvidence.length>=3);assert.ok(sources(o).every(s=>s.mention==='szövetség'));});
 test(`FB02 bare artifact has evidence but no entity: ${id}`,()=>{const o=run('bare_'+id),r=o.reportingNominalRelations[0];assert.equal(r.source,null);assert.equal(r.binding,'unresolved');assert.ok(r.sourceArtifact.textSpan);assert.equal(sources(o).length,0);});
}
for(const[id,name]of Object.entries({media:'hetilap',person:'Judit',named:'Esti Krónika',nested_owner:'cég leányvállalatának'}))test(`FB02 entity-bearing NP preserved: ${id}`,()=>{const r=run(id).reportingNominalRelations[0];assert.equal(r.source.mention,name);assert.equal(r.binding,'resolved');});
for(const id of ['multiple','ambiguous','pronoun','artifact_owner'])test(`FB02 ambiguous or non-entity possessor: ${id}`,()=>{const o=run(id);assert.equal(o.reportingNominalRelations[0].source,null);assert.equal(sources(o).length,0);});
for(const id of ['nonreport_price','nonreport_report','nonreport_notice'])test(`FB02 lexical artifact alone never creates attribution: ${id}`,()=>{const o=run(id);assert.deepEqual(o.reportingNominalRelations,[]);assert.deepEqual(o.attributionChains,[]);assert.equal(sources(o).length,0);});
test('FB02 source and explicit actor stay separate',()=>{const f=run('money').frames[0];assert.equal(f.source.mention,'hatóság');assert.equal(f.actor.mention,'Judit');});
test('FB02 source repair never invents a previously unresolved actor',()=>{const o=run('actor');assert.equal(o.reportingNominalRelations[0].source.mention,'kapitányság');assert.equal(o.frames[0].actor,null);});
test('FB02 numeric owner is not the origin or artifact',()=>{const f=run('numeric').frames[0];assert.equal(f.source.mention,'vállalat');assert.equal(f.numericArguments[0].owner.mention,'dolgozót');assert.equal(f.numericArguments[0].value,280);});
test('FB02 modal numeric proposition remains qualified',()=>{const f=run('modal').frames[0];assert.equal(f.source.mention,'hetilap');assert.equal(f.modality,'possible');assert.equal(f.numericArguments[0].semanticScope.unconditionalEqualityAllowed,false);});
test('FB02 negative proposition remains denied',()=>assert.equal(run('negation').frames[0].polarity,'denied'));
test('FB02 correction remains positive with separate rejected actor',()=>{const f=run('contrast').frames[0];assert.equal(f.actor.mention,'Lilla');assert.equal(f.polarity,'asserted');assert.equal(f.contrasts[0].rejected.value,'judit');assert.equal(f.source.mention,'hivatal');});
for(const id of ['speaker','quote','recipient'])test(`FB02 artifact and inner speaker retain ordered chain: ${id}`,()=>{const o=run(id),c=o.attributionChains[0];assert.equal(c.binding,'resolved');assert.deepEqual(c.edges.map(e=>e.source?.mention),[id==='speaker'?'hetilap':'hivatal','szóvivő']);assert.equal(c.edges[1].parentAttributionId,c.edges[0].id);assert.ok(o.reportingNominalRelations[0].claimFrameIds.length>0);assert.ok(sources(o).every(s=>s.mention!=='lapnak'));if(id==='recipient')assert.equal(c.edges[1].recipient.mention,'lapnak');});
test('FB02 outer publication and inner artifact owner are not flattened',()=>{const o=run('outer'),c=o.attributionChains.find(c=>c.rule==='outer_evidential_then_possessive_artifact');assert.equal(c.binding,'resolved');assert.deepEqual(c.edges.map(e=>e.source.mention),['lap','vállalat']);assert.equal(c.edges[1].sourceArtifact.textSpan,'jelentése');assert.equal(c.edges[1].parentAttributionId,c.edges[0].id);assert.deepEqual(c.propositionIds,o.reportingNominalRelations[0].claimFrameIds);});
test('FB02 sentence boundary isolates the source',()=>{const o=run('boundary');assert.deepEqual(o.frames.map(f=>f.source?.mention??null),['hivatal',null]);});
test('FB02 two independent artifacts retain two sources',()=>{const o=run('two');assert.deepEqual(o.reportingNominalRelations.map(r=>r.source.mention),['hivatal','vállalat']);assert.deepEqual(o.frames.map(f=>f.source?.mention),['hivatal','vállalat']);});
for(const [name,mutate] of [
 ['detached possessor',a=>{a.tokens.find(t=>t.text==='szövetség').headStart=0;}],
 ['recipient case',a=>{a.tokens.find(t=>t.text==='szövetség').morph.Case='Dat';}],
 ['actor-only dependency',a=>{a.tokens.find(t=>t.text==='szövetség').dep='nsubj';}],
 ['missing possession',a=>{delete a.tokens.find(t=>t.lemma==='dokumentum').morph['Person[psor]'];}],
 ['non-attribution attachment',a=>{a.tokens.find(t=>t.lemma==='dokumentum').dep='obj';}]
])test(`FB02 parser mutation does not assert source: ${name}`,()=>{const r=input('document');mutate(r.annotation);const o=bind(r.text,r.annotation);assert.equal(o.reportingNominalRelations[0].source,null);assert.equal(o.reportingNominalRelations[0].binding,'unresolved');assert.ok(sources(o).every(s=>s.mention!=='dokumentuma'));});
test('FB02 missing claim frame forbids resolved origin',()=>{const r=input('document');const o=composeSources(r.text,r.annotation,{frames:[],attributionChains:[]});assert.equal(o.reportingNominalRelations[0].source,null);assert.ok(o.reportingNominalRelations[0].unresolvedReasons.includes('artifact_claim_target_unproven'));});
test('FB02 duplicate possible claim targets abstain',()=>{const r=input('document'),o=run('document');o.frames.push({...o.frames[0],frameId:'ambiguous'});composeSources(r.text,r.annotation,o);assert.equal(o.reportingNominalRelations[0].source,null);});
test('FB02 artifact lemma inside proper publication name is not blacklisted',()=>{const r=input('named');const t=r.annotation.tokens.find(t=>t.text==='Krónika');t.lemma='közlemény';assert.equal(t.pos,'PROPN');const o=bind(r.text,r.annotation);assert.equal(o.reportingNominalRelations[0].source.mention,'Esti Krónika');});
test('FB02 every controlled annotation and emitted span is exact; canonical OFF',()=>{let n=0;for(const r of rows){assert.ok(validAnnotation(r.text,r.annotation),r.id);const o=bind(r.text,r.annotation);const walk=x=>{if(!x||typeof x!=='object')return;if(Number.isInteger(x.start)&&Number.isInteger(x.end)&&typeof x.textSpan==='string'){assert.equal(r.text.slice(x.start,x.end),x.textSpan,r.id);n++;}for(const v of Object.values(x))if(v&&typeof v==='object')walk(v);};walk(o);assert.deepEqual(o.canonical,[]);assert.equal(o.projectionState,'disabled_research_only');}assert.ok(n>500);});
