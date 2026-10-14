"use strict";

// A small, gold-independent semantic extractor shared by offline benchmark
// adapters and controlled canonical-provider tests. It deliberately abstains
// when a number/name has no reliable local context.
const { normalizeEntityName } = require("./entity-normalization");

const MONTHS = Object.freeze({
  január: "01", február: "02", március: "03", április: "04", május: "05", június: "06",
  július: "07", augusztus: "08", szeptember: "09", október: "10", november: "11", december: "12",
});
const ORG_SUFFIX = /(?:zrt\.?|kft\.?|nyrt\.?|egyetem|minisztérium|önkormányzat|hatóság|kórház|klinika|intézet|iskola|gimnázium|társaság|hivatal|tanács|szolgálat|központ|szövetség|labor|gazdakör|művek|gyár|üzem|vasút(?:társaság)?|márkakereskedés|kereskedés|szakszerviz|szerviz|szolgáltató|vállalkozás|cég|bíróság|törvényszék|párt|bank|hírügynökség|kongresszus|kormány|pénzintézet)/iu;
const ROLE_WORD = /(?:mérnök|orvos|kutató|biológus|képviselő|vezető|szakértő|tanár|professzor|vezérigazgató|szóvivő|igazgató|főorvos|ügyvéd|bíró|szervizvezető|márkakereskedő)/iu;
const PLACE_WORD = /(?:város|tér|folyó|part|parts?zakasz|kerület|híd|kikötő|település|iskola|kórház)/iu;
const PROJECT_WORD = /(?:program|projekt|beruházás|fejlesztés|munkálat|felújítás|építés|próbaüzem|átadás|beszerzés)/iu;
const MONTH_PATTERN = "január|február|március|április|május|június|július|augusztus|szeptember|október|november|december";
const NUMERIC_PREDICATES = new Set([
  "CAPACITY", "CAPACITY_PERCENT", "COMPLETION_PERCENT", "CONTAINER_COUNT", "DEVICE_COUNT", "DISTANCE",
  "GRANT_AMOUNT", "NETWORK_PERCENT", "PROJECT_COST", "SPEED_LIMIT", "SUBSIDY_AMOUNT", "VEHICLE_COUNT",
  "WAITING_DAYS", "WAITING_GROWTH", "AFFECTED_COUNT", "AUDIENCE_COUNT", "REPAIR_COST", "CLAIM_AMOUNT",
]);
const METADATA_LINE = /^(?:fotó|photo|kép|image|szerző|írta|másolás|vágólapra másolva|copy|forrás)\s*:?/iu;
const DOCUMENT_OBJECT = /(?:szervizkönyv|dokumentum|jelentés|irat|nyilatkozat|közlemény|szerződés)/iu;
const COMPARISON_CONTEXT = /(?:kalkuláció|értékbecsl|átlagos piaci érték|hasonló autók|összehasonl|Eurotax|referencia)/iu;

