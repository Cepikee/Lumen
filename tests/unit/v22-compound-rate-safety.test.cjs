"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/rate-annotations.json'),{bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
const ns=id=>run(id).frames.flatMap(f=>f.numericArguments);
for(const [id,unit] of [['speed','hour'],['slash','h'],['meters','second'],['volume','minute'],['count','second'],['money','hour'],['monthly','month'],['daily','day'],['area','négyzetméter'],['unknown','cikluson']])test(`lossless unresolved compound candidate: ${id}`,()=>{
 const n=ns(id)[0];assert.equal(n.semanticKind,'compound_rate');assert.equal(n.binding,'unresolved');assert.equal(n.unit.denominator,unit);assert.ok(n.compound.numerator.baseUnit);assert.equal(n.compound.denominators[0].relation,'per');assert.ok(n.evidenceSpan.textSpan.includes(n.compound.denominators[0].evidenceSpan.textSpan));assert.equal(n.owner,null);
});
for(const [id,kind] of [['upper','upper_bound'],['lower','lower_bound'],['below','upper_comparison'],['delta','comparative_delta'],['deltaCount','comparative_delta']])test(`compound qualifier preserved: ${id}`,()=>{
 const n=ns(id)[0];assert.equal(n.binding,'unresolved');assert.ok(n.compound.qualifiers.some(q=>q.kind===kind));assert.equal(n.compound.scopeStatus,'candidate_only');
});
for(const [id,kind] of [['simple','measurement'],['duration','duration'],['clock','clock_time'],['percent','percentage']])test(`non-rate negative control remains intact: ${id}`,()=>{const n=ns(id)[0];assert.equal(n.semanticKind,kind);assert.equal(n.binding,'resolved');assert.equal(n.compound,undefined);});
test('source does not become owner of attributed compound rate',()=>{const f=run('source').frames[0];assert.equal(f.source.mention,'rendőrség');assert.equal(f.numericArguments[0].owner,null);assert.equal(f.numericArguments[0].compound.denominators[0].unit,'h');});
test('ambiguous correction cannot reactivate rejected numerator or lose accepted denominator',()=>{
 const r=run('contrast'),n=r.frames.flatMap(f=>f.numericArguments);assert.ok(n.every(n=>n.binding==='unresolved'));assert.ok(n.find(n=>n.value===75).compound);assert.ok(!n.some(n=>n.value===50&&n.binding==='resolved'));
});
test('all compound raw spans exact and no canonical facts emitted',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);}
});
test('W3 loses unsafe simple resolution and retains speed denominator and threshold',()=>{
 const x=require('../../docs/UTOM_V2_2/blind_readiness_20261009/BEFORE_REPAIR_raw.json').rows.find(x=>x.id==='W');
 const n=bind(x.text,x.annotation).frames[1].numericArguments[0];assert.equal(n.binding,'unresolved');assert.deepEqual(n.unit,{numerator:'km',denominator:'hour'});assert.ok(n.compound.qualifiers.some(q=>q.kind==='threshold'));
});
