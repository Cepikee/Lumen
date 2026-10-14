# Fresh first-pass item audit

Assistant-performed manual audit, not an independent human review. Frozen denominator 120. Full raw output is immutable. C=correct resolved slot, W=wrong resolved slot, U=correct abstention, M=missed defensible resolution. A frame may remain unresolved while its source/numeric/actor slot is explicitly resolved; those slots are still audited. Missing candidates are not counted as wrong positive bindings. Explicit safety blocking may satisfy a safety-only gold item.

## A1 — CORRECT_RESOLVED

**Gold:** A halasztás indokolója Takács Réka, nem a frakciók.

**Observed:** actorStatus resolved, actor Takács Réka, action indokol.

**Raw pointers:** /rows/0/output/frames/0; /rows/0/output (entities/chains/contrasts/roles).

## A2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az idézet forrása Takács Réka; a frakciók címzettek.

**Observed:** No attribution chain or source; the named actor does not establish the quote/source/recipient relationship.

**Raw pointers:** /rows/0/output/frames/0, /rows/0/output/frames/1; /rows/0/output (entities/chains/contrasts/roles).

## A3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A napirendre tűzés tagadott; az indokolás nem tagadott.

**Observed:** Multiple predicates collapsed into tart; polarity unresolved/nested_negation_scope, no separate negated tűz frame.

**Raw pointers:** /rows/0/output/frames/1; /rows/0/output (entities/chains/contrasts/roles).

## A4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az összefoglaló forrása a parlament sajtóirodája, nem az összefoglaló mint entitás.

**Observed:** source null, no nominal relation; possessor roles alone do not identify attribution.

**Raw pointers:** /rows/0/output/frames/2; /rows/0/output (entities/chains/contrasts/roles).

## A5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 2028 tavasza a voksolás legkorábbi lehetséges ideje, nem megtörtént szavazás.

**Observed:** 2028 unknown/unresolved; possible preserved but spring and earliest-time role absent.

**Raw pointers:** /rows/0/output/frames/3; /rows/0/output (entities/chains/contrasts/roles).

## A6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az amíg feltétel az idézett napirendre tűzésre korlátozódik.

**Observed:** conditionality false; quoted frame unresolved and no amíg antecedent relation.

**Raw pointers:** /rows/0/output/frames/1; /rows/0/output (entities/chains/contrasts/roles).

## B1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az átadó Barta Júlia; a jegyző címzett.

**Observed:** átad actor unresolved despite PERSON entity; no recipient slot.

**Raw pointers:** /rows/1/output/frames/0; /rows/1/output (entities/chains/contrasts/roles).

## B2 — CORRECT_RESOLVED

**Gold:** Barta Júlia személy; főépítész szerep nem része a személynévnek.

**Observed:** entities contains exactly Barta Júlia as person, excludes főépítész.

**Raw pointers:** /rows/1/output/frames/0; /rows/1/output (entities/chains/contrasts/roles).

## B3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A kilencedik kerület közigazgatási azonosító, nem versenyhelyezés.

**Observed:** No kilencedik kerület numeric ordinal; ambiguous contrast suppresses branch.

**Raw pointers:** /rows/1/output/frames/1; /rows/1/output (entities/chains/contrasts/roles).

## B4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az elhelyezés tárgya ivókutak; padok elvetett alternatíva.

**Observed:** contrast unresolved; object candidates are not accepted/rejected resolved roles.

**Raw pointers:** /rows/1/output/frames/1, /rows/1/output/frames/2; /rows/1/output (entities/chains/contrasts/roles).

## B5 — CORRECT_RESOLVED

**Gold:** Az ivókutak elhelyezése feltételes, nem végrehajtott.

**Observed:** helyez conditional with a separate ha antecedent frame and trigger; no asserted execution.

**Raw pointers:** /rows/1/output/frames/1, /rows/1/output/frames/2; /rows/1/output (entities/chains/contrasts/roles).

## B6 — CORRECT_RESOLVED

**Gold:** Első ütem szakasz, nem a játszótér helyezése.

**Observed:** ordinal 1 owner ütem; not placement/person.

**Raw pointers:** /rows/1/output/frames/3; /rows/1/output (entities/chains/contrasts/roles).

## C1 — CORRECT_RESOLVED

**Gold:** A mérlegelés forrása az exportőrök szövetsége.

**Observed:** nominal relation resolves exportőrök szövetségének as source distinct from mérlegelése.

**Raw pointers:** /rows/2/output/frames/0; /rows/2/output (entities/chains/contrasts/roles).

## C2 — WRONG_RESOLVED

**Gold:** 8 milliárd euró a megrendelésérték lehetséges alsó küszöbe; nem egyenlőség.

