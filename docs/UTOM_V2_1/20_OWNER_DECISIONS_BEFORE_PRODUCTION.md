# UTOM production előtti owner döntések

Ez a dokumentum rövid döntési lap. Nem választ a tulajdonos helyett.

| Döntési tétel | Mit kell eldönteni? | Ajánlott alapállapot | Kötelező indulás előtt? | Állapot |
|---|---|---|---|---|
| Hosting plan | Egy VPS vagy külön web/DB szolgáltatás? | Stagingen mérés; productionben külön DB előnyös | Igen | PENDING |
| Full-text retention | Meddig tartható meg az `articles.content_text`? | Rövid, dokumentált retention | Igen | PENDING |
| Source/TDM policy | Mely források és milyen tartalommal engedélyezettek? | Forrásonként ALLOW/HOLD/BLOCK | Igen | PENDING |
| 444 | Maradjon-e proxyzott feed? | `HOLD` canonical policyig | Igen, ha a forrás indulna | PENDING |
| Email provider | Melyik szolgáltató küld verification/reset/contact üzeneteket? | Jóváhagyott SMTP/API provider | Igen az auth email flow-hoz | PENDING |
| Payment provider | Kell-e fizetős induláskor? | V2.1-ben OFF, nincs fake checkout | Nem a jelenlegi code release-hez | DEFERRED |
| Paid AI | Kell-e fizetős AI az induláskor? | OFF; deterministic/mock és meglévő read model | Nem | DEFERRED |
| Analytics | Milyen consent és milyen analytics? | Kezdetben OFF | Igen, ha aktiváljuk | PENDING |
| FFmpeg/Híradó | Indul-e a Híradó az első release-ben? | Deferred, amíg capability nincs | Csak Híradó scope esetén | PENDING |
| Monitoring alerts | Ki kap riasztást és milyen időablakban? | Owner + infra on-call | Igen | PENDING |
| Backup retention | Mennyi ideig őrzünk mentést, hol és milyen restore RPO/RTO-val? | Off-host, titkosított, rendszeresen visszaállítva | Igen | PENDING |

## Következmény

Amíg a `PENDING` indulás előtti tételek nincsenek lezárva, a rendszer production deploy-ready státusza `NO`. A dokumentum nem tartalmaz secretet, provider credentialt vagy jogi állásfoglalást.
