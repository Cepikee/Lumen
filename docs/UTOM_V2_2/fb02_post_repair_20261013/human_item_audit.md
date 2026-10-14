# FB02 same frozen 120 decisions

Assistant adjudication, not independent human review. Original gold untouched. O1 alone changes label; all 63 misses retained. Non-O source identities/chains and all numeric/actor/scope outputs deep-equal. C/D/E/H/K/M/N/S changes add relation evidence/target metadata; J gains an unresolved artifact relation, no source identity. No correctness credit for unresolved J3. No new source asserted except O1.

## A1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A halasztás indokolója Takács Réka, nem a frakciók.

POST: actorStatus resolved, actor Takács Réka, action indokol.

References: /rows/0/output/frames/0

## A2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az idézet forrása Takács Réka; a frakciók címzettek.

POST: No attribution chain or source; the named actor does not establish the quote/source/recipient relationship.

References: /rows/0/output/frames/0, /rows/0/output/frames/1

## A3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A napirendre tűzés tagadott; az indokolás nem tagadott.

POST: Multiple predicates collapsed into tart; polarity unresolved/nested_negation_scope, no separate negated tűz frame.

References: /rows/0/output/frames/1

## A4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az összefoglaló forrása a parlament sajtóirodája, nem az összefoglaló mint entitás.

POST: source null, no nominal relation; possessor roles alone do not identify attribution.

References: /rows/0/output/frames/2

## A5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 2028 tavasza a voksolás legkorábbi lehetséges ideje, nem megtörtént szavazás.

POST: 2028 unknown/unresolved; possible preserved but spring and earliest-time role absent.

References: /rows/0/output/frames/3

## A6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az amíg feltétel az idézett napirendre tűzésre korlátozódik.

POST: conditionality false; quoted frame unresolved and no amíg antecedent relation.

References: /rows/0/output/frames/1

## B1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az átadó Barta Júlia; a jegyző címzett.

POST: átad actor unresolved despite PERSON entity; no recipient slot.

References: /rows/1/output/frames/0

## B2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Barta Júlia személy; főépítész szerep nem része a személynévnek.

POST: entities contains exactly Barta Júlia as person, excludes főépítész.

References: /rows/1/output/frames/0

## B3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A kilencedik kerület közigazgatási azonosító, nem versenyhelyezés.

POST: No kilencedik kerület numeric ordinal; ambiguous contrast suppresses branch.

References: /rows/1/output/frames/1

## B4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az elhelyezés tárgya ivókutak; padok elvetett alternatíva.

POST: contrast unresolved; object candidates are not accepted/rejected resolved roles.

References: /rows/1/output/frames/1, /rows/1/output/frames/2

## B5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Az ivókutak elhelyezése feltételes, nem végrehajtott.

POST: helyez conditional with a separate ha antecedent frame and trigger; no asserted execution.

References: /rows/1/output/frames/1, /rows/1/output/frames/2

## B6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Első ütem szakasz, nem a játszótér helyezése.

POST: ordinal 1 owner ütem; not placement/person.

References: /rows/1/output/frames/3

## C1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A mérlegelés forrása az exportőrök szövetsége.

POST: nominal relation resolves exportőrök szövetségének as source distinct from mérlegelése.

References: /rows/2/output/frames/0

## C2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 8 milliárd euró a megrendelésérték lehetséges alsó küszöbe; nem egyenlőség.

POST: greater_than from the connected governing predicate; possible retained, EUR value unchanged; unconditional equality forbidden.

References: /rows/2/output/frames/0

## C3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 31 százalék a hajógyártók részesedése, nem növekedési mérték.

POST: 31% unresolved without owner or share role.

References: /rows/2/output/frames/1

## C4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 6 százalék relatív exportnövekedés, nem abszolút exportérték.

POST: Instrumental percentage attached to bővül now carries change_magnitude/increase; not resulting level or equality.

References: /rows/2/output/frames/2

## C5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 2027 február 18 a közzététel dátuma.

POST: calendar_date {2027,2,18} resolved on történik publication frame.

References: /rows/2/output/frames/3

## C6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 14 óra ugyanennek a közzétételnek az időpontja.