**Observed:** 8e9 EUR resolved with equal operator; possibility survives but exceeds/lower-bound relation lost.

**Raw pointers:** /rows/2/output/frames/0; /rows/2/output (entities/chains/contrasts/roles).

## C3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 31 százalék a hajógyártók részesedése, nem növekedési mérték.

**Observed:** 31% unresolved without owner or share role.

**Raw pointers:** /rows/2/output/frames/1; /rows/2/output (entities/chains/contrasts/roles).

## C4 — WRONG_RESOLVED

**Gold:** 6 százalék relatív exportnövekedés, nem abszolút exportérték.

**Observed:** 6% resolved as unqualified equal/percentage; relative change and reference period missing from semantic scope.

**Raw pointers:** /rows/2/output/frames/2; /rows/2/output (entities/chains/contrasts/roles).

## C5 — CORRECT_RESOLVED

**Gold:** 2027 február 18 a közzététel dátuma.

**Observed:** calendar_date {2027,2,18} resolved on történik publication frame.

**Raw pointers:** /rows/2/output/frames/3; /rows/2/output (entities/chains/contrasts/roles).

## C6 — CORRECT_RESOLVED

**Gold:** 14 óra ugyanennek a közzétételnek az időpontja.

**Observed:** clock_time {14,0} resolved on same publication frame.

**Raw pointers:** /rows/2/output/frames/3; /rows/2/output (entities/chains/contrasts/roles).

## D1 — CORRECT_RESOLVED

**Gold:** Borostyán Csomagoló Központ egy szervezetnév; üzemvezetője nem a cégnév része.

**Observed:** organization entity full name excludes üzemvezetője.

**Raw pointers:** /rows/3/output/frames/0; /rows/3/output (entities/chains/contrasts/roles).

## D2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A jelzés forrása az üzemvezető, címzettjei a dolgozók.

**Observed:** jelez not recognized as reporting; source and recipient null.

**Raw pointers:** /rows/3/output/frames/0, /rows/3/output/frames/1; /rows/3/output (entities/chains/contrasts/roles).

## D3 — CORRECT_UNRESOLVED

**Gold:** A műszak megszüntetésének végrehajtója implicit, nem oldható fel név szerint.

**Observed:** megszüntet actor null, no positive person recovery.

**Raw pointers:** /rows/3/output/frames/1; /rows/3/output (entities/chains/contrasts/roles).

## D4 — CORRECT_UNRESOLVED

**Gold:** A feljegyzés szerzője nincs megadva; nem maga a feljegyzés a személyforrás.

**Observed:** bare feljegyzés source null with source_bearing_possessor_unproven.

**Raw pointers:** /rows/3/output/frames/2; /rows/3/output (entities/chains/contrasts/roles).

## D5 — CORRECT_RESOLVED

**Gold:** 73 érintett munkakör, nem 73 végrehajtott elbocsátás.

**Observed:** 73 count owner munkakör on érint frame, not performed layoffs.

**Raw pointers:** /rows/3/output/frames/2; /rows/3/output (entities/chains/contrasts/roles).

## D6 — CORRECT_RESOLVED

**Gold:** A tulajdonosi jóváhagyás tagadott, nem a 73 munkakör létezése.

**Observed:** hagy polarity denied; 73-count frame asserted separately.

**Raw pointers:** /rows/3/output/frames/3; /rows/3/output (entities/chains/contrasts/roles).

## E1 — CORRECT_RESOLVED

**Gold:** A fogyasztási adat forrása a hálózatirányító, nem a tájékoztatás.

**Observed:** source hálózatirányító resolved with separate tájékoztatása nominal relation.

**Raw pointers:** /rows/4/output/frames/0; /rows/4/output (entities/chains/contrasts/roles).

## E2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 16 köbméter óránként fogyasztási ráta, generátorokhoz kötve.

**Observed:** compound köbméter/hour preserved but attachment unresolved; no generator owner.

**Raw pointers:** /rows/4/output/frames/0; /rows/4/output (entities/chains/contrasts/roles).

## E3 — CORRECT_RESOLVED

**Gold:** 11 óra felső időtartamkorlát és lehetőség, nem tényleges üzemidő.

**Observed:** duration 11 hour resolved, less_or_equal and possible; no unconditional equality.

**Raw pointers:** /rows/4/output/frames/1; /rows/4/output (entities/chains/contrasts/roles).

## E4 — WRONG_RESOLVED

**Gold:** A tárolós ellátás feltétele szélcsend; nem vonatkozik a próbára.

**Observed:** Resolved 11-hour argument has conditionality false; Szélcsend esetén is not retained as a condition. E3 and E4 test separate but correlated qualifiers.

