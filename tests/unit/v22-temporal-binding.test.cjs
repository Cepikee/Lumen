"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/temporal-annotations.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const input=id=>structuredClone(cases.find(x=>x.id===id));
const result=id=>{const x=input(id);return bind(x.text,x.annotation);};
const args=id=>result(id).frames.flatMap(f=>f.numericArguments);
for(const id of ['full','bare','partial','month','end'])test(`temporal date structure: ${id}`,()=>{
 const n=args(id)[0];assert.equal(n.semanticKind,'calendar_date');assert.equal(n.binding,'resolved');assert.equal(n.value.month,11);
 assert.equal(n.value.year,['full','bare','month'].includes(id)?2027:null);assert.equal(n.value.day,['full','bare','partial'].includes(id)?9:null);
 if(id==='end')assert.equal(n.value.part,'end');assert.equal(args(id).length,1);
});
for(const id of ['clock','colon'])test(`explicit clock: ${id}`,()=>{const n=args(id)[0];assert.equal(n.semanticKind,'clock_time');assert.equal(n.binding,'resolved');assert.deepEqual(n.value,{hour:9,minute:id==='colon'?45:0});});
for(const id of ['deadline','weekday','opening'])test(`calendar/clock boundary: ${id}`,()=>{const n=args(id)[0];assert.equal(n.binding,'resolved');assert.equal(n.temporalRole,'boundary');assert.notEqual(n.semanticKind,'duration');});
for(const [id,value,unit] of [['weeks',4,'week'],['days',3,'day'],['hours',4,'hour'],['minutes',75,'minute']])test(`duration attachment: ${id}`,()=>{const n=args(id)[0];assert.equal(n.binding,'resolved');assert.equal(n.semanticKind,'duration');assert.equal(n.value,value);assert.equal(n.unit,unit);});
test('terminative hour without disambiguating syntax abstains',()=>{const n=args('ambiguous')[0];assert.equal(n.binding,'unresolved');assert.equal(n.owner,null);});
for(const id of ['ordinal','district'])test(`ordinal nominal is not count or ranking: ${id}`,()=>{const n=args(id)[0];assert.equal(n.semanticKind,'ordinal');assert.equal(n.binding,'resolved');});
for(const id of ['rank','rankobj'])test(`placement needs governing place and predicate: ${id}`,()=>{const n=args(id)[0];assert.equal(n.semanticKind,'rank');assert.equal(n.binding,'resolved');assert.equal(n.value,4);});
test('bare ordinal copula does not invent a ranking context',()=>{assert.equal(args('became')[0].binding,'unresolved');});
test('calendar date, clock and compound duration retain three separate arguments',()=>{
 const ns=args('mixed');assert.deepEqual(ns.map(n=>n.semanticKind),['calendar_date','clock_time','duration']);assert.ok(ns.every(n=>n.binding==='resolved'));assert.equal(ns[2].value,3);assert.equal(ns[2].unit,'hour');
});
test('temporal correction preserves only accepted date and a positive event',()=>{
 const r=result('contrast'),ns=r.frames.flatMap(f=>f.numericArguments);assert.equal(ns.length,1);assert.equal(ns[0].value.day,11);assert.equal(ns[0].binding,'resolved');assert.equal(r.contrasts[0].rejected.value.day,9);assert.ok(r.frames.every(f=>f.polarity==='asserted'));
});
test('nested reporting source remains distinct from temporal attachment',()=>{const r=result('attribution');assert.equal(r.attributionChains[0].binding,'resolved');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['lap','minisztérium']);assert.equal(r.frames[0].numericArguments[0].binding,'resolved');});
test('detached date head cannot stay resolved from surface proximity',()=>{
 const x=input('full'),t=x.annotation.tokens.find(t=>t.text==='9-én');t.headStart=t.start;
 assert.equal(bind(x.text,x.annotation).frames[0].numericArguments[0].binding,'unresolved');
});
test('out-of-range clock and impossible calendar day never resolve',()=>{
 for(const [id,from,to] of [['colon','9:45','9:75'],['full','9-én','0-én']]){
  const x=input(id);x.text=x.text.replace(from,to);
  for(const group of ['tokens','sentences','entities'])for(const span of x.annotation[group])span.text=x.text.slice(span.start,span.end);
  const ns=bind(x.text,x.annotation).frames.flatMap(f=>f.numericArguments);assert.ok(ns.length);assert.ok(ns.every(n=>n.binding==='unresolved'));
 }
});
test('temporal failure does not erase a separately proven actor',()=>{
 const x=input('clock'),t=x.annotation.tokens.find(t=>t.text==='órakor');t.headStart=t.start;
 const f=bind(x.text,x.annotation).frames[0];assert.equal(f.actor.mention,'kutató');assert.equal(f.numericArguments[0].binding,'unresolved');
});
test('temporal evidence slices raw source and resolved values carry structural reasons',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);
 for(const f of r.frames)for(const n of f.numericArguments)if(n.binding==='resolved'){assert.ok(n.bindingEvidence.dependencyPath.length);assert.equal(n.bindingEvidence.frameId,f.frameId);}assert.deepEqual(r.canonical,[]);}
});
