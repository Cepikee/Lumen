const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const source=fs.readFileSync('components/InsightsDashboard.tsx','utf8');
const exported={};
vm.runInNewContext(ts.transpileModule(source+'\nexport { State };'.replace('\\n','\n'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
 exports:exported,
 require(name){if(name==='react'||name==='react/jsx-runtime')return require(name); return {default:{}}; }
});
const html=renderToStaticMarkup(React.createElement(exported.State,{error:new Error('API failed'),hasData:true},React.createElement('b',null,'STALE DATA')));
assert.match(html,/role="alert"/);assert.doesNotMatch(html,/STALE DATA/);
assert.match(source,/error={series.error}/);assert.match(source,/error={insights.error}/);
console.log('insights error rendering regression: PASS');