**Raw pointers:** /rows/4/output/frames/1; /rows/4/output (entities/chains/contrasts/roles).

## E5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A feszültség 228 V elfogadott, 230 V elvetett; mérés pozitív.

**Observed:** volt homograph/contrast unresolved, neither alternative resolved.

**Raw pointers:** /rows/4/output/frames/2, /rows/4/output/frames/3; /rows/4/output (entities/chains/contrasts/roles).

## E6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A fogyasztók a generátorok; nem a hálózatirányító.

**Observed:** fogyaszt actor null; generators not recovered.

**Raw pointers:** /rows/4/output/frames/0; /rows/4/output (entities/chains/contrasts/roles).

## F1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az idézett állítás eredeti forrása kikötőmester, közvetítője a révüzem szóvivője.

**Observed:** Quote source identifies intermediary révüzem szóvivője only; kikötőmester original-message layer missing.

**Raw pointers:** /rows/5/output/frames/0; /rows/5/output (entities/chains/contrasts/roles).

## F2 — CORRECT_RESOLVED

**Gold:** Az indulás tagadott, a szóvivő írása nem tagadott.

**Observed:** indul denied; no negation on reporting verb ír.

**Raw pointers:** /rows/5/output/frames/0; /rows/5/output (entities/chains/contrasts/roles).

## F3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 85 kerékpár befogadóképesség; nem aznap szállított darabszám.

**Observed:** 85 unresolved, no capacity role; no positive actual count promoted.

**Raw pointers:** /rows/5/output/frames/1; /rows/5/output (entities/chains/contrasts/roles).

## F4 — CORRECT_RESOLVED

**Gold:** 19 bicikli a mai tényleges szállítmány.

**Observed:** 19 count owner biciklit resolved on ma/szállít frame.

**Raw pointers:** /rows/5/output/frames/2; /rows/5/output (entities/chains/contrasts/roles).

## F5 — CORRECT_RESOLVED

**Gold:** Október 22 06:40 a beszállás kezdete; év ismeretlen.

**Observed:** Oct 22 year null and 06:40 resolved on megkezd/beszállás.

**Raw pointers:** /rows/5/output/frames/3; /rows/5/output (entities/chains/contrasts/roles).

## F6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az indulási tilalom a köd feloszlásáig tart.

**Observed:** Quoted text retained but no temporal boundary for fog clearing.

**Raw pointers:** /rows/5/output/frames/0; /rows/5/output (entities/chains/contrasts/roles).

## G1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A csomagátvevők helyszínelők, a bérlő az átadó.

**Observed:** átvesz actor null; helyszínelők not bound.

**Raw pointers:** /rows/6/output/frames/0; /rows/6/output (entities/chains/contrasts/roles).

## G2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 14 átvett csomag; nem a teljes készlet.

**Observed:** 14 isolated unknown/unresolved; intervening lezárt blocks unit attachment.

**Raw pointers:** /rows/6/output/frames/0; /rows/6/output (entities/chains/contrasts/roles).

## G3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A tagadó idézet forrása Fekete Dóra, nem a kereskedő.

**Observed:** pontosít no reporting source/quote chain, Fekete Dóra entity alone insufficient.

**Raw pointers:** /rows/6/output/frames/1, /rows/6/output/frames/2; /rows/6/output (entities/chains/contrasts/roles).

## G4 — CORRECT_RESOLVED

**Gold:** Fekete Dóra személynév; rendőr őrnagy külön cím.

**Observed:** Fekete Dóra one person span without title.

**Raw pointers:** /rows/6/output/frames/2; /rows/6/output (entities/chains/contrasts/roles).

## G5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A kihallgatás tárgya alkalmazott; tulajdonos elvetett, nem tagadott a kihallgatás.

**Observed:** object contrast unresolved; no accepted employee or rejected owner representation.

**Raw pointers:** /rows/6/output/frames/3; /rows/6/output (entities/chains/contrasts/roles).

## G6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A cáfolat forrása ügyészség; nem a cáfolat névszói fej.

**Observed:** No source or reporting nominal relation for cáfolata.

**Raw pointers:** /rows/6/output/frames/3; /rows/6/output (entities/chains/contrasts/roles).

## H1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az ajtónyitók a buszvezető segítői, nem a buszvezető.

**Observed:** kinyit actor null; neither helpers nor possessor falsely promoted.

**Raw pointers:** /rows/7/output/frames/0; /rows/7/output (entities/chains/contrasts/roles).

## H2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A sérülésadat forrása mentésirányítás.

**Observed:** közlése relation exists but possessor unproven; source null.

**Raw pointers:** /rows/7/output/frames/1; /rows/7/output (entities/chains/contrasts/roles).

## H3 — CORRECT_RESOLVED

