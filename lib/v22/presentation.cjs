"use strict";

const PREDICATE_LABELS = Object.freeze({
  works_for: "ennél a szervezetnél dolgozik",
  located_in: "ehhez a helyhez kapcsolódik",
  has_value: "ezt az értéket hordozza",
  announced: "bejelentette",
  PROJECT_COST: "teljes projektköltség",
  SUBSIDY_AMOUNT: "támogatási összeg",
  COMPLETION_PERCENT: "készültség",
  DISTANCE: "távolság",
  OPENING_DATE: "megnyitás tervezett dátuma",
  OPENING_EVENT: "megnyitási állapot",
  CONSTRUCTION_START: "építés tervezett kezdése",
  INJURY_OCCURRED: "történt-e sérülés",
  DAMAGE_SCOPE: "károsodás terjedelme",
  INCIDENT_CAUSE: "feltételezett ok",
  RELOCATION_PLAN: "költözési terv",
  FUNDING_STATUS: "finanszírozási állapot",
  PUBLIC_CONFIDENCE: "közbizalom",
  PERSON_ROLE: "személy szerepe",
  IDENTITY_CONTEXT: "azonosítási környezet",
  PROJECT_START: "projekt tervezett kezdése",
  GRANT_AMOUNT: "pályázati összeg",
  BUS_PURCHASE: "buszbeszerzés",
  BIKE_RACK: "kerékpártároló",
  EVENT_STATUS: "eseményállapot",
});

const STATUS_LABELS = Object.freeze({
  accepted: "azonosítva",
  active: "aktív",
  review: "ellenőrzésre vár",
  unresolved: "még nem azonosított",
  disputed: "vitatott",
  observed: "forrásban szerepel",
  candidate: "ellenőrzendő jelölt",
  open: "nyitott",
  article: "cikk",
  event: "esemény",
});

const TYPE_LABELS = Object.freeze({ person: "személy", organisation: "szervezet", organization: "szervezet", company: "cég", location: "hely", place: "hely", project: "projekt", event: "esemény" });

function formatPredicate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "állítás";
  if (PREDICATE_LABELS[raw]) return PREDICATE_LABELS[raw];
  const words = raw.replaceAll("_", " ").toLowerCase().trim();
  return words ? `állítás: ${words}` : "állítás";
}

function formatStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return STATUS_LABELS[raw] || (raw ? `állapot: ${raw.replaceAll("_", " ")}` : "ismeretlen állapot");
}

function formatEntityType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return TYPE_LABELS[raw] || (raw ? `típus: ${raw.replaceAll("_", " ")}` : "ismeretlen típus");
}

function parseObject(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")))) return value;
  try { return JSON.parse(trimmed); } catch { return value; }
}

function formatTypedValue(value, options = {}) {
  const parsed = parseObject(value);
  if (parsed == null || parsed === "") return "nincs adat";
  if (typeof parsed === "boolean") return parsed ? "igen" : "nem";
  if (typeof parsed === "number") return Number.isFinite(parsed) ? new Intl.NumberFormat("hu-HU").format(parsed) : "ismeretlen szám";
  if (typeof parsed === "string") return parsed;
  if (Array.isArray(parsed)) return parsed.map((item) => formatTypedValue(item, options)).join(", ");
  if (typeof parsed === "object") {
    if (Object.prototype.hasOwnProperty.call(parsed, "value")) {
      const inner = formatTypedValue(parsed.value, options);
      const unit = typeof parsed.unit === "string" && parsed.unit.trim() ? parsed.unit.trim() : "";
      return unit ? `${inner} ${unit}` : inner;
    }
    const entries = Object.entries(parsed).filter(([, item]) => item != null).map(([name, item]) => `${name.replaceAll("_", " ")}: ${formatTypedValue(item, options)}`);
    return entries.length ? entries.join(", ") : "nincs adat";
  }
  return "nincs adat";
}

module.exports = { PREDICATE_LABELS, STATUS_LABELS, TYPE_LABELS, formatPredicate, formatStatus, formatEntityType, formatTypedValue };
