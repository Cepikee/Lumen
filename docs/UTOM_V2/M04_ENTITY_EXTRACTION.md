# UTOM V2 – M4 Entity extraction

Állapot: `M4 COMPLETE`
Dátum: 2026-10-03 (Europe/Budapest)
Schema: `054`

## Acceptance-gap

| M4 requirement | Status | Evidence | Remaining |
|---|---|---|---|
| M2 canonical ingestion envelope és explicit `v2.ingestion.1` input | COMPLETE | `lib/v2/entity-extraction.js`, targeted input/version tests | nincs |
| Determinisztikus canonical extraction text | COMPLETE | title + contentText, NFC-preserving canonical text helper | runtime/provider wiring későbbi slice |
| Controlled entity type allowlist | COMPLETE | 7 M1-fagyasztott típus validációja | nincs |
| Typed mention/candidate output contract | COMPLETE | strict `entities[]` result contract | persistence későbbi slice |
| Evidence span és bounds validáció | COMPLETE | exact JS code-unit span és mention egyezés | provider mapping későbbi slice |
| Confidence `0..1` validáció | COMPLETE | finite numeric boundary checks | nincs |
| Empty extraction és occurrence semantics | COMPLETE | empty és repeated-occurrence regressziók | nincs |
| JSON-safe immutable output | COMPLETE | deep-freeze result regression | nincs |
| Malformed/unknown output explicit invalid result | COMPLETE | invalid type/confidence/span/extra field tests | quarantine/runtime policy későbbi slice |
| AI provider/mock runtime | COMPLETE | `lib/v2/entity-extraction-provider.js`, runtime targeted tests; paid AI 0 | nincs |
| Mention persistence / AI-run audit | COMPLETE | repository, `v2_ai_runs`, typed unresolved `v2_entity_mentions`, idempotent operation key | MySQL runtime evidence környezetfüggő |
| Feature-flagged pipeline integration | COMPLETE | egy canonical optional `entity_extraction` handoff a pipeline-ban; OFF zero provider call | nincs |
| Entity resolution/merge | N/A | M5/M6 feladat | későbbi milestone |

**M4 acceptance: 12/13 COMPLETE, 0 NOT STARTED, 0 BLOCKED, 1 N/A.**
**Applicable acceptance: 12/12 COMPLETE.**

## Dependency inventory

- canonical input: `lib/v2/ingestion-envelope.js`, `v2.ingestion.1`
- article content source: `article.title` + `article.contentText`, egy newline-nal összefűzve
- entity type allowlist: person, company, organization, location, project, product, topic
- mention/entity boundary: output csak mention és unresolved candidate adat; canonical entity ID nincs
- resolver boundary: nincs implementálva (M5/M6)
- AI/provider boundary: canonical mock provider; paid AI `0`
- persistence boundary: caller-owned V2 repository transaction, no raw provider response
- schema support: `054_v2_entity_mention_type.sql` additively adds nullable `entity_type`, preserving pre-existing unresolved rows while new M4 mentions remain typed
- feature flag: one optional pipeline handoff, `UTOM_V2_ENABLED` gated
- context/audit/idempotency: M1 request context, `v2_ai_runs` audit and deterministic operation key

## Selected slice

Az első slice után a három fennmaradó dependency-order követelmény is elkészült: canonical mock provider boundary, feature-flagelt optional pipeline handoff, valamint schema-valid mention és AI-run audit persistence. Entity resolution, merge és későbbi extraction domain-ek nem kerültek be.

## Extraction contract

- input version: `v2.ingestion.1`
- output version: `v2.extraction.1`
- entity types: a 7 elemű allowlist
- mention: `mentionText`, NFC formában, az evidence span pontos szövege
- candidate: `normalizedCandidateName`, trimelt, de ékezetmegőrző NFC
- confidence: finite number `0..1`
- evidence/span: `{ start, end }`, JavaScript UTF-16 code-unit offset a canonical `title + "\n" + contentText` szövegen
- unresolved: nincs `entityId`; extraction nem végez resolutiont
- empty: `entities: []` érvényes
- duplicate: külön span külön occurrence, nincs automatikus entity-szintű deduplikáció
- immutable/JSON-safe: valid result deep-frozen, csak JSON-adatot tartalmaz

## Validation

- Targeted M4: contract/runtime/repository/pipeline/migration tests – PASS
- lefedve: input version, malformed envelope, allowlist, confidence boundaries, Hungarian text, exact span, out-of-range/hallucinated span, extra field, empty extraction, duplicate occurrence, same-name candidates, immutable output
- AI call: `0` paid; deterministic mock only
- DB write: `v2_ai_runs` audit és typed unresolved `v2_entity_mentions`, caller-owned transaction
- migration: `054_v2_entity_mention_type.sql`, additive
- runtime: OFF zero provider call; ON exactly one optional canonical handoff
- legacy behavior: M4 failure shadow/non-blocking, legacy article completion unchanged

MySQL 8 targeted integration PASS: fresh `001→054`, upgrade `053→054`, idempotent retry, typed seven-type mentions, empty extraction, rollback és readiness `054` ellenőrizve. A lokális WSL MySQL 8.0.46 tesztadatbázis a validáció után eltávolítható.

Final M4 gate: feature OFF/ON runtime, AI audit, mention persistence, empty extraction, retry, rollback, M4-APP-001, M4-APP-002 és legacy integration regressziók PASS; paid AI `0`, production DB `NEM`.

## Finding

`M4-APP-001` – az új optional V2 extraction step miatt a pipeline state machine a feature OFF ágban hiányzó optional stepet is incomplete állapotnak tekintette, ezért az article completion hibával leállhatott. A root cause az optional állapotok feltétel nélküli ellenőrzése volt. A javítás csak a jelenlévő optional step-eket ellenőrzi; a célzott pipeline-state regresszió és az M4 runtime tesztek PASS.

`M4-APP-002` – a kezdeti runtime handoff két külön request/run contextet hozott létre ugyanazon extraction lifecycle-hoz. A root cause a külön envelope- és provider-hívásban létrehozott context volt. A javítás egyetlen `entityContext` továbbadása az envelope-nek és a providernek; regresszióval ellenőrizve.

`M4-APP-003` – a schema readiness baseline még `053`-at követelt, ezért az új `054` M4 migration után a health/readiness hibásan régi verziót tekintett volna aktuálisnak. A root cause a központi `REQUIRED_SCHEMA` verzió és a mention `entity_type` oszlop hiányos frissítése volt. Javítva és izolált MySQL-en `ready: true` eredménnyel ellenőrizve.

## Next exact unmet requirement

M4 formálisan lezárult. A master plan szerinti következő phase az M5; implementációját ebben a sessionben kezdjük.