**Gold:** Legalább 5 sérült alsó korlát, nem pontos öt.

**Observed:** 5 utas resolved with greater_or_equal and unconditionalEqualityAllowed false.

**Raw pointers:** /rows/7/output/frames/1; /rows/7/output (entities/chains/contrasts/roles).

## H4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 40 perc a forgalomleállítás időtartama.

**Observed:** 40 minute duration typed but attachment unresolved.

**Raw pointers:** /rows/7/output/frames/3; /rows/7/output (entities/chains/contrasts/roles).

## H5 — CORRECT_UNRESOLVED

**Gold:** A forgalmat leállító szereplő nincs kimondva.

**Observed:** leállít actor null.

**Raw pointers:** /rows/7/output/frames/3; /rows/7/output (entities/chains/contrasts/roles).

## H6 — CORRECT_RESOLVED

**Gold:** A helikopterkérés tagadott; a forgalomleállítás pozitív.

**Observed:** kér helikoptert denied; leállít polarity asserted.

**Raw pointers:** /rows/7/output/frames/3, /rows/7/output/frames/4; /rows/7/output (entities/chains/contrasts/roles).

## I1 — CORRECT_RESOLVED

**Gold:** Második forduló versenyszakasz, nem Lilla helyezése.

**Observed:** 2 ordinal owner fordulójából, not Sipos Lilla placement.

**Raw pointers:** /rows/8/output/frames/0; /rows/8/output (entities/chains/contrasts/roles).

## I2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Sipos Lilla harmadik befutó.

**Observed:** harmadikként not extracted, relative actor unresolved.

**Raw pointers:** /rows/8/output/frames/1; /rows/8/output (entities/chains/contrasts/roles).

## I3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Negyedik hely a váltó helyezése, nem ismert egyéni versenyzőé.

**Observed:** 4 placement recognized but rank_owner_unproven.

**Raw pointers:** /rows/8/output/frames/2; /rows/8/output (entities/chains/contrasts/roles).

## I4 — CORRECT_UNRESOLVED

**Gold:** A Második lett idézet alanya nem azonosítható biztosan.

**Observed:** Második ordinal unresolved, no inferred ranked person.

**Raw pointers:** /rows/8/output/frames/4; /rows/8/output (entities/chains/contrasts/roles).

## I5 — CORRECT_RESOLVED

**Gold:** A döntőbe jutó Sipos Lilla.

**Observed:** Sipos Lilla resolved actor of jut.

**Raw pointers:** /rows/8/output/frames/0; /rows/8/output (entities/chains/contrasts/roles).

## I6 — CORRECT_RESOLVED

**Gold:** A záró idézet forrása csapatvezető.

**Observed:** csapatvezető quote source in recovered chain.

**Raw pointers:** /rows/8/output/frames/4; /rows/8/output (entities/chains/contrasts/roles).

## J1 — CORRECT_RESOLVED

**Gold:** Szabad Adathálózat Egyesület egy szervezet, kutatója külön szerep.

**Observed:** Full organization entity; kutatója not included in entity name.

**Raw pointers:** /rows/9/output/frames/0; /rows/9/output (entities/chains/contrasts/roles).

## J2 — CORRECT_RESOLVED

**Gold:** A bemutató a kutató, nem a felügyelet.

**Observed:** actorStatus resolved kutatója; felügyelet not actor. Frame-wide unresolved flag does not erase actor slot.

**Raw pointers:** /rows/9/output/frames/0; /rows/9/output (entities/chains/contrasts/roles).

## J3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A jegyzőkönyv forrása labor, nem jegyzőkönyve.

**Observed:** jegyzőkönyve source null; no labor attribution.

**Raw pointers:** /rows/9/output/frames/1; /rows/9/output (entities/chains/contrasts/roles).

## J4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 1,8 gigabit másodpercenként kapcsolati ráta, nem egyszerű adatmennyiség.

**Observed:** compound gigabit/second preserved but binding unresolved.

**Raw pointers:** /rows/9/output/frames/1; /rows/9/output (entities/chains/contrasts/roles).

## J5 — WRONG_RESOLVED

**Gold:** 12–18 milliszekundum a késleltetés tartománya, nem két egyenlőségi mérés.

**Observed:** 12 resolved count, equal, unconditionalEqualityAllowed true from 12 és 18 milliszekundum; 18 separate unknown. Range and measurement dimension lost.

**Raw pointers:** /rows/9/output/frames/2; /rows/9/output (entities/chains/contrasts/roles).

## J6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Az azonosság tagadott; a sebességérték nincs tagadva.

**Observed:** No azonos proposition; polarity unresolved because predicate absent.

