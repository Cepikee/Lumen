"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=require('../fixtures/real-text-a/source-recovery-annotations.json');
const boundaries=require('../fixtures/real-text-a/source-recovery-boundaries.json');
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
const owner=f=>f.claimOwner||f.source;
for(const [id,source]of [['positive','szóvivő'],['negative','szóvivő'],['denial','rendőrség'],['leading','igazgató'],['trailing','igazgató'],['colon','szóvivő'],['added','igazgató'],['reported','igazgató']])test(`B02 governed source and bounded proposition: ${id}`,()=>{
 const r=run(id),f=r.frames[0];assert.equal(r.frames.length,1);assert.equal(owner(f).mention,source);assert.notEqual(f.actor?.mention,source);assert.ok(f.content.textSpan.includes(id==='negative'?'történt':id==='denial'?'ellopta':'aláírta'));assert.equal(f.polarity,['negative','denial'].includes(id)?'denied':'asserted');
 if(id!=='negative'){const c=r.attributionChains.find(c=>c.id===f.attributionChainId);assert.equal(c.binding,'resolved');assert.equal(c.edges.at(-1).targetId,f.frameId);assert.ok(c.edges.at(-1).structuralEvidence);assert.equal(f.sourceEvidence.frameId,f.frameId);}
});
for(const id of ['recipient','towards','with'])test(`B02 addressee does not become source: ${id}`,()=>{const f=run(id).frames[0];assert.equal(owner(f).mention,'igazgató');assert.match(f.recipient.mention,/Péter/u);assert.notEqual(f.recipient.mention,owner(f).mention);});
for(const [id,kind,value]of [['deadline','calendar_date',null],['count','count',18],['money','money',32],['measurement','measurement',8]])test(`B02 subsequent independent sentence survives: ${id}`,()=>{
 const fs=run(id).frames;assert.equal(fs.length,2);assert.equal(owner(fs[0]).mention,'szóvivő');assert.equal(owner(fs[1]),null);const n=fs[1].numericArguments[0];assert.equal(n.semanticKind,kind);assert.equal(n.binding,'resolved');if(value!==null)assert.equal(n.value,value);else assert.equal(n.value.day,18);assert.ok(fs[1].content.start>fs[0].content.end);
});
test('B02 nested quoted chain preserves outer publisher and inner owner',()=>{const r=run('nestedQuote'),f=r.frames[0],c=r.attributionChains.find(c=>c.id===f.attributionChainId);assert.equal(c.binding,'resolved');assert.deepEqual(c.edges.map(e=>e.source.mention),['lap','igazgató']);assert.equal(c.edges[1].parentAttributionId,c.edges[0].id);assert.equal(owner(f).mention,'igazgató');assert.equal(f.actor?.mention,'Júlia');});
test('B02 ambiguous dependency on possessive nested speaker abstains rather than flattening',()=>{const r=run('nested'),c=r.attributionChains[0];assert.equal(c.binding,'unresolved');assert.equal(c.edges.length,2);assert.equal(owner(r.frames[0]),null);});
test('B02 attributed count belongs to counted argument, not source',()=>{const f=run('sourceCount').frames[0],n=f.numericArguments[0];assert.equal(owner(f).mention,'igazgató');assert.equal(n.value,18);assert.equal(n.binding,'resolved');assert.notEqual(n.owner?.mention,'igazgató');});
test('B02 temporal boundary is separate from source',()=>{const f=run('sourceTime').frames[0],n=f.numericArguments[0];assert.equal(owner(f).mention,'igazgató');assert.equal(n.binding,'resolved');assert.equal(n.value.day,18);assert.notEqual(n.owner?.mention,'igazgató');});
test('B02 denial preserves source and B01 unresolved compound safety',()=>{const f=run('rate').frames[0],n=f.numericArguments[0];assert.equal(owner(f).mention,'rendőrség');assert.equal(f.polarity,'denied');assert.equal(n.semanticKind,'compound_rate');assert.equal(n.binding,'unresolved');assert.equal(n.owner,null);});
test('B02 unsupported source/correction dependency remains conservative',()=>{const r=run('contrast');assert.ok(r.frames.every(f=>f.binding==='unresolved'));assert.ok(!r.frames.flatMap(f=>f.numericArguments).some(n=>n.value===14&&n.binding==='resolved'));assert.ok(r.frames.some(f=>f.numericArguments.some(n=>n.value===18)));});
test('B02 missing quote speaker never inferred from quote actor',()=>{const r=run('absent');assert.equal(r.frames.length,1);assert.equal(owner(r.frames[0]),null);});
test('B02 multiple speakers never merge or cross-attribute',()=>{const fs=run('multiple').frames;assert.equal(fs.length,2);assert.deepEqual(fs.map(f=>owner(f).mention),['Péter','Dóra']);assert.match(fs[0].content.textSpan,/Júlia/u);assert.match(fs[1].content.textSpan,/Anna/u);assert.ok(fs[0].content.end<fs[1].content.start);});
test('B02 unmatched quote does not erase following sentence or invent attribution',()=>{const fs=run('malformed').frames;assert.ok(fs.some(f=>f.content.textSpan.includes('Péter elolvasta')));assert.ok(fs.every(f=>!owner(f)));});
test('B02 complement syntax alone does not license unknown reporting semantics',()=>{assert.ok(run('unknown').frames.every(f=>!owner(f)));});
test('B02 missing source-subject dependency cannot be replaced by proximity',()=>{const x=cases.find(x=>x.id==='positive'),a=structuredClone(x.annotation);a.tokens.find(t=>t.text==='szóvivő').dep='obl';const r=bind(x.text,a);assert.ok(r.frames.every(f=>!owner(f)));});
test('B02 recovered source evidence is raw-exact and projection stays disabled',()=>{for(const x of cases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan,x.id);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);assert.ok(r.frames.every(f=>f.canonicalProjectionAllowed===false));}});
for(const x of boundaries)test(`B02 punctuation and sentence isolation: ${x.id}`,()=>{
 const r=bind(x.text,x.annotation),fs=r.frames;
 if(x.id==='independentReport'){assert.equal(fs.length,2);assert.deepEqual(fs.map(f=>owner(f).mention),['szóvivő','Péter']);}
 if(x.id==='priorReport'){assert.equal(fs.length,2);assert.equal(owner(fs[1]),null);}
 if(x.id==='quoteHogy'){assert.equal(fs.length,1);assert.equal(owner(fs[0]).mention,'szóvivő');}
 if(x.id==='negatedReport'){assert.equal(owner(fs[0]),null);assert.equal(fs[0].polarity,'unresolved');}
 // These frozen parses attach the person's token to the closing quote.
 // B02 must retain the sentence; repairing its actor parse belongs to B03.
 if(x.id==='afterActor'||x.id==='afterDate'){assert.equal(fs.length,2);assert.equal(owner(fs[1]),null);assert.match(fs[1].content.textSpan,/^Péter/u);assert.equal(fs[1].action,'elolvas');assert.equal(fs[1].actor,null);}
 if(x.id==='afterDate'){const n=fs[1].numericArguments.find(n=>n.semanticKind==='calendar_date');assert.deepEqual(n.value,{year:2029,month:5,day:8,part:null});}
 function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);
});