POST: clock_time {14,0} resolved on same publication frame.

References: /rows/2/output/frames/3

## D1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Borostyán Csomagoló Központ egy szervezetnév; üzemvezetője nem a cégnév része.

POST: organization entity full name excludes üzemvezetője.

References: /rows/3/output/frames/0

## D2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A jelzés forrása az üzemvezető, címzettjei a dolgozók.

POST: jelez not recognized as reporting; source and recipient null.

References: /rows/3/output/frames/0, /rows/3/output/frames/1

## D3: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A műszak megszüntetésének végrehajtója implicit, nem oldható fel név szerint.

POST: megszüntet actor null, no positive person recovery.

References: /rows/3/output/frames/1

## D4: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A feljegyzés szerzője nincs megadva; nem maga a feljegyzés a személyforrás.

POST: bare feljegyzés source null with source_bearing_possessor_unproven.

References: /rows/3/output/frames/2

## D5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 73 érintett munkakör, nem 73 végrehajtott elbocsátás.

POST: 73 count owner munkakör on érint frame, not performed layoffs.

References: /rows/3/output/frames/2

## D6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A tulajdonosi jóváhagyás tagadott, nem a 73 munkakör létezése.

POST: hagy polarity denied; 73-count frame asserted separately.

References: /rows/3/output/frames/3

## E1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A fogyasztási adat forrása a hálózatirányító, nem a tájékoztatás.

POST: source hálózatirányító resolved with separate tájékoztatása nominal relation.

References: /rows/4/output/frames/0

## E2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 16 köbméter óránként fogyasztási ráta, generátorokhoz kötve.

POST: compound köbméter/hour preserved but attachment unresolved; no generator owner.

References: /rows/4/output/frames/0

## E3: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 11 óra felső időtartamkorlát és lehetőség, nem tényleges üzemidő.

POST: duration 11 hour resolved, less_or_equal and possible; no unconditional equality.

References: /rows/4/output/frames/1

## E4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A tárolós ellátás feltétele szélcsend; nem vonatkozik a próbára.

POST: Szélcsend esetén retained as exact nominal-condition evidence; possible plus less_or_equal retained on same 11-hour argument.

References: /rows/4/output/frames/1

## E5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A feszültség 228 V elfogadott, 230 V elvetett; mérés pozitív.

POST: volt homograph/contrast unresolved, neither alternative resolved.

References: /rows/4/output/frames/2, /rows/4/output/frames/3

## E6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A fogyasztók a generátorok; nem a hálózatirányító.

POST: fogyaszt actor null; generators not recovered.

References: /rows/4/output/frames/0

## F1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az idézett állítás eredeti forrása kikötőmester, közvetítője a révüzem szóvivője.

POST: Quote source identifies intermediary révüzem szóvivője only; kikötőmester original-message layer missing.

References: /rows/5/output/frames/0

## F2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Az indulás tagadott, a szóvivő írása nem tagadott.

POST: indul denied; no negation on reporting verb ír.

References: /rows/5/output/frames/0

## F3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 85 kerékpár befogadóképesség; nem aznap szállított darabszám.

POST: 85 unresolved, no capacity role; no positive actual count promoted.

References: /rows/5/output/frames/1

## F4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 19 bicikli a mai tényleges szállítmány.

POST: 19 count owner biciklit resolved on ma/szállít frame.

References: /rows/5/output/frames/2

## F5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Október 22 06:40 a beszállás kezdete; év ismeretlen.

POST: Oct 22 year null and 06:40 resolved on megkezd/beszállás.

References: /rows/5/output/frames/3

## F6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az indulási tilalom a köd feloszlásáig tart.

POST: Quoted text retained but no temporal boundary for fog clearing.

References: /rows/5/output/frames/0

## G1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A csomagátvevők helyszínelők, a bérlő az átadó.

POST: átvesz actor null; helyszínelők not bound.

References: /rows/6/output/frames/0

## G2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 14 átvett csomag; nem a teljes készlet.

POST: 14 isolated unknown/unresolved; intervening lezárt blocks unit attachment.

References: /rows/6/output/frames/0

## G3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A tagadó idézet forrása Fekete Dóra, nem a kereskedő.

