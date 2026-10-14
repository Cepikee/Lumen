const fs=require('node:fs'),cp=require('node:child_process');
const run=(args,encoding='utf8')=>{const r=cp.spawnSync('wsl.exe',args,{encoding,timeout:45000});return {command:'wsl.exe',args,cwd:process.cwd(),exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message};};
const status=run(['--status'],'utf16le'),distros=run(['-l','-v'],'utf16le');
const probe=run(['-d','Ubuntu-24.04','--','env','PYTHONPATH=/home/mark/.local/share/utom-morph-research','python3','/mnt/f/Projekt2025/Lumen/docs/UTOM_V2_2/nlp_pipeline_recovery_20261013/environment_probe.py']);
const conversion=run(['-d','Ubuntu-24.04','--','wslpath','-u',process.cwd()]);
fs.writeFileSync(__dirname+'/environment.json',JSON.stringify({status,distros,probe,conversion,current:probe.exitCode===0?JSON.parse(probe.stdout):null},null,2),{flag:'wx'});
console.log(probe.exitCode,probe.stderr);if(probe.exitCode===0){const x=JSON.parse(probe.stdout);delete x.modelHashes;console.log(x);}
