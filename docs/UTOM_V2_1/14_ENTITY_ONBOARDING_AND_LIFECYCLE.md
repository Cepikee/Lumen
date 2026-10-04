# V2.1 – Biztonságos entity onboarding és lifecycle

## Cél és státusz

Az entity anchor technikai stabilitást ad a mention, claim, event, evidence és conflict kapcsolatokhoz. Ez nem azonos az elfogadott canonical identityvel. Az új anchor `status=unresolved` állapotban jön létre, ezért a rendszer nem állítja róla, hogy bizonyított személy, szervezet vagy hely.

`V21-ENTITY-F001` – **FIXED** (High)

Root cause: az M6 korábban csak meglévő exact entityt tudott a mentionhöz kötni. Új névnél nem írt master entityt és nem volt stabil `subject_entity_id`, ezért az M11 helyesen `subject_entity_id_required` hibával leállt.

## Állapotgép

```text
extracted mention
      |
      v
unresolved anchor  ---> review / ambiguous (candidate jelzés)
      |
      v
accepted / active identity (csak külön, policy szerinti feloldással)
```

Az onboarding az `v2_entities.identity_scope_key` mezővel determinisztikus, scope-olt kulcsot használ. A 059-es migráció a név hashét és ezt a scope-ot együtt teszi egyedivé. A scope lehet canonical cluster/context, ennek hiányában az article. Így ugyanaz a név két bizonytalan contextben nem olvad össze.

## Lifecycle szabályok

| Helyzet | Működés |
|---|---|
| Új person/company/location | Bizonyított mention-evidence mellett unresolved anchor készül; nem accepted. |
| Már ismert exact compatible entity | A meglévő policy szerinti exact entity újrahasználható. |
| Több candidate / ambiguity | Nincs automatikus merge vagy accepted döntés; a provisional anchor unresolved marad, a candidate csak review-jelzés. |
| Fuzzy hasonlóság | Nem hoz automatikus identity merge-et. |
| Type mismatch | Külön entity identity; a másik típus candidate-je nem használható. |
| Namesake | Eltérő scope esetén külön anchor. |
| Retry | A scope-olt unique kulcs és az operation history ugyanazt az anchor ID-t adja vissza. |
| Két worker | InnoDB unique kulcs és a caller tranzakciója miatt nincs duplicate anchor; a második worker idempotensen újrahasznál. |

## Evidence és tranzakció

Anchor csak létező mentionből készülhet. Az onboarding ellenőrzi az article normalizált canonical szövegét, a start/end offsetet és a tényleges raw span-t. Hibás vagy eltolt span esetén `entity_evidence_invalid` történik, master entity nem jön létre. A mention binding, entity insert és history ugyanabban a caller-owned tranzakcióban fut; a runtime batch ezt a tranzakciós határt kezeli.

## Downstream és public semantics

Claim kaphat provisional `subject_entity_id`-t, így a conflict detector nem null subject miatt áll meg. A conflict összehasonlítható claimeknél fut, de winner automatikusan nincs. Az unresolved entity az existing public read model státuszszűrése miatt nem jelenik meg accepted identityként; a belső claim anchor és az accepted identity külön fogalom.

## Regression evidence

- új person és company anchor;
- exact entity reuse;
- retry ugyanazzal az ID-val;
- külön namesake scope;
- type mismatch külön identity;
- evidence nélküli és hibás evidence span elutasítva;
- canonical raw E2E: 3 raw article, 21 mention, 7 közös provisional anchor, 11 subject-bound claim, 1 numeric conflict, winner nélkül;
- közvetlen derived-table seed: nincs.