POST: pontosít no reporting source/quote chain, Fekete Dóra entity alone insufficient.

References: /rows/6/output/frames/1, /rows/6/output/frames/2

## G4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Fekete Dóra személynév; rendőr őrnagy külön cím.

POST: Fekete Dóra one person span without title.

References: /rows/6/output/frames/2

## G5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A kihallgatás tárgya alkalmazott; tulajdonos elvetett, nem tagadott a kihallgatás.

POST: object contrast unresolved; no accepted employee or rejected owner representation.

References: /rows/6/output/frames/3

## G6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A cáfolat forrása ügyészség; nem a cáfolat névszói fej.

POST: No source or reporting nominal relation for cáfolata.

References: /rows/6/output/frames/3

## H1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az ajtónyitók a buszvezető segítői, nem a buszvezető.

POST: kinyit actor null; neither helpers nor possessor falsely promoted.

References: /rows/7/output/frames/0

## H2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A sérülésadat forrása mentésirányítás.

POST: közlése relation exists but possessor unproven; source null.

References: /rows/7/output/frames/1

## H3: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Legalább 5 sérült alsó korlát, nem pontos öt.

POST: 5 utas resolved with greater_or_equal and unconditionalEqualityAllowed false.

References: /rows/7/output/frames/1

## H4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 40 perc a forgalomleállítás időtartama.

POST: 40 minute duration typed but attachment unresolved.

References: /rows/7/output/frames/3

## H5: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A forgalmat leállító szereplő nincs kimondva.

POST: leállít actor null.

References: /rows/7/output/frames/3

## H6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A helikopterkérés tagadott; a forgalomleállítás pozitív.

POST: kér helikoptert denied; leállít polarity asserted.

References: /rows/7/output/frames/3, /rows/7/output/frames/4

## I1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Második forduló versenyszakasz, nem Lilla helyezése.

POST: 2 ordinal owner fordulójából, not Sipos Lilla placement.

References: /rows/8/output/frames/0

## I2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Sipos Lilla harmadik befutó.

POST: harmadikként not extracted, relative actor unresolved.

References: /rows/8/output/frames/1

## I3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Negyedik hely a váltó helyezése, nem ismert egyéni versenyzőé.

POST: 4 placement recognized but rank_owner_unproven.

References: /rows/8/output/frames/2

## I4: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A Második lett idézet alanya nem azonosítható biztosan.

POST: Második ordinal unresolved, no inferred ranked person.

References: /rows/8/output/frames/4

## I5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A döntőbe jutó Sipos Lilla.

POST: Sipos Lilla resolved actor of jut.

References: /rows/8/output/frames/0

## I6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A záró idézet forrása csapatvezető.

POST: csapatvezető quote source in recovered chain.

References: /rows/8/output/frames/4

## J1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Szabad Adathálózat Egyesület egy szervezet, kutatója külön szerep.

POST: Full organization entity; kutatója not included in entity name.

References: /rows/9/output/frames/0

## J2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A bemutató a kutató, nem a felügyelet.

POST: actorStatus resolved kutatója; felügyelet not actor. Frame-wide unresolved flag does not erase actor slot.

References: /rows/9/output/frames/0

## J3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A jegyzőkönyv forrása labor, nem jegyzőkönyve.

POST: jegyzőkönyve source null; no labor attribution.

References: /rows/9/output/frames/1

## J4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 1,8 gigabit másodpercenként kapcsolati ráta, nem egyszerű adatmennyiség.

POST: compound gigabit/second preserved but binding unresolved.

References: /rows/9/output/frames/1

## J5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 12–18 milliszekundum a késleltetés tartománya, nem két egyenlőségi mérés.

POST: 12 and 18 now share range qualifier and both abstain. Safety repaired; complete resolved millisecond target remains missing.

References: /rows/9/output/frames/2

## J6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Az azonosság tagadott; a sebességérték nincs tagadva.

POST: No azonos proposition; polarity unresolved because predicate absent.

References: /rows/9/output/frames/1

## K1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A felvételi előrejelzés forrása járványügyi központ.

POST: Nominal source központ attached to condition frame only; numeric admission proposition source null. Abbreviated source head alone is not counted as wrong identity.

