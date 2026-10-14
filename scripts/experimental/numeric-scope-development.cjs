"use strict";
// Local research annotation capture; no expected labels are passed to NLP.
const fs = require('node:fs');
const { WorkerClient } = require('./morph-worker-client.cjs');
const { workerOptions } = require('./real-text-a-development.cjs');
const cases = [
 ['equal','A raktár 83 ládát tárol.'],
 ['exact','A raktár pontosan 83 ládát tárol.'],
 ['upper','A raktár legfeljebb 83 ládát tárol.'],
 ['maximum','A raktár maximum 83 ládát tárol.'],
 ['lower','A raktár legalább 83 ládát tárol.'],
 ['minimum','A raktár minimum 83 ládát tárol.'],
 ['greater','A raktár több mint 83 ládát tárol.'],
 ['less','A raktár kevesebb mint 83 ládát tárol.'],
 ['approx','A raktár körülbelül 83 ládát tárol.'],
 ['about','A raktár mintegy 83 ládát tárol.'],
 ['range_dash','A raktár 70–83 ládát tárol.'],
 ['range_words','A raktár 70 és 83 közötti ládát tárol.'],
 ['potential','Az üzem 46 dolgozót alkalmazhat.'],
 ['capacity','Az üzem akár 46 dolgozót is alkalmazhat.'],
 ['conditional','Az üzem 46 dolgozót alkalmazna.'],
 ['future','Az üzem 46 dolgozót fog alkalmazni.'],
 ['bounded_possible','Az üzem legfeljebb 46 dolgozót alkalmazhat.'],
 ['lehet','A létszám 46 fő lehet.'],
 ['lehetne','A létszám 46 fő lehetne.'],
 ['must','Az üzemnek 46 dolgozót kell alkalmaznia.'],
 ['should','Az üzemnek 46 dolgozót kellene alkalmaznia.'],
 ['expected','Az üzem várhatóan 46 dolgozót alkalmaz.'],
 ['money_bound','A támogatás legfeljebb 7 millió forint volt.'],
 ['money_greater','A bevétel több mint 7 millió forint volt.'],
 ['money_possible','A műhely akár 7 millió forintot kaphat.'],
 ['money_exact','Júlia pontosan 7000 forintot fizetett.'],
 ['percent_upper','A részesedés legfeljebb 12 százalék volt.'],
 ['percent_lower','A részesedés legalább 12 százalék volt.'],
 ['percent_greater','A részesedés több mint 12 százalék volt.'],
 ['percent_delta','A termelés 12 százalékkal nőtt.'],
 ['percent_level','A részesedés 12 százalékra nőtt.'],
 ['rate_max','A jármű maximum 87 km/h-val haladt.'],
 ['rate_above','A jármű 87 km/h fölött haladt.'],
 ['rate_below','A jármű 87 km/h alatt maradt.'],
 ['rate_possible','A jármű akár 87 km/h-val haladhat.'],
 ['rate_equal','A jármű 87 km/h-val haladt.'],
 ['attributed','A tanács szerint akár 23 millió forintba kerülhet a felújítás.'],
 ['negated','Nem kerülhet többe 17 millió forintnál a felújítás.'],
 ['contrast','Nem legfeljebb 11, hanem legfeljebb 16 pályázó kaphat támogatást.'],
 ['reference','A reggeli 6 fokhoz képest este 13 fokot mérhetnek.'],
 ['year','A próba 2032-ben indulhat.'],
 ['sibling','Az üzem 46 dolgozót alkalmazhat, de a raktár 83 ládát tárol.'],
 ['lexical_control','A tanár 8 diákkal nevet.'],
 ['aux_sibling','Az üzem 46 dolgozót alkalmaz, de a raktárnak 83 ládát kell tárolnia.']
].map(([id,text])=>({id,text}));
async function main() {
 const w=new WorkerClient(workerOptions),rows=[];
 try { for(const c of cases) rows.push({...c,annotation:(await w.request(c.text)).annotation}); }
 finally { w.stop(); }
 fs.writeFileSync('tests/fixtures/real-text-a/numeric-scope-annotations.json',JSON.stringify(rows,null,2),{flag:'wx'});
 console.log('Captured local NLP annotations:',rows.length);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={cases};
