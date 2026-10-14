"use strict";
// Positive semantic classes for new generic actors. Neither subjecthood nor
// a nominal's spelling alone licenses agency. Existing named-role logic lives
// in the dependency binder; this rule only adds evidenced generic participants.
const norm=t=>String(t?.lemma||'').toLocaleLowerCase('hu');
const people=new Set(['férfi','nő','ember','dolgozó','munkás','mentő','tűzoltó','orvos','versenyző']);
const organisations=new Set(['intézmény','hatóság','bizottság','hivatal','szolgáltató','klinika','kórház','csapat']);
const humanActions=new Set(['vezet','fut','dolgozik','segít','ment','vizsgál','ellenőriz','aláír','javít','megjavít','átad']);
const organisationActions=new Set(['alkalmaz','felvesz','javít','megjavít','ellenőriz','elfogad','jóváhagy','aláír','szervez','fejleszt','finanszíroz']);
function genericActorLicense(t,predicate,tokens){
 if(!predicate||predicate.pos!=='VERB'||predicate.morph.VerbForm!=='Fin'||predicate.morph.Voice!=='Act')return null;
 if(t.pos!=='NOUN'||t.dep!=='nsubj'||t.headStart!==predicate.start||t.morph.Case!=='Nom')return null;
 if(t.morph.Number&&predicate.morph.Number&&t.morph.Number!==predicate.morph.Number)return null;
 if(tokens.some(x=>x.headStart===t.start&&['case','conj'].includes(x.dep)))return null;
 const particles=tokens.filter(x=>x.headStart===predicate.start&&x.dep==='compound:preverb');
 const action=particles.length===1?norm(particles[0])+norm(predicate):norm(predicate);
 const kind=people.has(norm(t))&&humanActions.has(action)?'human_agent':organisations.has(norm(t))&&organisationActions.has(action)?'institutional_agent':null;
 return kind?{rule:'generic_semantic_class_compatible_active_predicate',nominalClass:kind,action}:null;
}
module.exports={genericActorLicense};