References: /rows/10/output/frames/0, /rows/10/output/frames/1

## K2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 46 beteg naponta feltételes lehetséges felvétel, nem megtörtént összes felvétel.

POST: per-day compound candidate retains possibility and condition, but attachment unresolved.

References: /rows/10/output/frames/1

## K3: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A felvétel függ a fertőzésszám növekedésétől.

POST: conditionAntecedent and conditionality link increased infections to admission clause.

References: /rows/10/output/frames/0, /rows/10/output/frames/1

## K4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A bezárás visszautasított állítás; nem tényleges pozitív bezárás.

POST: Counterfactual volna retained, but no explicit rejected-report link from visszautasít to bezár. No fully resolved positive closure claim.

References: /rows/10/output/frames/2, /rows/10/output/frames/3

## K5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A vizsgálógépet kórház kapta meg.

POST: megkap actor null.

References: /rows/10/output/frames/4

## K6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A keddi gépátvétel nem örökli az első mondat feltételességét.

POST: Independent receipt clause asserted/conditionality false, no leaked antecedent.

References: /rows/10/output/frames/4

## L1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A kérés forrása tankerület, a levél felolvasója igazgatóhelyettes.

POST: No attribution source/chain for tankerület request; original gold wording ambiguity noted separately.

References: /rows/11/output/frames/0, /rows/11/output/frames/1

## L2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Péntek jelentkezési határidő, nem a kérés dátuma.

POST: péntekig calendar boundary resolved on lead/jelentkezés.

References: /rows/11/output/frames/1

## L3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Ösztöndíj elfogadott 75 ezer forint/hó, elvetett 60 ezer; nem negatív ösztöndíj.

POST: Contrast unresolved; rejected 60 and accepted 75000 not established.

References: /rows/11/output/frames/2, /rows/11/output/frames/3

## L4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 75 ezer forint havonta ismétlődő összeg, nem egyszeri teljes támogatás.

POST: HUF/month compound preserved only as unresolved candidate.

References: /rows/11/output/frames/3

## L5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A járandóság a jogosultság fennállásához kötött.

POST: No eligibility boundary/condition, frame unresolved.

References: /rows/11/output/frames/4

## L6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Harmadik nap tanfolyami időbeli sorszám, nem helyezés.

POST: 3 ordinal owner napján, not rank.

References: /rows/11/output/frames/5

## M1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A hajnali mérés forrása magashegyi állomás; mérései nem entitásforrás.

POST: mérései relation exists but source_bearing_possessor_unproven.

References: /rows/12/output/frames/0

## M2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Mínusz 7 Celsius-fok a levegő hőmérséklete.

POST: 7 unknown/unresolved; lexical minus and Celsius not bound, no positive 7-degree measurement.

References: /rows/12/output/frames/0

## M3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 2–4 fok várható negatív referenciaeltérés, nem abszolút maximumhőmérséklet.

POST: 2–4 range unresolved with no dimension/reference; safe abstention, not a resolved absolute temperature.

References: /rows/12/output/frames/1

## M4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: A délutáni referenciaeltérés előrejelzés; nem megfigyelt érték.

POST: Frame modalities expected; no resolved observed maximum.

References: /rows/12/output/frames/1

## M5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Várt jelenség ónos eső, havazás elvetett; a várakozás pozitív.

POST: Object contrast unresolved; no accepted ónos eső versus rejected havazás.

References: /rows/12/output/frames/3

## M6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A várakozás közlője meteorológus.

POST: hangsúlyoz no source/chain.

References: /rows/12/output/frames/2, /rows/12/output/frames/3

## N1: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: Az elemzést végző személy nem explicit; a laboratórium hely, a kutatócsoport megbízó.

POST: elemez actor null; laboratory location and commissioning group not promoted.

References: /rows/13/output/frames/0

## N2: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A mérési jelentés szerzője nincs megnevezve.

POST: source null and nominal relation source_bearing_possessor_unproven.

References: /rows/13/output/frames/1

## N3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 0,7 gramm közelítő kristálytömeg.

POST: 0.7 approximately recognized but unresolved count, no mass measurement binding.

References: /rows/13/output/frames/1

