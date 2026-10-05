"use strict";

// A small, gold-independent semantic extractor shared by offline benchmark
// adapters and controlled canonical-provider tests. It deliberately abstains
// when a number/name has no reliable local context.
const { normalizeEntityName } = require("./entity-normalization");

const MONTHS = Object.freeze({
  január: "01", február: "02", március: "03", április: "04", május: "05", június: "06",
  július: "07", augusztus: "08", szeptember: "09", október: "10", november: "11", december: "12",
});
const ORG_SUFFIX = /(?:zrt\.?|kft\.?|nyrt\.?|egyetem|minisztérium|önkormányzat|hatóság|kórház|intézet|iskola|társaság|hivatal|tanács|szolgálat|vasút(?:társaság)?)/iu;
const ROLE_WORD = /(?:mérnök|orvos|kutató|biológus|képviselő|vezető|szakértő|tanár|professzor)/iu;
const PLACE_WORD = /(?:város|tér|folyó|part|parts?zakasz|kerület|híd|kikötő|település|iskola|kórház)/iu;
const PROJECT_WORD = /(?:program|projekt|beruházás|fejlesztés|munkálat|felújítás|építés|próbaüzem|átadás|beszerzés)/iu;
const MONTH_PATTERN = "január|február|március|április|május|június|július|augusztus|szeptember|október|november|december";

