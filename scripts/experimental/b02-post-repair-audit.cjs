"use strict";
// Frozen annotation replay, not a new blind evaluation. Never overwrites output.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {bind}=require('./real-text-a-binder.cjs');
const out='docs/UTOM_V2_2/b02_post_repair_20261009';
const before=require('../../docs/UTOM_V2_2/b01_post_repair_20261009/POST_REPAIR_raw.json');
const freeze=require('../../docs/UTOM_V2_2/b02_post_repair_20261009/freeze.json');
const labels=structuredClone(require('../../docs/UTOM_V2_2/b01_post_repair_20261009/labels.json'));
const evidence={spans:0,exact:0,failures:0};
// Compare persisted JSON contracts, where optional undefined fields are absent.
const rows=before.rows.map(x=>({...x,output:JSON.parse(JSON.stringify(bind(x.text,x.annotation)))}));
for(const x of rows){function walk(v){if(!v||typeof v!=='object')return;if(typeof v.textSpan==='string'){evidence.spans++;if(x.text.slice(v.start,v.end)===v.textSpan)evidence.exact++;else evidence.failures++;}Object.values(v).forEach(walk);}walk(x.output);}
assert.equal(evidence.failures,0);
for(const id of ['E','A','S','W','T'])assert.deepEqual(rows.find(x=>x.id===id).output,before.rows.find(x=>x.id===id).output);
const p=rows.find(x=>x.id==='P').output,h=rows.find(x=>x.id==='H').output;
assert.deepEqual(p.frames[0],before.rows.find(x=>x.id==='P').output.frames[0]);
assert.equal(p.frames[1].source.mention,'szóvivő');assert.equal(p.frames[1].polarity,'denied');assert.equal(p.frames[1].hypotheticalContext,true);
assert.equal(p.frames[1].numericArguments[0].value,12);assert.equal(p.frames[1].numericArguments[0].binding,'resolved');
assert.equal(h.frames[0].source.mention,'igazgató');assert.equal(h.frames[0].actor,null);
assert.equal(h.frames[0].numericArguments[0].value,45);assert.equal(h.frames[0].numericArguments[0].property,'headcount');
assert.deepEqual(h.frames[1].numericArguments[0].value,{year:null,month:10,day:17,part:null});assert.equal(h.frames[1].numericArguments[0].binding,'resolved');assert.equal(h.frames[1].numericArguments[0].temporalRole,'boundary');assert.equal(h.frames[1].source,null);
const changes={P6:'P.frames[1]: szóvivő source and claimOwner; tagad predicate, denied proposition, exact separate evidence.',H1:'H.frames[0]: igazgató source and claimOwner, bounded quoted content; clinic actor remains unresolved (H2 unchanged).',H4:'H.frames[1]: separate application boundary, month 10 day 17 year null, resolved; no inherited quote source.'};
for(const row of labels)if(changes[row[0]]){row[1]='CORRECT_RESOLVED';row[2]=changes[row[0]];}
const counts={CORRECT_RESOLVED:0,WRONG_RESOLVED:0,CORRECT_UNRESOLVED:0,MISSED_DEFENSIBLE_RESOLUTION:0};for(const [,label]of labels)counts[label]++;
const integrity=[];for(const [path,hash]of Object.entries(freeze.hashes)){if(!path.startsWith('docs/'))continue;const actual=crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');assert.equal(actual,hash,path);integrity.push({path,sha256:actual,unchanged:true});}
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('scripts/experimental/compound-rate-safety.cjs')).digest('hex'),freeze.hashes['scripts/experimental/compound-rate-safety.cjs']);
const metrics={total:labels.length,counts,resolvedPrecision:counts.CORRECT_RESOLVED/(counts.CORRECT_RESOLVED+counts.WRONG_RESOLVED),resolutionRate:(counts.CORRECT_RESOLVED+counts.WRONG_RESOLVED)/labels.length,evidence,changedCases:['P','H'],changedSelectedDecisions:Object.keys(changes),method:'Same frozen seven synthetic texts and linguistic annotations, same selected 39 decisions; post-repair manual reassessment, not a fresh independent blind test.',B02:'PARTIAL',B03:'untouched',NEXT_REAL_WORLD_BLIND_TEST_READY:false};
for(const [name,value]of Object.entries({'POST_REPAIR_raw.json':{phase:'B02_POST_REPAIR',created:new Date().toISOString(),rows},'labels.json':labels,'metrics.json':metrics,'historical_integrity.json':integrity}))fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(metrics,null,2));