## N4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 9 milliméter a kristály átmérője, nem tömege.

POST: 9 unresolved count; diameter measurement not resolved.

References: /rows/13/output/frames/2

## N5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Az elmélet bizonyítása nem pozitívan állított tény: állítja tagadott.

POST: Explicit negated_reporting_predicate/content_under_negated_report block; polarity unresolved rather than positive proof. This safety decision is satisfied by explicit blocking evidence.

References: /rows/13/output/frames/3

## N6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A csoport vezetője emberi szerep, nem a csoport szervezet neve.

POST: No leader entity/local role/source, only theory object.

References: /rows/13/output/frames/3

## O1: WRONG_RESOLVED → CORRECT_RESOLVED

Gold: Az ár forrása üzletlánc árjegyzéken keresztül; nem az árjegyzék mint beszélő.

POST: Possessor üzletlánc is the source entity; árjegyzéke retained as artifact; case/possessive/obl path links to the kerül claim. Numeric rate remains unchanged/unresolved.

References: /rows/14/output/frames/0

## O2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 412 forint/kg liszt egységár.

POST: 412 HUF/kg retained as compound candidate, unresolved. No csonka money equality; resolved price/property target not added.

References: /rows/14/output/frames/0

## O3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 18 százalék kedvezmény elfogadott, 15 elvetett, feltételes lehetőség megmarad.

POST: Percent contrast unresolved; rejected value not positively resolved.

References: /rows/14/output/frames/1, /rows/14/output/frames/2

## O4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Kedvezmény csak csomagolást visszahozóknak lehetséges.

POST: Possible retained but eligibility relative clause not represented as condition. No resolved numeric claim.

References: /rows/14/output/frames/2, /rows/14/output/frames/3

## O5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 3900 forint a kosárár alsó korlátja, nem pontos ára.

POST: 3900 unresolved; negative comparison lower bound not structured.

References: /rows/14/output/frames/4

## O6: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A kedvezményt adó nyelvtani alany implicit; személyt nem lehet megnevezni.

POST: adhat actor null, no person invented.

References: /rows/14/output/frames/2

## P1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Külső közlő szakszervezeti elnök, hivatkozott ígéret forrása munkáltató.

POST: Actor elnök recovered but source/chain absent; employer promise not composed.

References: /rows/15/output/frames/0, /rows/15/output/frames/1

## P2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Fizetés nélkül maradás tagadott; fizetés elmaradás nem pozitív tény.

POST: marad fizetés nélkül polarity denied, no positive no-pay claim.

References: /rows/15/output/frames/1

## P3: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Megszűnés éve 2031, elvetett 2029; megszűnés eseménye nem tagadott.

POST: Date/time contrast resolved: 2029 rejected, 2031 accepted; event polarity asserted.

References: /rows/15/output/frames/2

## P4: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: 2031 a hatály megszűnésének ideje.

POST: 2031 year accepted on megszűnik frame.

References: /rows/15/output/frames/2

## P5: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Legalább 24 óra képzés belépőnként alsó korlátú kötelezettség, nem megtartott képzés.

POST: 24 duration unresolved; minimum and required retained but per-entrant denominator absent.

References: /rows/15/output/frames/3

## P6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Kell szervezni kötelezettség, nem megtörtént szervezés.

POST: Required modality and governing-modal evidence on kell/szervezni.

References: /rows/15/output/frames/3

## Q1: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A leemelés két koordinált aktora közül egyetlen kizárólagos aktor nem választható.

POST: Coordinated actor candidates not collapsed to single resolved actor.

References: /rows/16/output/frames/0

## Q2: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: Az elszállítás implicit alanya nem egyetlen biztos név.

POST: Implicit transport actor null.

References: /rows/16/output/frames/1

## Q3: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Az idézet forrása rendező, látogatók címzettek.

POST: kiállítás rendezője source, látogatóknak recipient, bounded quote chain.

References: /rows/16/output/frames/2

## Q4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Keretválasztó gyűjtő, én elvetett; nem az egész választás tagadott.

POST: Pronoun actor contrast unresolved; no accepted gyűjtő or rejected én binding.

References: /rows/16/output/frames/2

## Q5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Harmadik terem helyazonosító, nem személy helyezése.