**Raw pointers:** /rows/9/output/frames/1; /rows/9/output (entities/chains/contrasts/roles).

## K1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A felvételi előrejelzés forrása járványügyi központ.

**Observed:** Nominal source központ attached to condition frame only; numeric admission proposition source null. Abbreviated source head alone is not counted as wrong identity.

**Raw pointers:** /rows/10/output/frames/0, /rows/10/output/frames/1; /rows/10/output (entities/chains/contrasts/roles).

## K2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 46 beteg naponta feltételes lehetséges felvétel, nem megtörtént összes felvétel.

**Observed:** per-day compound candidate retains possibility and condition, but attachment unresolved.

**Raw pointers:** /rows/10/output/frames/1; /rows/10/output (entities/chains/contrasts/roles).

## K3 — CORRECT_RESOLVED

**Gold:** A felvétel függ a fertőzésszám növekedésétől.

**Observed:** conditionAntecedent and conditionality link increased infections to admission clause.

**Raw pointers:** /rows/10/output/frames/0, /rows/10/output/frames/1; /rows/10/output (entities/chains/contrasts/roles).

## K4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A bezárás visszautasított állítás; nem tényleges pozitív bezárás.

**Observed:** Counterfactual volna retained, but no explicit rejected-report link from visszautasít to bezár. No fully resolved positive closure claim.

**Raw pointers:** /rows/10/output/frames/2, /rows/10/output/frames/3; /rows/10/output (entities/chains/contrasts/roles).

## K5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A vizsgálógépet kórház kapta meg.

**Observed:** megkap actor null.

**Raw pointers:** /rows/10/output/frames/4; /rows/10/output (entities/chains/contrasts/roles).

## K6 — CORRECT_RESOLVED

**Gold:** A keddi gépátvétel nem örökli az első mondat feltételességét.

**Observed:** Independent receipt clause asserted/conditionality false, no leaked antecedent.

**Raw pointers:** /rows/10/output/frames/4; /rows/10/output (entities/chains/contrasts/roles).

## L1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A kérés forrása tankerület, a levél felolvasója igazgatóhelyettes.

**Observed:** No attribution source/chain for tankerület request; original gold wording ambiguity noted separately.

**Raw pointers:** /rows/11/output/frames/0, /rows/11/output/frames/1; /rows/11/output (entities/chains/contrasts/roles).

## L2 — CORRECT_RESOLVED

**Gold:** Péntek jelentkezési határidő, nem a kérés dátuma.

**Observed:** péntekig calendar boundary resolved on lead/jelentkezés.

**Raw pointers:** /rows/11/output/frames/1; /rows/11/output (entities/chains/contrasts/roles).

## L3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Ösztöndíj elfogadott 75 ezer forint/hó, elvetett 60 ezer; nem negatív ösztöndíj.

**Observed:** Contrast unresolved; rejected 60 and accepted 75000 not established.

**Raw pointers:** /rows/11/output/frames/2, /rows/11/output/frames/3; /rows/11/output (entities/chains/contrasts/roles).

## L4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 75 ezer forint havonta ismétlődő összeg, nem egyszeri teljes támogatás.

**Observed:** HUF/month compound preserved only as unresolved candidate.

**Raw pointers:** /rows/11/output/frames/3; /rows/11/output (entities/chains/contrasts/roles).

## L5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A járandóság a jogosultság fennállásához kötött.

**Observed:** No eligibility boundary/condition, frame unresolved.

**Raw pointers:** /rows/11/output/frames/4; /rows/11/output (entities/chains/contrasts/roles).

## L6 — CORRECT_RESOLVED

**Gold:** Harmadik nap tanfolyami időbeli sorszám, nem helyezés.

**Observed:** 3 ordinal owner napján, not rank.

**Raw pointers:** /rows/11/output/frames/5; /rows/11/output (entities/chains/contrasts/roles).

## M1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A hajnali mérés forrása magashegyi állomás; mérései nem entitásforrás.

**Observed:** mérései relation exists but source_bearing_possessor_unproven.

**Raw pointers:** /rows/12/output/frames/0; /rows/12/output (entities/chains/contrasts/roles).

## M2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Mínusz 7 Celsius-fok a levegő hőmérséklete.

**Observed:** 7 unknown/unresolved; lexical minus and Celsius not bound, no positive 7-degree measurement.

**Raw pointers:** /rows/12/output/frames/0; /rows/12/output (entities/chains/contrasts/roles).

## M3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 2–4 fok várható negatív referenciaeltérés, nem abszolút maximumhőmérséklet.

**Observed:** 2–4 range unresolved with no dimension/reference; safe abstention, not a resolved absolute temperature.

**Raw pointers:** /rows/12/output/frames/1; /rows/12/output (entities/chains/contrasts/roles).

