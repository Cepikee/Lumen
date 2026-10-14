"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/attribution-annotations.json');
// Historical chain grammar regression; full dependency integration is tested separately.
const {bindMorphologyStage:bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
test('publisher ministry chain keeps source order and leaves implicit event actor unresolved',()=>{
 const r=run('publisher_ministry');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['Telex','minisztérium']);
 assert.equal(r.attributionChains[0].binding,'resolved');const f=r.frames[0];assert.equal(f.actor,null);assert.equal(f.source,null);assert.equal(f.claimOwner.mention,'minisztérium');assert.equal(f.action,'emel');assert.equal(f.numericArguments[0].value,2027);
});
test('police witness and person performing the action remain three separate roles',()=>{
 const r=run('police_witness');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['rendőrség','tanú']);assert.equal(r.frames[0].actor.mention,'Kovács Péter');assert.equal(r.frames[0].claimOwner.mention,'tanú');assert.equal(r.frames[0].action,'elhagy');
});
test('reported negation and denial do not become positive facts or resolved pronoun actors',()=>{
 const r=run('publisher_government');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['RTL','kormány']);assert.equal(r.frames[0].polarity,'denied');assert.equal(r.frames[0].claimOwner.mention,'kormány');
 const d=run('denial');assert.equal(d.frames[0].polarity,'denied');assert.equal(d.frames[0].status,'denied_claim');assert.equal(d.frames[0].actor,null);assert.equal(d.frames[0].action,'aláír');assert.deepEqual(d.attributionChains[0].edges.map(e=>e.source.mention),['lap','politikus']);
});
test('publication recipient never becomes claim source or quantity owner',()=>{
 const r=run('recipient'),e=r.attributionChains[0].edges[0],f=r.frames[0];assert.equal(e.source.mention,'miniszter');assert.equal(e.recipient.mention,'Népszavának');assert.equal(e.recipient.normalized,null);assert.equal(f.actor.mention,'vállalat');assert.equal(f.action,'felvesz');assert.equal(f.numericArguments[0].value,300);assert.equal(f.numericArguments[0].unit,'person');assert.equal(f.numericArguments[0].subject,null);
});
test('publisher citation and possessive spokesperson form an ordered three-edge chain',()=>{
 const r=run('intermediate'),c=r.attributionChains[0];assert.equal(c.binding,'resolved');assert.deepEqual(c.edges.map(e=>e.source.mention),['Portfolio','Reutersre','cég szóvivője']);assert.equal(c.edges[1].source.normalized,'reuters');assert.equal(r.frames[0].numericArguments[0].value,4.2e9);assert.equal(r.frames[0].numericArguments[0].unit,'EUR');assert.equal(r.frames[0].actor,null);
});
test('ambiguous, absent and negated reporting sources abstain without flattening',()=>{
 for(const id of ['ambiguous','missing','negative_report']){const r=run(id);assert.equal(r.attributionChains[0].binding,'unresolved');assert.ok(r.frames.every(f=>f.source===null&&f.binding==='unresolved'));}
 assert.equal(run('negative_report').frames[0].polarity,'unresolved');
});
test('every resolved edge links exact raw evidence, ordered parents and a real proposition frame',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);
 for(const c of r.attributionChains)if(c.binding==='resolved'){const ids=new Set([...c.edges.map(e=>e.id),...r.frames.map(f=>f.frameId)]);c.edges.forEach((e,i)=>{assert.equal(e.depth,i);assert.equal(e.parentAttributionId,i?c.edges[i-1].id:null);assert.ok(ids.has(e.targetId));assert.ok(e.source.evidenceSpan&&e.verbSpan&&e.propositionSpan&&e.rule);});}
 assert.deepEqual(r.canonical,[]);assert.equal(r.projectionState,'disabled_research_only');assert.ok(r.frames.every(f=>f.canonicalProjectionAllowed===false));}
});
test('source chains and denial scope cannot leak into an adjacent sentence',()=>{
 const first=cases.find(x=>x.id==='denial'),second=cases.find(x=>x.id==='police_witness');
 const offset=first.text.length+1,text=first.text+' '+second.text;
 const shifted={};for(const key of ['tokens','entities','sentences'])shifted[key]=second.annotation[key].map(x=>({...x,start:x.start+offset,end:x.end+offset}));
 const a={};for(const key of ['tokens','entities','sentences'])a[key]=[...first.annotation[key],...shifted[key]];
 const r=bind(text,a);assert.equal(r.attributionChains.length,2);assert.deepEqual(r.frames.map(f=>f.polarity),['denied','asserted']);assert.equal(r.frames[1].actor.mention,'Kovács Péter');assert.equal(r.frames[1].claimOwner.mention,'tanú');assert.notEqual(r.frames[0].attributionChainId,r.frames[1].attributionChainId);
 for(const c of r.attributionChains)assert.ok(c.propositionIds.every(id=>r.frames.some(f=>f.frameId===id)));
});