POST: 3 ordinal targets terem, not person rank.

References: /rows/16/output/frames/3

## Q6: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A Második feliratból rang és rangsorolt alany nem állapítható meg.

POST: Standalone Második ordinal unresolved, no ranked entity.

References: /rows/16/output/frames/4

## R1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Kötelező intézmény törvényszék.

POST: kötelez actor null despite explicit institution.

References: /rows/17/output/frames/0

## R2: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Kötelezett szakértő elfogadott, vádlott elvetett.

POST: Object contrast resolved szakértő accepted/vádlott rejected, asserted event.

References: /rows/17/output/frames/0

## R3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A beszámoló forrása jogi képviselő; Szalai Emese címzett.

POST: beszámol source/recipient absent; original gold recipient ambiguity separately noted.

References: /rows/17/output/frames/1

## R4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Szalai Emesének inflektált személynév teljes span, nem beszámolóforrás.

POST: No PER entity, mixed_case_name_boundary; full inflected name not recovered.

References: /rows/17/output/frames/1

## R5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Idézés tagadott, beszámoló nem tagadott.

POST: beszámol asserted, idéz denied in separate clause.

References: /rows/17/output/frames/1, /rows/17/output/frames/2

## R6: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Szeptember 8–17 a pótlási lehetőség intervalluma, év ismeretlen.

POST: Sep17 end boundary resolved, Sep8 start omitted; interval not complete.

References: /rows/17/output/frames/3

## S1: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Becslés forrása gazdaság agronómusa, nem becslése névszói fej.

POST: Nested possessive source gazdaság agronómusának recovered, becslése separated.

References: /rows/18/output/frames/0

## S2: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 4,6 tonna/hektár becsült feltételes hozam, nem betakarított összmennyiség.

POST: tonna/hektár compound plus possible/conditional retained but attachment unresolved.

References: /rows/18/output/frames/0

## S3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Tervezett betakarítás július; június elvetett korábbi idő.

POST: No June/July temporal arguments or replacement relation.

References: /rows/18/output/frames/2

## S4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: 8 gép elfogadott, 6 elvetett, feltételes munkavégzés.

POST: Numeric correction unresolved; conditional morphology retained but no accepted8/rejected6.

References: /rows/18/output/frames/3, /rows/18/output/frames/4

## S5: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Hozam feltétele eső kitartása, lehetőség nem tény.

POST: possible+conditional, amennyiben antecedent retained.

References: /rows/18/output/frames/0, /rows/18/output/frames/1

## S6: CORRECT_RESOLVED → CORRECT_RESOLVED

Gold: Második kör vizsgálati szakasz, nem rang.

POST: 2 ordinal owner körben, not placement.

References: /rows/18/output/frames/5

## T1: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A várakozók tárgyalók, nem Brüsszel.

POST: vár actor unresolved despite explicit tárgyalók.

References: /rows/19/output/frames/0

## T2: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: Brüsszel intézményi referense nem egyértelmű, konkrét szervezet nem nevezhető meg.

POST: Brüsszel LOC entity only, no invented specific institution.

References: /rows/19/output/frames/0, /rows/19/output/frames/2

## T3: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: Álláspont forrása küldöttség, tanács elvetett; közvetítő szóvivő.

POST: Source contrast unresolved, no accepted küldöttség attribution.

References: /rows/19/output/frames/3

## T4: MISSED_DEFENSIBLE_RESOLUTION → MISSED_DEFENSIBLE_RESOLUTION

Gold: A tanács és küldöttség forrásalternatívák; ismertetés nincs tagadva.

POST: asserted ismertet survives but alternatives not semantically bound.

References: /rows/19/output/frames/3

## T5: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: 2 és később nem bizonyítottan azonos slot alternatívái; unresolved.

POST: ambiguous_contrast_scope with rejected/accepted null.

References: /rows/19/output/frames/5

## T6: CORRECT_UNRESOLVED → CORRECT_UNRESOLVED

Gold: A 2 tulajdonsága és mértékegysége hiányzik, pozitív támogatási összeg nem oldható fel.

POST: 2 unknown unresolved, no positive support amount.

References: /rows/19/output/frames/5
