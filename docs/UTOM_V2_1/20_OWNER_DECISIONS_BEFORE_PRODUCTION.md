# UTOM production előtti owner döntések

Ez a dokumentum rövid döntési lap. Nem választ a tulajdonos helyett.

| Döntési tétel | Mit kell eldönteni? | Ajánlott alapállapot | Kötelező indulás előtt? | Állapot |
|---|---|---|---|---|
| Hosting plan | Egy VPS vagy külön web/DB szolgáltatás? | Stagingen mérés; productionben külön DB előnyös | Igen | PENDING |
| Full-text retention | Meddig tartható meg az `articles.content_text`? | sikeres feldolgozás után legfeljebb 24 óra; failed/retry esetén legfeljebb 7 nap | Igen | DECIDED |
| Paywall bypass | Megkerülhető-e fizetős vagy korlátozott forrás? | Soha; cookie, credential, private API és cache bypass tilos | Igen | DECIDED |
| Source/TDM policy | Mely források és milyen tartalommal engedélyezettek? | bizonytalan vagy tiltott jelzés esetén HOLD/BLOCK | Igen | DECIDED |
| 444 | Maradjon-e proxyzott feed? | `THIRD-PARTY / PROXY – HOLD`, canonical ingestion OFF | Igen, ha a forrás indulna | DECIDED |
| Email provider | Melyik szolgáltató küld verification/reset/contact üzeneteket? | Jóváhagyott SMTP/API provider | Igen az auth email flow-hoz | OPEN |
| Payment provider | Kell-e fizetős induláskor? | V2.1-ben OFF, nincs fake checkout | Nem a free staging/code release-hez | DEFERRED |
| Paid AI | Kell-e fizetős AI az induláskor? | OFF; deterministic/mock és meglévő read model | Nem | DECIDED |
| Analytics | Milyen consent és milyen analytics? | Kezdetben OFF | Igen, ha aktiváljuk | DECIDED |
| FFmpeg/Híradó | Indul-e a Híradó az első release-ben? | Deferred, amíg capability nincs | Csak Híradó scope esetén | DECIDED |
| Monitoring alerts | Ki kap riasztást és milyen időablakban? | Owner + infra on-call | Igen | OPEN |
| Backup retention | Mennyi ideig őrzünk mentést, hol és milyen restore RPO/RTO-val? | 7 napi, 4 heti, 3 havi; legalább egy off-host példány; checksum és restore rehearsal | Igen | DECIDED |
| Hosting/plan | Melyik VPS és régió induljon? | staging mérés után owner döntés | Igen | OPEN |
| Production domain rollout | Mikor és milyen DNS/proxy beállítással induljon? | staging után külön change window | Igen | OPEN |
| Legal/source review | A forrásonkénti policy végleges jóváhagyása | owner/legal review | Igen | OPEN |

## Következmény

Amíg az indulás előtti `OPEN` tételek nincsenek lezárva, a rendszer production deploy-ready státusza `NO`. A retention policy technikailag elfogadott, de a megvalósítása külön mérnöki munka; a dokumentum nem tartalmaz secretet, provider credentialt vagy jogi állásfoglalást.
