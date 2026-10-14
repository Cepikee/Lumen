"use strict";
// Research-only safety successor; the frozen provider remains unchanged.
const base = require('./role-scope-binder.cjs');
const {bindContrasts} = require('./contrast-correction.cjs');
const {bindAttribution} = require('./attribution-chain.cjs');
const {bindDependencies} = require('./dependency-binding.cjs');
const norm = s => String(s || '').toLocaleLowerCase('hu');
const finite = t => ['VERB','AUX'].includes(t.pos) && t.morph.VerbForm === 'Fin';
const span = (raw,start,end) => ({start,end,textSpan:raw.slice(start,end)});
function supported(ref, tokens, predicate) {
  if (!ref || ref.case !== 'Nom' || ref.pronoun || ref.type === 'location') return false;
  const tail = tokens.findIndex(t => t.end === ref.end);
  const next = tokens[tail + 1];
  if (next && (next.pos === 'ADP' || ['NOUN','PROPN'].includes(next.pos) && (next.morph['Person[psor]'] || next.morph.Case !== 'Nom'))) return false;
  const own = tokens[tail];
  const followingHead = tokens.slice(tail + 1).find(t => !['ADJ','DET','ADV','NUM'].includes(t.pos));
  if (followingHead?.morph['Person[psor]']) return false;
  if (predicate?.morph.Voice === 'Pass') return false;
  return Boolean(own && (!predicate || !own.morph.Number || !predicate.morph.Number || own.morph.Number === predicate.morph.Number));
}
function bindCore(raw, annotation) {
  const result = base.bind(raw, annotation);
  const unsafeNames = result.entities.filter(e => e.type === 'person' && annotation.tokens.some(t => t.start >= e.start && t.end <= e.end && !['PROPN','PUNCT'].includes(t.pos)));
  result.entities = result.entities.filter(e => !unsafeNames.includes(e));
  for (const f of result.frames) {
    const ts = annotation.tokens.filter(t => t.start >= f.evidenceSpan.start && t.end <= f.evidenceSpan.end);
    const content = ts.filter(t => t.start >= f.content.start && t.end <= f.content.end);
    const predicate = content.find(t => t.start === f.actionSpan?.start);
    const reject = reason => { if (!f.unresolvedReasons.includes(reason)) f.unresolvedReasons.push(reason); f.binding = 'unresolved'; };
    const unsafeRef = ref => ref && unsafeNames.some(e => e.start === ref.start && e.end === ref.end);
    if (f.actor && (unsafeRef(f.actor) || !predicate || !finite(predicate) || !supported(f.actor, content, predicate))) {
      f.actor = f.subject = null; f.actorStatus = 'unresolved'; reject('unsupported_local_actor');
    }
    const reportTokens = f.reportingVerb ? ts.filter(t => t.end <= f.content.start || t.start >= f.content.end) : [];
    const report = ts.find(t => norm(t.lemma) === f.reportingVerb);
    const sourceTokens = reportTokens.length ? reportTokens : ts;
    // Explicit "szerint" is attribution, not a grammatical subject assertion.
    if (f.source && (unsafeRef(f.source) || f.reportingVerb !== 'szerint' && !supported(f.source, sourceTokens, report))) {
      f.source = f.reportingActor = f.attribution = null; reject('unsupported_reporting_actor');
    }
    if (f.unresolvedReasons.some(r => ['nested_attribution','multiple_reporting_predicates'].includes(r))) {
      f.attributionCandidates = f.source ? [f.source] : [];
      f.source = f.reportingActor = f.attribution = null;
      reject('attribution_chain_unresolved');
    }
    if (f.actor) f.actorEvidence = { rule: 'unique_nominative_local_finite_predicate', entitySpan: f.actor.evidenceSpan, predicateSpan: f.actionSpan, clauseSpan: f.content };
    if (f.source) f.sourceEvidence = { rule: f.reportingVerb === 'szerint' ? 'explicit_according_to' : 'local_reporting_subject', entitySpan: f.source.evidenceSpan, clauseSpan: f.evidenceSpan };
    if (f.recipient) {
      const r = f.recipient;
      const personal = ['person','organization'].includes(r.type) || /^(neki|vele|tőle)$/iu.test(r.mention);
      const validCase = ['mond','közöl','ír','küld'].includes(f.reportingVerb) && r.case === 'Dat' || f.reportingVerb === 'közöl' && r.case === 'Ins' || f.reportingVerb === 'kérdez' && r.case === 'Ela' || f.reportingVerb === 'tájékoztat' && r.case === 'Acc';
      if (!personal || !validCase) { f.recipient = null; f.recipientCandidates = []; reject('recipient_valency_unproven'); }
    }
    // A negator belongs to a finite predicate only when its intervening tokens
    // are adverbs/particles, not an embedded nominal or non-finite phrase.
    const negators = content.filter(t => ['nem','sem'].includes(norm(t.text)));
    const localNegation = predicate && negators.some(n => n.end <= predicate.start && content.filter(t => t.start >= n.end && t.end <= predicate.start).every(t => ['ADV','PART'].includes(t.pos) && !t.morph.VerbForm));
    if (!['tagad','cáfol'].includes(f.reportingVerb)) {
      f.polarity = localNegation || predicate && /^nincs/u.test(norm(predicate.text)) ? 'denied' : 'asserted';
      if (negators.length && !predicate) { f.polarity = 'unresolved'; reject('negation_predicate_unresolved'); }
      if (content.filter(finite).length > 1 && negators.length) { f.polarity = 'unresolved'; reject('nested_negation_scope'); }
      const negativeReport = report && sourceTokens.some(n => ['nem','sem'].includes(norm(n.text)) && n.end <= report.start && sourceTokens.filter(t => t.start >= n.end && t.end <= report.start).every(t => ['ADV','PART'].includes(t.pos) && !t.morph.VerbForm));
      if (negativeReport) { f.polarity = 'unresolved'; reject('content_under_negated_report'); }
      else f.unresolvedReasons = f.unresolvedReasons.filter(r => r !== 'negated_reporting_predicate');
    }
    for (const n of f.numericArguments) {
      const after = ts.filter(t => t.start >= n.end);
      const followingNumber = f.numericArguments.find(x => x.start > n.start);
      const localAfter = after.filter(t => !followingNumber || t.start < followingNumber.start);
      const assign = (kind,type,property,evidence) => { n.semanticKind=kind; n.ownerType=type; n.property=property; n.owner={label:property,evidenceSpan:evidence}; n.subject=null; };
      if (localAfter[0] && norm(localAfter[0].lemma) === 'százalékos' && localAfter[0].start - n.end < 3) {
        n.unit='%'; n.end=localAfter[0].end; n.raw=raw.slice(n.start,n.end); n.evidenceSpan=span(raw,n.start,n.end);
        n.unresolvedReasons=n.unresolvedReasons.filter(r=>r!=='unit_unresolved');
      }
      if (/^\d{4}-(?:ban|ben)$/u.test(n.raw)) assign('year','time','year',n.evidenceSpan);
      else if (n.semanticKind === 'age') {
        const head = localAfter.find(t => ['NOUN','PROPN'].includes(t.pos));
        if (head && ['büntetés','szerződés','futamidő','szabadságvesztés','időtartam'].includes(norm(head.lemma))) assign('duration','property','duration',span(raw,head.start,head.end));
        else {
          const between = head ? localAfter.filter(t => t.end <= head.start) : [];
          const people = result.entities.filter(e => e.type === 'person' && head && e.start === head.start && between.every(t => ['ADJ','DET'].includes(t.pos)));
          n.owner = people.length === 1 ? people[0] : null;
          n.subject = n.owner; n.ownerType = n.owner ? 'entity' : 'unresolved'; n.property = 'age';
          if (!n.owner) n.unresolvedReasons.push('age_head_unresolved');
        }
      }
      if (n.semanticKind === 'tariff_rate' && n.unit !== '%') { n.semanticKind='unknown'; n.owner=null; n.ownerType='unresolved'; n.property=null; n.subject=null; }
      if (n.ownerType === 'threshold' && n.unit === '%') n.semanticKind='threshold';
      if (n.ownerType === 'entity' && n.semanticKind !== 'age' && !f.actor) { n.owner=null; n.subject=null; n.ownerType='unresolved'; n.unresolvedReasons.push('unsupported_local_actor'); }
      if (n.ownerType === 'entity' && n.semanticKind !== 'age' && (!predicate || !n.unit || ts.some(t => t.start >= n.start && t.end <= n.end && t.pos === 'ADJ'))) {
        n.owner=null; n.subject=null; n.ownerType='unresolved'; n.unresolvedReasons.push('numeric_predicate_attachment_unproven');
      }
      if (!n.owner && !n.unresolvedReasons.includes('numeric_owner_unresolved')) n.unresolvedReasons.push('numeric_owner_unresolved');
      n.binding = n.unresolvedReasons.length ? 'unresolved' : 'resolved';
      if (n.binding === 'resolved') n.bindingEvidence = { rule: n.semanticKind === 'age' ? 'adjacent_person_age_modifier' : 'local_typed_numeric_argument', numericSpan: n.evidenceSpan, ownerSpan: n.owner.evidenceSpan, clauseSpan: f.evidenceSpan };
    }
    if (f.numericArguments.some(n => n.binding === 'unresolved')) reject('numeric_binding_unresolved');
  }
  result.version = 'real-text-safety-a-1';
  return result;
}
// Component-level historical regressions can inspect the morphology stage.
// The actual research entrypoint always applies the dependency safety gate.
function bindMorphologyStage(raw, annotation) { return bindAttribution(raw, annotation, (text,a)=>bindContrasts(text,a,bindCore)); }
function bind(raw, annotation) {
 const morphology=bindMorphologyStage(raw, annotation);
 const recovered=require('./source-scope-recovery.cjs').recoverSources(raw,annotation,morphology,(text,a)=>bindContrasts(text,a,bindCore));
 const compounds=require('./compound-rate-safety.cjs').guardCompoundRates(raw, annotation, bindDependencies(raw, annotation, recovered));
 const scoped=require('./numeric-scope-safety.cjs').guardNumericScope(raw, annotation, compounds);
 return require('./source-composition-safety.cjs').composeSources(raw, annotation, scoped);
}
module.exports = {bind, bindMorphologyStage};
