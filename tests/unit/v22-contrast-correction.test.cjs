"use strict";
const {test}=require('node:test');
const assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/contrast-annotations.json');
// These historical fixtures isolate correction grammar without dependency data.
const {bindMorphologyStage:bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
test('actor correction keeps only Anna positive and signing is not attribution',()=>{
 const r=run('actor'),f=r.frames[0],c=r.contrasts[0];
 assert.equal(c.slot,'actor');assert.equal(c.rejected.value,'péter');assert.equal(c.accepted.value,'anna');
 assert.equal(f.actor.mention,'Anna');assert.equal(f.action,'aláír');assert.equal(f.source,null);assert.equal(f.polarity,'asserted');
});
test('quantity, amount and year corrections share a slot and reject the old value',()=>{
 for(const [id,slot,rejected,accepted] of [['number','number',20,35],['money','amount',3e9,4.2e9],['year','date/time',2025,2026]]){
  const r=run(id),c=r.contrasts[0];assert.equal(c.binding,'resolved');assert.equal(c.slot,slot);
  assert.equal(c.rejected.value,rejected);assert.equal(c.accepted.value,accepted);
  const ns=r.frames.flatMap(f=>f.numericArguments);assert.deepEqual(ns.map(n=>n.value),[accepted]);assert.equal(ns[0].binding,'resolved');assert.equal(ns[0].contrastFrameId,c.frameId);
  assert.ok(r.frames.every(f=>f.polarity==='asserted'));
 }assert.equal(run('money').contrasts[0].rejected.unit,'HUF');
});
test('source correction and attributed numeric correction keep their distinct roles',()=>{
 const f=run('source').frames[0];assert.equal(f.source.normalized,'rendőrség');assert.equal(f.actor.normalized,'rendőrség');assert.equal(f.polarity,'asserted');assert.equal(f.contrasts[0].rejected.value,'minisztérium');
 const n=run('reported').frames[0];assert.equal(n.source.normalized,'vállalat');assert.equal(n.numericArguments[0].value,90);assert.equal(n.numericArguments[0].subject,null);assert.equal(n.numericArguments[0].ownerType,'semantic_role');
});
test('accusative object correction removes the rejected object',()=>{
 const f=run('object').frames[0];assert.deepEqual(f.object,['szerződés']);assert.equal(f.contrasts[0].slot,'object');assert.equal(f.contrasts[0].rejected.value,'levél');
});
test('incompatible alternatives, multiple predicates and repeated correction abstain',()=>{
 for(const id of ['mismatch','two_actions','double']){const r=run(id);assert.equal(r.contrasts[0].binding,'unresolved');assert.ok(r.frames.every(f=>f.binding==='unresolved'&&!f.actor&&!f.source));assert.ok(r.frames.flatMap(f=>f.numericArguments).every(n=>n.binding==='unresolved'));}
});
test('all contrast evidence slices original input and projection remains disabled',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);assert.equal(r.projectionState,'disabled_research_only');for(const c of r.contrasts)if(c.binding==='resolved'){assert.ok(c.frameId&&c.rule&&c.slot&&c.rejected.evidenceSpan&&c.accepted.evidenceSpan);} }
});
