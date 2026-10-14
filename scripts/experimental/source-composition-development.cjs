"use strict";
const fs=require('node:fs');
const {WorkerClient}=require('./morph-worker-client.cjs');
const {workerOptions}=require('./real-text-a-development.cjs');
const cases=[
 ['paper','A hetilap értesülése szerint a tárgyalás lezárult.'],
 ['institution','A hatóság közlése szerint a vizsgálat lezárult.'],
 ['police','A kapitányság tájékoztatása alapján a sofőr távozott.'],
 ['person','Judit bejelentése szerint a bolt bezárt.'],
 ['company','A vállalat beszámolója alapján a termelés nőtt.'],
 ['bare_plural','Értesülések szerint a tárgyalás lezárult.'],
 ['bare_report','A beszámoló szerint a termelés nőtt.'],
 ['nested','A hetilap közlése szerint a szóvivő azt mondta, hogy a híd megnyílt.'],
 ['recipient','A hivatal közlése szerint a szóvivő a lapnak elmondta, hogy a híd megnyílt.'],
 ['actor','A kapitányság közlése szerint a sofőr elhagyta a helyszínt.'],
 ['numeric','A vállalat közlése szerint az üzem 280 dolgozót alkalmaz.'],
 ['negation','A hivatal közlése szerint a bolt nem zárt be.'],
 ['modal','A hetilap közlése szerint a program akár 24 millió forintba kerülhet.'],
 ['money','A hatóság közlése szerint Judit 8200 forintot fizetett.'],
 ['temporal','A hivatal közlése szerint a tárgyalás 2033-ban indulhat.'],
 ['contrast','A hivatal közlése szerint nem Judit, hanem Lilla írta alá a szerződést.'],
 ['multiple','A cég és a hivatal közlése szerint a termelés nőtt.'],
 ['ambiguous','A cég vagy a hivatal közlése szerint a termelés nőtt.'],
 ['quote','A hivatal közlése szerint a szóvivő azt mondta: „A bolt bezárt.”'],
 ['nonreport','Judit elolvasta a hivatal közlését.'],
 ['two','A hivatal közlése szerint a bolt bezárt. A vállalat beszámolója alapján a termelés nőtt.'],
 ['boundary','A hivatal közlése szerint a bolt bezárt. A sofőr távozott.'],
 ['possessive_role','A klinika vezetője szerint a vizsgálat lezárult.'],
 ['named','Az Esti Krónika tájékoztatása szerint a bolt bezárt.'],
 ['nested_possessor','A cég vezetőjének közlése szerint a bolt bezárt.'],
 ['pronoun','Az ő közlése szerint a bolt bezárt.'],
 ['bare_statement','A közlés alapján a bolt bezárt.']
].map(([id,text])=>({id,text}));
async function main(){const w=new WorkerClient(workerOptions),rows=[];try{for(const x of cases)rows.push({...x,annotation:(await w.request(x.text)).annotation});}finally{w.stop();}fs.writeFileSync('tests/fixtures/real-text-a/source-composition-annotations.json',JSON.stringify(rows,null,2),{flag:'wx'});console.log(rows.length);}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={cases};
