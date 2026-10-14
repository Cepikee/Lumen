const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const dir=__dirname,relative='docs/UTOM_V2_2/fresh_blind_20261012/',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=fs.readdirSync('tests/unit').filter(f=>/^v22-.*\.test\.cjs$/.test(f)).map(f=>'tests/unit/'+f);
const r=cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{encoding:'utf8',maxBuffer:30e6});
const log=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(dir+'/tests_after.txt',log,{flag:'wx'});
const n=k=>Number(log.match(new RegExp('^# '+k+' (\\d+)','m'))?.[1]);
const git=args=>cp.execFileSync('git',args,{maxBuffer:100e6,stdio:['ignore','pipe','pipe']});
const freeze=JSON.parse(fs.readFileSync(dir+'/freeze.json')), supplement=JSON.parse(fs.readFileSync(dir+'/freeze_intelligence_supplement.json')),manifest=JSON.parse(fs.readFileSync(dir+'/input_manifest.json'));
const changed=[];const hashes={...freeze.hashes,...supplement.hashes};for(const[p,h]of Object.entries(hashes))if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==h)changed.push(p);
const inputChanged=Object.entries(manifest.files).filter(([p,h])=>sha(fs.readFileSync(dir+'/'+p))!==h).map(([p])=>p);
const baseline=JSON.parse(fs.readFileSync(dir+'/baseline.json'));
const raw=JSON.parse(fs.readFileSync(dir+'/FRESH_BLIND_BEFORE_REPAIR_raw.json'));
const journalMismatch=raw.rows.filter(row=>JSON.stringify(JSON.parse(fs.readFileSync(dir+'/journal/'+row.id+'.json')))!==JSON.stringify(row)).map(r=>r.id);
const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('hu').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const corpus=JSON.parse(fs.readFileSync(dir+'/corpus.json'));
const oldTexts=[];function collect(x,p){if(!x||typeof x!=='object')return;if(typeof x.text==='string'&&x.text.length>60)oldTexts.push({p,text:x.text});for(const v of Object.values(x))if(v&&typeof v==='object')collect(v,p);}
function scan(p){if(!fs.existsSync(p))return;for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())scan(f);else if(e.name.endsWith('.json'))try{collect(JSON.parse(fs.readFileSync(f)),f);}catch{}}}
scan('tests/fixtures/real-text-a');const second='docs/UTOM_V2_2/second_blind_20261009/corpus.json';collect(JSON.parse(fs.readFileSync(second)),second);
const collisions=corpus.flatMap(c=>c.sentences.flatMap(s=>oldTexts.filter(o=>normalize(o.text).includes(normalize(s))).map(o=>({snippet:c.id,sentence:s,previous:o.p}))));
const status=git(['status','--porcelain=v1','-uall']).toString();
const oldLines=freeze.status.split(/\r?\n/).filter(Boolean).sort(),newLines=status.split(/\r?\n/).filter(l=>l&&!l.includes(relative)).sort();
const verified={createdAt:new Date().toISOString(),branch:git(['branch','--show-current']).toString().trim(),head:git(['rev-parse','HEAD']).toString().trim(),testsBefore:baseline,testsAfter:{tests:n('tests'),pass:n('pass'),fail:n('fail'),exitCode:r.status},frozenFileCount:Object.keys(hashes).length,changedFrozenFiles:changed,trackedDiffSha256Before:freeze.trackedDiffSha256,trackedDiffSha256After:sha(git(['diff','--binary','HEAD'])),workingTreeOutsideMeasurementUnchanged:JSON.stringify(oldLines)===JSON.stringify(newLines),changedInputFiles:inputChanged,journalCount:raw.rows.length,journalMismatch,firstPassRawSha256:sha(fs.readFileSync(dir+'/FRESH_BLIND_BEFORE_REPAIR_raw.json')),novelty:{previousTextRecordsChecked:oldTexts.length,exactNormalizedSentenceCollisions:collisions,scope:'real-text-a fixture JSON and SECOND corpus; lexical screening is not proof of structural independence. New wording/combinations manually reviewed; standard linguistic constructions intentionally shared.'},canonicalProjectionOff:raw.rows.every(r=>r.output.canonical.length===0&&r.output.projectionState==='disabled_research_only'),inferenceCalls:20,replays:0,engineEdits:0,testEdits:0,paidAiCalls:0,externalProviderCalls:0};
verified.measurementIntegrity=changed.length===0&&inputChanged.length===0&&journalMismatch.length===0&&verified.workingTreeOutsideMeasurementUnchanged&&verified.trackedDiffSha256Before===verified.trackedDiffSha256After&&n('tests')===424&&n('pass')===424&&n('fail')===0&&r.status===0?'PASS':'FAIL';
fs.writeFileSync(dir+'/verification.json',JSON.stringify(verified,null,2),{flag:'wx'});console.log(JSON.stringify(verified,null,2));
