"use strict";
// Known-corpus reassessment. Outputs are exclusive; historical audits immutable.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {bind}=require('./real-text-a-binder.cjs');
const dir='docs/UTOM_V2_2/b03_post_repair_20261009';
const old=require('../../docs/UTOM_V2_2/b02_post_repair_20261009/POST_REPAIR_raw.json');
const freeze=require('../../docs/UTOM_V2_2/b03_post_repair_20261009/freeze.json');
const rows=old.rows.map(x=>({...x,output:JSON.parse(JSON.stringify(bind(x.text,x.annotation)))}));
const get=id=>rows.find(x=>x.id===id).output;
for(const id of ['P','S','W'])assert.deepEqual(get(id),old.rows.find(x=>x.id===id).output);
const e=get('E'),a=get('A'),t=get('T'),h=get('H');
assert.equal(a.frames[0].actor.mention,'férfi');assert.equal(a.frames[0].source.mention,'rendőrség');assert.equal(a.frames[1].actor.mention,'mentők');
assert.equal(h.frames[0].actor.mention,'klinika');assert.equal(h.frames[0].source.mention,'igazgató');assert.equal(h.frames[0].numericArguments[0].value,45);
assert.deepEqual(h.frames[1],old.rows.find(x=>x.id==='H').output.frames[1]);
assert.equal(e.frames[1].numericArguments[0].value,24000000);assert.equal(e.frames[1].numericArguments[0].binding,'resolved');assert.equal(e.frames[1].numericArguments[0].semanticKind,'money');
assert.equal(e.contrasts[0].rejected.value,16000000);assert.equal(e.contrasts[0].accepted.value,24000000);assert.equal(e.frames[1].polarity,'asserted');assert.equal(e.frames[1].numericArguments.length,1);
assert.equal(t.frames[1].numericArguments[0].binding,'resolved');assert.equal(t.frames[1].numericArguments[0].semanticKind,'ordinal');assert.equal(t.frames[1].numericArguments[0].owner.mention,'teszt');
const labels=structuredClone(require('../../docs/UTOM_V2_2/b02_post_repair_20261009/labels.json'));
const improved={A2:'A.frames[0]: férfi active driving participant, nsubj plus compatible human/action class; source separate.',A5:'A.frames[1]: mentők active workers, morphology and generic human class compatible with dolgozik.',H2:'H.frames[0]: klinika active hiring institution; source remains igazgató; count remains headcount.',E4:'E.frames[1]: accepted 24000000 HUF, exact denomination-to-support-to-predicate dependency route.',E5:'E.contrasts[0]: rejected 16000000 HUF, accepted 24000000 HUF, asserted receipt; only accepted numeric argument.',T3:'T.frames[1]: ordinal 3 modifies teszt; amod:att -> nominal nsubj -> tart; ordinal target, not rank.'};
for(const row of labels)if(improved[row[0]]){row[1]='CORRECT_RESOLVED';row[2]=improved[row[0]];}
labels.find(x=>x[0]==='E6')[2]='E.frames[2]: percentage 35, share, owner részesedést; preceding contrast is now one frame.';
const counts={CORRECT_RESOLVED:0,WRONG_RESOLVED:0,CORRECT_UNRESOLVED:0,MISSED_DEFENSIBLE_RESOLUTION:0};labels.forEach(x=>counts[x[1]]++);
const evidence={spans:0,exact:0,failures:0};for(const x of rows){function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string'){evidence.spans++;if(x.text.slice(v.start,v.end)===v.textSpan)evidence.exact++;else evidence.failures++;}Object.values(v).forEach(walk);}walk(x.output);}assert.equal(evidence.failures,0);
const integrity=[];for(const [path,hash]of Object.entries(freeze.hashes)){if(!path.startsWith('docs/')&&!path.startsWith('tests/unit/'))continue;const actual=crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');assert.equal(actual,hash,path);integrity.push({path,sha256:hash,unchanged:true});}
for(const p of ['scripts/experimental/compound-rate-safety.cjs','scripts/experimental/source-scope-recovery.cjs'])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),freeze.hashes[p]);
const metrics={total:39,counts,resolvedPrecision:counts.CORRECT_RESOLVED/(counts.CORRECT_RESOLVED+counts.WRONG_RESOLVED),resolutionRate:(counts.CORRECT_RESOLVED+counts.WRONG_RESOLVED)/39,evidence,changedSelectedDecisions:Object.keys(improved),method:'Known seven synthetic texts, frozen annotation replay; manual selected-item reassessment, not independent blind validation.',B03:'PARTIAL',B01Regression:false,B02Regression:false,SECOND_BLIND_CORPUS_READY:true,NEXT_REAL_WORLD_BLIND_TEST_READY:false};
for(const [name,data]of Object.entries({'POST_REPAIR_raw.json':{phase:'B03_POST_REPAIR',created:new Date().toISOString(),rows},'labels.json':labels,'metrics.json':metrics,'historical_integrity.json':integrity}))fs.writeFileSync(dir+'/'+name,JSON.stringify(data,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(metrics,null,2));
