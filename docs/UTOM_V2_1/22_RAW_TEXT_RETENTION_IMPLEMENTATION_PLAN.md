# Raw/full-text retention implementation plan

Állapot: `IMPLEMENTATION REQUIRED BEFORE PRODUCTION`
Policy: owner által elfogadott célérték – sikeres feldolgozás után legfeljebb 24 óra, failed/retry állapotban legfeljebb 7 nap.

Ez a terv nem módosít adatot és nem futtat törlést.

## Auditált tárolási felületek

| Tároló | Tartalom | Raw/full source? | Policy szerint |
|---|---|---:|---|
| `articles.content_text` | scraper/RSS által megtisztított teljes forrásszöveg | Igen | 24 óra / failed 7 nap |
| `articles.short_summary`, `articles.long_summary` | feldolgozott, saját összefoglaló | Nem | hosszabb távon megőrizhető |
| `summaries.content`, `summaries.detailed_content` | saját summary/read model tartalom | Nem | hosszabb távon megőrizhető |
| `v2_entity_mentions.raw_text` | rövid entity mention/evidence span | Nem, minimális span | külön evidence policy |
| `v2_claim_evidence.text_span` | korlátozott claim evidence span | Nem, minimális span | külön evidence policy |
| `v2_relation_evidence.text_span` | korlátozott relation evidence span | Nem, minimális span | külön evidence policy |
| `daily_reports.content`, `videos.description` | saját report/media leírás | Nem | külön domain policy |

## Feldolgozási függőségek

Az `articles.content_text` jelenleg több feldolgozási út bemenete: rövid és hosszú összefoglaló, kategória, sentiment, kulcsszó, embedding, clickbait, plagiarism, cluster/related és a canonical V2 extraction handoff. A retry/recovery útvonal később is visszaolvashatja a mezőt.

Következmény: automatikus 24 órás törlés jelenlegi formában funkciót törhet, ha egy required vagy retryable step még pending/failed/uncertain állapotú. A retention cleanup nem vezethető be pusztán egy időzített `DELETE` lekérdezéssel.

## Későbbi megvalósítási lépések

1. Migration: explicit `raw_content_expires_at` és szükség esetén `raw_content_retention_reason` mező az `articles` táblán.
2. Ingestionkor expiry számítás: normál feldolgozásra 24 óra, failed/retry állapotra legfeljebb 7 nap.
3. Pipeline contract: a cleanup csak akkor nullázhatja a raw mezőt, ha minden raw-függő required step terminális, nincs aktív claim, és nincs recovery hold.
4. Cleanup job: batch méret, lock/claim, idempotencia, audit event, dry-run és metrics.
5. Reprocessing contract: raw törlés után a retry útvonal explicit `raw_content_unavailable` állapotot adjon, ne induljon hibás részfeldolgozás.
6. Evidence review: a mention/claim/relation spanok hossz- és hozzáférési határai maradjanak külön a teljes raw retentiontől.
7. Fixture: pending, failed, uncertain, completed, missing raw, duplicate cleanup és concurrent worker esetekre regresszió.
8. Staging restore rehearsal és owner sign-off után lehet production migration/cleanup ütemezést készíteni.

## Indulási besorolás

- `RAW FULL-TEXT RETENTION IMPLEMENTED: NO`
- Free public launch blocker: **YES**, amíg a jóváhagyott retention policy nem érvényesül a production ingestionben.
- Paid Premium launch blocker: **YES**, a free gate mellett a payment/entitlement külön hiányzó kapu.
- Owner/legal blocker: **YES**, forrásonkénti policy és retention jóváhagyás szükséges.
- Staging build blocker: **NO**, a staging felépíthető raw cleanup aktiválása nélkül; a cleanup jelenleg nem fut, ezt az eltérést dokumentálni kell.
