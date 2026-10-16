"use strict";
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),extensions=['.js','.jsx','.ts','.tsx','.cjs','.mjs'];
const tracked=execFileSync('git',['diff','--name-only','--diff-filter=ACMR'],{cwd:root,encoding:'utf8'});
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'});
const files=[...new Set((tracked+'\n'+untracked).split(/\r?\n/))].filter(f=>/^(app|components|hooks|lib|forecast)\//.test(f)&&extensions.includes(path.extname(f)));
const missing=[];
for(const file of files){
 const absolute=path.join(root,file),source=fs.readFileSync(absolute,'utf8');
 for(const match of source.matchAll(/(?:from\s+|require\s*\(|import\s*\()["']([^"']+)["']/g)){
  const name=match[1];if(!name.startsWith('.')&&!name.startsWith('@/'))continue;
  const base=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(absolute),name);
  if(!fs.existsSync(base)&&!extensions.some(e=>fs.existsSync(base+e)||fs.existsSync(path.join(base,'index'+e))))missing.push(file+' -> '+name);
 }
}
console.log(JSON.stringify({scope:'changed production files only',files:files.length,missing},null,2));
if(missing.length)process.exitCode=1;
