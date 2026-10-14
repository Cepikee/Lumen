const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/insights-dashboard.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsObject});
for(const date of [null,undefined,'','not-a-date'])assert.equal(exportsObject.timestamp(date),null);
const dns=fs.readFileSync('components/UtomDnsKategoria.tsx','utf8');
assert.ok(dns.includes('Number.isFinite(value) && value >= 0 ? value : 0'));
console.log('insights/dns number safety contract: PASS');
