const assert = require('node:assert/strict');
const fs = require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/insights-dashboard.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
for(const value of [NaN,Infinity,-1,null,undefined,'bad',{},true])assert.equal(exportsObject.count(value),0);
assert.equal(exportsObject.count('12'),12);
console.log('insights category numeric safety: PASS');
