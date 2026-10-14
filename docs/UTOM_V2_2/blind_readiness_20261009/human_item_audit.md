# Emberi item audit — BEFORE_REPAIR

Az elvárások a futás előtt készültek. A címkézés a befagyasztott output után, kézi szemantikai ellenőrzéssel. Nem független külső annotátor.

| ID | Előre rögzített elvárás | Státusz | Bizonyíték / indok |
|---|---|---|---|
| P1 | Dóra az aláíró, nem a minisztérium | CORRECT_RESOLVED | P.frames[0].actor = Dóra; explicit nsubj. |
| P2 | hírügynökség → minisztérium → aláírási állítás forráslánc | CORRECT_RESOLVED | P.attributionChains[0]: hírügynökség → minisztérium; claimOwner minisztérium. |
| P3 | 2028-03-06 az aláírás dátuma | CORRECT_RESOLVED | P.frames[0].numericArguments[0] calendar_date 2028-03-06. |
| P4 | A 12 település kimaradása tagadott, nem pozitív tény | CORRECT_RESOLVED | P.frames[1].polarity denied; hypotheticalContext true. Count is scoped under denial. |
| P5 | 12 település a kimaradás count argumentuma | CORRECT_RESOLVED | P.frames[1].numericArguments[0]: 12 count, owner település. |
| P6 | A tagadás közlője a szóvivő, nem az előző mondat forrásai | MISSED_DEFENSIBLE_RESOLUTION | P.frames[1]: reportingVerb tagad, de source/reportingActor/attribution null; szóvivő elveszett. |
| E1 | A vállalat a vásárló | CORRECT_RESOLVED | E.frames[0].actor vállalat. |
| E2 | 2028 calendar year, nem count | CORRECT_RESOLVED | E.frames[0].numericArguments[0]: year 2028. |
| E3 | 28 a gépsorok száma | CORRECT_RESOLVED | E.frames[0].numericArguments[1]: count 28, owner gépsort. |
| E4 | 24 millió HUF támogatás összege, nem személy pénze | MISSED_DEFENSIBLE_RESOLUTION | E.frames[2]: money 24000000 felismerve, de binding unresolved és owner null. |
| E5 | 16 millió rejected, 24 millió accepted; kapott pozitív | MISSED_DEFENSIBLE_RESOLUTION | E.contrasts[0] unresolved; rejected/accepted null. Nincs pozitív rejected leak, de a korrekció nem reprezentált. |
| E6 | 35 százalék ownership share, nem change magnitude | CORRECT_RESOLVED | E.frames[3]: percentage 35, property share, owner részesedést. |
| A1 | rendőrség a vezetésről szóló állítás forrása | CORRECT_RESOLVED | A.frames[0].source rendőrség. |
| A2 | férfi a vezető, nem rendőrség | MISSED_DEFENSIBLE_RESOLUTION | A.frames[0].actor null; a szöveg egyértelműen a férfit jelöli. |
| A3 | 46 a férfi életkora | CORRECT_RESOLVED | A.frames[0].numericArguments[0]: age 46, owner férfi. |
| A4 | 7 km megtett távolság, nem age vagy duration | CORRECT_RESOLVED | A.frames[0].numericArguments[1]: measurement 7 km, vezetett frame. |
| A5 | mentők a második mondat cselekvői | MISSED_DEFENSIBLE_RESOLUTION | A.frames[1].actor null; mentők explicit alany a nyers szövegben. |
| A6 | két órán át = duration 2 hour | CORRECT_RESOLVED | A.frames[1]: duration 2 hour, át marker. |
| S1 | negyedik forduló ordinal 4, nem placement | MISSED_DEFENSIBLE_RESOLUTION | S.frames[0]: ordinal 4 címkézett, de binding unresolved. |
| S2 | második lett rank 2, ranked owner Réka | MISSED_DEFENSIBLE_RESOLUTION | S.frames[0]: 2 ordinal unresolved; nincs resolved rank owner. |
| S3 | Réka vagy Gergő: nincs egyértelmű rank owner; abstain | CORRECT_UNRESOLVED | S.frames[1]: disjunctive owner mellett nincs resolved rank. |
| W1 | szolgálat a hőmérséklet-változás forrása | CORRECT_RESOLVED | W.frames[0].source szolgálat. |
| W2 | 6 százalék decrease magnitude, nem share | CORRECT_RESOLVED | W.frames[0]: percentage 6, property change_magnitude, csökkent frame. |
| W3 | 60 km/h sebességküszöb, nem 60 km megtett út | WRONG_RESOLVED | W.frames[1].numericArguments[0]: measurement 60 km resolved; a raw szöveg sebességküszöb 60 km/h. Az óránként denominator és threshold szerep elveszett. |
| W4 | a lezárás feltételes, nem már megtörtént lezárás | CORRECT_RESOLVED | W.frames[2]: conditionality true, status conditional; az előzmény külön antecedent frame. |
| W5 | lezárás végrehajtója implicit; nem híd vagy szél | CORRECT_UNRESOLVED | W.frames[2].actor null; híd nem actor. |
| T1 | kutató a bemutató cselekvője | CORRECT_RESOLVED | T.frames[0].actor kutató. |
| T2 | 10:20 clock time a bemutatóhoz kötve | CORRECT_RESOLVED | T.frames[0]: clock_time 10:20, time role. |
| T3 | harmadik teszt ordinal 3, nem rank | MISSED_DEFENSIBLE_RESOLUTION | T.frames[1]: ordinal 3 unresolved, bár a harmadik teszt sorszáma egyértelmű. |
| T4 | négy nap a harmadik teszt durationje | CORRECT_RESOLVED | T.frames[1]: duration 4 day, a harmadik teszt clause-a. |
| T5 | nem sikerült csak az első mérésre vonatkozik | CORRECT_RESOLVED | T.frames[2].polarity denied, T.frames[1] asserted; nincs átfolyó negáció. |
| H1 | igazgató quoted speaker, klinika event actor; publisher nem kitalált | MISSED_DEFENSIBLE_RESOLUTION | H.frames[0]: reportingVerb közöl, source/reportingActor null. Az igazgató explicit quote speaker. |
| H2 | klinika a felvétel alanya | MISSED_DEFENSIBLE_RESOLUTION | H.frames[0].actor null; klinika alany kihagyva. |
| H3 | 45 embert a felvétel headcountja | CORRECT_RESOLVED | H.frames[0]: headcount 45, owner embert, vesz fel frame. |
| H4 | október 17 boundary, év nincs megadva | MISSED_DEFENSIBLE_RESOLUTION | A második, október 17-ig jelentkezést tartalmazó mondathoz nincs frame/temporal argument. |
| P7 | Dóra személyspan; minisztérium és hírügynökség külön referensek | CORRECT_RESOLVED | Dóra exact person entity; a két forrás külön chain referens. |
| S4 | Réka és Gergő két külön személy, nem közös névspan | CORRECT_RESOLVED | Réka és Gergő külön entity spanok, nincs összevont név. |
| W6 | szél sebessége birtokviszony, nem személy vagy actor név | CORRECT_RESOLVED | W.frames[1].syntacticRoles possessor szél → sebessége; actor null. |
| A7 | férfi generikus személyszerep, nincs kitalált név | CORRECT_RESOLVED | Age owner férfi generikus referent, nincs kitalált személynév vagy identity. |
