const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
module.exports=function load(file,deps={},globals={}){
 const exports={};
 const dependencies={'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status??200})}},'@/lib/security':{securityCheck:async()=>null},...deps};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:name=>{if(!(name in dependencies))throw Error('Missing test dependency '+name);return dependencies[name];},Error,URL,URLSearchParams,Date,Map,Set,console,process,...globals});
 return exports;
};
