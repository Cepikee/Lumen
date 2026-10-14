# Frozen held-out: esetről esetre végzett tartalmi ellenőrzés

Az első futás és a gépi értékelés után készült. Ez Codex által végzett tartalmi review, nem független külső szakértői jóváhagyás. A gold, evaluator, binder és first-pass JSON változatlan. A 36 példa 15 témacímkét fed le; ezek rövid, szintetikus, lexikailag új példák, nem 36 független valódi cikk. A mintacsaládok tudatosan megegyeznek a javítandó hibacsaládokkal.

A táblázatban a „0” a hibásan biztosnak jelölt szereplő/forrás/címzett/számkötés hiányát jelenti az adott példában. Nem azt jelenti, hogy minden szemantikai mező teljes. A helyes numerikus kötés actor nélküli, unresolved teljes frame mellett is lehetséges.

| Eset | Helyes eredmény | Kihagyás / tartalmi korlát | False resolved | Wrong actor/source/owner/sign/conditional | Entity/type |
|---|---|---|---:|---|---|
| s01 | -11 °C, hőmérséklet tulajdonság | Teljes frame actor hiányában unresolved; állapotleírásnál ez túl szigorú | 0 | nincs | nincs néventitás |
| s02 | −17 millió HUF, egyenleg | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s03 | –4 gól, gólkülönbség | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s04 | mínusz 13 fok → -13 | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s05 | 7 százalékponttal csökkent → delta -7 | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s06 | Készlet 23 darabbal csökkent → delta -23 | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s07 | 12 → −6, delta -18, teljes változásevidence | A számok mértékegysége null; a hőmérséklet property megvan | 0 | nincs | nincs |
| s08 | [-9,+4] tartomány, közös fok egység | Teljes frame unresolved | 0 | nincs | nincs |
| s09 | 48 doboz; raktár location, actor ismeretlen | Doboz/talált mennyiség property nincs kötve | 0 | nincs téves actor; owner omitted | nincs hamis raktár-ORG |
| s10 | 143 beteg; klinika location | Kezelt betegek számának owner/property kötése hiányzik | 0 | nincs téves actor; owner omitted | nincs hamis klinika-ORG |
| s11 | Rendőrség explicit actor, 48 talált doboz, raktár location | Az entity ownerType generikus referenst is tartalmaz; nem bizonyít tulajdonjogot | 0 | nincs a contract szerinti kötésben | generic referent, nem named ORG |
| s12 | Bence source; Rékának recipient; levél megérkezése külön content | Content subject nincs; Réka canonicalIdentity null, nem hibás lemma | 0 | nincs | két helyes surface |
| s13 | Rékának recipient; source unresolved | A meg nem nevezett beszélőt nem találja ki | 0 | nincs | surface-only Rékának |
| s14 | Bence source; vele recipient | Bolt content actor nincs feloldva | 0 | nincs | Bence helyes |
| s15 | Bence source; tőle recipient | Kérdésként modalitás nincs külön; az interrogatív -e csak contentben marad | 0 | nincs a mért szerepekben | Bence helyes |
| s16 | Bence actor/source; Rékát recipient | Réka teljes identity nem rekonstruált | 0 | nincs | surface-only címzett |
| s17 | Bence source; neki recipient | Óra mint esemény subject nincs | 0 | nincs | Bence helyes |
| s18 | 88% process/completion; Vince37% entity/share | Sára42% és actor kihagyva: a modell Sára esetét Sbl-nek jelölte | 0 | nincs hibás owner; Sára omitted | Sára személy felismerve, identity unresolved |
| s19 | 11% threshold; Vince29%, Zita22% helyes | Sára31% omitted. A threshold frame az ellipszis szabály miatt tévesen a kap igét örökli; a teljes frame unresolved, a threshold számkötés helyes | 0 | nincs hibás biztos szerep/szám; action mezőhiba | Sára Case=Sbl |
| s20 | 56 éves és42% nyers érték helyes | Mindkét owner és Sára actor omitted | 0 | owner omitted, nem rossz érték | Sára Case=Sbl |
| s21 | 14% tarifa külön; Cédrus Zrt32% részesedés külön | Actor a property hordozóját is jelenti, nem feltétlenül szándékos cselekvőt | 0 | nincs a gold contractban | vállalat helyes |
| s22 | 2023 calendar_year elkülönül42%-tól | Sára42% owner omitted | 0 | owner omitted | Sára Case=Sbl |
| s23 | 18% betegpopuláció | 96 beteg population_count kötése omitted | 0 | nincs hibás owner | nincs hamis néventitás |
| s24 | Tagadás megmarad; Cnd=true; logical conditional=false | Sára source és actor omitted. A counterfactual modalitás túl erős: a tagadott volna nem bizonyít tényellentétes világot | 0 | nincs hibás biztos szerep; modalitáshiba | Sára Case=Sbl |
| s25 | Cnd/hypothetical; logical conditional=false | Sára actor omitted | 0 | nincs hibás logical condition | Sára Case=Sbl |
| s26 | Vince feltétel és következmény; Zita külön, nem feltételes | Nincs új kihagyás a kijelölt contractban | 0 | nincs | Vince/Zita helyes |
| s27 | Előreálló következmény és utólagos ha is conditional | A második clause implicit Vince actor nincs; első modality-lista asserted+conditional együtt marad, bár a fő modality conditional | 0 | actor omitted; scope helyes | Vince helyes |
| s28 | Történhetett volna Cnd, nem logical conditional | A counterfactual címke nem bizonyítja, hogy az esemény nem történt meg; potenciális olvasat veszhet el | 0 | nincs a mért logical conditionben | nincs |
| s29 | Magyar idézet + követő Bence: egy content/source frame | action=fog; a javulni lexikai predikátum strukturáltan elvész | 0 | source helyes | Bence helyes |
| s30 | Elöl Bence + magyar idézet: egy frame | action=fog, nem javul | 0 | source helyes | Bence helyes |
| s31 | ASCII idézet + követő Bence: egy frame | action=fog, nem javul | 0 | source helyes | Bence helyes |
| s32 | Gondolatjeles idézet + követő Bence: egy frame | action=fog, nem javul | 0 | source helyes | Bence helyes |
| s33 | Nincs hamis Szerintük személy, iskola/kórház névszervezet | A Szerintük attribúciós kontextus eltűnik: reportingContext=false, asserted. A gold ezt a mezőt nem méri; a frame unresolved | 0 | nincs kitalált source, de attribution-context omitted | guard helyes |
| s34 | Réka actor; Rékának recipient | Második előfordulás NER-ként omitted (NOUN lett), a címzett ettől még helyes; same-article identity nincs összekötve | 0 | nincs hibás source | 1 néventitás-omission |
| s35 | Legalább -15: lower_bound és signed érték | Actor nélküli állapot unresolved | 0 | nincs | nincs |
| s36 | Legfeljebb +7: upper_bound, possible | Actor nélküli állapot unresolved | 0 | nincs | nincs |

