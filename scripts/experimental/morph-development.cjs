"use strict";
const fs=require('node:fs');const {WorkerClient}=require('./morph-worker-client.cjs');const {bind}=require('./morph-clause-binder.cjs');
const cases=[
 ['economy','Az Alfa Zrt. bevétele 12 milliárd, a Béta Kft.-é 9 milliárd forint volt.'],
 ['company','A vállalat szerint nem csökkent az ár, de a kereskedők kevesebb eladásról számoltak be.'],
 ['election','Anna 51 százalékot, Béla 43 százalékot szerzett.'],
 ['sport','A hazai csapat három gólt, a vendég egyet szerzett.'],
 ['weather','Budapesten 32, Szegeden 35 fokot mértek.'],
 ['health','A kórházban 320 beteget, a klinikán 210-et kezeltek.'],
 ['energy','Az Északi Erőmű 35 megawattot termelt, a Déli Erőmű 46 megawattot termelt.'],
 ['science','A kutató szerint a minta 12 százaléka reagált, bár az eredmény nem végleges.'],
 ['technology','Az első termék 120 ezer, a második 145 ezer forintba kerül.'],
 ['transport','A Volánbusz szerint ha a vihar erősödik, 8 járatot törölnek, a MÁV viszont tegnap 3 buszt indított.'],
 ['education','Az iskola 24 tanulót, az egyetem 32 diákot fogadott.'],
 ['court','Anna elismerte, hogy pénzt kért, de tagadta, hogy jogsértést követett el.'],
 ['police','A rendőrség szerint 5 iratot találtak, a Reuters azonban 4 iratról számolt be.'],
 ['conditional','Ha Anna nyer, adót csökkent, Béla viszont tegnap már új programot jelentett be.'],
 ['attribution','A minisztérium szerint az ár csökkent, a gyártó viszont ezt tagadta.'],
 ['nested','A Reuters azt írta, hogy a rendőrség szerint 5 iratot találtak.'],
 ['namesake','Kovács Anna és Kovács Béla 5 pontot szerzett. Szerinte ez siker.'],
 ['unicode','😀 Anna 51 százalékot, Béla 43 százalékot szerzett.'],
 ['metadata','Fotó: Kovács Anna / Ügynökség\nAnna 51 százalékot, Béla 43 százalékot szerzett.'],
 ['comparison','A korábbi referencia 30 százalék volt, Anna most 51 százalékot szerzett.']
].map(([id,text])=>({id,text}));
const mutations=[
 ['subject_order','Béla 51 százalékot, Anna 43 százalékot szerzett.'],
 ['value_order','Anna 43 százalékot, Béla 51 százalékot szerzett.'],
 ['conjunction','Anna 51 százalékot, Béla pedig 43 százalékot szerzett.'],
 ['negation','Anna nem szerzett 51 százalékot, Béla 43 százalékot kapott.'],
 ['attribution_swap','A rendőrség szerint Anna 51 százalékot szerzett.'],
 ['conditional_added','Ha Anna nyer, 51 százalékot kaphat.'],
 ['plan','Anna azt ígérte, hogy 5 üzemet nyit.'],
 ['future','Anna holnap 5 üzemet nyit.'],
 ['organization','Az Alfa Zrt. 51 százalékot, a Béta Kft. 43 százalékot szerzett.'],
 ['location_person','Anna 32, Béla 35 fokot mért.'],
 ['two_surnames','Kovács Anna 51 százalékot, Kovács Béla 43 százalékot szerzett.'],
 ['three_subjects','Anna 51 százalékot, Béla 43 százalékot, Csilla 6 százalékot szerzett.']
].map(([id,text])=>({id:'mutation_'+id,text}));
(async()=>{const worker=new WorkerClient();const results=[];try{for(const c of [...cases,...mutations]){const {annotation}=await worker.request(c.text);const result=bind(c.text,annotation);results.push({...c,annotation,result});console.log(c.id,JSON.stringify(result.frames.map(f=>({text:f.propositionSpan.textSpan,subject:f.subject?.mention,action:f.action,binding:f.binding,n:f.numericArguments.map(n=>[n.value,n.unit]),polarity:f.polarity,cond:f.conditionality,source:f.attribution?.label}))));}}finally{worker.stop();}fs.writeFileSync('docs/UTOM_V2_2/morph_clause/development_latest.json',JSON.stringify({developmentOnly:true,results},null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
