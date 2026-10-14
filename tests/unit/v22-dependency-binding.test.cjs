"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const cases=[
 ...require('../fixtures/real-text-a/dependency-annotations.json'),
 ...require('../fixtures/real-text-a/dependency-extra-annotations.json')
];
const {bind}=require('../../scripts/experimental/real-text-a-binder.cjs');
const run=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation).frames[0];};
const full=id=>{const x=cases.find(x=>x.id===id);return bind(x.text,x.annotation);};
const reviewCases=require('../fixtures/real-text-a/candidate-review-annotations.json');
test('candidate review: possession is not positive actor evidence for an inanimate patient',()=>{
 const x=reviewCases.find(x=>x.id==='possessed');assert.equal(bind(x.text,x.annotation).frames[0].actor,null);
});
test('candidate review: generic counted head is found through modifiers without noun whitelist',()=>{
 const x=reviewCases.find(x=>x.id==='count'),f=bind(x.text,x.annotation).frames[0];
 assert.equal(f.actor.mention,'intézet');assert.equal(f.numericArguments[0].binding,'resolved');assert.equal(f.numericArguments[0].owner.mention,'mikroszkópot');
 const broken=structuredClone(x);broken.annotation.tokens.find(t=>t.text==='17').headStart=broken.annotation.tokens.find(t=>t.text==='17').start;
 const b=bind(broken.text,broken.annotation).frames[0];assert.equal(b.actor.mention,'intézet');assert.ok(b.numericArguments.every(n=>n.binding==='unresolved'));
});
test('candidate review: accepted generic contrast count needs its own dependency route',()=>{
 const x=reviewCases.find(x=>x.id==='contrast');const r=bind(x.text,x.annotation),ns=r.frames.flatMap(f=>f.numericArguments);
 assert.deepEqual(ns.map(n=>[n.value,n.binding]),[[18,'resolved']]);assert.ok(ns[0].bindingEvidence.dependencyPath.length);
 const broken=structuredClone(x),t=broken.annotation.tokens.find(t=>t.text==='18');t.headStart=t.start;
 const rejected=bind(broken.text,broken.annotation).frames.flatMap(f=>f.numericArguments);
 assert.ok(rejected.every(n=>n.value!==12&&n.binding==='unresolved'));
});
test('candidate review: a malformed source governor does not become a resolved chain',()=>{
 const x=structuredClone(cases.find(x=>x.id==='nested_attribution_numeric'));
 const marker=x.annotation.tokens.find(t=>t.text==='szerint');marker.headStart=x.annotation.tokens.find(t=>t.text==='4,2').start;
 const r=bind(x.text,x.annotation);assert.equal(r.attributionChains[0].binding,'unresolved');assert.equal(r.frames[0].claimOwner,null);
 assert.equal(r.frames[0].numericArguments[0].binding,'resolved');
});
test('candidate review: real duration and percentage retain their distinct semantic kinds and exact evidence',()=>{
 for(const x of reviewCases){const r=bind(x.text,x.annotation);function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);assert.deepEqual(r.canonical,[]);}
 for(const [id,kind,unit] of [['duration','duration','day'],['percent','percentage','%']]){const x=reviewCases.find(x=>x.id===id),n=bind(x.text,x.annotation).frames[0].numericArguments[0];assert.equal(n.semanticKind,kind);assert.equal(n.unit,unit);assert.equal(n.binding,'resolved');}
});
test('dependency edges cannot revive bindings inside unresolved correction scope',()=>{
 for(const x of require('../fixtures/real-text-a/dependency-ambiguous-annotations.json')){
  const r=bind(x.text,x.annotation);assert.ok(r.contrasts.some(c=>c.binding==='unresolved'));
  for(const f of r.frames){assert.equal(f.actor,null);assert.equal(f.actorStatus,'unresolved');assert.ok(f.numericArguments.every(n=>n.binding==='unresolved'&&n.owner===null));}
 }
});
test('missing dependency metadata cannot silently retain heuristic positive bindings',()=>{
 const x=structuredClone(cases.find(x=>x.id==='G'));
 for(const t of x.annotation.tokens){delete t.dep;delete t.headStart;}
 const r=bind(x.text,x.annotation);assert.equal(r.dependencyVerified,false);
 for(const f of r.frames){assert.equal(f.actor,null);assert.ok(f.numericArguments.every(n=>n.binding==='unresolved'&&n.owner===null));}
});
test('live dependency annotations preserve accepted corrections and nested source chains',()=>{
 const xs=require('../fixtures/real-text-a/dependency-compatibility-annotations.json');
 const rs=xs.map(x=>bind(x.text,x.annotation));
 assert.equal(rs[0].frames[0].actor.mention,'Anna');assert.equal(rs[0].frames[0].polarity,'asserted');
 assert.deepEqual(rs[0].frames[0].actorEvidence.dependencyPath.map(e=>e.relation),['conj','nsubj']);
 for(const [i,value] of [[1,35],[2,90]]){const n=rs[i].frames[0].numericArguments;assert.deepEqual(n.map(x=>x.value),[value]);assert.equal(n[0].binding,'resolved');assert.ok(n[0].bindingEvidence.syntacticReason);assert.equal(n[0].bindingEvidence.frameId,rs[i].frames[0].frameId);}
 assert.equal(rs[3].frames[0].actor.mention,'Nagy Anna');assert.equal(rs[3].frames[0].numericArguments[0].value,120);
 assert.deepEqual(rs[3].attributionChains[0].edges.map(e=>e.source.mention),['minisztérium','rendőrség']);
 for(let i=0;i<xs.length;i++){function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(xs[i].text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(rs[i]);assert.deepEqual(rs[i].canonical,[]);}
});
test('dependency-backed numerics keep adjectival money, percentage shares and measurements distinct',()=>{
 const money=run('money_adj');assert.deepEqual(money.numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[38000000,'money','szerződés']]);
 const share=run('share');assert.deepEqual(share.numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[30,'percentage','részesedést']]);
 const age=run('age_measurement');assert.deepEqual(age.numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[38,'age','férfi'],[120,'measurement','kilométert']]);
 const amb=run('disjunctive_actor');assert.equal(amb.actor,null);assert.equal(amb.binding,'unresolved');
});
test('dependency subjects resolve explicit actors, excluding possessors, recipients and attribution',()=>{
 assert.equal(run('A').actor.mention,'Kovács Péter');assert.equal(run('A').action,'aláír');
 for(const id of ['B','C','D','E'])assert.equal(run(id).actor.mention,'Nagy Anna');
 assert.ok(run('B').syntacticRoles.some(r=>r.role==='possessor'&&r.referent.mention==='Kovács Péter'));
 assert.ok(run('C').syntacticRoles.some(r=>r.role==='object'&&r.referent.mention==='szerződést'));
 assert.ok(run('D').syntacticRoles.some(r=>r.role==='recipient'&&r.referent.mention==='Kovács Péter'));
 assert.equal((run('E').claimOwner||run('E').source).mention,'minisztérium');assert.equal(run('F').actor,null);
});
test('organisation actors, ambiguous subjects and possessive role heads obey structural licensing',()=>{
 const org=run('org_i_actor');assert.equal(org.actor.mention,'egyetem');assert.equal(org.numericArguments[0].semanticKind,'count');assert.equal(org.numericArguments[0].owner.mention,'embert');
 const amb=run('ambiguous_subject');assert.equal(amb.actor,null);assert.equal(amb.binding,'unresolved');assert.equal(amb.numericArguments[0].semanticKind,'count');assert.equal(amb.numericArguments[0].owner.mention,'embert');
 const role=run('possessive_role_actor');assert.equal(role.actor.mention,'vezérigazgatója');assert.equal(role.numericArguments[0].semanticKind,'count');assert.equal(role.numericArguments[0].owner.mention,'embert');assert.ok(role.syntacticRoles.some(r=>r.role==='possessor'));
});
test('generic count and year/count collision are structurally licensed',()=>{
 const generic=run('generic_count_school');assert.deepEqual(generic.numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[19,'count','iskolát']]);
 const y=run('year_count_same');assert.equal(y.actor.mention,'vállalat');assert.deepEqual(y.numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[2026,'year','rendelt'],[2026,'count','légszűrőt']]);
});
test('year, duration and percentage-change use distinct dependency-backed slots',()=>{
 assert.deepEqual(run('I').numericArguments.map(n=>[n.value,n.semanticKind,n.property]),[[2025,'year','year'],[15,'percentage','change_magnitude']]);
 assert.deepEqual(run('K').numericArguments.map(n=>[n.value,n.semanticKind,n.property]),[[3,'duration','duration'],[27,'percentage','change_magnitude']]);
 assert.deepEqual(run('L').numericArguments.map(n=>[n.value,n.semanticKind,n.property]),[[120,'count','headcount'],[2026,'year','year']]);
});
test('duration week/day/hour and percentage-change stay distinct under local syntax',()=>{
 assert.deepEqual(run('duration_week').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[3,'duration','hétig']]);
 assert.deepEqual(run('duration_day').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[2,'duration','napig']]);
 assert.deepEqual(run('duration_hour').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[5,'duration','óráig']]);
 assert.deepEqual(run('percentage_change').numericArguments.map(n=>[n.value,n.semanticKind,n.property]),[[30,'percentage','change_magnitude']]);
});
test('triple-nested attribution keeps the source chain and numeric claim separate',()=>{
 const r=full('nested_attribution_numeric');assert.equal(r.attributionChains[0].binding,'resolved');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['Portfolio','Reutersre','cég szóvivője']);
 assert.equal(r.frames[0].actor,null);assert.deepEqual(r.frames[0].numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[4.2e9,'money','üzlet']]);
});
test('broken count attachment does not collapse a licensed organisation actor',()=>{
 const x=structuredClone(cases.find(x=>x.id==='year_count_same'));const count=x.annotation.tokens.find(t=>t.start===20&&t.text==='2026');count.headStart=count.start;
 const r=bind(x.text,x.annotation).frames[0];assert.equal(r.actor.mention,'vállalat');assert.equal(r.numericArguments.find(n=>n.semanticKind==='year').binding,'resolved');assert.equal(r.numericArguments.find(n=>n.semanticKind==='count').binding,'unresolved');
});
test('broken numeric attachment does not collapse a nested attribution source chain',()=>{
 const x=structuredClone(cases.find(x=>x.id==='nested_attribution_numeric'));const num=x.annotation.tokens.find(t=>t.text==='4,2');num.headStart=num.start;
 const r=bind(x.text,x.annotation);assert.equal(r.attributionChains[0].binding,'resolved');assert.deepEqual(r.attributionChains[0].edges.map(e=>e.source.mention),['Portfolio','Reutersre','cég szóvivője']);assert.equal(r.frames[0].numericArguments[0].binding,'unresolved');assert.equal(r.frames[0].actor,null);
});
test('age paths end at the described person while amount paths end at support or revenue',()=>{
 assert.deepEqual(run('G').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[38,'age','Nagy Anna'],[4200000,'money','támogatást']]);
 assert.deepEqual(run('J').numericArguments.map(n=>[n.value,n.semanticKind,n.owner.mention]),[[42,'age','férfi'],[3e9,'money','bevételt']]);
 assert.equal(run('J').actor.mention,'cége');
});
test('age syntax alone does not prove an unclassified proper name is a person',()=>{
 const x=structuredClone(cases.find(x=>x.id==='G'));x.annotation.entities=[];
 const n=bind(x.text,x.annotation).frames[0].numericArguments[0];
 assert.equal(n.binding,'unresolved');assert.equal(n.owner,null);
});
test('headcount belongs to the employment argument and never the company possessor',()=>{
 const f=run('H');assert.equal(f.actor.mention,'cége');assert.equal(f.numericArguments[0].value,120);assert.equal(f.numericArguments[0].owner.mention,'embert');assert.equal(f.numericArguments[0].subject,null);
});
test('conflicting subjects and disconnected numeric attachment abstain despite former heuristics',()=>{
 const b=structuredClone(cases.find(x=>x.id==='B'));const t=b.annotation.tokens.find(t=>t.text==='Kovács');t.dep='nsubj';t.headStart=b.annotation.tokens.find(t=>t.text==='írta').start;
 assert.equal(bind(b.text,b.annotation).frames[0].actor,null);
 const g=structuredClone(cases.find(x=>x.id==='G'));const n=g.annotation.tokens.find(t=>t.text==='38');n.headStart=n.start;n.dep='ROOT';
 const out=bind(g.text,g.annotation).frames[0];assert.equal(out.numericArguments[0].binding,'unresolved');assert.equal(out.numericArguments[0].owner,null);
});
test('passive morphology and malformed graph cannot produce a resolved actor',()=>{
 for(const mutation of ['passive','invalid']){const x=structuredClone(cases[0]);const v=x.annotation.tokens.find(t=>t.pos==='VERB');if(mutation==='passive')v.morph.Voice='Pass';else x.annotation.tokens[0].headStart=99999;assert.equal(bind(x.text,x.annotation).frames[0].actor,null);}
});
test('resolved bindings contain raw structural evidence and canonical outputs stay disabled',()=>{
 for(const x of cases){const r=bind(x.text,x.annotation);assert.equal(r.dependencyStatus,'available');function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string')assert.equal(x.text.slice(v.start,v.end),v.textSpan);Object.values(v).forEach(walk);}walk(r);
 for(const f of r.frames){if(f.actor)assert.ok(f.actorEvidence);for(const n of f.numericArguments)if(n.binding==='resolved'){assert.ok(n.bindingEvidence);assert.equal(n.bindingEvidence.frameId,f.frameId);assert.equal(n.bindingEvidence.resolutionStatus,'resolved');}assert.equal(f.canonicalProjectionAllowed,false);}assert.deepEqual(r.canonical,[]);}
});