## Mit bizonyít és mit nem a nulla?

A rögzített evaluator 11 resolved frame, 22 resolved numeric binding és 27 nem-null szerepállítás között nem talált hibát: 0/60. Ezek átfedő döntések, nem 60 független megfigyelés. A role assertions számláló a nem-null szerepeket unresolved teljes frame mellett is ellenőrzi.

A teljes output 45 frame; ebből 34 unresolved. Gold actor-lefedettség11/18, source9/10, recipient7/7; numerikus owner/property22/30; néventitás26/27. Ez érdemi, de korlátozott lefedettség. Nem a mindent elutasító rendszer 0/0 eredménye.

A gépi scope-ellenőrzés a raw proposition/content határait méri, nem az esemény teljes jelentését. Nem méri az action lemma helyességét, a counterfactual megalapozottságát, a kérdésmodalitást vagy a Szerintük implicit attribúcióját. A gold nyelvtani Cnd-címkéi és a logikai feltétel címkéi külön vannak. E hiányok miatt a 0/60 nem nevezhető teljes entailment safetynek.

Az annotations fájl `id` mezője a worker 1..36 request ID-ját őrzi, a raw output `id` mezője s01..s36. A kapcsolat a frozen input sorrendjével egyértelmű. Ezt az első futás után nem írtuk át.
