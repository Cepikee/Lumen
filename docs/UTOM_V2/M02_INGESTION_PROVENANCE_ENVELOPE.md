# M2 – Első kanonikus implementációs lépés

Projekt: UTOM.HU / Lumen
Branch: `develop/utom-recovery`
Dátum: 2026-10-03

## Lépés azonosítása

A `99_IMPLEMENTATION_MASTER_PLAN.md` az M2-t mérföldkőként és elfogadási kapuként definiálja, de nem ad külön számozott M2 al-lépéseket. Ezért az első kanonikus végrehajtható egység az M2 objective és tesztkapu szerinti **tiszta, determinisztikus ingestion provenance és normalization envelope foundation**.

Ez nem új üzleti pipeline és nem M3 dedup/cluster adapter.

## Scope

Megvalósult a `lib/v2/ingestion-envelope.js` pure helper, amely:

- a meglévő `canonicalizeArticleUrl` alapján állítja elő az article canonical URL-t és SHA-256 URL identity-t;
- a meglévő source identity helper-ekből canonical source metadata-t ad;
- a meglévő `parsePublicationTime` alapján csak explicit timezone-os publication időt fogad el;
- a publication és observed time mezőket külön kezeli;
- determinisztikusan normalizálja a címet és tartalmi szöveget NFC, zero-width eltávolítás, sortörés- és üres sor-kezelés után;
- a request/run identity-t csak a kapott M1 contextből veszi át;
- ismeretlen provenance-t explicit `null` értékkel hagy;
- verziózett (`v2.ingestion.1`), JSON-safe és mélyen immutable envelope-ot ad vissza;
- invalid article/URL esetén determinisztikus invalid eredményt ad.

Az envelope létrehozása nem ír adatbázist, nem hív hálózatot vagy AI-t, nem küld e-mailt, nem indít workert, és nem módosítja a legacy ingestion hot pathot. Nincs migration és nincs backfill.

## Contract

| Mező | Jelentés |
|---|---|
| `article.canonicalUrl` | canonical article identity URL |
| `article.urlIdentity` | a canonical URL SHA-256 identity-je |
| `source` | canonical source metadata vagy `null` |
| `publication` | explicit publication time/source vagy `null` |
| `observedAt` | ingestion/observation timestamp vagy `null` |
| `provenance.requestId/runId` | M1 contextből átvett runtime identity vagy `null` |
| `normalization` | alkalmazott determinisztikus szabályok |

Üres vagy bizonytalan adat nem kap implicit fallback értéket.

## Validation

Targeted regressions: `tests/unit/v2-ingestion-envelope.test.cjs`, `tests/unit/v2-ingestion-runtime-handoff.test.cjs`, `tests/unit/v2-ingestion-provenance-schema.test.cjs` és az M1 foundation tesztek; összesen 17 célzott teszt PASS. Lefedik a canonical URL/source/publication normalizálást, magyar karaktereket és whitespace-t, unknown/null adatot, invalid inputot, determinismust, immutable outputot, context-ID validációt, feature OFF legacy-safety-t, retry/idempotenciát, schema contractot és side-effect boundary-t.

Legacy runtime integration ebben a lépésben nem történt; a legacy flow változatlan maradt.

## Állapot

## M2 acceptance-gap progress

| M2 requirement | Status | Evidence | Remaining |
|---|---|---|---|
| Canonical URL/source/publication normalization | COMPLETE | `lib/v2/ingestion-envelope.js`, `tests/unit/v2-ingestion-envelope.test.cjs` | nincs |
| Feature-flagged runtime ingestion handoff | COMPLETE | `lib/feed-ingestion.js`, `tests/unit/v2-ingestion-runtime-handoff.test.cjs` | nincs |
| Retry melletti egyetlen article identity | COMPLETE | runtime handoff regression: insert + deduplicated retry azonos `urlIdentity`-vel | tartós audit még nincs |
| Malformed/unknown source explicit kezelése | COMPLETE | envelope `null` source/invalid URL és legacy outcome regression | nincs |
| Provenance tartós tárolása és audit history | COMPLETE | `v2_ingestion_provenance`, repository boundary, fresh/upgrade MySQL és retry/rollback teszt | nincs |

## M2 persistence slice

Az M2 additív schema extension a `053_v2_ingestion_provenance.sql` migrationben készült el. A tartós rekord strukturáltan tárolja az article/url/source/publication/observed/request/run/operation/version/status adatokat; teljes cikk- vagy raw provider payload nem kerül bele.

Az `operation_key` determinisztikus: explicit ingestion operation key esetén annak SHA-256 értéke, enélkül canonical source + external ID + canonical URL kombinációja. Ez technikai retry esetén idempotens, ugyanakkor eltérő operation key esetén megőrzi az audit history-t.

Az `article_id` és `source_id` FK-k `SET NULL` szabályúak, ezért az audit rekord article/source törlésnél nem törlődik csendben. A repository caller-owned connectiont használ, nem commitol és nem release-el. A V2 audit write shadow/non-blocking; audit hiba nem töri a legacy ingestiont, de a runtime eredményben `persistence: failed` állapot jelenik meg.

MySQL bizonyíték:

- fresh `001→053`: PASS;
- upgrade `052→053`: PASS;
- idempotent retry: PASS;
- külön audit event history: PASS;
- rollback: PASS;
- normalization version, request/run és FK contract: PASS.

Végső M2 regresszió: offline suite `250/250 PASS`, TypeScript PASS, ESLint PASS (0 error), import check PASS, production build PASS.

`M1 COMPLETE: IGEN`
`M2 CURRENT STEP COMPLETE: IGEN`
`M2 COMPLETE: IGEN`
`M2 IMPLEMENTATION BLOCKER: NINCS`
`LATEST SCHEMA VERSION: 053`
`NEXT STEP: M3 – Existing dedup és cluster adapter`