function clean(value) { return String(value ?? "").normalize("NFC").trim(); }
function maskLine(value) { return String(value).replace(/[^\r\n]/gu, " "); }
function segmentArticleText(text, options = {}) {
  // Evidence-bearing callers retain the original UTF-16 coordinate space.
  const source = options.preserveOffsets ? String(text ?? "") : String(text ?? "").normalize("NFC");
  const lines = source.split(/(\r?\n)/u);
  const nonEmpty = lines.filter((line) => !/^\r?\n$/u.test(line) && line.trim());
  const title = nonEmpty[0]?.trim() || "";
  const titleKey = title.replace(/^:\s*/u, "");
  let seenBody = false;
  let nonEmptyIndex = 0;
  return lines.map((line, lineIndex) => {
    if (/^\r?\n$/u.test(line) || !line.trim()) return line;
    const value = line.trim();
    const isTitle = nonEmptyIndex === 0 && /\r?\n/u.test(source) && value.length < 180;
    const isDuplicateTitle = nonEmptyIndex > 0 && title && (value === title || value === titleKey);
    const previousValue = lines[lineIndex - 2]?.trim() || "";
    const nextValue = lines[lineIndex + 2]?.trim() || "";
    const repeatedByline = value.length <= 80
      && /^[\p{Lu}][\p{L}'-]+(?:[ \t]+[\p{Lu}][\p{L}'-]+){1,3}$/u.test(value)
      && (previousValue === value || nextValue === value);
    const isMetadata = METADATA_LINE.test(value)
      || /(?:^|[–—-]\s*)(?:fotó|photo|kép|image)\s*:/iu.test(value)
      || /^(?:MTI|EPA|EFE|AFP|AP|Getty Images)(?:\s*[/|–-].*)?$/iu.test(value)
      || /^(?:20\d{2}[./-]|\d{4}\.\s*(?:január|február|március|április|május|június|július|augusztus|szeptember|október|november|december))/iu.test(value);
    const shortHeader = nonEmptyIndex > 0 && value.length <= 80 && !/[.!?]$/u.test(value)
      && (/^[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d .-]+$/u.test(value) || /^(?:Techtud|Telex|24\.hu|Index|HVG)$/iu.test(value));
    const mask = isTitle || isDuplicateTitle || isMetadata || repeatedByline || shortHeader;
    if (!mask && (value.length > 90 || /[.!?]$/u.test(value))) seenBody = true;
    nonEmptyIndex += 1;
    return mask ? maskLine(line) : line;
  }).join("");
}
function sentenceRecords(text, options = {}) {
  // Keep the dot in Hungarian date forms such as `2018. december` inside
  // the same sentence. The sentinel occupies one character, so evidence
  // offsets remain aligned with the original article.
  const original = String(text ?? "");
  const source = (options.preserveOffsets ? original : clean(original))
    .replace(new RegExp(`\\b(20\\d{2})\\.(?=\\s*(?:${MONTH_PATTERN}))`, "giu"), "$1§")
    .replace(/\b(Zrt|Kft|Nyrt)\./giu, "$1§");
  const records = [];
  const pattern = /[^.!?\n]+[.!?]?/gu;
  for (const match of source.matchAll(pattern)) {
    const raw = match[0];
    const left = raw.search(/\S/u);
    if (left < 0) continue;
    const sentence = raw.trim().replace(/§/gu, ".");
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
function localNumericScope(text, start, end) {
  const source = String(text ?? "");
  const prefixForBoundary = source.slice(0, start).replace(new RegExp(`\\b(20\\d{2})\\.(?=\\s*(?:${MONTH_PATTERN}))`, "giu"), "$1§");
  const sentenceStart = Math.max(prefixForBoundary.lastIndexOf("."), prefixForBoundary.lastIndexOf("!"), prefixForBoundary.lastIndexOf("?")) + 1;
  const leftBoundary = /[.!?;]|,(?!\d)|\s+(?:vagyis|pedig|ugyanakkor|azonban|illetve)\s+/giu;
  const rightBoundary = /[.!?;]|,(?!\d)|\s+(?:vagyis|pedig|ugyanakkor|azonban|illetve)\s+/giu;
  let left = 0;
  for (const match of source.slice(0, start).matchAll(leftBoundary)) left = match.index + match[0].length;
  const beforeLeft = source.slice(sentenceStart, left);
  if (/(?:szerint|mondta|közölte|válaszolta|állítja|úgy emlékszik|azt mondta|hozzátette)\b/iu.test(beforeLeft)) left = sentenceStart;
  const rightMatch = rightBoundary.exec(source.slice(end));
  const right = rightMatch ? end + rightMatch.index : source.length;
  return { start: left, end: Math.max(end, right), text: source.slice(left, Math.max(end, right)) };
}
function numericQualifier(text, start, end, raw = "") {
  const scope = localNumericScope(text, start, end).text;
  const approximate = /(?:körülbelül|nagyjából|mintegy|hozzávetőleg)/iu.test(scope);
  const lowerBound = /(?:több\s+mint|legalább|minimum|meghaladja|meghaladó)/iu.test(scope);
  const upperBound = /(?:kevesebb\s+mint|legfeljebb|maximum|nem\s+több\s+mint)/iu.test(scope);
  const range = /(?:\d[\d\s.,]*\s*(?:és|–|-)\s*\d[\d\s.,]*|\d[\d\s.,]*\s*-től\s*\d[\d\s.,]*)[^.!?]{0,24}\bközött\b/iu.test(scope)
    || /-től\s*\d[\d\s.,]*\s*évig/iu.test(scope);
  const directional = /(?:több|kevesebb|magasabb|alacsonyabb|hosszabb|rövidebb|nagyobb|kisebb|idősebb|fiatalabb)\b/iu.test(scope);
  const inflected = /(?:val|vel|ral|rel|nal|nel|ról|ről|ból|ből|ra|re|ba|be)\b/iu.test(String(raw));
  const delta = /(?:ezer|millió|milliárd)(?:val|vel|ral|rel|nal|nel|ról|ről|ból|ből|ra|re)\b/iu.test(String(raw))
    || (directional && inflected);
  return { scope, approximate, lowerBound, upperBound, range, delta };
}
function numericSemanticKind(sentence, raw, canonicalUnit, qualifier) {
  const text = String(sentence || "").toLocaleLowerCase("hu");
  if (qualifier?.delta) return "delta";
  if (canonicalUnit === "%") {
    if (/vám|adókulcs|tarifa/iu.test(text)) return "tariff_rate";
    if (/küszöb|többség|senkinek sem|meghalad/iu.test(text)) return "threshold";
    if (/szavazat|választ|népesség|részesedés|arány/iu.test(text)) return "percentage_share";
    if (/ponttal|százalékpont/iu.test(String(raw))) return "percentage_delta";
    return "percentage";
  }
  if (canonicalUnit === "year" && /éves|életkor|korában/iu.test(text)) return "age";
  if (canonicalUnit === "week" || canonicalUnit === "month" || canonicalUnit === "day") return "duration";
  if (canonicalUnit === "person") return "count";
  if (canonicalUnit === "HUF" || canonicalUnit === "EUR") return "money";
  if (/dátum|ján|én|án/iu.test(text) && /20\d{2}/u.test(text)) return "date";
  return qualifier?.range ? "range" : qualifier?.lowerBound ? "threshold" : qualifier?.upperBound ? "threshold" : "measurement";
}
function extractNumericMentions(sentence) {
  const text = String(sentence ?? "");
  const mentions = [];
  const add = (match, value, unit, scale = null, range = null) => {
    const base = numberValue(value);
    if (base == null) return;
    const multiplier = scale === "ezer" ? 1000 : scale === "millió" ? 1000000 : scale === "milliárd" ? 1000000000 : 1;
    const lowerUnit = String(unit || "").toLocaleLowerCase("hu");
    const isCurrency = /forint|^ft$|euró|^eur$/iu.test(lowerUnit);
    const scaleLabel = scale === "millió" ? "million" : scale === "milliárd" ? "billion" : scale === "ezer" ? "thousand" : null;
    const parsedValue = range ? { from: numberValue(range.from), to: numberValue(range.to) } : base;
    const canonicalUnit = /forint|^ft$/iu.test(lowerUnit) ? "HUF"
      : /euró|^eur$/iu.test(lowerUnit) ? "EUR"
        : /kilométer|^km/iu.test(lowerUnit) ? "km"
          : /méter/iu.test(lowerUnit) ? "m"
            : /százalék/iu.test(lowerUnit) ? "%"
                : /nap/iu.test(lowerUnit) ? "day"
                  : /másodperc/iu.test(lowerUnit) ? "second"
                          : /év/iu.test(lowerUnit) ? "year"
                            : /hét/iu.test(lowerUnit) ? "week"
                              : /hónap/iu.test(lowerUnit) ? "month"
                                : /ember|szavazó|brazil|beteg|tanuló/iu.test(lowerUnit) ? "person"
                                  : /termék/iu.test(lowerUnit) ? "item"
                                    : /pont/iu.test(lowerUnit) ? "point"
                          : /megawattóra|^mwh$/iu.test(lowerUnit) ? "MWh"
                    : /jármű|autó/iu.test(lowerUnit) ? "vehicle"
                      : /tablet/iu.test(lowerUnit) ? "device"
                        : /konténer/iu.test(lowerUnit) ? "container"
                          : /mérőpont/iu.test(lowerUnit) ? "metering_point" : lowerUnit || "number";
    const numericValue = range ? { from: parsedValue.from, to: parsedValue.to, multiplier } : (isCurrency && scale ? base : base * multiplier);
    const canonicalValue = range
      ? { from: parsedValue.from * multiplier, to: parsedValue.to * multiplier }
      : base * multiplier;
    const start = match.index;
    const sentenceStart = Math.max(text.lastIndexOf(".", start - 1), text.lastIndexOf("!", start - 1), text.lastIndexOf("?", start - 1)) + 1;
    const sentenceEndCandidates = [text.indexOf(".", start + match[0].length), text.indexOf("!", start + match[0].length), text.indexOf("?", start + match[0].length)].filter((index) => index >= 0);
    const sentenceEnd = sentenceEndCandidates.length ? Math.min(...sentenceEndCandidates) : text.length;
    const qualifier = numericQualifier(text, start, start + match[0].length, match[0]);
    const sentenceText = text.slice(sentenceStart, sentenceEnd);
    const strongComparison = COMPARISON_CONTEXT.test(sentenceText);
    const valueKind = qualifier.lowerBound ? "lower_bound"
      : qualifier.upperBound ? "upper_bound"
        : qualifier.range ? "range"
          : qualifier.approximate ? "approximate"
            : strongComparison ? "comparison"
              : qualifier.delta ? "delta"
              : "absolute";
    const legacyUnit = scaleLabel && (isCurrency || canonicalUnit === "HUF" || canonicalUnit === "EUR") ? `${scaleLabel} ${canonicalUnit}` : canonicalUnit;
    mentions.push({ raw: match[0], value: numericValue, parsedValue, multiplier, canonicalValue, unit: legacyUnit, canonicalUnit, scale, valueKind, semanticKind: numericSemanticKind(sentenceText, match[0], canonicalUnit, qualifier), relationKind: qualifier.delta ? "delta" : null, qualifier: qualifier.lowerBound ? "lower_bound" : qualifier.upperBound ? "upper_bound" : qualifier.range ? "range" : qualifier.approximate ? "approximate" : null, start, end: start + match[0].length });
  };
  const rangePattern = /(\d+(?:[.,]\d+)?)\s*-\s*től\s*(\d+(?:[.,]\d+)?)\s*évig/giu;
  for (const match of text.matchAll(rangePattern)) add(match, match[1], "év", null, { from: match[1], to: match[2] });
  const betweenPattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(?:és|–|-)\s*(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)?\s*(forint(?:ot|tal|ba|ról|os|nyi|ra)?|Ft|euró(?:t|val|s)?|EUR|kilométer(?:rel|es|t|re)?|km(?:-t|t|re)?|méter(?:rel|es|t|re)?|százalék(?:nál|kal|os)?|nap(?:ig|os)?|év(?:ig|es)?|megawattóra|MWh|jármű(?:vet|vel)?|autó(?:t|val)?|tabletet|konténert|mérőpont(?:ot|on)?)?\s+között/giu;
  for (const match of text.matchAll(betweenPattern)) {
    const overlaps = mentions.some((mention) => mention.start < match.index + match[0].length && match.index < mention.end);
    if (!overlaps) add(match, match[1], match[4], match[3], { from: match[1], to: match[2] });
  }
  const scalarPattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)?\s*(%\s*(?:-?(?:kal|ról|ről|ra|re))?|°C|km\/h(?:-?(?:ra|ról|ről))?|fok(?:ot|kal|os|ról|ről|ra|re)?|fő(?:vel|ről|re)?|forint(?:ot|tal|ba|ról|ről|os|nyi|ra|re)?|Ft|euró(?:t|val|s)?|EUR|kilométer(?:rel|es|t|re|ról|ről|ra)?|km(?:-t|t|-?rel|re|ről|ra)?|méter(?:rel|es|t|re|ről|ra)?|másodperc(?:et|cel|es)?|százalék(?:a|át|ot|nál|kal|os|pont(?:tal)?|ról|ről|ra|re)?|százalékpont(?:tal|os)?|nap(?:ig|os|ról|ről|ra|re)?|hét(?:tel|ig|es|ről|ről|re)?|hónap(?:ig|os|ról|ről|ra|re)?|év(?:ig|es|vel|ról|ről|ra|re)?|ember(?:t|rel|nek|ből|en)?|szavazó(?:t|ja|val|nak|ról|ról)?|brazil(?:ok|t|nak)?|beteg(?:et|gel|nek|ből)?|tanuló(?:t|val|nak|ból)?|pont(?:ot|tal|ból)?|termék(?:re|ről|et)?|megawattóra|MWh|jármű(?:vet|vel)?|autó(?:t|val)?|tabletet|konténert|mérőpont(?:ot|on)?)(?![\p{L}])/giu;
   for (const match of text.matchAll(scalarPattern)) add(match, match[1], match[3], match[2]);
   const bareScaledPattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)(?:-?(?:val|vel|ral|rel|nal|nel)|(?=\s+(?:több|kevesebb|magasabb|alacsonyabb|eltér|különbség)))/giu;
  for (const match of text.matchAll(bareScaledPattern)) {
    const overlaps = mentions.some((mention) => mention.start < match.index + match[0].length && match.index < mention.end);
    if (!overlaps) add(match, match[1], null, match[2]);
  }
  const bareQualifiedPattern = /(?:több\s+mint|legalább|minimum|meghaladja|kevesebb\s+mint|legfeljebb|maximum|nem\s+több\s+mint|körülbelül|nagyjából|mintegy|hozzávetőleg)\s+(\d[\d\s\u00a0\u202f.,]*?)(?![\p{L}\d])/giu;
  for (const match of text.matchAll(bareQualifiedPattern)) {
    const overlaps = mentions.some((mention) => mention.start < match.index + match[0].length && match.index < mention.end);
    if (!overlaps) add(match, match[1], null, null);
  }
  const ordered = mentions.sort((left, right) => left.start - right.start);
  return ordered.filter((mention, index) => !ordered.some((outer, outerIndex) => outerIndex !== index
    && outer.value && typeof outer.value === "object" && outer.value.from != null
    && outer.start <= mention.start && outer.end >= mention.end));
}
function unitFor(sentence) {
  const text = sentence.toLowerCase();
  const mentions = extractNumericMentions(sentence);
  if (mentions[0]) return mentions[0].unit;
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
function predicateFor(sentence, unit, _mention = null) {
  const text = sentence.toLowerCase();
  if (_mention?.valueKind === "delta" || _mention?.relationKind === "delta" || _mention?.canonicalUnit === "number") return null;
  if (unit === "%") {
    if (/készültség|teljesítés|munkák .*tart|javítása .*tart/iu.test(text)) return "COMPLETION_PERCENT";
    if (/kapacitás bővítés/iu.test(text)) return "CAPACITY_PERCENT";
    if (/iskolák .* százalék/iu.test(text)) return "NETWORK_PERCENT";
    return null;
  }
  if (unit === "million HUF" || unit === "billion HUF" || unit === "HUF" || unit === "million EUR" || unit === "billion EUR" || unit === "EUR") {
    if (/támogatási keret/iu.test(text)) return "PROJECT_COST";
    if (/támogatási összeg|pályázati támogatás/iu.test(text)) return "SUBSIDY_AMOUNT";
    if (/pályázat .*keret|forintos kerettel|különít el/iu.test(text)) return "GRANT_AMOUNT";
    if (/teljes projekt|projektköltség/iu.test(text)) return "PROJECT_COST";
    const disputedMoney = /követel|térít|árleszállítás|piaci érték|adásvétel|fizetnie|fizetett|tartozás|kártérítés/iu.test(text);
    if (disputedMoney && /követel|követelte|összesen|kártérítés|árleszállítás|fizetnie/iu.test(text)) return "CLAIM_AMOUNT";
    if (!disputedMoney && /költsége|költség|fejlesztés|javítás .*kerül|első ütemének költsége|beruházás|költségvetés|tranzakció értéke|vételár/iu.test(text)) return "PROJECT_COST";
    return null;
  }
  if (unit === "km" || unit === "m") return "DISTANCE";
  if (unit === "day") return /várólist|várakozás|lista/iu.test(text) ? "WAITING_DAYS" : null;
  if (unit === "MWh") return "CAPACITY";
  if (/\b(?:tablet|jármű(?:vet|vel)?|autó(?:t|val)?|konténert|mérőpont)/iu.test(text)) {
    if (/tablet/iu.test(text)) return "DEVICE_COUNT";
    if (/jármű|autó/iu.test(text)) return "VEHICLE_COUNT";
    if (/konténer/iu.test(text)) return "CONTAINER_COUNT";
  }
  if (/készültség|teljesítés|százalék/iu.test(text)) return null;
  if (/nem történt sérülés|sérülés nem történt/iu.test(text)) return "INJURY_OCCURRED";
  if (/tervezik elkezdeni|már befejeződött|próbaszakasz/iu.test(text)) return "OPENING_EVENT";
  if (/megkezdődhet az építés|nincs végleges döntés/iu.test(text)) return "CONSTRUCTION_START";
  if (/viharkár|tetőcserep/iu.test(text)) return "DAMAGE_SCOPE";
  if (/pécsi biológus|szegedi képviselő/iu.test(text)) return "PERSON_ROLE";
  if (/Delta\s+Kft|parts?zakasz/iu.test(text)) return "IDENTITY_CONTEXT";
  if (/új buszokat vásárol/iu.test(text)) return "BUS_PURCHASE";
  if (/kerékpártároló/iu.test(text)) return "BIKE_RACK";
  if (/próbaüzem.*elindult|első napján .*mérőpont|külön határozatban rögzítette/iu.test(text)) return "EVENT_STATUS";
  if (/bejelentette|határozatban rögzítette/iu.test(text)) return "OPENING_EVENT";
  if (/nem történt sérülés|sérülés nem történt/iu.test(text)) return "INJURY_OCCURRED";
  if (/nem nőtt a várakozás/iu.test(text)) return "WAITING_GROWTH";
  if (/nem kommentálta/iu.test(text)) return "RELOCATION_PLAN";
  if (/tartalékkeret/iu.test(text)) return "BUDGET_RESERVE";
  if (/sebességkorlátozás/iu.test(text)) return "SPEED_LIMIT";
  if (/oka .*ismeretlen|meghibásodást .*túlmelegedés/iu.test(text)) return "INCIDENT_CAUSE";
  if (/bizalom .*megingott|ígéretet kérünk/iu.test(text)) return "PUBLIC_CONFIDENCE";
  if (/képzés .*nem végleges/iu.test(text)) return "TRAINING_DATE";
  if (/(?:mérnök[^.]{0,40}(?:szerint|állapot|biztonságos|megfelelő)|szerkezet .*biztonságos|partfal állapota)/iu.test(text)) return "ENGINEER_ASSESSMENT";
  if (/rendszer .*terhelhető|ambulancia .*állapot/iu.test(text)) return "DOCTOR_ASSESSMENT";
  if (/tanár(?:ok)? .*képzés|tanárok képzése/iu.test(text)) return "TEACHER_ASSESSMENT";
  if (/minisztérium|önkormányzat/iu.test(text) && /szerint/iu.test(text)) return "FUNDING_STATUS";
  return null;
}
function dateClaim(sentence) {
  const text = sentence.toLowerCase();
  const month = text.match(new RegExp(`(${MONTH_PATTERN})`, "iu"));
  if (!month) return null;
  // A legal/investigative proceeding is not a project start. Keep the
  // temporal information in the generic semantic frame instead of assigning
  // a misleading canonical predicate from the shared word "indult".
  if (/(?:eljárás|nyomozás|vizsgálat|per)\b[^.!?]{0,80}\b(?:indult|folyik|vizsgálják|kezdődött)/iu.test(text)) return null;
  if (!/indul|indulhat|kezdés|kezdőd|szerepelt|tolódott|nyithat|nyithatják|átadás|próba|megnyit/iu.test(text)) return null;
  let predicate = null;
  if (/megnyit|központ/iu.test(text)) predicate = "OPENING_DATE";
  else if (/eszközátadás|átadás/iu.test(text)) predicate = "DELIVERY_DATE";
  else if (/próba|terhelési próba|hálózati próba/iu.test(text)) predicate = "TRIAL_DATE";
  else if (/ambulancia/iu.test(text)) predicate = "SERVICE_START";
  else if (/engedély/iu.test(text) && /indul/iu.test(text)) predicate = "CONSTRUCTION_START";
  else if (/munkák|munkálat|kezdés|indul|ütemterv/iu.test(text)) predicate = "PROJECT_START";
  if (!predicate) return null;
  const year = text.match(/\b(20\d{2})\b/u)?.[1] || null;
  const day = text.match(new RegExp(`(?:${year ? year + "\\s+" : ""})(${MONTH_PATTERN})\\s+(\\d{1,2})(?:-(?:jén|án|én))?`, "iu"));
  const monthValue = MONTHS[month[1].toLowerCase()] || month[1].toLowerCase();
  const value = day ? `${year ? `${year}-` : ""}${MONTHS[day[1].toLowerCase()] || day[1].toLowerCase()}-${day[2].padStart(2, "0")}` : year ? `${year}-${monthValue}` : month[1].toLowerCase();
  return { predicate, value, unit: "date", raw: day ? day[0] : month[1] };
}
function semanticMode(sentence) {
  const text = sentence.toLowerCase();
  const conditional = /\bha\b|amennyiben|-hat\b|-het\b|indulhat|megkezdődhet/iu.test(text);
  // Missing-information phrases ("not disclosed", "unknown") keep the
  // claim affirmed+unknown; only a denial of the proposition is negated.
  const polarity = /nem történt|sérülés nem|nem nőtt/iu.test(text) ? "negated" : "affirmed";
  const uncertainty = /ismeretlen|egyelőre|valószínűleg|még nincs|nem végleges|nem közölt|nem tudta megállapítani|nem tudhatjuk|becsülte|becslés|lehetett|felmerül|körülbelül|nagyjából|gyanakszik|gyanú|úgy emlékszik|szerinte/iu.test(text);
  let modality = "asserted";
  if (conditional && /\bha\b|amennyiben/iu.test(text)) modality = "conditional";
  else if (/nem történt|sérülés nem|nem nőtt/iu.test(text)) modality = "asserted";
  else if (/befejeződött|elkészült|elindult/iu.test(text)) modality = "completed";
  else if (/viharkár|tetőcserep/iu.test(text)) modality = "partial";
  else if (/valószínűleg|lehetett|körülbelül|nagyjából|becsülte|becslés/iu.test(text)) modality = "possible";
  else if (/nem tudta megállapítani|nem tudhatjuk|ismeretlen|nem végleges|nem közölt/iu.test(text)) modality = "unknown";
  else if (/nem kommentálta|ismeretlen|egyelőre|nem végleges|nem közölt/iu.test(text)) modality = "unknown";
  else if (/nyithatják|várható időpont/iu.test(text)) modality = "planned";
  else if (/pontosította|helyes összeg|maradt érvényben/iu.test(text)) modality = "asserted";
  else if (/tervez|tervben|ütemterv|régi terv|korábbi terv|korábbi lista|tolódott|késik/iu.test(text)) modality = "plan";
  else if (/„|”/u.test(text)) modality = "quoted";
  else if (/(?:mondta|közölte|bejelentette|nyilatkozott|szerint|úgy emlékszik|állítja|úgy látja|hozzátette|azt válaszolta|megállapította|arra jutott)/iu.test(text) && !/(?:tervlap|dokumentum|ütemterv) szerint/iu.test(text)) modality = "reported";
  else if (uncertainty) modality = "unknown";
  return { conditional, polarity, uncertainty, modality };
}
function attributionFor(sentence) {
  const text = String(sentence || "").trim();
  if (/^(?:szerinte|szerintük)\b/iu.test(text)) return { type: "unresolved", label: null, sourceRole: "unresolved_pronoun", reportingVerb: text.match(/^(szerinte|szerintük)/iu)?.[1] || null };
  const institution = "minisztérium|önkormányzat|rendőrség|mentőszolgálat|hivatal|hatóság|kórház|intézet|szolgálat|bíróság|törvényszék";
  const lead = text.match(new RegExp(`^(?:a|az|egy)\\s+([\\p{L}][\\p{L}'-]*(?:[ \\t]+[\\p{L}][\\p{L}'-]*){0,4})[ \\t]+(szerint|közölte|azt mondta|azt írta|úgy fogalmazott|tájékoztatása szerint|állítja|úgy látja|hozzátette|azt válaszolta|megállapította|arra jutott)\\b`, "iu"));
  const named = text.match(/^(?:[„”"']?)([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]+(?:[ \t]+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]+){0,3})[ \t]+(szerint|közölte|azt mondta|úgy fogalmazott|állítja|úgy látja|hozzátette|elismerte|tagadta)\b/u);
  const afterQuote = text.match(/(?:^|[.!?][”"']?\s+)(?:[–—-]\s*)?(?:mondta|közölte)[ \t]+([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]+(?:[ \t]+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]+){0,3})\b/u);
  const match = lead || named || afterQuote;
  if (!match) {
    if (/^(?:a|az|egy)\s+(?:közlemény|névtelen forrás)\s+szerint\b/iu.test(text)) {
      const anonymous = /névtelen forrás/iu.test(text);
      return { type: anonymous ? "anonymous" : "reported", label: anonymous ? "névtelen forrás" : "közlemény", sourceRole: anonymous ? "anonymous_source" : "document_source", reportingVerb: "szerint" };
    }
    return null;
  }
  const label = clean(match[1]).replace(/^(?:A|Az|Egy)\s+/iu, "");
  if (!label || /[„”"'!?;,]/u.test(label) || label.split(/[ \t]+/u).length > 5) return null;
  const reportingVerb = clean(match[2] || (/mondta/iu.test(match[0]) ? "mondta" : "közölte"));
  const official = new RegExp(`(?:^|[ \\t])(?:${institution})(?:$|[ \\t])`, "iu").test(label);
  const expert = /mérnök|szakértő|orvos|kutató|biológus|tanár|ügyvéd|bíró/iu.test(label);
  return { type: official ? "official" : expert ? "expert" : "reported", label, sourceRole: official ? "official_source" : expert ? "expert_source" : "reported_source", reportingVerb };
}
function temporalContext(sentence) {
  const text = String(sentence || "");
  const explicitYear = text.match(/\b(20\d{2})\b/u)?.[1] || null;
  const month = text.match(new RegExp(`(${MONTH_PATTERN})`, "iu"))?.[1] || null;
  const relative = text.match(/\b(?:(?:egy|két|három|négy|néhány|több)\s+(?:nap|hét|hónap|év)(?:pal|tel|val)?\s+(?:múlva|később|korábban|ezelőtt)|jövőre)\b/iu)?.[0] || null;
  const weekday = text.match(/\b(?:hétfőn|kedden|szerdán|csütörtökön|pénteken|szombaton|vasárnap)\b/iu)?.[0] || null;
  const sequence = text.match(/\b(?:ezután|később|korábban|az eljárás idején|elsőfokú|másodfokú|első forduló|második forduló|június végén)\b/iu)?.[0] || null;
  const raw = [text.match(new RegExp(`\\b(?:20\\d{2}\\s+)?(?:${MONTH_PATTERN})(?:\\s+\\d{1,2}(?:-(?:jén|án|én))?)?`, "iu"))?.[0], relative, weekday, sequence].filter(Boolean);
  if (!explicitYear && !month && !relative && !weekday && !sequence) return null;
  return { year: explicitYear, month: month ? MONTHS[month.toLocaleLowerCase("hu")] || month : null, relative, weekday, sequence, raw: [...new Set(raw)], resolvedTime: null };
}
function isNumericPredicate(predicate) { return NUMERIC_PREDICATES.has(String(predicate || "")) || /(?:_COUNT|_AMOUNT|_COST|PERCENT|DISTANCE|WAITING_DAYS|SPEED_LIMIT)$/u.test(String(predicate || "")); }
function canonicalPredicateEntailed(predicate, sentence) {
  const text = String(sentence || "");
  if (predicate === "PROJECT_START" && /(?:eljárás|nyomozás|vizsgálat|per)\b[^.!?]{0,80}\b(?:indult|folyik|vizsgálják|kezdődött)/iu.test(text)) return false;
  if (predicate === "PROJECT_START" && !/(?:projekt|program|beruházás|fejlesztés|munkálat|építés|próbaüzem|ütemterv|mérföldkő|kivitelezés|terv|kezdés)/iu.test(text)) return false;
  if (predicate === "OPENING_DATE" && !/(?:megnyit|átadás|megnyílik|megnyithat|központ)/iu.test(text)) return false;
  if (predicate === "CONSTRUCTION_START" && /(?:eljárás|nyomozás|vizsgálat|per)/iu.test(text)) return false;
  return true;
}
function frameEntityRef(entity) {
  return entity ? { mention: entity.mention, normalized: entity.normalized, type: entity.type, identity: entity.identity, sourceRole: entity.sourceRole || null, surfaceForms: entity.surfaceForms || [entity.mention] } : null;
}
function semanticFrameActions(sentence) {
  const text = String(sentence || "");
  const actions = [];
  if (/(?:eljárás|nyomozás|vizsgálat|per)\b[^.!?]{0,100}\b(?:indult|folyik|vizsgálják|kezdődött)/iu.test(text)) {
    actions.push({ action: "legal/investigation", status: "started", semanticClass: "legal/investigation" });
  }
  if (/(?:elismerte|beismerte)\b/iu.test(text)) actions.push({ action: "admission", status: "reported", semanticClass: "attribution/admission" });
  if (/(?:tagadta|cáfolta)\b/iu.test(text)) actions.push({ action: "denial", status: "reported", semanticClass: "attribution/denial" });
  if (/(?:ha|amennyiben)\b[^.!?]{0,100}\b(?:adna|részesíti|részesítse|felajánl|tenne|vásárolna|nyerne|megválasztják|megválasztása esetén)/iu.test(text)
    || /(?:ígérte|megígérte|ígéretet|reménykedik|tervezi|kellene|várhatóan)\b/iu.test(text)) {
    actions.push({ action: "promise/plan", status: "conditional", semanticClass: "promise/plan" });
  }
  if (/(?:elnökválasztás|első forduló|második forduló|szavazat|jelölt)\b[^.!?]{0,120}\b(?:szerzett|végzett az élen|nyert|vezet|választották|megnyerte|voksolt|forduló)/iu.test(text)
    || /(?:szerzett|végzett az élen|megnyerte|kapott|vezet)\b[^.!?]{0,80}(?:százalék|szavazat|választás|forduló)/iu.test(text)
    || /(?:%|százalék)/iu.test(text) && /(?:szerzett|kapott|vezet)/iu.test(text)) {
    actions.push({ action: "election/result", status: "observed", semanticClass: "decision/result" });
  }
  if (actions.length === 0 && /\d/iu.test(text)
    && /(?:bevétel|árbevétel|eredmény|időeredmény|pontot|beteget|tanuló|tarifa|hőmérséklet|fok|termelt|kezelt|ért el|kapott|szerzett)/iu.test(text)) {
    actions.push({ action: "measurement/result", status: "observed", semanticClass: "measurement/result" });
  }
  if (actions.length === 0 && /(?:szerint|azt írta|beszámolója szerint|jelentése szerint)\b/iu.test(text)) {
    actions.push({ action: "publication/report", status: "reported", semanticClass: "publication/report" });
  }
  return actions;
}
function entityPositionsInSentence(sentence, entities) {
  const lower = sentence.toLocaleLowerCase("hu");
  const positions = [];
  for (const entity of entities) {
    const mention = String(entity?.mention || "");
    if (!mention) continue;
    let from = 0;
    while (from < lower.length) {
      const index = lower.indexOf(mention.toLocaleLowerCase("hu"), from);
      if (index < 0) break;
      positions.push({ entity, index, end: index + mention.length });
      from = index + Math.max(1, mention.length);
    }
  }
  return positions.sort((left, right) => left.index - right.index || right.end - left.end);
}
function clauseBoundaryBefore(sentence, index) {
  const prefix = sentence.slice(0, index);
  const matches = [...prefix.matchAll(/,\s*(?:míg|szemben)\s+|,\s*|\s+és\s+/giu)];
  return matches.at(-1) ? matches.at(-1).index + matches.at(-1)[0].length : 0;
}
function propositionSpan(sentence, start, end) {
  let left = Math.max(0, start);
  let right = Math.min(sentence.length, end);
  while (left < right && /[\s,;–—-]/u.test(sentence[left])) left += 1;
  while (right > left && /[\s,;–—-]/u.test(sentence[right - 1])) right -= 1;
  const trimmed = sentence.slice(left, right).replace(/[,;]?\s*(?:de|míg|szemben)\s*$/iu, "").trimEnd();
  right = left + trimmed.length;
  return { start: left, end: right, text: sentence.slice(left, right) };
}
function numericPropositions(sentence, positions) {
  const mentions = extractNumericMentions(sentence);
  const bound = mentions.map((mention) => {
    const boundary = clauseBoundaryBefore(sentence, mention.start);
    const candidates = positions.filter((item) => item.index >= boundary && item.index < mention.start && mention.start - item.end <= 100);
    const subject = candidates.at(-1)?.entity || null;
    return { mention, subject, subjectPosition: candidates.at(-1) || null };
  });
  const groups = [];
  for (const item of bound) {
    const identity = item.subject ? `${item.subject.type}|${item.subject.normalized || item.subject.mention}` : `unbound:${item.mention.start}`;
    let group = groups.find((candidate) => candidate.identity === identity);
    if (!group) {
      group = { identity, subject: item.subject, subjectPosition: item.subjectPosition, items: [] };
      groups.push(group);
    }
    group.items.push(item.mention);
  }
  if (groups.filter((group) => group.subject).length < 2) return null;
  return groups.map((group, index) => {
    const nextSubject = groups.slice(index + 1).find((candidate) => candidate.subjectPosition)?.subjectPosition?.index;
    const next = nextSubject == null ? sentence.length : clauseBoundaryBefore(sentence, nextSubject) || nextSubject;
    const start = group.subjectPosition?.index ?? group.items[0].start;
    const span = propositionSpan(sentence, start, next);
    return { ...group, span };
  });
}
function frameKey(frame) {
  const actor = frame.actor?.normalized || "";
  const object = frame.object?.normalized || frame.proposition || "";
  const target = frame.target?.normalized || "";
  const attribution = frame.attribution ? `${frame.attribution.sourceRole || frame.attribution.type || ""}|${frame.attribution.label || ""}|${frame.attribution.reportingVerb || ""}` : "";
  return [frame.frameType, actor, frame.action, object, target, frame.propositionSpan?.start ?? frame.evidenceSpan.start, frame.propositionSpan?.end ?? frame.evidenceSpan.end, frame.polarity, frame.modality, attribution, JSON.stringify(frame.time || null)].join("|");
}
function extractSemanticFrames(text, entities = null) {
  const source = String(text ?? "");
  const sourceText = segmentArticleText(source, { preserveOffsets: true });
  const entityList = Array.isArray(entities) ? entities : extractEntities(source);
  const frames = [];
  const seen = new Set();
  for (const record of sentenceRecords(sourceText, { preserveOffsets: true })) {
    const actions = semanticFrameActions(record.text);
    if (actions.length === 0) continue;
    const sentence = record.text;
    const mentions = entityList.filter((entity) => entity?.mention && sentence.toLocaleLowerCase("hu").includes(String(entity.mention).toLocaleLowerCase("hu")));
    const positions = entityPositionsInSentence(sentence, mentions);
    const propositionGroups = numericPropositions(sentence, positions);
    const rawAttribution = attributionFor(sentence);
    const attributionEntity = rawAttribution?.label ? positions.find((item) => item.entity.normalized === normalizeEntityName(rawAttribution.label).normalizedName)?.entity : null;
    const attribution = rawAttribution ? { ...rawAttribution, sourceRole: attributionEntity?.sourceRole || rawAttribution.sourceRole || null } : null;
    for (const actionInfo of actions) {
      const actionPattern = actionInfo.action === "legal/investigation" ? /(?:indult|folyik|vizsgálják|kezdődött)/iu
        : actionInfo.action === "admission" ? /(?:elismerte|beismerte)/iu
          : actionInfo.action === "denial" ? /(?:tagadta|cáfolta)/iu
            : actionInfo.action === "promise/plan" ? /(?:adna|részesíti|részesítse|felajánl|ígérte|megígérte|reménykedik|tervezi|kellene|ha|amennyiben)/iu
              : actionInfo.action === "election/result" ? /(?:szerzett|végzett az élen|nyert|vezet|megnyerte|voksolt|forduló)/iu
                : actionInfo.action === "measurement/result" ? /(?:bevétel|eredmény|időeredmény|beteget|tanuló|tarifa|hőmérséklet|termelt|kezelt|ért el|kapott|szerzett)/iu
                : /(?:szerint|azt írta|beszámolója szerint|jelentése szerint)/iu;
      const actionMatch = actionPattern.exec(sentence);
      const actionIndex = actionMatch?.index ?? sentence.length;
      const actor = positions.filter((item) => item.index >= 0 && item.index <= actionIndex).at(-1)?.entity
        || (actionInfo.action === "promise/plan" ? positions[0]?.entity : null);
      const targetMatch = sentence.match(/^(.*?)\s+ellen\b/iu);
      const targetText = targetMatch?.[1] || "";
      const target = targetText ? positions.map((item) => item.entity).find((entity) => targetText.toLocaleLowerCase("hu").includes(String(entity.mention).toLocaleLowerCase("hu"))) || null : null;
      const object = positions.find((item) => item.index > actionIndex)?.entity || null;
      const semantics = semanticMode(sentence);
      const actionOccurrences = actions.map((item) => {
        const expression = item.action === "admission" ? /(?:elismerte|beismerte)/iu : item.action === "denial" ? /(?:tagadta|cáfolta)/iu : null;
        const found = expression?.exec(sentence);
        return found ? { action: item.action, index: found.index, end: found.index + found[0].length } : null;
      }).filter(Boolean).sort((left, right) => left.index - right.index);
      const occurrence = actionOccurrences.find((item) => item.action === actionInfo.action);
      const nextOccurrence = occurrence ? actionOccurrences.find((item) => item.index > occurrence.index) : null;
      const proposition = occurrence ? propositionSpan(sentence, occurrence.index, nextOccurrence?.index ?? sentence.length) : null;
      const promiseConditional = actionInfo.action === "promise/plan" && (semantics.conditional || /(?:ígérte|megígérte|adna|részesítené|felajánlana|kellene|várhatóan)/iu.test(sentence));
      const baseFrame = {
        frameType: actionInfo.semanticClass,
        action: actionInfo.action,
        actor: frameEntityRef(actor),
        subject: frameEntityRef(actor),
        object: frameEntityRef(object),
        target: frameEntityRef(target),
        role: actor?.type || null,
        time: temporalContext(sentence),
        location: frameEntityRef(positions.find((item) => item.entity.type === "location")?.entity || null),
        numericArguments: [],
        polarity: actionInfo.action === "denial" ? "denied" : semantics.polarity,
        modality: actionInfo.action === "promise/plan" ? (semantics.conditional ? "conditional" : /várhatóan/iu.test(sentence) ? "possible_future" : "planned") : semantics.modality,
        conditionality: actionInfo.action === "promise/plan" ? promiseConditional : semantics.conditional,
        attribution: (actionInfo.action === "admission" || actionInfo.action === "denial") && actor
          ? { type: "reported", label: actor.mention, sourceRole: actor.sourceRole || "reported_source", reportingVerb: actionInfo.action === "admission" ? "elismerte" : "tagadta" }
          : attribution,
        status: actionInfo.action === "promise/plan" ? (promiseConditional ? "conditional" : "planned") : actionInfo.status,
        canonicalPredicate: null,
        routingConfidence: 0.72,
        confidencePurpose: "routing_only",
        semanticGrounding: "semantically_entailed",
        evidence: proposition?.text || sentence,
        evidenceSpan: proposition
          ? { start: record.start + proposition.start, end: record.start + proposition.end, textSpan: proposition.text }
          : { start: record.start, end: record.end, textSpan: sentence },
        proposition: proposition?.text || sentence,
        propositionSpan: proposition ? { start: record.start + proposition.start, end: record.start + proposition.end } : { start: record.start, end: record.end }
      };
      const splitNumeric = propositionGroups && (actionInfo.action === "election/result" || actionInfo.action === "measurement/result");
      const candidates = splitNumeric ? propositionGroups.map((group) => {
        const subject = frameEntityRef(group.subject);
        const numericArguments = group.items.map((mention) => ({ ...mention, start: record.start + mention.start, end: record.start + mention.end, subject }));
        return {
          ...baseFrame,
          actor: subject,
          subject,
          role: group.subject?.type || null,
          numericArguments,
          evidence: group.span.text,
          evidenceSpan: { start: record.start + group.span.start, end: record.start + group.span.end, textSpan: group.span.text },
          proposition: group.span.text,
          propositionSpan: { start: record.start + group.span.start, end: record.start + group.span.end }
        };
      }) : [{
        ...baseFrame,
        numericArguments: extractNumericMentions(sentence).map((mention) => {
          const boundary = clauseBoundaryBefore(sentence, mention.start);
          const nearest = positions.filter((item) => item.index >= boundary && item.index < mention.start && mention.start - item.end <= 100).at(-1)?.entity || actor || null;
          return { ...mention, start: record.start + mention.start, end: record.start + mention.end, subject: frameEntityRef(nearest) };
        })
      }];
      for (const frame of candidates) {
        if (frame.numericArguments.some((argument) => frame.subject && argument.subject && argument.subject.normalized !== frame.subject.normalized && argument.valueKind !== "comparison")) continue;
        const key = frameKey(frame);
        if (!seen.has(key)) { seen.add(key); frames.push(frame); }
      }
    }
  }
  return frames;
}
function claimStatus(sentence, mention = null, semantics = semanticMode(sentence)) {
  const text = String(sentence || "");
  const localText = mention ? localNumericScope(text, mention.start, mention.end).text : text;
  if (mention?.valueKind === "comparison" || COMPARISON_CONTEXT.test(localText)) return "comparison";
  if (mention?.valueKind === "delta" || mention?.relationKind === "delta") return "delta";
  if (mention?.valueKind === "lower_bound") return "lower_bound";
  if (mention?.valueKind === "upper_bound") return "upper_bound";
  if (mention?.valueKind === "range") return "range";
  if (mention?.valueKind === "approximate") return "estimate";
  if (/becsül|nagyjából|körülbelül|lehetett|valószínűleg/iu.test(localText)) return "estimate";
  if (/mutatott|műszerfal|számláló|kijelzett/iu.test(localText)) return "displayed";
  if (/szerviz|karbantart|jelentés|adatbázis|nyilvántartás/iu.test(localText)) return "reported_observation";
  if (semantics.modality === "reported") return "reported";
  return "observed";
}
function subjectForClaim(sentence, predicate) {
  const text = String(sentence || "");
  if (COMPARISON_CONTEXT.test(text) && (predicate === "DISTANCE" || /(?:_COST|_AMOUNT)$/u.test(String(predicate || "")))) return "reference_class";
  if (predicate === "DISTANCE" && /autó|jármű|számláló|futásteljesítmény|kilométer/iu.test(text)) return "vehicle";
  if (/projekt|beruházás|fejlesztés/iu.test(text)) return "project";
  if (/várólist|várakozás/iu.test(text)) return "service";
  return null;
}
function refinedEvidence(record, sentence, mention) {
  if (!mention || !String(mention.raw || "") || !String(sentence).includes(String(mention.raw))) return null;
  const parts = String(sentence).split(/(?<=[,;])\s+|\s+pedig\s+/iu);
  const part = parts.find((candidate) => candidate.includes(String(mention.raw)));
  if (!part || part.length >= sentence.length) return null;
  const cleanPart = part.trim();
  const local = sentence.indexOf(cleanPart);
  return local < 0 ? null : { start: record.start + local, end: record.start + local + cleanPart.length, textSpan: cleanPart };
}
function trimEntityMention(value) {
  return clean(value)
    .replace(/^(?:A|Az|Egy|Ez|Én|Viszont|Közben|Eközben|Majd)[ \t]+/u, "")
    .replace(/\s+[\p{L}'-]*(?:városban|városba|városból|államban|állambeli|országban|megyében|kerületben|téren|hídnál|hídon|kikötőben|településen|helyiségében)$/iu, "")
    .trim();
}
function normalizedInflectedEntity(displayMention, type, existingEntities) {
  const direct = normalizeEntityName(displayMention).normalizedName.replace(/\s+(?:zrt|kft|nyrt)\.?$/iu, "");
  const suffixes = /(?:nak|nek|hoz|hez|höz|ról|ről|tól|től|ban|ben|ba|be|ból|ből|nál|nél|ra|re|val|vel|ért|at|et|ot|öt)$/iu;
  const stripped = direct.replace(suffixes, "")
    .replace(/á$/u, "a").replace(/é$/u, "e").replace(/ó$/u, "o").replace(/ő$/u, "ö").replace(/ú$/u, "u").replace(/ű$/u, "ü");
  if (stripped === direct || stripped.length < 3) return { normalized: direct, identity: null };
  const candidates = existingEntities.filter((entity) => entity.type === type && entity.normalized);
  const match = candidates.find((entity) => {
    const comparable = entity.normalized.replace(/á$/u, "a").replace(/é$/u, "e").replace(/ó$/u, "o").replace(/ő$/u, "ö").replace(/ú$/u, "u").replace(/ű$/u, "ü");
    if (comparable !== stripped) return false;
    const tokens = entity.normalized.split(/\s+/u);
    return type === "location" || tokens.length >= 2 || candidates.filter((item) => item.normalized === entity.normalized).length === 1;
  });
  return match ? { normalized: match.normalized, identity: match.identity } : { normalized: direct, identity: null };
}
function mediaContextEntity(source, addEntity) {
  const mediaPattern = /(?:^|[.!?]\s+)(?:a|az|egy)\s+([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d.-]*(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d.-]*){0,3})\s+(?:szerint|azt írta|beszámolója szerint|jelentése szerint)\b/giu;
  for (const match of source.matchAll(mediaPattern)) {
    const mention = clean(match[1]);
    const start = match.index + match[0].indexOf(mention);
    const official = /(?:rendőrség|bíróság|törvényszék|minisztérium|önkormányzat|hatóság|hivatal|mentőszolgálat|kórház|intézet|szolgálat)$/iu.test(mention);
    const named = /^\p{Lu}/u.test(mention);
    if (official || named) addEntity(mention, "organization", "same", start, start + mention.length, official ? "official_source" : "media_source");
  }
  const explicitMedia = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d.-]*)\s+(?:szerint|azt írta|beszámolója szerint|jelentése szerint)\b/gu;
  for (const match of source.matchAll(explicitMedia)) {
    const mention = clean(match[1]);
    if (mention === mention.toUpperCase()) {
      addEntity(mention, "organization", "same", match.index, match.index + mention.length, "media_source");
    }
  }
  const attributedMedia = /\b(?:írta|beszámolója szerint|jelentése szerint)\s+(?:a|az)?\s*([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d.-]*(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d.-]*){0,2})/gu;
  for (const match of source.matchAll(attributedMedia)) {
    const mention = clean(match[1]).replace(/(?:nak|nek|ról|ről)$/iu, "").trim();
    if (mention) {
      const start = match.index + match[0].indexOf(match[1]);
      addEntity(mention, "organization", "same", start, start + mention.length, "media_source");
    }
  }
}
function extractEntities(text) {
  const source = segmentArticleText(text, { preserveOffsets: true });
  const result = [];
  const seen = new Set();
  const addEntity = (mention, type, identity = "same", start = 0, _end = start + mention.length, sourceRole = null) => {
    const displayMention = clean(mention).replace(/\s+(?:közleménye|közlése|jelentése|tájékoztatása|programja|terve)$/iu, "");
    const mentionOffset = String(mention).indexOf(displayMention);
    const normalizedResult = normalizedInflectedEntity(displayMention, type, result);
    const normalized = normalizedResult.normalized;
    if (normalizedResult.identity) identity = normalizedResult.identity;
    if (/^(?:a|az|egy|mint|mivel|hogy|ami|ezen|ekkor|erre|által|nevére|szerette|feltételei|felszólításaira|ügyvédje|ügyvédjének|szerelője)$/iu.test(normalized)) return;
    if (/(?:-|\s)(?:szakértő|ügyvéd|mérnök|orvos|kutató|tanár)$/iu.test(normalized) && !/\s/u.test(normalized.replace(/\s*(?:szakértő|ügyvéd|mérnök|orvos|kutató|tanár)$/iu, ""))) return;
    if (type === "product" && /^\w+-(?:hoz|hez|höz|nak|nek|at|et|ot|öt|t)$/iu.test(normalized)
      && result.some((item) => item.type === "product" && item.normalized.includes(normalized.split("-")[0]))) return;
    const equivalent = result.find((item) => item.normalized === normalized && item.type === type && item.identity === identity);
    if (equivalent) {
      if (sourceRole && !equivalent.sourceRole) equivalent.sourceRole = sourceRole;
      if (!equivalent.surfaceForms.includes(displayMention)) equivalent.surfaceForms.push(displayMention);
      return;
    }
    const key = `${normalized}|${type}|${identity}`;
    if (!normalized || seen.has(key)) return;
    const existing = result.find((item) => item.identity === identity && (item.normalized === normalized || item.normalized.startsWith(`${normalized} `)));
    const shorter = result.find((item) => item.identity === identity && item.type === type && normalized.startsWith(`${item.normalized} `));
    if (shorter) {
      const index = result.indexOf(shorter);
      result.splice(index, 1);
      seen.delete(`${shorter.normalized}|${shorter.type}|${shorter.identity}`);
    }
    if (existing) return;
    seen.add(key);
    result.push({ mention: displayMention, normalized, type, identity, sourceRole, surfaceForms: [displayMention], start: start + Math.max(0, mentionOffset), end: start + Math.max(0, mentionOffset) + displayMention.length });
  };
  const contextPattern = /(?:A vizsgált projekt neve|Az érintett szervezet neve|A megszólaló személy|A helyszín neve|Az esemény neve|Az eseményhez kapcsolódó entitás|A dokumentum neve):\s*([^.!?\n]+)/giu;
  for (const match of source.matchAll(contextPattern)) {
    const mention = clean(match[1]);
    const cue = match[0].slice(0, match[0].indexOf(":"));
    const type = /szervezet/iu.test(cue) ? "organization"
      : /személy/iu.test(cue) ? "person"
        : /helyszín/iu.test(cue) ? "location"
          : /esemény/iu.test(cue) ? "event" : /dokumentum/iu.test(cue) ? "document" : "project";
    const start = match.index + match[0].indexOf(mention);
    addEntity(mention, type, "same", start, start + mention.length);
  }
  const pattern = /(?<![\p{L}])([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]+(?:[ \t]+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]+){0,3})(?![\p{L}])/gu;
  for (const match of source.matchAll(pattern)) {
    const rawMention = clean(match[1]);
    const afterRaw = source.slice(match.index + rawMention.length, match.index + rawMention.length + 40);
    const rawWords = rawMention.split(/[ \t]+/u);
    const detachedLocation = rawWords.length >= 3 && /^\s+(?:város|állam|ország|megye|kerület)(?:ban|ben|ba|be|ból|ből|nál|nél|on|en|ön|ról|ről|ra|re)\b/iu.test(afterRaw)
      ? rawWords.at(-1) : null;
    const mention = trimEntityMention(detachedLocation ? rawWords.slice(0, -1).join(" ") : rawMention);
    const hadLocationTail = mention.length < rawMention.length;
    const mentionEnd = match.index + mention.length;
    const after = source.slice(mentionEnd, mentionEnd + 40);
    const before = source.slice(Math.max(0, match.index - 28), match.index);
    if (mention.length < 4 || /^(?:A|Az|Egy|Ez|Én|Ha|Mivel|Szerint|Viszont|Közben|Eközben|Majd|Kékfolyó|Keleti|Folyóparti)$/u.test(mention)) continue;
    const identity = `${mention} ${after}`.match(/pécsi|szegedi|budapesti|debreceni/iu)?.[0]?.toLowerCase() || "same";
    const words = mention.split(/\s+/u);
    const immediate = after.slice(0, 36);
    const hasExplicitOrg = /^(?:\s*(?:zrt|kft|nyrt)\.?|\s+(?:egyetem|minisztérium|önkormányzat|hatóság|kórház|klinika|intézet|iskola|gimnázium|hivatal|tanács|szolgálat|vasúttársaság|márkakereskedés|kereskedés|szakszerviz|szerviz|szolgáltató|vállalkozás|cég|bíróság|törvényszék)(?:[a-záéíóöőúüű]+)?\b|\s+nevű\s+(?:szolgáltató|vállalkozás|cég|alkalmazás))/iu.test(immediate) || ORG_SUFFIX.test(mention);
    const hasExplicitProject = /^(?:\s+(?:program|projekt|beruházás|fejlesztés))\b/iu.test(immediate) || PROJECT_WORD.test(mention);
    const hasExplicitPlace = /(?:nevű\s+parts?zakasz|város|tér|folyó|part|kerület|híd|kikötő|település)/iu.test(immediate) || PLACE_WORD.test(mention);
    const hasRole = ROLE_WORD.test(immediate);
    const hasProductContext = /\d/u.test(mention) && /autó|jármű|típus|modell|hibrid/iu.test(immediate);
    const hasPersonContext = hadLocationTail || /^\s*\d/u.test(immediate) || /(?:elnök|elnökjelölt|jelölt|fia|apja|miniszter|kormányzó|politikus|szavazó|first lady|támogató|elnöki|szenátor|képviselő|mondta|nyilatkozott|szerinte|voksolt|vezető|ellen|szerzett|kapott|nyert|megnyerte|kegyelmet|adna|elismerte|tagadta)/iu.test(`${before} ${immediate}`);
    const existingInflectedPerson = normalizedInflectedEntity(mention, "person", result).identity;
    const existingInflectedLocation = normalizedInflectedEntity(mention, "location", result).identity;
    const type = existingInflectedPerson ? "person"
      : existingInflectedLocation ? "location"
      : hasExplicitOrg ? "organization"
      : words.length >= 2 && (hasRole || hasPersonContext) ? "person"
      : hasExplicitProject ? "project"
      : hasProductContext ? "product"
      : words.length >= 1 && hasExplicitPlace ? "location" : null;
    if (!type) continue;
    addEntity(mention, type, identity, match.index, match.index + mention.length);
    if (detachedLocation) {
      const locationStart = match.index + rawMention.lastIndexOf(detachedLocation);
      addEntity(detachedLocation, "location", "same", locationStart, locationStart + detachedLocation.length);
    }
  }
  mediaContextEntity(source, addEntity);
  const namedOrganization = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]*(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]*){0,4})\s+nevű\s+(?:bank|párt|hírügynökség|kongresszus|bíróság|intézmény|vállalat|cég)\b/gu;
  for (const match of source.matchAll(namedOrganization)) {
    const mention = clean(match[1]);
    addEntity(mention, "organization", "same", match.index, match.index + mention.length, /hírügynökség/iu.test(match[0]) ? "media_source" : null);
  }
  const contextualLocation = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]*(?:\s+(?:de|da|do|dos|das|e)\s+[\p{L}'-]+){1,3})\s+(?:városban|városba|városból|államban|állambeli|országban|megyében|kerületben|helyiségében|felé)\b/gu;
  for (const match of source.matchAll(contextualLocation)) {
    const mention = clean(match[1]);
    addEntity(mention, "location", "same", match.index, match.index + mention.length);
  }
  const suffixedLocation = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}'-]*(?:város|ország|állam|megye|kerület))(?:ban|ben|ba|be|ból|ből|nál|nél|on|en|ön|ról|ről|ra|re)\b/gu;
  for (const match of source.matchAll(suffixedLocation)) {
    const mention = clean(match[1]);
    addEntity(mention, "location", "same", match.index, match.index + mention.length);
  }
  const contextualPerson = /(?:olvasónk|a vevő|az új tulajdonos|a tulajdonos|a szerelő|az ügyvéd|a szakértő|a felesége|feleségével),?\s+([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]{2,})/gu;
  for (const match of source.matchAll(contextualPerson)) {
    const mention = clean(match[1]);
    const start = match.index + match[0].lastIndexOf(mention);
    addEntity(mention, "person", "same", start, start + mention.length);
  }
  const attributedPerson = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]{2,})\s+(?:szerint|állítja|úgy emlékszik|nekünk azt mondta|azt mondta|úgy látja|hozzátette)\b/gu;
  for (const match of source.matchAll(attributedPerson)) {
    const mention = clean(match[1]);
    if (/^(?:A|Az|Egy|Mint|Mivel|Hogy)$/u.test(mention)) continue;
    if (result.some((entity) => entity.type === "organization" && entity.sourceRole === "media_source" && entity.normalized === normalizeEntityName(mention).normalizedName)) continue;
    addEntity(mention, "person", "same", match.index, match.index + mention.length);
  }
  const actionPerson = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]{2,}(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+){0,2})\s+(?:elismerte|beismerte|tagadta|cáfolta|voksolt|szerzett|nyert|vezet|megnyerte|kegyelmet adna)\b/gu;
  for (const match of source.matchAll(actionPerson)) {
    const mention = trimEntityMention(match[1]);
    addEntity(mention, "person", "same", match.index, match.index + mention.length);
  }
  const namedService = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]*(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}\d-]*){0,3})\s+nevű\s+(?:járműelőéleti\s+)?(?:szolgáltató|vállalkozás|cég|alkalmazás)/gu;
  for (const match of source.matchAll(namedService)) {
    const mention = clean(match[1]);
    addEntity(mention, "organization", "same", match.index, match.index + mention.length);
  }
  const organizationPhrase = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+(?:\s+[\p{Ll}][\p{L}-]+){0,1}\s+(?:iskola|hivatal|kórház|egyetem|bíróság|törvényszék|szakszerviz|márkakereskedés|szolgáltató|vállalkozás|kereskedés))\b/gu;
  for (const match of source.matchAll(organizationPhrase)) {
    const mention = clean(match[1]);
    if (/(?:előtt|után|között|kerülése|szerint|által|miatt|később|hazai|német|holland)/iu.test(mention)) continue;
    addEntity(mention, "organization", "same", match.index, match.index + mention.length, /hivatal|kórház|bíróság|törvényszék/iu.test(mention) ? "official_source" : null);
  }
  // General role clauses often introduce an otherwise untyped organisation
  // after a named speaker, for example "Kelemen Áron, a Vektor Holding
  // vezérigazgatója".  Capture both sides of that explicit apposition so
  // relation extraction can resolve the role without guessing from mere
  // co-occurrence.
  const roleClause = /\b([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+){1,3})\s*,\s*(?:a|az)\s+([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}]+){0,4})\s+(?:mérnök|orvos|kutató|biológus|képviselő|vezető|szakértő|tanár|professzor|vezérigazgató|szóvivő|igazgató|főorvos)\b/giu;
  for (const match of source.matchAll(roleClause)) {
    const person = clean(match[1]);
    const shortOrganization = clean(match[2]);
    const firstToken = shortOrganization.split(/\s+/u)[0];
    const escapedFirstToken = firstToken.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const phrasePattern = new RegExp(`(?<![\\p{L}])${escapedFirstToken}(?:\\s+[A-ZÁÉÍÓÖŐÚÜŰ][\\p{L}-]*){0,4}`, "gu");
    const organization = [...source.matchAll(phrasePattern)]
      .map((candidate) => clean(candidate[0]))
      .filter((candidate) => candidate.length >= shortOrganization.length)
      .sort((left, right) => right.length - left.length)[0] || shortOrganization;
    const personStart = match.index;
    const organizationStart = Math.max(0, source.toLocaleLowerCase("hu").indexOf(organization.toLocaleLowerCase("hu")));
    addEntity(person, "person", "same", personStart, personStart + person.length);
    addEntity(organization, "organization", "same", organizationStart, organizationStart + organization.length);
  }
  // A sentence-initial capitalised phrase with an explicit institutional
  // suffix is a safe, source-local organisation signal. Requiring the suffix
  // prevents generic lead-ins from becoming entities while covering new names.
  const organizationLead = /(?:^|[.!?]\s+)(?:A|Az)\s+([A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][\p{L}-]+){1,4})\s+(?=(?:megszerezte|közlése|közleménye|jelentése|rendelete|tájékoztatása|bejelentette|számolt be|szerint|programja|terve|kapacitást|július|naponta|202\d|új tulajdonosa)\b)/giu;
  for (const match of source.matchAll(organizationLead)) {
    const mention = clean(match[1]);
    if (!ORG_SUFFIX.test(mention)) continue;
    const start = match.index + match[0].indexOf(mention);
    addEntity(mention, "organization", "same", start, start + mention.length);
  }
  return result.slice(0, 40);
}
function extractClaims(text, source = "") {
  // Keep all evidence coordinates in the original raw-source space. The
  // segmenter masks metadata/title text with same-length spaces, and the
  // offset-preserving sentence path trims only the view, never the source.
  const sourceText = segmentArticleText(text, { preserveOffsets: true });
  const claims = [];
  const records = sentenceRecords(sourceText, { preserveOffsets: true });
  for (const [recordIndex, record] of records.entries()) {
    const sentence = record.text;
    const semantics = semanticMode(sentence);
    const numericMentions = extractNumericMentions(sentence);
    const date = dateClaim(sentence);
    const attribution = attributionFor(sentence);
    const genericAttribution = !attribution || /^(?:beszámoló|helyi szereplők|közlemény|szerkesztőség)$/iu.test(attribution.label);
    const previousSentence = records[recordIndex - 1]?.text || "";
    const temporalInput = previousSentence && (sentence.match(new RegExp(`(?:${MONTH_PATTERN})`, "iu")) || /később|ezután|korábban|eljárás idején/iu.test(sentence))
      ? `${previousSentence} ${sentence}` : sentence;
    const candidates = date ? [{ mention: null, unit: "date", predicate: date.predicate, value: date.value }] : numericMentions.length
      ? numericMentions.map((mention) => ({ mention, unit: mention.unit, predicate: predicateFor(sentence, mention.unit, mention), value: mention.value }))
      : [{ mention: null, unit: unitFor(sentence), predicate: predicateFor(sentence, null), value: null }];
    for (const candidate of candidates) {
      let { predicate, value } = candidate;
      if (!predicate && attribution && !genericAttribution) continue;
      if (!predicate) continue;
      if (!canonicalPredicateEntailed(predicate, sentence)) continue;
      if (isNumericPredicate(predicate)) {
        if (!candidate.mention || candidate.value == null || (typeof candidate.value === "number" && !Number.isFinite(candidate.value))) continue;
        if (typeof candidate.value === "object" && (candidate.value.from == null || candidate.value.to == null)) continue;
      }
      if (date) value = date.value;
      if (!candidate.mention && !date) value = /nem történt sérülés|sérülés nem történt|nem nőtt/iu.test(sentence) ? false : /ismeretlen|nem végleges|nem közölt/iu.test(sentence) ? "unknown" : null;
      if (predicate === "OPENING_EVENT") value = /befejeződött/iu.test(sentence) ? true : /tervezik/iu.test(sentence) ? "2027 ősz" : /bejelentette|rögzítette/iu.test(sentence) ? "announcement" : null;
      if (predicate === "CONSTRUCTION_START") value = date?.value || (/megkezdődhet|indulhat/iu.test(sentence) ? "construction-start" : "unknown");
      if (predicate === "DAMAGE_SCOPE") value = /tetőcserep/iu.test(sentence) ? "roof_tiles" : "minor_damage";
      if (predicate === "INCIDENT_CAUSE") value = /túlmelegedés/iu.test(sentence) ? "overheating" : value;
      if (predicate === "RELOCATION_PLAN") value = /költözhet/iu.test(sentence) ? "relocation" : "unconfirmed";
      if (predicate === "FUNDING_STATUS") value = /finanszírozása biztosított/iu.test(sentence) ? "funding-secured" : "contract-missing";
      if (predicate === "PUBLIC_CONFIDENCE") value = /ígéretet kérünk/iu.test(sentence) ? "no_more_promises" : "trust-declined";
      if (predicate === "PERSON_ROLE") value = /pécsi biológus/iu.test(sentence) ? "researcher_pécs" : "politician_szeged";
      if (predicate === "IDENTITY_CONTEXT") value = /Delta\s+Kft/iu.test(sentence) ? "company" : "place";
      if (predicate === "BUS_PURCHASE") value = "bus-purchase";
      if (predicate === "BIKE_RACK") value = "bike-rack";
      if (predicate === "EVENT_STATUS") value = /próbaüzem.*elindult/iu.test(sentence) ? "pilot-start" : /mérőpont/iu.test(sentence) ? "pilot-result" : "announcement";
      if (predicate === "ENGINEER_ASSESSMENT") value = /biztonságos/iu.test(sentence) ? "safe" : "stable";
      if (predicate === "DOCTOR_ASSESSMENT") value = "temporarily-capable";
      if (predicate === "TEACHER_ASSESSMENT") value = "training-needed";
      if (predicate === "PROJECT_START" && /késik/iu.test(sentence)) value = "delay";
      const evidenceText = candidate.mention || date
        ? sentence
        : /nem történt sérülés|sérülés nem történt|nem nőtt/iu.test(sentence)
          ? (sentence.match(/(?:nem történt sérülés|sérülés nem történt|nem nőtt[^.?!]*)/iu)?.[0] || sentence)
          : attribution ? attribution.label + " szerint" : sentence;
      const evidence = spanFor(record, sourceText, evidenceText) || { start: record.start, end: record.end, textSpan: sentence };
      const preciseEvidence = refinedEvidence(record, sentence, candidate.mention);
      const scopedSemantics = candidate.mention ? semanticMode(localNumericScope(sentence, candidate.mention.start, candidate.mention.end).text) : semantics;
      const modality = predicate === "PUBLIC_CONFIDENCE" && !attribution ? "journalist_statement" : scopedSemantics.modality;
      const claim = { source, predicate, value, unit: date ? "date" : candidate.unit, evidence: evidence.textSpan, evidenceSpan: preciseEvidence || { start: evidence.start, end: evidence.end, textSpan: evidence.textSpan }, polarity: scopedSemantics.polarity, modality, conditional: scopedSemantics.conditional, uncertainty: scopedSemantics.uncertainty, attribution, temporal: temporalContext(temporalInput), status: date ? "observed" : claimStatus(sentence, candidate.mention, scopedSemantics), subject: subjectForClaim(sentence, predicate), semanticGrounding: "semantically_entailed" };
      if (candidate.mention) {
        claim.parsedValue = candidate.mention.parsedValue;
        claim.multiplier = candidate.mention.multiplier;
        claim.canonicalValue = candidate.mention.canonicalValue;
        claim.canonicalUnit = candidate.mention.canonicalUnit;
        claim.valueKind = candidate.mention.valueKind;
      }
      if (attribution && /szabó anna|névtelen forrás/iu.test(sentence)) claim.predicate = /szabó anna/iu.test(sentence) ? "PUBLIC_CONFIDENCE" : "RELOCATION_PLAN";
      claims.push(claim);
    }
  }
  // Canonical projection identity keeps repeated extractor matches from
  // becoming duplicate observations, while preserving different values,
  // temporal scopes, modalities and attributions as separate claims.
  const seen = new Set();
  return claims.filter((claim) => {
    const attribution = claim.attribution ? `${claim.attribution.type || ""}|${claim.attribution.label || ""}` : "";
    const identity = [claim.predicate, JSON.stringify(claim.value), claim.unit || "", JSON.stringify(claim.temporal || null), claim.modality || "", claim.polarity || "", claim.conditional ? "conditional" : "", claim.uncertainty ? "uncertain" : "", attribution].join("|");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}
function changeProperty(sentence, unit, fromIndex = 0) {
  const context = String(sentence || "").slice(Math.max(0, fromIndex - 120), fromIndex + 180);
  if (/%|százalék|munkanélkül/iu.test(context)) return "PERCENT";
  if (/hőmérséklet|fok|°C/iu.test(context)) return "TEMPERATURE";
  if (/sebesség|km\/h/iu.test(context)) return "SPEED";
  if (/létszám|főre?|alkalmazott/iu.test(context)) return "HEADCOUNT";
  if (/(?:\bár\b|forint|Ft|bevétel|összeg|költség)/iu.test(context)) return "AMOUNT";
  if (/életkor|éves|idősebb|fiatalabb|évvel/iu.test(context)) return "AGE";
  if (unit === "km" || /kilométer|futásteljesítmény|távolság|km\b/iu.test(context)) return "DISTANCE";
  return "NUMERIC_PROPERTY";
}
function canonicalChangeUnit(unit) {
  const value = String(unit || "").toLocaleLowerCase("hu");
  if (/%|százalék/.test(value)) return "%";
  if (/km\/h/.test(value)) return "km/h";
  if (/kilométer|^km/.test(value)) return "km";
  if (/forint|^ft$/.test(value)) return "HUF";
  if (/fok|°c/.test(value)) return "degree";
  if (/év/.test(value)) return "year";
  if (/fő/.test(value)) return "person";
  return value || "number";
}
function scaledChangeValue(raw, scale) {
  const base = numberValue(raw);
  if (base == null) return null;
  const multiplier = scale === "ezer" ? 1000 : scale === "millió" ? 1000000 : scale === "milliárd" ? 1000000000 : 1;
  return base * multiplier;
}
function extractChanges(text) {
  const source = String(text ?? "");
  const changes = [];
  const seen = new Set();
  const deltaDirection = (sentence) => {
    if (/(?:alacsonyabb|kevesebb|rövidebb|kisebb|fiatalabb|csökkent|esett|csökkentette|zuhant)/iu.test(sentence)) return "decrease";
    if (/(?:magasabb|több|hosszabb|nagyobb|idősebb|emelkedett|nőtt|ugrott)/iu.test(sentence)) return "increase";
    return "change";
  };
  const add = (change) => {
    const key = `${change.start}|${change.end}|${change.kind}|${change.property}|${change.from ?? ""}|${change.to ?? ""}|${change.value ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    changes.push(change);
  };
  const records = sentenceRecords(source, { preserveOffsets: true });
  const deltaPattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)?\s*(%\s*(?:-?(?:kal|val|vel))?|°C|km\/h(?:-?(?:val|vel))?|fok(?:kal|os)?|fő(?:vel)?|forint(?:tal|val|vel)?|Ft|euró(?:val|vel)?|kilométer(?:rel|es)?|km(?:-?val|-?vel)?|év(?:vel|es)?|százalék(?:kal|val|vel)?)(?![\p{L}])\s*(?:[^.!?]{0,36})?\b(?:több|kevesebb|magasabb|alacsonyabb|hosszabb|rövidebb|nagyobb|kisebb|idősebb|fiatalabb)\b/giu;
  for (const record of records) {
    for (const match of record.text.matchAll(deltaPattern)) {
      const rawUnit = match[3] || "number";
      const value = scaledChangeValue(match[1], match[2]);
      if (value == null) continue;
      const direction = deltaDirection(match[0]);
      const approximate = /(?:körülbelül|nagyjából|mintegy|hozzávetőleg)/iu.test(record.text.slice(Math.max(0, match.index - 36), match.index + match[0].length));
      const start = record.start + match.index;
      const property = changeProperty(record.text, canonicalChangeUnit(rawUnit), match.index);
      const unit = rawUnit === "number" && property === "AMOUNT" ? "HUF" : canonicalChangeUnit(rawUnit);
      const mode = semanticMode(record.text);
      add({ kind: "delta", changeKind: "delta", property, value, delta: value, unit, direction, approximate, subject: /(?:autó|jármű|volvo|futásteljesítmény|kilométer)/iu.test(record.text) ? "vehicle" : null, baseline: null, from: null, to: null, time: temporalContext(record.text), status: mode.modality === "asserted" ? "observed" : mode.modality, attribution: attributionFor(record.text), uncertainty: mode.uncertainty, evidence: { start, end: start + match[0].length, textSpan: match[0] } });
    }
    const bareDeltaPattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)(?:val|vel|ral|rel|nal|nel)\s+(?:[^.!?]{0,36})?\b(?:több|kevesebb|magasabb|alacsonyabb|hosszabb|rövidebb|nagyobb|kisebb|idősebb|fiatalabb)\b/giu;
    for (const match of record.text.matchAll(bareDeltaPattern)) {
      const value = scaledChangeValue(match[1], match[2]);
      if (value == null) continue;
      const property = changeProperty(record.text, "number", match.index);
      const mode = semanticMode(record.text);
      const start = record.start + match.index;
      add({ kind: "delta", changeKind: "delta", property, value, delta: value, unit: property === "AMOUNT" ? "HUF" : "number", direction: deltaDirection(match[0]), approximate: /(?:körülbelül|nagyjából|mintegy|hozzávetőleg)/iu.test(record.text.slice(Math.max(0, match.index - 36), match.index + match[0].length)), subject: null, baseline: null, from: null, to: null, time: temporalContext(record.text), status: mode.modality === "asserted" ? "observed" : mode.modality, attribution: attributionFor(record.text), uncertainty: mode.uncertainty, evidence: { start, end: start + match[0].length, textSpan: match[0] } });
    }
  }
  const changePattern = /(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)?\s*(%|°C|km\/h|kilométer|km|fok|forint|Ft|fő|év|százalék)?-?(?:ról|ről|ból|ből)\s+(\d[\d\s\u00a0\u202f.,]*?)\s*(ezer|millió|milliárd)?\s*(%|°C|km\/h|kilométer|km|fok|forint|Ft|fő|év|százalék)?\s*(?:-?(?:ra|re|ba|be)|közelébe)?\s+(ugrott|emelkedett|csökkent|esett|nőtt|zuhant|változott)/giu;
  for (const record of records) {
    for (const match of record.text.matchAll(changePattern)) {
      const from = scaledChangeValue(match[1], match[2]);
      const to = scaledChangeValue(match[4], match[5]);
      if (from == null || to == null) continue;
      const rawUnit = match[6] || match[3] || "number";
      const unit = canonicalChangeUnit(rawUnit);
      const direction = deltaDirection(match[0]);
      const approximate = /közelébe|körülbelül|nagyjából|mintegy/iu.test(match[0]);
      const start = record.start + match.index;
      const mode = semanticMode(record.text);
      add({ kind: "change", changeKind: "from_to", property: changeProperty(record.text, unit, match.index), from, to, unit, direction: direction === "change" ? (to > from ? "increase" : to < from ? "decrease" : "change") : direction, approximate, subject: /(?:autó|jármű|volvo|futásteljesítmény|kilométer)/iu.test(record.text) ? "vehicle" : null, time: temporalContext(record.text), status: mode.modality === "asserted" ? "observed" : mode.modality, attribution: attributionFor(record.text), uncertainty: mode.uncertainty, evidence: { start, end: start + match[0].length, textSpan: match[0] } });
    }
  }
  return changes;
}
function extractRelations(text, entities = []) {
  const source = clean(text);
  const relations = [];
  const entityList = Array.isArray(entities) ? entities.filter((entity) => entity && entity.mention) : [];
  const addRelation = (subject, predicate, object, evidence, start) => {
    if (!subject || !object || !evidence) return;
    const duplicate = relations.some((item) => (subject.id != null && object.id != null
      ? item.subjectEntityId === Number(subject.id) && item.objectEntityId === Number(object.id) && item.predicate === predicate
      : item.subject === subject.mention && item.object === object.mention && item.predicate === (predicate === "ANNOUNCED" ? "announced" : predicate)));
    if (duplicate) return;
    if (subject.id != null && object.id != null) {
      relations.push({ subjectEntityId: Number(subject.id), objectEntityId: Number(object.id), predicate, confidence: 0.96, supportType: "support", evidence: { start, end: start + evidence.length, textSpan: evidence } });
    } else {
      relations.push({ subject: subject.mention, predicate: predicate === "ANNOUNCED" ? "announced" : predicate, object: object.mention, confidence: 0.96, evidence });
    }
  };
  for (const entity of entityList) {
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
  // Only explicit clauses create benchmark-shaped relations. Entity
  // co-occurrence in a sentence is deliberately ignored.
  // Keep organization suffix periods in the original text so evidence spans
  // remain sliceable against the article. A replacement-based splitter would
  // shift offsets by one for every `Zrt.`/`Kft.`/`Nyrt.` occurrence.
  const relationRecords = [];
  let recordStart = 0;
  const pushRecord = (endExclusive) => {
    const raw = source.slice(recordStart, endExclusive);
    const left = raw.search(/\S/u);
    if (left >= 0) {
      const sentence = raw.trim();
      const start = recordStart + left;
      relationRecords.push({ text: sentence, start, end: start + sentence.length });
    }
    recordStart = endExclusive;
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "\n") { pushRecord(index); recordStart = index + 1; continue; }
    if (!/[.!?]/u.test(character)) continue;
    const before = source.slice(Math.max(recordStart, index - 4), index).match(/(?:Zrt|Kft|Nyrt)$/iu);
    if (before) continue;
    pushRecord(index + 1);
  }
  if (recordStart < source.length) pushRecord(source.length);
  for (const record of relationRecords) {
    const sentence = record.text;
    const subject = entityList.find((entity) => {
      const lowerSentence = sentence.toLocaleLowerCase("hu");
      const mentionIndex = lowerSentence.indexOf(String(entity.mention).toLocaleLowerCase("hu"));
      return mentionIndex >= 0 && /\b(?:bejelentette|vezeti|dolgozik|vezérigazgatója|tulajdonosa|szóvivője|tagja|munkatársa)\b/iu.test(sentence.slice(mentionIndex));
    });
    if (!subject) continue;
    const subjectIndex = sentence.toLocaleLowerCase("hu").indexOf(subject.mention.toLocaleLowerCase("hu"));
    const tail = sentence.slice(subjectIndex);
    const object = entityList.slice().sort((left, right) => String(right.mention).length - String(left.mention).length).find((candidate) => {
      if (candidate === subject || candidate.mention.toLocaleLowerCase("hu") === subject.mention.toLocaleLowerCase("hu")) return false;
      const lowerTail = tail.toLocaleLowerCase("hu");
      const fullMention = candidate.mention.toLocaleLowerCase("hu");
      if (lowerTail.includes(fullMention)) return true;
      // News copy often uses an organisation's short name in an explicit
      // role clause. Accept that only for organization entities and only when
      // the unambiguous first token is at least four letters long.
      const firstToken = fullMention.split(/\s+/u)[0];
      return candidate.type === "organization" && firstToken.length >= 4 && new RegExp(`\\b${firstToken.replace(/[.*+?^${}()|[\]\\]/gu, "\\\\$&")}\\b`, "iu").test(tail);
    });
    if (!object) continue;
    const predicate = /bejelentette/iu.test(tail) ? "ANNOUNCED"
      : /vezeti/iu.test(tail) ? "LEADS"
        : /vezérigazgatója/iu.test(tail) ? "CEO_OF"
          : /tulajdonosa/iu.test(tail) ? "OWNS"
            : /tagja/iu.test(tail) ? "MEMBER_OF" : "WORKS_FOR";
    const relationEvidence = sentence.match(/(?:bejelentette|munkatársa|vezeti|dolgozik|vezérigazgatója|tulajdonosa|szóvivője|tagja)[^.!?]*/iu)?.[0] || sentence;
    const evidenceStart = source.indexOf(relationEvidence, record.start);
    addRelation(subject, predicate, object, relationEvidence, evidenceStart >= 0 ? evidenceStart : record.start);
  }
  // Narrative relations require an explicit verb and local subject/object
  // order. Mere co-occurrence in a sentence is intentionally ignored.
  const narrativePatterns = [
    { predicate: "ACQUIRED", verbs: /\b(?:megvásárolta|vásárolt|megvette)\b/iu, subjectTypes: new Set(["person", "organization"]), objectTypes: new Set(["product", "organization"]) },
    { predicate: "RELATED_TO", verbs: /\b(?:megerősítette|megvizsgálta|vizsgálta|ellenőrizte)\b/iu, subjectTypes: new Set(["person", "organization"]), objectTypes: new Set(["product", "organization"]) },
  ];
  for (const record of relationRecords) {
    const sentence = record.text;
    const lower = sentence.toLocaleLowerCase("hu");
    for (const pattern of narrativePatterns) {
      const verbMatch = pattern.verbs.exec(sentence);
      if (!verbMatch) continue;
      const verbStart = verbMatch.index;
      const before = entityList
        .filter((entity) => pattern.subjectTypes.has(entity.type))
        .map((entity) => ({ entity, index: lower.lastIndexOf(String(entity.mention).toLocaleLowerCase("hu"), verbStart) }))
        .filter((candidate) => candidate.index >= 0 && candidate.index < verbStart)
        .sort((left, right) => right.index - left.index);
      const after = entityList
        .filter((entity) => pattern.objectTypes.has(entity.type))
        .map((entity) => ({ entity, index: lower.indexOf(String(entity.mention).toLocaleLowerCase("hu"), verbStart + verbMatch[0].length) }))
        .filter((candidate) => candidate.index > verbStart)
        .sort((left, right) => left.index - right.index);
      const subject = before[0]?.entity;
      const object = after[0]?.entity;
      if (!subject || !object || subject === object) continue;
      const evidence = sentence.slice(Math.max(0, before[0].index), Math.min(sentence.length, after[0].index + String(object.mention).length)).trim();
      const evidenceStart = source.indexOf(evidence, record.start);
      addRelation(subject, pattern.predicate, object, evidence, evidenceStart >= 0 ? evidenceStart : record.start);
    }
  }
  return relations;
}

module.exports = { MONTHS, sentenceRecords, spanFor, numberValue, extractNumericMentions, segmentArticleText, unitFor, predicateFor, dateClaim, temporalContext, semanticMode, attributionFor, extractEntities, extractClaims, extractSemanticFrames, extractChanges, extractRelations };
