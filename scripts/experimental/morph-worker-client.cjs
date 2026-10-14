"use strict";
const {spawn}=require('node:child_process');
function validAnnotation(raw,a){
  if(!a||!['tokens','sentences','entities'].every(k=>Array.isArray(a[k])&&a[k].length<=200000))return false;
  const span=x=>x&&Number.isSafeInteger(x.start)&&Number.isSafeInteger(x.end)&&x.start>=0&&x.end>x.start&&x.end<=raw.length&&raw.slice(x.start,x.end)===x.text;
  return ['tokens','sentences','entities'].every(k=>a[k].every(span))&&a.tokens.every(t=>typeof t.lemma==='string'&&typeof t.pos==='string'&&t.morph&&typeof t.morph==='object'&&!Array.isArray(t.morph))&&a.entities.every(e=>['PER','ORG','LOC','MISC'].includes(e.label));
}
// Full worker responses require dependencies; semantic sub-annotations keep
// the original validAnnotation contract above (including partial clauses).
function validWorkerAnnotation(raw,a){
  if(!validAnnotation(raw,a)||!a.tokens.length||!a.sentences.length)return false;
  const ordered=xs=>xs.every((x,i)=>!i||xs[i-1].end<=x.start);
  const starts=new Map(a.tokens.map(t=>[t.start,t]));
  return ordered(a.tokens)&&ordered(a.sentences)&&a.tokens.every(t=>typeof t.lemma==='string'&&typeof t.pos==='string'&&t.morph&&typeof t.morph==='object'&&!Array.isArray(t.morph)&&typeof t.dep==='string'&&t.dep.length>0&&Number.isSafeInteger(t.headStart)&&a.sentences.some(s=>t.start>=s.start&&t.end<=s.end&&starts.get(t.headStart)?.start>=s.start&&starts.get(t.headStart)?.end<=s.end))&&a.entities.every(e=>['PER','ORG','LOC','MISC'].includes(e.label));
}
class WorkerClient{
  constructor({command='wsl.exe',args=['-d','Ubuntu-24.04','--','env','PYTHONPATH=/home/mark/.local/share/utom-morph-research','python3','/mnt/f/Projekt2025/Lumen/scripts/experimental/morph-worker.py'],timeoutMs=10000,startupMs=20000,maxPending=4}={}){Object.assign(this,{command,args,timeoutMs,startupMs,maxPending});this.pending=new Map();this.seq=0;this.child=null;this.starting=null;}
  async start(){if(this.starting)return this.starting;if(this.child)return;this.starting=new Promise((resolve,reject)=>{const child=spawn(this.command,this.args,{stdio:['pipe','pipe','pipe'],windowsHide:true});this.child=child;let buf='',ready=false;const timer=setTimeout(()=>fail('startup_timeout'),this.startupMs);
    let stderr='';const fail=(reason,details={})=>{const error=Object.assign(new Error(reason),{stderr,...details});this.lastFailure={reason,stderr,...details};clearTimeout(timer);if(!ready)reject(error);if(this.child===child){this.child=null;this.starting=null;}for(const [id,p] of this.pending){if(p.child===child){clearTimeout(p.timer);p.reject(error);this.pending.delete(id);}}child.kill();};
    child.stdout.setEncoding('utf8');child.on('error',error=>fail('worker_error',{code:error.code}));child.on('close',(exitCode,signal)=>fail('worker_exit',{exitCode,signal}));child.stdin.on('error',()=>fail('worker_stdin_error'));child.stderr.setEncoding('utf8');child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-8192);});
    child.stdout.on('data',chunk=>{buf+=chunk.toString('utf8');if(buf.length>8000000)return fail('oversized_output');let i;while((i=buf.indexOf('\n'))>=0){let value;try{value=JSON.parse(buf.slice(0,i));}catch{return fail('malformed_output');}buf=buf.slice(i+1);if(!value||typeof value!=='object'||Array.isArray(value))return fail('malformed_output');if(!ready){if(value.type!=='ready')return fail('invalid_ready');ready=true;clearTimeout(timer);this.load=value;resolve();continue;}const p=this.pending.get(value.id);if(!p)return fail('unexpected_response');clearTimeout(p.timer);this.pending.delete(value.id);if(!value.ok){p.reject(new Error('worker_rejected'));continue;}if(!validWorkerAnnotation(p.raw,value.annotation)){p.reject(new Error('malformed_annotation'));return fail('malformed_annotation');}p.resolve(value);}});
  });try{await this.starting;}finally{this.starting=null;}}
  async request(raw){if(typeof raw!=='string'||!raw.trim()||raw.length>200000)throw new Error('invalid_input');await this.start();if(this.pending.size>=this.maxPending)throw new Error('queue_full');const id=++this.seq,child=this.child;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('request_timeout'));this.stop();},this.timeoutMs);this.pending.set(id,{resolve,reject,timer,raw,child});child.stdin.write(JSON.stringify({id,text:raw})+'\n');});}
  async safeRequest(raw){try{return{mode:'linguistic',...(await this.request(raw))};}catch(error){return{mode:'deterministic-only',reason:error.message,annotation:null};}}
  stop(){const child=this.child;this.child=null;this.starting=null;for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('worker_stopped'));}this.pending.clear();if(child){child.stdin.end();child.kill();}}
}
module.exports={WorkerClient,validAnnotation,validWorkerAnnotation};