## M4 — CORRECT_RESOLVED

**Gold:** A délutáni referenciaeltérés előrejelzés; nem megfigyelt érték.

**Observed:** Frame modalities expected; no resolved observed maximum.

**Raw pointers:** /rows/12/output/frames/1; /rows/12/output (entities/chains/contrasts/roles).

## M5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Várt jelenség ónos eső, havazás elvetett; a várakozás pozitív.

**Observed:** Object contrast unresolved; no accepted ónos eső versus rejected havazás.

**Raw pointers:** /rows/12/output/frames/3; /rows/12/output (entities/chains/contrasts/roles).

## M6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A várakozás közlője meteorológus.

**Observed:** hangsúlyoz no source/chain.

**Raw pointers:** /rows/12/output/frames/2, /rows/12/output/frames/3; /rows/12/output (entities/chains/contrasts/roles).

## N1 — CORRECT_UNRESOLVED

**Gold:** Az elemzést végző személy nem explicit; a laboratórium hely, a kutatócsoport megbízó.

**Observed:** elemez actor null; laboratory location and commissioning group not promoted.

**Raw pointers:** /rows/13/output/frames/0; /rows/13/output (entities/chains/contrasts/roles).

## N2 — CORRECT_UNRESOLVED

**Gold:** A mérési jelentés szerzője nincs megnevezve.

**Observed:** source null and nominal relation source_bearing_possessor_unproven.

**Raw pointers:** /rows/13/output/frames/1; /rows/13/output (entities/chains/contrasts/roles).

## N3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 0,7 gramm közelítő kristálytömeg.

**Observed:** 0.7 approximately recognized but unresolved count, no mass measurement binding.

**Raw pointers:** /rows/13/output/frames/1; /rows/13/output (entities/chains/contrasts/roles).

## N4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 9 milliméter a kristály átmérője, nem tömege.

**Observed:** 9 unresolved count; diameter measurement not resolved.

**Raw pointers:** /rows/13/output/frames/2; /rows/13/output (entities/chains/contrasts/roles).

## N5 — CORRECT_RESOLVED

**Gold:** Az elmélet bizonyítása nem pozitívan állított tény: állítja tagadott.

**Observed:** Explicit negated_reporting_predicate/content_under_negated_report block; polarity unresolved rather than positive proof. This safety decision is satisfied by explicit blocking evidence.

**Raw pointers:** /rows/13/output/frames/3; /rows/13/output (entities/chains/contrasts/roles).

## N6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A csoport vezetője emberi szerep, nem a csoport szervezet neve.

**Observed:** No leader entity/local role/source, only theory object.

**Raw pointers:** /rows/13/output/frames/3; /rows/13/output (entities/chains/contrasts/roles).

## O1 — WRONG_RESOLVED

**Gold:** Az ár forrása üzletlánc árjegyzéken keresztül; nem az árjegyzék mint beszélő.

**Observed:** sourceEvidence resolutionStatus resolved promotes árjegyzéke itself to source instead of üzletlánc possessor.

**Raw pointers:** /rows/14/output/frames/0; /rows/14/output (entities/chains/contrasts/roles).

## O2 — WRONG_RESOLVED

**Gold:** 412 forint/kg liszt egységár.

**Observed:** 412 HUF resolved equal money, kg denominator lost; raw kilónként never reaches compound representation.

**Raw pointers:** /rows/14/output/frames/0; /rows/14/output (entities/chains/contrasts/roles).

## O3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 18 százalék kedvezmény elfogadott, 15 elvetett, feltételes lehetőség megmarad.

**Observed:** Percent contrast unresolved; rejected value not positively resolved.

**Raw pointers:** /rows/14/output/frames/1, /rows/14/output/frames/2; /rows/14/output (entities/chains/contrasts/roles).

## O4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Kedvezmény csak csomagolást visszahozóknak lehetséges.

**Observed:** Possible retained but eligibility relative clause not represented as condition. No resolved numeric claim.

**Raw pointers:** /rows/14/output/frames/2, /rows/14/output/frames/3; /rows/14/output (entities/chains/contrasts/roles).

## O5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 3900 forint a kosárár alsó korlátja, nem pontos ára.

**Observed:** 3900 unresolved; negative comparison lower bound not structured.

**Raw pointers:** /rows/14/output/frames/4; /rows/14/output (entities/chains/contrasts/roles).

## O6 — CORRECT_UNRESOLVED

**Gold:** A kedvezményt adó nyelvtani alany implicit; személyt nem lehet megnevezni.

**Observed:** adhat actor null, no person invented.

**Raw pointers:** /rows/14/output/frames/2; /rows/14/output (entities/chains/contrasts/roles).