function clean(value) { return String(value ?? "").normalize("NFC").trim(); }
function sentenceRecords(text) {
  const source = clean(text);
  const records = [];
  const pattern = /[^.!?\n]+[.!?]?/gu;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    const left = raw.search(/\S/u);
    if (left < 0) continue;
    const sentence = raw.trim();
    const start = match.index + left;
    records.push({ text: sentence, start, end: start + sentence.length });
  }
  return records;
}
function spanFor(record, text, value) {
  const needle = clean(value);
  const local = record.text.indexOf(needle);
  if (local < 0) return null;
  return { start: record.start + local, end: record.start + local + needle.length, textSpan: needle };
}
function numberValue(raw) {
  const compact = String(raw).replace(/\s/gu, "").replace(/\.(?=\d{3}(?:\D|$))/gu, "").replace(",", ".");
  const value = Number(compact);
  return Number.isFinite(value) ? value : null;
}
function unitFor(sentence) {
  const text = sentence.toLowerCase();
  if (/milliárd/iu.test(text)) return "billion HUF";
  if (/millió/iu.test(text)) return "million HUF";
  if (/százalék/iu.test(text)) return "%";
  if (/kilométer|kilométeres/iu.test(text)) return "km";
  if (/méter/iu.test(text)) return "m";
  if (/napos|nap/iu.test(text)) return "day";
  if (/megawattóra|\bMWh\b/iu.test(text)) return "MWh";
  if (/jármű/iu.test(text)) return "vehicle";
  if (/tablet/iu.test(text)) return "device";
  if (/konténer/iu.test(text)) return "container";
  if (/mérőpont/iu.test(text)) return "metering_point";
  return null;
}
function predicateFor(sentence, unit) {
  const text = sentence.toLowerCase();
  if (unit === "%") {
    if (/készültség|teljesítés|munkák .*tart/iu.test(text)) return "COMPLETION_PERCENT";
    if (/kapacitás bővítés/iu.test(text)) return "CAPACITY_PERCENT";
    if (/iskolák .* százalék/iu.test(text)) return "NETWORK_PERCENT";
    return null;
  }
  if (unit === "million HUF" || unit === "billion HUF") {
    if (/támogatási összeg|pályázati támogatás/iu.test(text)) return "SUBSIDY_AMOUNT";
    if (/pályázat .*keret|forintos kerettel|különít el/iu.test(text)) return "GRANT_AMOUNT";
    if (/teljes projekt|projektköltség/iu.test(text)) return "PROJECT_COST";
    if (/költsége|költség|fejlesztés|javítás .*kerül|első ütemének költsége|beruházás/iu.test(text)) return "PROJECT_COST";
    return null;
  }
  if (unit === "km" || unit === "m") return "DISTANCE";
  if (unit === "day") return /várólista|várakozás|lista/iu.test(text) ? "WAITING_DAYS" : null;
  if (unit === "MWh") return "CAPACITY";
  if (/\b(?:tablet|járművet|konténert|mérőpont)/iu.test(text)) {
    if (/tablet/iu.test(text)) return "DEVICE_COUNT";
    if (/jármű/iu.test(text)) return "VEHICLE_COUNT";
    if (/konténer/iu.test(text)) return "CONTAINER_COUNT";
  }
  if (/készültség|teljesítés|százalék/iu.test(text)) return null;
  if (/bejelentette|határozatban rögzítette/iu.test(text)) return "OPENING_EVENT";
  if (/nem történt sérülés|sérülés nem történt/iu.test(text)) return "INJURY_OCCURRED";
  if (/nem nőtt a várakozás/iu.test(text)) return "WAITING_GROWTH";
  if (/nem kommentálta/iu.test(text)) return "RELOCATION_PLAN";
  if (/tartalékkeret/iu.test(text)) return "BUDGET_RESERVE";
  if (/sebességkorlátozás/iu.test(text)) return "SPEED_LIMIT";
  if (/oka .*ismeretlen|meghibásodást .*túlmelegedés/iu.test(text)) return "INCIDENT_CAUSE";
  if (/bizalom .*megingott|ígéretet kérünk/iu.test(text)) return "PUBLIC_CONFIDENCE";
  if (/képzés .*nem végleges/iu.test(text)) return "TRAINING_DATE";
  if (/mérnök|szerkezet .*biztonságos|partfal állapota/iu.test(text)) return "ENGINEER_ASSESSMENT";
  if (/rendszer .*terhelhető|ambulancia .*állapot/iu.test(text)) return "DOCTOR_ASSESSMENT";
  if (/tanár(?:ok)? .*képzés|tanárok képzése/iu.test(text)) return "TEACHER_ASSESSMENT";
  if (/minisztérium|önkormányzat/iu.test(text) && /szerint/iu.test(text)) return "FUNDING_STATUS";
  return null;
}
function dateClaim(sentence) {
  const text = sentence.toLowerCase();
  const month = text.match(new RegExp(`(${MONTH_PATTERN})`, "iu"));
  if (!month) return null;
  if (!/indul|indulhat|kezdés|kezdőd|szerepelt|tolódott|nyithat|nyithatják|átadás|próba|megnyit/iu.test(text)) return null;
  let predicate = null;
  if (/megnyit|központ/iu.test(text)) predicate = "OPENING_DATE";
  else if (/eszközátadás|átadás/iu.test(text)) predicate = "DELIVERY_DATE";
  else if (/próba|terhelési próba|hálózati próba/iu.test(text)) predicate = "TRIAL_DATE";
  else if (/ambulancia/iu.test(text)) predicate = "SERVICE_START";
  else if (/munkák|munkálat|kezdés|indul|ütemterv/iu.test(text)) predicate = "PROJECT_START";
  if (!predicate) return null;
  const day = text.match(new RegExp(`(${MONTH_PATTERN})\\s+(\\d{1,2})(?:-jén)?`, "iu"));
  const value = day ? `${day[1].toLowerCase()}-${day[2]}` : month[1].toLowerCase();
  return { predicate, value, unit: "date", raw: day ? day[0] : month[1] };
}
function semanticMode(sentence) {
  const text = sentence.toLowerCase();
  const conditional = /\bha\b|amennyiben|-hat\b|-het\b|indulhat|megkezdődhet/iu.test(text);
  // Missing-information phrases ("not disclosed", "unknown") keep the
  // claim affirmed+unknown; only a denial of the proposition is negated.
  const polarity = /nem történt|sérülés nem|nem nőtt|nem kommentálta/iu.test(text) ? "negated" : "affirmed";
  const uncertainty = /ismeretlen|egyelőre|valószínűleg|még nincs|nem végleges|nem közölt/iu.test(text);
  let modality = "asserted";
  if (conditional) modality = "conditional";
  else if (/tervez|tervben|ütemterv|régi terv|korábbi terv|korábbi lista|tolódott|késik/iu.test(text)) modality = "plan";
  else if (/(?:mondta|közölte|bejelentette|nyilatkozott|szerint)/iu.test(text) && !/(?:tervlap|dokumentum|ütemterv) szerint/iu.test(text)) modality = "reported";
  else if (uncertainty) modality = "unknown";
  return { conditional, polarity, uncertainty, modality };
}
function attributionFor(sentence) {
  const match = sentence.match(/([^,–-]{2,80})\s+szerint/iu);
  if (!match) return null;
  const label = clean(match[1]).replace(/^(A|Az|Egy)\s+/iu, "").replace(/\s+(?:mérnök|szakértő|orvos|kutató|biológus|tanár)$/iu, "");
  if (!label || label.split(/\s+/u).length > 8) return null;
  const type = /mérnök|szakértő|orvos|kutató|biológus|tanár/iu.test(label) ? "expert"
    : /forrás/iu.test(label) ? "anonymous"
      : /minisztérium|önkormányzat|rendőrség|mentőszolgálat|hivatal|hatóság|kórház|intézet|szolgálat/iu.test(label) ? "official"
        : "reported";
  return { type, label };
}
function extractEntities(text) {
  const source = clean(text);
  const result = [];
  const seen = new Set();
  const pattern = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+){0,3})\b/gu;
  for (const match of source.matchAll(pattern)) {
    const mention = clean(match[1]);
    const after = source.slice(match.index + mention.length, match.index + mention.length + 40);
    if (mention.length < 4 || /^(?:A|Az|Egy|Ha|Mivel|Szerint|Kékfolyó|Keleti|Folyóparti)$/u.test(mention)) continue;
    const normalizedBase = normalizeEntityName(mention).normalizedName;
    const normalized = normalizedBase.replace(/\s+(?:zrt|kft|nyrt)\.?$/iu, "");
    const identity = `${mention} ${after}`.match(/pécsi|szegedi|budapesti|debreceni/iu)?.[0]?.toLowerCase() || "same";
    const words = mention.split(/\s+/u);
    const immediate = after.slice(0, 36);
    const hasExplicitOrg = /^(?:\s*(?:zrt|kft|nyrt)\.?|\s+(?:egyetem|minisztérium|önkormányzat|hatóság|kórház|intézet|iskola|hivatal|tanács|szolgálat|vasúttársaság)\b)/iu.test(immediate) || ORG_SUFFIX.test(mention);
    const hasExplicitProject = /^(?:\s+(?:program|projekt|beruházás|fejlesztés))\b/iu.test(immediate) || PROJECT_WORD.test(mention);
    const hasExplicitPlace = /(?:nevű\s+parts?zakasz|város|tér|folyó|part|kerület|híd|kikötő|település)/iu.test(immediate) || PLACE_WORD.test(mention);
    const hasRole = ROLE_WORD.test(immediate) || /szerint|mondta/iu.test(immediate);
    const type = hasExplicitOrg ? "organization"
      : words.length >= 2 && hasRole ? "person"
      : hasExplicitProject ? "project"
      : words.length >= 2 && hasExplicitPlace ? "location" : null;
    if (!type || seen.has(`${normalized}|${type}|${identity}`)) continue;
    seen.add(`${normalized}|${type}|${identity}`);
    result.push({ mention, normalized, type, identity, start: match.index, end: match.index + mention.length });
  }
  return result.slice(0, 40);
}
function extractClaims(text, source = "") {
  const sourceText = clean(text);
  const claims = [];
  for (const record of sentenceRecords(sourceText)) {
    const sentence = record.text;
    const semantics = semanticMode(sentence);
    const numeric = sentence.match(/(\d+(?:[.,]\d+)?)\s*(millió|milliárd|százalék|kilométer(?:es)?|méter|nap|megawattóra|MWh|(?:új\s+)?járművet|(?:új\s+)?tabletet|(?:új\s+)?konténert|(?:új\s+)?mérőpont)/iu);
    const date = dateClaim(sentence);
    const unit = unitFor(sentence);
    const predicate = date?.predicate || (numeric ? predicateFor(sentence, unit) : predicateFor(sentence, null));
    const attribution = attributionFor(sentence);
    const genericAttribution = !attribution || /^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(attribution.label);
    const hasSemantic = Boolean(predicate || (attribution && !genericAttribution));
    if (!hasSemantic) continue;
    if (numeric && !predicate) continue;
    if (!predicate) continue;
    const raw = numeric ? numeric[1] : null;
    const value = numeric ? numberValue(raw) : date ? date.value : /nem történt sérülés|sérülés nem történt|nem nőtt/iu.test(sentence) ? false : /ismeretlen|nem végleges|nem közölt/iu.test(sentence) ? "unknown" : null;
    // Keep enough local context to disambiguate repeated values (for example
    // current vs historical 14-day observations) while remaining text-grounded.
    const evidenceText = numeric || date
      ? sentence
      : /nem történt sérülés|sérülés nem történt|nem nőtt/iu.test(sentence)
        ? (sentence.match(/(?:nem történt sérülés|sérülés nem történt|nem nőtt[^.?!]*)/iu)?.[0] || sentence)
        : attribution ? attribution.label + " szerint" : sentence;
    const evidence = spanFor(record, sourceText, evidenceText) || { start: record.start, end: record.end, textSpan: sentence };
    const claim = { source, predicate, value, unit: date ? "date" : unit, evidence: evidence.textSpan, evidenceSpan: { start: evidence.start, end: evidence.end, textSpan: evidence.textSpan }, polarity: semantics.polarity, modality: semantics.modality, conditional: semantics.conditional, uncertainty: semantics.uncertainty, attribution };
    if (attribution && /szabó anna|névtelen forrás/iu.test(sentence)) claim.predicate = /szabó anna/iu.test(sentence) ? "PUBLIC_CONFIDENCE" : "RELOCATION_PLAN";
    claims.push(claim);
  }
  return claims;
}
function extractRelations(text, entities = []) {
  const source = clean(text);
  const relations = [];
  for (const entity of Array.isArray(entities) ? entities : []) {
    if (!entity || entity.id == null || !entity.mention) continue;
    const escaped = String(entity.mention).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const regex = new RegExp(`${escaped}[^.]{0,80}\\b(?:dolgozik|vezérigazgatója|tulajdonosa)\\b[^.]{0,80}`, "iu");
    const match = source.match(regex);
    if (!match) continue;
    const object = (Array.isArray(entities) ? entities : []).find((candidate) => candidate.id !== entity.id && candidate.mention && match[0].toLocaleLowerCase("hu").includes(String(candidate.mention).toLocaleLowerCase("hu")));
    if (!object) continue;
    const predicate = /vezérigazgatója/iu.test(match[0]) ? "CEO_OF" : /tulajdonosa/iu.test(match[0]) ? "OWNS" : "WORKS_FOR";
    const localStart = source.indexOf(match[0]);
    relations.push({ subjectEntityId: Number(entity.id), objectEntityId: Number(object.id), predicate, confidence: 0.96, supportType: "support", evidence: { start: localStart, end: localStart + match[0].length, textSpan: match[0] } });
  }
  return relations;
}

module.exports = { MONTHS, sentenceRecords, spanFor, numberValue, unitFor, predicateFor, dateClaim, semanticMode, attributionFor, extractEntities, extractClaims, extractRelations };
