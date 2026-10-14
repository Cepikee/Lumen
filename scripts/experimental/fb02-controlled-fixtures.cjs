"use strict";
// Offline controlled syntax fixtures derived from prior real parser outputs.
// Lexical substitutions preserve dependency topology; not new NLP measurements.
const base=require('../../tests/fixtures/real-text-a/source-composition-annotations.json');
function fixture(id,template,replacements={}){
 const old=structuredClone(base.find(x=>x.id===template));let text='',cursor=0;const points=new Map();
 const tokens=old.annotation.tokens.map(t=>{text+=old.text.slice(cursor,t.start);const start=text.length;const r=replacements[t.text];const word=r?.[0]??t.text;text+=word;points.set(t.start,start);points.set(t.end,text.length);cursor=t.end;return {...t,text:word,lemma:r?.[1]??t.lemma,start,end:text.length};});text+=old.text.slice(cursor);
 const offset=n=>{if(points.has(n))return points.get(n);let delta=0;for(const t of old.annotation.tokens){if(t.end>n)break;delta=(points.get(t.end)-t.end);}return n+delta;};
 for(const t of tokens)t.headStart=offset(t.headStart);
 const spans=xs=>xs.map(s=>({...s,start:offset(s.start),end:offset(s.end),text:text.slice(offset(s.start),offset(s.end))}));
 return {id,text,annotation:{tokens,sentences:spans(old.annotation.sentences),entities:spans(old.annotation.entities)},provenance:{kind:'controlled_dependency_fixture',template,substitutions:replacements}};
}
const artifacts=[['price','árjegyzéke','árjegyzék'],['report','jelentése','jelentés'],['notice','közleménye','közlemény'],['account','beszámolója','beszámoló'],['brief','tájékoztatója','tájékoztató'],['document','dokumentuma','dokumentum'],['data','adatsora','adatsor'],['table','kimutatása','kimutatás'],['minutes','jegyzőkönyve','jegyzőkönyv'],['communication','közlése','közlés'],['information','értesülése','értesülés'],['statement','nyilatkozata','nyilatkozat']];
const rows=artifacts.flatMap(([id,word,lemma])=>[
 fixture(id,'institution',{'hatóság':['szövetség','szövetség'],'közlése':[word,lemma]}),
 fixture('bare_'+id,'bare_statement',{'közlés':[lemma,lemma]})
]);
for(const [id,template,replacements]of [
 ['media','paper',{'értesülése':['dokumentuma','dokumentum']}],
 ['person','person',{'bejelentése':['nyilatkozata','nyilatkozat']}],
 ['named','named',{'tájékoztatása':['közleménye','közlemény']}],
 ['actor','actor',{'közlése':['jelentése','jelentés']}],
 ['numeric','numeric',{'közlése':['árjegyzéke','árjegyzék']}],
 ['money','money',{'közlése':['árjegyzéke','árjegyzék']}],
 ['modal','modal',{'közlése':['tájékoztatója','tájékoztató']}],
 ['negation','negation',{'közlése':['dokumentuma','dokumentum']}],
 ['contrast','contrast',{'közlése':['közleménye','közlemény']}],
 ['speaker','nested',{'közlése':['közleménye','közlemény']}],
 ['quote','quote',{'közlése':['közleménye','közlemény']}],
 ['recipient','recipient',{'közlése':['közleménye','közlemény']}],
 ['nested_owner','nested_possessor',{'vezetőjének':['leányvállalatának','leányvállalat'],'közlése':['jelentése','jelentés']}],
 ['multiple','multiple',{'közlése':['dokumentuma','dokumentum']}],
 ['ambiguous','ambiguous',{'közlése':['dokumentuma','dokumentum']}],
 ['pronoun','pronoun',{'közlése':['dokumentuma','dokumentum']}],
 ['nonreport_price','nonreport',{'közlését':['árjegyzékét','árjegyzék']}],
 ['nonreport_report','nonreport',{'közlését':['jelentését','jelentés']}],
 ['nonreport_notice','nonreport',{'közlését':['közleményét','közlemény']}],
 ['boundary','boundary',{'közlése':['dokumentuma','dokumentum']}],
 ['two','two',{'közlése':['dokumentuma','dokumentum'],'beszámolója':['árjegyzéke','árjegyzék']}],
 ['artifact_owner','institution',{'hatóság':['jelentés','jelentés'],'közlése':['dokumentuma','dokumentum']}]
])rows.push(fixture(id,template,replacements));
// Explicit double-evidential topology: both obliques attach to the same claim.
const outer=fixture('outer','company',{'beszámolója':['jelentése','jelentés']});
const prefix='A lap szerint ';const shift=prefix.length;
for(const t of outer.annotation.tokens){t.start+=shift;t.end+=shift;t.headStart+=shift;}
for(const k of ['sentences','entities'])for(const s of outer.annotation[k]){s.start+=shift;s.end+=shift;}
outer.text=prefix+outer.text;outer.annotation.sentences[0].start=0;outer.annotation.sentences[0].text=outer.text;
const predicate=outer.annotation.tokens.find(t=>t.dep==='ROOT');
outer.annotation.tokens.unshift({text:'A',lemma:'a',start:0,end:1,pos:'DET',morph:{},dep:'det',headStart:2},{text:'lap',lemma:'lap',start:2,end:5,pos:'NOUN',morph:{Case:'Nom'},dep:'obl',headStart:predicate.start},{text:'szerint',lemma:'szerint',start:6,end:13,pos:'ADP',morph:{},dep:'case',headStart:2});
outer.provenance.additionalTopology='hand-authored outer evidential attached to same predicate';rows.push(outer);
module.exports={rows,fixture};