## P1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Külső közlő szakszervezeti elnök, hivatkozott ígéret forrása munkáltató.

**Observed:** Actor elnök recovered but source/chain absent; employer promise not composed.

**Raw pointers:** /rows/15/output/frames/0, /rows/15/output/frames/1; /rows/15/output (entities/chains/contrasts/roles).

## P2 — CORRECT_RESOLVED

**Gold:** Fizetés nélkül maradás tagadott; fizetés elmaradás nem pozitív tény.

**Observed:** marad fizetés nélkül polarity denied, no positive no-pay claim.

**Raw pointers:** /rows/15/output/frames/1; /rows/15/output (entities/chains/contrasts/roles).

## P3 — CORRECT_RESOLVED

**Gold:** Megszűnés éve 2031, elvetett 2029; megszűnés eseménye nem tagadott.

**Observed:** Date/time contrast resolved: 2029 rejected, 2031 accepted; event polarity asserted.

**Raw pointers:** /rows/15/output/frames/2; /rows/15/output (entities/chains/contrasts/roles).

## P4 — CORRECT_RESOLVED

**Gold:** 2031 a hatály megszűnésének ideje.

**Observed:** 2031 year accepted on megszűnik frame.

**Raw pointers:** /rows/15/output/frames/2; /rows/15/output (entities/chains/contrasts/roles).

## P5 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Legalább 24 óra képzés belépőnként alsó korlátú kötelezettség, nem megtartott képzés.

**Observed:** 24 duration unresolved; minimum and required retained but per-entrant denominator absent.

**Raw pointers:** /rows/15/output/frames/3; /rows/15/output (entities/chains/contrasts/roles).

## P6 — CORRECT_RESOLVED

**Gold:** Kell szervezni kötelezettség, nem megtörtént szervezés.

**Observed:** Required modality and governing-modal evidence on kell/szervezni.

**Raw pointers:** /rows/15/output/frames/3; /rows/15/output (entities/chains/contrasts/roles).

## Q1 — CORRECT_UNRESOLVED

**Gold:** A leemelés két koordinált aktora közül egyetlen kizárólagos aktor nem választható.

**Observed:** Coordinated actor candidates not collapsed to single resolved actor.

**Raw pointers:** /rows/16/output/frames/0; /rows/16/output (entities/chains/contrasts/roles).

## Q2 — CORRECT_UNRESOLVED

**Gold:** Az elszállítás implicit alanya nem egyetlen biztos név.

**Observed:** Implicit transport actor null.

**Raw pointers:** /rows/16/output/frames/1; /rows/16/output (entities/chains/contrasts/roles).

## Q3 — CORRECT_RESOLVED

**Gold:** Az idézet forrása rendező, látogatók címzettek.

**Observed:** kiállítás rendezője source, látogatóknak recipient, bounded quote chain.

**Raw pointers:** /rows/16/output/frames/2; /rows/16/output (entities/chains/contrasts/roles).

## Q4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Keretválasztó gyűjtő, én elvetett; nem az egész választás tagadott.

**Observed:** Pronoun actor contrast unresolved; no accepted gyűjtő or rejected én binding.

**Raw pointers:** /rows/16/output/frames/2; /rows/16/output (entities/chains/contrasts/roles).

## Q5 — CORRECT_RESOLVED

**Gold:** Harmadik terem helyazonosító, nem személy helyezése.

**Observed:** 3 ordinal targets terem, not person rank.

**Raw pointers:** /rows/16/output/frames/3; /rows/16/output (entities/chains/contrasts/roles).

## Q6 — CORRECT_UNRESOLVED

**Gold:** A Második feliratból rang és rangsorolt alany nem állapítható meg.

**Observed:** Standalone Második ordinal unresolved, no ranked entity.

**Raw pointers:** /rows/16/output/frames/4; /rows/16/output (entities/chains/contrasts/roles).

## R1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Kötelező intézmény törvényszék.

**Observed:** kötelez actor null despite explicit institution.

**Raw pointers:** /rows/17/output/frames/0; /rows/17/output (entities/chains/contrasts/roles).

## R2 — CORRECT_RESOLVED

**Gold:** Kötelezett szakértő elfogadott, vádlott elvetett.

**Observed:** Object contrast resolved szakértő accepted/vádlott rejected, asserted event.

**Raw pointers:** /rows/17/output/frames/0; /rows/17/output (entities/chains/contrasts/roles).

## R3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A beszámoló forrása jogi képviselő; Szalai Emese címzett.

**Observed:** beszámol source/recipient absent; original gold recipient ambiguity separately noted.

**Raw pointers:** /rows/17/output/frames/1; /rows/17/output (entities/chains/contrasts/roles).

