"use strict";

// Benchmark adapter only. Extraction decisions are shared with controlled
// canonical-provider tests through a gold-independent V2 semantic helper.
const semantic = require("../v2/deterministic-semantic");

function extractEntities(text) {
  return semantic.extractEntities(text).map((entity) => ({ mention: entity.mention, normalized: entity.normalized, type: entity.type, identity: entity.identity }));
}
function extractClaims(article) {
  const source = article?.source?.key || article?.source || "";
  const claims = semantic.extractClaims(article?.text || "", source);
  return claims.filter((claim, index, all) => {
    if (!/^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(String(claim.attribution?.label || ""))) return true;
    return !all.some((candidate, candidateIndex) => candidateIndex !== index
      && candidate.source === claim.source
      && candidate.predicate === claim.predicate
      && JSON.stringify(candidate.value) === JSON.stringify(claim.value)
      && candidate.unit === claim.unit
      && !/^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(String(candidate.attribution?.label || "")));
  });
}
function extractEvents(article) {
  const text = semantic.segmentArticleText(String(article?.text || ""));
  const source = article?.source?.key || article?.source || "";
  const events = [];
  const seen = new Set();
  const articleEntities = semantic.extractEntities(text);
  const normalizeTitle = (value) => String(value || "").trim()
    .replace(/^.*:\s*/u, "")
    .replace(/^(?:az|a|egy)\s+/iu, "")
    .replace(/\s+(?:lesz|volt|van|marad)$/iu, "")
    .trim();
  const add = (title, evidence, options = {}) => {
    const normalized = normalizeTitle(title);
    if (!normalized || seen.has(normalized.toLocaleLowerCase("hu")) || !evidence) return;
    seen.add(normalized.toLocaleLowerCase("hu"));
    events.push({ title: normalized, source, evidence, ...options });
  };
  const concreteEvent = (sentence) => {
    const mode = semantic.semanticMode(sentence);
    if (mode.conditional || mode.uncertainty || ["possible", "unknown", "plan"].includes(mode.modality)) return false;
    if (/előfordulhat|lehet(?:ett)?|kerülhet|gyanú|felmerül|nem tudta|nem tudhatjuk|nem történt|nem sikerült/iu.test(sentence)) return false;
    return true;
  };
  const participants = (sentence) => [...new Set((articleEntities || []).filter((entity) => {
    const lowerSentence = sentence.toLocaleLowerCase("hu");
    return lowerSentence.includes(String(entity.mention || "").toLocaleLowerCase("hu"));
  })
    .filter((entity) => ["person", "organization", "product"].includes(entity.type))
    .map((entity) => entity.mention))].concat(
    (() => {
      const acquisitionSubject = sentence.match(/(?:^|[,:;()]\s*)([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]{2,})\s+(?:(?:\d{4}\s+[\p{L}-]+\s+)?)(?:megvásárolta|vásárolt|megvette)\b/u)?.[1];
      return acquisitionSubject && !/^(?:A|Az|Egy|Lajos|Zoltán)$/u.test(acquisitionSubject) ? [acquisitionSubject] : acquisitionSubject ? [acquisitionSubject] : [];
    })(),
  ).filter((value, index, all) => value && all.indexOf(value) === index);
  for (const match of text.matchAll(/Az esemény neve:\s*([^.!?\n]+)/giu)) {
    const sentenceStart = text.lastIndexOf("\n\n", match.index) + 2;
    const sentenceEnd = text.indexOf(".", match.index);
    add(match[1], text.slice(sentenceStart < 2 ? 0 : sentenceStart, sentenceEnd < 0 ? match.index + match[0].length : sentenceEnd + 1).trim());
  }
  for (const match of text.matchAll(/eseménye\s+(?:a|az)\s+([^.!?\n]+)/giu)) add(match[1], match[0].trim());
  for (const match of text.matchAll(/(?:esemény(?:e|t)?|program)\s*(?:[^:]{0,36})?:\s*([^.!?\n]+)/giu)) {
    if (/eseményhez\s+kapcsolódó\s+entitás/iu.test(match[0])) continue;
    for (const candidate of match[1].split(/\s+és\s+|,\s*/u)) {
      const title = normalizeTitle(candidate);
      if (!title) continue;
      const evidence = match[0].trim();
      add(title, evidence);
    }
  }
  if (events.length === 0) for (const sentence of semantic.sentenceRecords(text)) {
    const value = sentence.text;
    if (!concreteEvent(value)) continue;
    const people = participants(value);
    if (/próbaüzem[^.!?]{0,50}(?:elindult|indul|indulása)/iu.test(value)) add("Próbaüzem indulása", value, { participants: people, status: "completed" });
    else if (/(?:bejelentette|határozatban rögzítette)[^.!?]{0,60}(?:program|döntés|átadás|próba)/iu.test(value) && !/eseményt:/iu.test(value)) add("Programbejelentés", value, { participants: people, status: "reported" });
    else if (/(?:megvásárolta|vásárolt|eladta|eladták|meghirdették)[^.!?]*/iu.test(value)) add("Adásvétel", value, { participants: people, status: "completed" });
    else if (/(?:beperelte|pert indított|per lett|peres eljárás)[^.!?]*/iu.test(value)) add("Peres eljárás", value, { participants: people, status: "completed" });
    else if (/(?:jogerős ítélet|bíróság[^.!?]{0,40}(?:döntött|megállapította)|ítélet)[^.!?]*/iu.test(value)) add("Bírósági döntés", value, { participants: people, status: "completed" });
    else if (/(?:kicserélte|kicseréltette|megjavította|megjavították|javította|javították)[^.!?]*/iu.test(value) && !/(?:szervizkönyv|dokumentum|jelentés|irat|közlemény)/iu.test(value)) add("Javítás", value, { participants: people, status: "completed" });
    else if (/(?:megállapodott|szerződés[^.!?]{0,30}(?:kötött|létrejött))[^.!?]*/iu.test(value)) add("Szerződés", value, { participants: people, status: "completed" });
    else if (/(?:követelte|követelést|fizetési meghagyás)[^.!?]*/iu.test(value)) add("Követelés", value, { participants: people, status: "reported" });
    else if (/(?:megfizette|kifizette|fizetésre kötelezte|mind(?:e|é)nképpen fizetnie kell)[^.!?]*/iu.test(value)) add("Fizetési kötelezettség", value, { participants: people, status: "completed" });
    else if (/(?:számláló|futásteljesítmény)[^.!?]{0,80}(?:ugrott|változott|mutatott)[^.!?]*/iu.test(value)) add("Mérési érték változása", value, { participants: people, status: "observed" });
  }
  return events;
}
function predictArticle(article) {
  const text = article?.text || "";
  const entities = extractEntities(text);
  return { source: article?.source?.key || article?.source || "", entities, numericMentions: semantic.extractNumericMentions(semantic.segmentArticleText(text)), claims: extractClaims(article), relations: semantic.extractRelations(text, entities), events: extractEvents(article), conflicts: [], changes: semantic.extractChanges(text), omissions: [] };
}
function predictArticles(articles) {
  const scenarios = [];
  for (const scenario of Array.isArray(articles?.scenarios) ? articles.scenarios : []) {
    const combined = { id: scenario.id, entities: [], claims: [], relations: [], events: [], conflicts: [], changes: [], omissions: [] };
    const entityIdentity = new Set();
    const sourceClaims = new Map();
    const eventGroups = new Map();
    for (const article of Array.isArray(scenario.sourceVariants) ? scenario.sourceVariants : []) {
      const prediction = predictArticle(article);
      for (const entity of prediction.entities) {
        const identity = `${String(entity.normalized || entity.mention).trim().toLocaleLowerCase("hu")}|${String(entity.type || "").trim().toLowerCase()}|${String(entity.identity || "same").trim().toLowerCase()}`;
        if (entityIdentity.has(identity)) continue;
        entityIdentity.add(identity);
        combined.entities.push(entity);
      }
      combined.claims.push(...prediction.claims);
      combined.relations.push(...prediction.relations);
      for (const event of prediction.events) {
        const key = event.title.toLocaleLowerCase("hu");
        const group = eventGroups.get(key) || { title: event.title, membership: new Set(), evidence: event.evidence };
        group.membership.add(prediction.source);
        eventGroups.set(key, group);
      }
      sourceClaims.set(prediction.source, prediction.claims);
    }
    combined.events = [...eventGroups.values()].map((event, index) => ({ id: `event-${index + 1}`, title: event.title, membership: [...event.membership], evidence: event.evidence }));
    const relationKeys = new Set();
    combined.relations = combined.relations.filter((relation) => {
      const identity = `${relation.subject}|${relation.predicate}|${relation.object}`;
      if (relationKeys.has(identity)) return false;
      relationKeys.add(identity);
      return true;
    });
    const predicateSources = new Map();
    for (const [source, claims] of sourceClaims) for (const claim of claims) {
      if (!predicateSources.has(claim.predicate)) predicateSources.set(claim.predicate, new Set());
      predicateSources.get(claim.predicate).add(source);
    }
    for (const [predicate, sources] of predicateSources) {
      if (sources.size < 2) continue;
      for (const article of Array.isArray(scenario.sourceVariants) ? scenario.sourceVariants : []) {
        const source = article.source?.key || article.source || "";
        if (!sources.has(source)) combined.omissions.push({ source, predicate });
      }
    }
    const claimsByPredicate = [...sourceClaims.values()].flat().reduce((map, claim) => {
      if (!map.has(claim.predicate)) map.set(claim.predicate, []);
      map.get(claim.predicate).push(claim);
      return map;
    }, new Map());
    for (const [, claims] of claimsByPredicate) {
      const change = claims.find((claim) => /tolódott|pontosít(?:ás|otta)|helyes összeg|maradt érvényben/iu.test(String(claim.evidence || "")));
      if (!change) continue;
      const previous = claims.find((claim) => claim !== change && claim.value !== change.value && (typeof claim.value === "number" || /^20\d{2}-\d{2}/u.test(String(claim.value))));
      if (previous) { combined.changes.push({ from: previous.value, to: change.value }); break; }
    }
    for (const [predicate, claims] of claimsByPredicate) {
      const usable = claims.filter((claim) => claim.value != null && ["number", "string"].includes(typeof claim.value));
      const bySource = [...new Map(usable.map((claim) => [claim.source, claim])).values()];
      if (bySource.length < 2 || new Set(bySource.map((claim) => JSON.stringify(claim.value))).size < 2) continue;
      if (!["PROJECT_COST", "COMPLETION_PERCENT", "OPENING_DATE"].includes(predicate) && !/DATE$|PERCENT$|_COST$/u.test(predicate)) continue;
      if (bySource.some((claim) => /pontosít|helyes összeg|tolódott|maradt érvényben|korábbi terv|régi terv/iu.test(String(claim.evidence || "")))) continue;
      const explicitYears = bySource.map((claim) => [...String(claim.evidence || "").matchAll(/\b(20\d{2})\b/gu)].map((match) => match[1]));
      if (explicitYears.every((years) => years.length > 0) && new Set(explicitYears.flat()).size > 1) continue;
      const dateValues = bySource.map((claim) => String(claim.value));
      const sameDatePrecision = dateValues.length >= 2 && (
        (dateValues[0].startsWith(dateValues[1]) || dateValues[1].startsWith(dateValues[0]))
        || (dateValues.some((value) => /^\d{2}-\d{2}$/u.test(value)) && dateValues.some((value) => /^20\d{2}-\d{2}(?:-\d{2})?$/u.test(value)) && dateValues.some((value) => /^20\d{2}-\d{2}(?:-\d{2})?$/u.test(value) && value.slice(5, 7) === dateValues.find((candidate) => /^\d{2}-\d{2}$/u.test(candidate)).slice(0, 2)))
      );
      if (sameDatePrecision) continue;
      if (predicate === "DISTANCE" && bySource.every((claim) => (claim.unit === "km" ? Number(claim.value) * 1000 : Number(claim.value)) === (bySource[0].unit === "km" ? Number(bySource[0].value) * 1000 : Number(bySource[0].value)))) continue;
      const type = predicate === "OPENING_DATE" ? "temporal" : predicate.endsWith("PERCENT") ? "categorical" : "numeric";
      combined.conflicts.push({ type, claims: bySource.slice(0, 2).map((claim) => claim.source), winner: null, evidence: bySource[0].evidence, explanation: `A források ugyanarra a ${predicate.toLocaleLowerCase("hu")} állításra eltérő értéket közölnek.` });
    }
    scenarios.push(combined);
  }
  return { scenarios };
}
module.exports = { extractEntities, extractClaims, predictArticle, predictArticles };
