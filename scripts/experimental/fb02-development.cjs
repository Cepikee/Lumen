"use strict";
const fs=require('node:fs');
const {WorkerClient}=require('./morph-worker-client.cjs');
const {workerOptions}=require('./real-text-a-development.cjs');
const cases=[
 ['price','A szövetkezet árjegyzéke szerint a csomag 760 forintba kerül.'],
 ['report','A minisztérium jelentése szerint a vizsgálat lezárult.'],
 ['notice','A hatóság közleménye szerint a híd megnyílt.'],
 ['media','A hetilap értesülése szerint a tárgyalás lezárult.'],
 ['person','Eszter nyilatkozata szerint a bolt bezárt.'],
 ['document','Az intézet dokumentuma szerint a vizsgálat lezárult.'],
 ['data','Az intézet adatsora szerint a termelés nőtt.'],
 ['table','A társaság kimutatása szerint a termelés nőtt.'],
 ['minutes','A hivatal jegyzőkönyve szerint a tárgyalás lezárult.'],
 ['brief','A cég tájékoztatója szerint a bolt bezárt.'],
 ['account','A cég beszámolója szerint a termelés nőtt.'],
 ['communication','A hivatal közlése szerint a híd megnyílt.'],
 ['bare_report','A jelentés szerint a bolt bezárt.'],
 ['bare_price','Az árjegyzék szerint a csomag 760 forintba kerül.'],
 ['bare_brief','A tájékoztató szerint a bolt bezárt.'],
 ['bare_basis','A dokumentum alapján a vizsgálat lezárult.'],
 ['nonreport_price','Az árjegyzéket frissítették.'],
 ['nonreport_report','A jelentést tegnap adták ki.'],
 ['nonreport_notice','A közleményt letöltötték.'],
 ['actor','A rendőrség jelentése szerint a sofőr elhagyta a helyszínt.'],
 ['numeric','A vállalat árjegyzéke szerint a termék 850 forintba kerül.'],
 ['modal','A cég tájékoztatója szerint a termék akár 20 százalékkal is drágulhat.'],
 ['negation','A hivatal dokumentuma szerint a bolt nem zárt be.'],
 ['contrast','A hivatal közleménye szerint nem Eszter, hanem Lilla írta alá a szerződést.'],
 ['outer','A lap szerint a vállalat jelentése alapján a termelés nőtt.'],
 ['speaker','A cég közleménye szerint a vezérigazgató azt mondta, hogy a bolt bezárt.'],
 ['recipient','A hatóság közleménye szerint a szóvivő a lapnak elmondta, hogy a híd megnyílt.'],
 ['nested_owner','A cég leányvállalatának jelentése szerint a termelés nőtt.'],
 ['multiple','A cég és a hivatal dokumentuma szerint a termelés nőtt.'],
 ['ambiguous','A cég vagy a hivatal dokumentuma szerint a termelés nőtt.'],
 ['group','A bizottság dokumentuma szerint a vizsgálat lezárult.'],
 ['named','Az Esti Krónika közleménye szerint a bolt bezárt.'],
 ['boundary','A hivatal dokumentuma szerint a bolt bezárt. A sofőr távozott.'],
 ['two','A hivatal dokumentuma szerint a bolt bezárt. A cég árjegyzéke szerint a csomag 760 forintba kerül.'],
 ['pronoun','Az ő dokumentuma szerint a bolt bezárt.'],
 ['artifact_owner','A jelentés dokumentuma szerint a bolt bezárt.'],
 ['proper_artifact','Az Életjel nevű lap közleménye szerint a bolt bezárt.'],
 ['negative_source','Nem a hivatal dokumentuma szerint zárt be a bolt.'],
 ['role','A klinika vezetője szerint a vizsgálat lezárult.'],
 ['same_word','A hivatal dokumentuma szerint a bolt bezárt. A dokumentumot elégették.']
].map(([id,text])=>({id,text}));
async function main(){const w=new WorkerClient(workerOptions),rows=[];try{for(const c of cases)rows.push({...c,annotation:(await w.request(c.text)).annotation});}finally{w.stop();}fs.writeFileSync('tests/fixtures/real-text-a/fb02-annotations.json',JSON.stringify(rows,null,2),{flag:'wx'});console.log(rows.length);}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={cases};