## R4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Szalai Emesének inflektált személynév teljes span, nem beszámolóforrás.

**Observed:** No PER entity, mixed_case_name_boundary; full inflected name not recovered.

**Raw pointers:** /rows/17/output/frames/1; /rows/17/output (entities/chains/contrasts/roles).

## R5 — CORRECT_RESOLVED

**Gold:** Idézés tagadott, beszámoló nem tagadott.

**Observed:** beszámol asserted, idéz denied in separate clause.

**Raw pointers:** /rows/17/output/frames/1, /rows/17/output/frames/2; /rows/17/output (entities/chains/contrasts/roles).

## R6 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Szeptember 8–17 a pótlási lehetőség intervalluma, év ismeretlen.

**Observed:** Sep17 end boundary resolved, Sep8 start omitted; interval not complete.

**Raw pointers:** /rows/17/output/frames/3; /rows/17/output (entities/chains/contrasts/roles).

## S1 — CORRECT_RESOLVED

**Gold:** Becslés forrása gazdaság agronómusa, nem becslése névszói fej.

**Observed:** Nested possessive source gazdaság agronómusának recovered, becslése separated.

**Raw pointers:** /rows/18/output/frames/0; /rows/18/output (entities/chains/contrasts/roles).

## S2 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 4,6 tonna/hektár becsült feltételes hozam, nem betakarított összmennyiség.

**Observed:** tonna/hektár compound plus possible/conditional retained but attachment unresolved.

**Raw pointers:** /rows/18/output/frames/0; /rows/18/output (entities/chains/contrasts/roles).

## S3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Tervezett betakarítás július; június elvetett korábbi idő.

**Observed:** No June/July temporal arguments or replacement relation.

**Raw pointers:** /rows/18/output/frames/2; /rows/18/output (entities/chains/contrasts/roles).

## S4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** 8 gép elfogadott, 6 elvetett, feltételes munkavégzés.

**Observed:** Numeric correction unresolved; conditional morphology retained but no accepted8/rejected6.

**Raw pointers:** /rows/18/output/frames/3, /rows/18/output/frames/4; /rows/18/output (entities/chains/contrasts/roles).

## S5 — CORRECT_RESOLVED

**Gold:** Hozam feltétele eső kitartása, lehetőség nem tény.

**Observed:** possible+conditional, amennyiben antecedent retained.

**Raw pointers:** /rows/18/output/frames/0, /rows/18/output/frames/1; /rows/18/output (entities/chains/contrasts/roles).

## S6 — CORRECT_RESOLVED

**Gold:** Második kör vizsgálati szakasz, nem rang.

**Observed:** 2 ordinal owner körben, not placement.

**Raw pointers:** /rows/18/output/frames/5; /rows/18/output (entities/chains/contrasts/roles).

## T1 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A várakozók tárgyalók, nem Brüsszel.

**Observed:** vár actor unresolved despite explicit tárgyalók.

**Raw pointers:** /rows/19/output/frames/0; /rows/19/output (entities/chains/contrasts/roles).

## T2 — CORRECT_UNRESOLVED

**Gold:** Brüsszel intézményi referense nem egyértelmű, konkrét szervezet nem nevezhető meg.

**Observed:** Brüsszel LOC entity only, no invented specific institution.

**Raw pointers:** /rows/19/output/frames/0, /rows/19/output/frames/2; /rows/19/output (entities/chains/contrasts/roles).

## T3 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** Álláspont forrása küldöttség, tanács elvetett; közvetítő szóvivő.

**Observed:** Source contrast unresolved, no accepted küldöttség attribution.

**Raw pointers:** /rows/19/output/frames/3; /rows/19/output (entities/chains/contrasts/roles).

## T4 — MISSED_DEFENSIBLE_RESOLUTION

**Gold:** A tanács és küldöttség forrásalternatívák; ismertetés nincs tagadva.

**Observed:** asserted ismertet survives but alternatives not semantically bound.

**Raw pointers:** /rows/19/output/frames/3; /rows/19/output (entities/chains/contrasts/roles).

## T5 — CORRECT_UNRESOLVED

**Gold:** 2 és később nem bizonyítottan azonos slot alternatívái; unresolved.

**Observed:** ambiguous_contrast_scope with rejected/accepted null.

**Raw pointers:** /rows/19/output/frames/5; /rows/19/output (entities/chains/contrasts/roles).

## T6 — CORRECT_UNRESOLVED

**Gold:** A 2 tulajdonsága és mértékegysége hiányzik, pozitív támogatási összeg nem oldható fel.

**Observed:** 2 unknown unresolved, no positive support amount.

**Raw pointers:** /rows/19/output/frames/5; /rows/19/output (entities/chains/contrasts/roles).
