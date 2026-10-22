const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const React=require('react');const {JSDOM}=require('jsdom');const {createRoot}=require('react-dom/client');
const load=require('../helpers/insights-loader.cjs');const core=load('lib/trend-intelligence.ts');

test('inline panel aborts old periods, switches source series, drills down and closes',async()=>{
 const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});
 const previous={window:global.window,document:global.document,IS_REACT_ACT_ENVIRONMENT:global.IS_REACT_ACT_ENVIRONMENT};
 Object.assign(global,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const calls=[];let chart,closed=false,articleUrl;
 const exports={};
 const deps={react:React,'react/jsx-runtime':require('react/jsx-runtime'),'./SparklineDetailed':{__esModule:true,default:p=>{chart=p;return React.createElement('div',null,'chart');}},'@/lib/trend-intelligence':core,'@/lib/trend-intelligence-client':{
  intelligenceParams:(scope,keyword,category)=>new URLSearchParams({period:scope.period,keyword,category}),
  loadTrendHistory:(scope,keyword,category,signal)=>new Promise((resolve,reject)=>calls.push({scope,signal,resolve,reject})),
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/TrendIntelligencePanel.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,{exports,AbortController,console,URLSearchParams,fetch:async url=>{articleUrl=url;return {ok:true,json:async()=>({version:2,articles:[{id:1,title:'Valós kapcsolat',url:'https://example.test/article',source:'telex',date:null}],nextOffset:null})};},require:name=>name.endsWith('.css')?{}:deps[name]});
 const root=createRoot(document.getElementById('root'));
 const flush=()=>new Promise(resolve=>setImmediate(resolve));
 const click=async text=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(button,text);await React.act(async()=>{button.click();await flush();});};
 try {
  await React.act(async()=>root.render(React.createElement(exports.default,{keyword:'alma',category:'Tech',scope:{period:'7d',sources:[],categories:[]},onClose:()=>closed=true})));
  assert.match(document.body.textContent,/betöltése/);assert.equal(calls.length,1);
  await React.act(async()=>{const select=document.querySelector('select');select.value='90d';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  assert.equal(calls[0].signal.aborted,true);assert.equal(calls[1].scope.period,'90d');
  const window=core.parseTrendQuery(new URLSearchParams('period=90d'),new Date('2026-10-21T12:00:00Z')).window;
  const history=core.makePoints(window,[]);history[0].freq=2;history[0].sources.telex=2;
  await React.act(async()=>{calls[1].resolve({window,history,sources:['telex'],total:2,previousTotal:0,growth:null,status:'Új aktivitás',firstSeen:window.start,lastSeen:window.start});await flush();});
  assert.equal(chart.history.length,90);
  await click('Forrásonként');assert.equal(chart.series[0].label,'telex');assert.equal(chart.series[0].values[0],2);
  await React.act(async()=>{chart.onPointSelect(0);await flush();});
  assert.match(articleUrl,/bucket=/);assert.match(articleUrl,/category=Tech/);assert.match(document.body.textContent,/Valós kapcsolat/);
  await click('Bezárás ×');assert.equal(closed,true);
  await React.act(async()=>{const select=document.querySelector('select');select.value='365d';select.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
  await React.act(async()=>{calls[2].reject(Error('HTTP 503'));await flush();});
  assert.ok(document.querySelector('[role="alert"]'));await click('Újrapróbálás');assert.equal(calls.length,4);
 } finally {await React.act(async()=>root.unmount());assert.equal(calls.at(-1).signal.aborted,true);dom.window.close();Object.assign(global,previous);}
});

