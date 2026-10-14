// Measurement material only. Never imported by the research engine.
const fs=require('node:fs'),crypto=require('node:crypto');
const dir=__dirname, sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[
['A','országos politika',[
'A plenáris ülésen az elnöklő Takács Réka a frakcióknak így indokolta a halasztást: „Amíg az egyeztetés tart, nem tűzzük napirendre a módosítást.”',
'A parlament sajtóirodájának összefoglalója alapján az alkotmányügyi bizottság kérte a szünetet.',
'A voksolásra legkorábban 2028 tavaszán kerülhet sor.'
],[
['actor','R','A halasztás indokolója Takács Réka, nem a frakciók.'],
['attribution','R','Az idézet forrása Takács Réka; a frakciók címzettek.'],
['contrast/negation','R','A napirendre tűzés tagadott; az indokolás nem tagadott.'],
['attribution','R','Az összefoglaló forrása a parlament sajtóirodája, nem az összefoglaló mint entitás.'],
['temporal','R','2028 tavasza a voksolás legkorábbi lehetséges ideje, nem megtörtént szavazás.'],
['modality/scope','R','Az amíg feltétel az idézett napirendre tűzésre korlátozódik.']]],
['B','önkormányzat',[
'A lakógyűlésről távozva Barta Júlia főépítész a kerület jegyzőjének adta át a tervrajzokat.',
'A kilencedik kerület udvarain nem padokat, hanem ivókutakat helyeznének el, ha megszületik a lakók hozzájárulása.',
'Az első ütem a játszótérre korlátozódik.'
],[
['actor','R','Az átadó Barta Júlia; a jegyző címzett.'],
['entity boundary','R','Barta Júlia személy; főépítész szerep nem része a személynévnek.'],
['ordinal/rank','R','A kilencedik kerület közigazgatási azonosító, nem versenyhelyezés.'],
['contrast/negation','R','Az elhelyezés tárgya ivókutak; padok elvetett alternatíva.'],
['modality/scope','R','Az ivókutak elhelyezése feltételes, nem végrehajtott.'],
['ordinal/rank','R','Első ütem szakasz, nem a játszótér helyezése.']]],
['C','gazdaság',[
'Az exportőrök szövetségének mérlegelése szerint a megrendelések értéke meghaladhatja a 8 milliárd eurót.',
'Ebből a hajógyártókra jutó rész 31 százalék, az előző negyedévhez képest pedig 6 százalékkal bővült a kivitel.',
'A közzététel 2027. február 18-án 14 órakor történt.'
],[
['attribution','R','A mérlegelés forrása az exportőrök szövetsége.'],
['numeric','R','8 milliárd euró a megrendelésérték lehetséges alsó küszöbe; nem egyenlőség.'],
['numeric','R','31 százalék a hajógyártók részesedése, nem növekedési mérték.'],
['numeric','R','6 százalék relatív exportnövekedés, nem abszolút exportérték.'],
['temporal','R','2027 február 18 a közzététel dátuma.'],
['temporal','R','14 óra ugyanennek a közzétételnek az időpontja.']]],
['D','vállalat',[
'A Borostyán Csomagoló Központ üzemvezetője a dolgozóknak jelezte, hogy az éjszakai műszakot megszüntetik.',
'A feljegyzés szerint összesen 73 munkakör érintett, de a létszámleépítést a tulajdonos még nem hagyta jóvá.',
'Az átállításért felelős vezetőt a közlemény nem nevezi meg.'
],[
['entity boundary','R','Borostyán Csomagoló Központ egy szervezetnév; üzemvezetője nem a cégnév része.'],
['attribution','R','A jelzés forrása az üzemvezető, címzettjei a dolgozók.'],
['actor','U','A műszak megszüntetésének végrehajtója implicit, nem oldható fel név szerint.'],
['attribution','U','A feljegyzés szerzője nincs megadva; nem maga a feljegyzés a személyforrás.'],
['numeric','R','73 érintett munkakör, nem 73 végrehajtott elbocsátás.'],
['contrast/negation','R','A tulajdonosi jóváhagyás tagadott, nem a 73 munkakör létezése.']]],
['E','energia',[
'A hálózatirányító tájékoztatása alapján a tartalék generátorok óránként 16 köbméter gázt fogyasztanak.',
'Szélcsend esetén a tároló legfeljebb 11 órán keresztül biztosíthatja az ellátást.',
'Az átvételi próbán a feszültség nem 230, hanem 228 volt volt.'
],[
['attribution','R','A fogyasztási adat forrása a hálózatirányító, nem a tájékoztatás.'],
['numeric','R','16 köbméter óránként fogyasztási ráta, generátorokhoz kötve.'],
['numeric','R','11 óra felső időtartamkorlát és lehetőség, nem tényleges üzemidő.'],
['modality/scope','R','A tárolós ellátás feltétele szélcsend; nem vonatkozik a próbára.'],
['contrast/negation','R','A feszültség 228 V elfogadott, 230 V elvetett; mérés pozitív.'],
['actor','R','A fogyasztók a generátorok; nem a hálózatirányító.']]],
['F','közlekedés',[
'A kikötőmester üzenetét idézve a révüzem szóvivője azt írta: „A köd feloszlásáig egyetlen komp sem indul.”',
'Az új hajó egyszerre 85 kerékpár befogadására alkalmas, de ma csak 19 biciklit szállított.',
'A beszállást október 22-én 06:40-kor kezdték meg.'
],[
['attribution','R','Az idézett állítás eredeti forrása kikötőmester, közvetítője a révüzem szóvivője.'],
['contrast/negation','R','Az indulás tagadott, a szóvivő írása nem tagadott.'],
['numeric','R','85 kerékpár befogadóképesség; nem aznap szállított darabszám.'],
['numeric','R','19 bicikli a mai tényleges szállítmány.'],
['temporal','R','Október 22 06:40 a beszállás kezdete; év ismeretlen.'],
['modality/scope','R','Az indulási tilalom a köd feloszlásáig tart.']]],
['G','rendőrség',[
'A helyszínelők a raktár bérlőjétől 14 lezárt csomagot vettek át.',
'„Nem foglaltuk le a teljes készletet” – pontosított Fekete Dóra rendőr őrnagy a kereskedő kérdésére.',
'Az ügyészség cáfolata szerint nem a tulajdonost, hanem az alkalmazottját hallgatták ki.'
],[
['actor','R','A csomagátvevők helyszínelők, a bérlő az átadó.'],
['numeric','R','14 átvett csomag; nem a teljes készlet.'],
['attribution','R','A tagadó idézet forrása Fekete Dóra, nem a kereskedő.'],
['entity boundary','R','Fekete Dóra személynév; rendőr őrnagy külön cím.'],
['contrast/negation','R','A kihallgatás tárgya alkalmazott; tulajdonos elvetett, nem tagadott a kihallgatás.'],
['attribution','R','A cáfolat forrása ügyészség; nem a cáfolat névszói fej.']]],
['H','baleset',[
'A buszvezető segítői a mentők érkezése előtt kinyitották a hátsó ajtót.',
'A mentésirányítás közlése alapján legalább 5 utas könnyebben megsérült, két ember állapotát még vizsgálják.',
'A forgalmat 40 percre leállították, a mentők azonban nem kértek helikoptert.'
],[
['actor','R','Az ajtónyitók a buszvezető segítői, nem a buszvezető.'],
['attribution','R','A sérülésadat forrása mentésirányítás.'],
['numeric','R','Legalább 5 sérült alsó korlát, nem pontos öt.'],
['temporal','R','40 perc a forgalomleállítás időtartama.'],
['actor','U','A forgalmat leállító szereplő nincs kimondva.'],
['contrast/negation','R','A helikopterkérés tagadott; a forgalomleállítás pozitív.']]],
['I','sport',[
'A selejtező második fordulójából jutott döntőbe Sipos Lilla, aki végül harmadikként ért célba.',
'A váltóban a negyedik helyet szerezték meg; a befutó versenyző nevét nem közölték.',
'A csapatvezető röviden annyit mondott: „Második lett, de erről később beszélünk.”'
],[
['ordinal/rank','R','Második forduló versenyszakasz, nem Lilla helyezése.'],
['ordinal/rank','R','Sipos Lilla harmadik befutó.'],
['ordinal/rank','R','Negyedik hely a váltó helyezése, nem ismert egyéni versenyzőé.'],
['ordinal/rank','U','A Második lett idézet alanya nem azonosítható biztosan.'],
['actor','R','A döntőbe jutó Sipos Lilla.'],
['attribution','R','A záró idézet forrása csapatvezető.']]],
['J','technológia',[
'A Szabad Adathálózat Egyesület kutatója a felügyeletnek bemutatta a titkosítási protokollt.',
'A labor jegyzőkönyve szerint a kapcsolat sebessége 1,8 gigabit másodpercenként, ami nem azonos a letöltött adatmennyiséggel.',
'A hibajavítás után 12 és 18 milliszekundum között ingadozott a késleltetés.'
],[
['entity boundary','R','Szabad Adathálózat Egyesület egy szervezet, kutatója külön szerep.'],
['actor','R','A bemutató a kutató, nem a felügyelet.'],
['attribution','R','A jegyzőkönyv forrása labor, nem jegyzőkönyve.'],
['numeric','R','1,8 gigabit másodpercenként kapcsolati ráta, nem egyszerű adatmennyiség.'],
['numeric','R','12–18 milliszekundum a késleltetés tartománya, nem két egyenlőségi mérés.'],
['contrast/negation','R','Az azonosság tagadott; a sebességérték nincs tagadva.']]],
['K','egészségügy',[
'A járványügyi központ előrejelzése szerint, ha nő a fertőzések száma, naponta akár 46 beteget is felvehet az osztály.',
'A főorvos visszautasította, hogy már bezárták volna a rendelőt.',
'A kórház kedden megkapta az új vizsgálógépet.'
],[
['attribution','R','A felvételi előrejelzés forrása járványügyi központ.'],
['numeric','R','46 beteg naponta feltételes lehetséges felvétel, nem megtörtént összes felvétel.'],
['modality/scope','R','A felvétel függ a fertőzésszám növekedésétől.'],
['contrast/negation','R','A bezárás visszautasított állítás; nem tényleges pozitív bezárás.'],
['actor','R','A vizsgálógépet kórház kapta meg.'],
['modality/scope','R','A keddi gépátvétel nem örökli az első mondat feltételességét.']]],
['L','oktatás',[
'Az igazgatóhelyettes felolvasott levelében a tankerület azt kérte, hogy a diákok péntekig adják le a jelentkezést.',
'Az ösztöndíj nem 60, hanem 75 ezer forint havonta, és csak a jogosultság fennállásáig jár.',
'A tanfolyam harmadik napján műhelymunka következik.'
],[
['attribution','R','A kérés forrása tankerület, a levél felolvasója igazgatóhelyettes.'],
['temporal','R','Péntek jelentkezési határidő, nem a kérés dátuma.'],
['contrast/negation','R','Ösztöndíj elfogadott 75 ezer forint/hó, elvetett 60 ezer; nem negatív ösztöndíj.'],
['numeric','R','75 ezer forint havonta ismétlődő összeg, nem egyszeri teljes támogatás.'],
['modality/scope','R','A járandóság a jogosultság fennállásához kötött.'],
['ordinal/rank','R','Harmadik nap tanfolyami időbeli sorszám, nem helyezés.']]],
['M','időjárás',[
'A magashegyi állomás mérései alapján hajnalban mínusz 7 Celsius-fok volt a levegő hőmérséklete.',
'A délutáni maximum várhatóan 2–4 fokkal marad el az ilyenkor szokásostól.',
'A meteorológus hangsúlyozta, hogy nem havazásra, hanem ónos esőre kell számítani.'
],[
['attribution','R','A hajnali mérés forrása magashegyi állomás; mérései nem entitásforrás.'],
['numeric','R','Mínusz 7 Celsius-fok a levegő hőmérséklete.'],
['numeric','R','2–4 fok várható negatív referenciaeltérés, nem abszolút maximumhőmérséklet.'],
['modality/scope','R','A délutáni referenciaeltérés előrejelzés; nem megfigyelt érték.'],
['contrast/negation','R','Várt jelenség ónos eső, havazás elvetett; a várakozás pozitív.'],
['attribution','R','A várakozás közlője meteorológus.']]],
['N','tudomány',[
'A mintát a kutatócsoport által felkért laboratóriumban elemezték.',
'A mérési jelentés alapján a kristály tömege körülbelül 0,7 gramm, átmérője pedig 9 milliméter.',
'A csoport vezetője nem állítja, hogy a lelet bizonyítaná az elméletet.'
],[
['actor','U','Az elemzést végző személy nem explicit; a laboratórium hely, a kutatócsoport megbízó.'],
['attribution','U','A mérési jelentés szerzője nincs megnevezve.'],
['numeric','R','0,7 gramm közelítő kristálytömeg.'],
['numeric','R','9 milliméter a kristály átmérője, nem tömege.'],
['contrast/negation','R','Az elmélet bizonyítása nem pozitívan állított tény: állítja tagadott.'],
['entity boundary','R','A csoport vezetője emberi szerep, nem a csoport szervezet neve.']]],
['O','fogyasztói árak',[
'Az üzletlánc árjegyzéke szerint a liszt kilónként 412 forintba kerül.',
'Az akcióban nem 15, hanem 18 százalékos engedményt adhatnak azoknak, akik visszahozzák a csomagolást.',
'A kosár ára így sem kevesebb 3900 forintnál.'
],[
['attribution','R','Az ár forrása üzletlánc árjegyzéken keresztül; nem az árjegyzék mint beszélő.'],
['numeric','R','412 forint/kg liszt egységár.'],
['contrast/negation','R','18 százalék kedvezmény elfogadott, 15 elvetett, feltételes lehetőség megmarad.'],
['modality/scope','R','Kedvezmény csak csomagolást visszahozóknak lehetséges.'],
['numeric','R','3900 forint a kosárár alsó korlátja, nem pontos ára.'],
['actor','U','A kedvezményt adó nyelvtani alany implicit; személyt nem lehet megnevezni.']]],
['P','munkaerőpiac',[
'A szakszervezeti elnök a munkáltató ígéretére hivatkozva úgy fogalmazott, hogy a gyakornokok nem maradnak fizetés nélkül.',
'A megállapodás hatálya nem 2029-ben, hanem 2031-ben szűnik meg.',
'Új belépőnként legalább 24 óra képzést kell szervezni.'
],[
['attribution','R','Külső közlő szakszervezeti elnök, hivatkozott ígéret forrása munkáltató.'],
['contrast/negation','R','Fizetés nélkül maradás tagadott; fizetés elmaradás nem pozitív tény.'],
['contrast/negation','R','Megszűnés éve 2031, elvetett 2029; megszűnés eseménye nem tagadott.'],
['temporal','R','2031 a hatály megszűnésének ideje.'],
['numeric','R','Legalább 24 óra képzés belépőnként alsó korlátú kötelezettség, nem megtartott képzés.'],
['modality/scope','R','Kell szervezni kötelezettség, nem megtörtént szervezés.']]],
['Q','kultúra',[
'A restaurátor és a kurátor együtt emelte le a képet, majd elszállították a műhelybe.',
'A kiállítás rendezője a látogatóknak ezt mondta: „Nem én, hanem a gyűjtő választotta ki a keretet.”',
'A harmadik terem ajtaján az állt: „Második.”'
],[
['actor','U','A leemelés két koordinált aktora közül egyetlen kizárólagos aktor nem választható.'],
['actor','U','Az elszállítás implicit alanya nem egyetlen biztos név.'],
['attribution','R','Az idézet forrása rendező, látogatók címzettek.'],
['contrast/negation','R','Keretválasztó gyűjtő, én elvetett; nem az egész választás tagadott.'],
['ordinal/rank','R','Harmadik terem helyazonosító, nem személy helyezése.'],
['ordinal/rank','U','A Második feliratból rang és rangsorolt alany nem állapítható meg.']]],
['R','igazságszolgáltatás',[
'A törvényszék nem a vádlottat, hanem a szakértőt kötelezte az iratok pótlására.',
'A végzésről Szalai Emesének a jogi képviselője számolt be, de a bíróság indokolását nem idézte.',
'A pótlásra szeptember 8-tól szeptember 17-ig van lehetőség.'
],[
['actor','R','Kötelező intézmény törvényszék.'],
['contrast/negation','R','Kötelezett szakértő elfogadott, vádlott elvetett.'],
['attribution','R','A beszámoló forrása jogi képviselő; Szalai Emese címzett.'],
['entity boundary','R','Szalai Emesének inflektált személynév teljes span, nem beszámolóforrás.'],
['contrast/negation','R','Idézés tagadott, beszámoló nem tagadott.'],
['temporal','R','Szeptember 8–17 a pótlási lehetőség intervalluma, év ismeretlen.']]],
['S','mezőgazdaság',[
'A gazdaság agronómusának becslése alapján hektáronként 4,6 tonna árpa teremhet, amennyiben kitart az eső.',
'A betakarítást június helyett júliusra tervezik; nem 6, hanem 8 géppel dolgoznának.',
'A második körben a talaj nedvességét vizsgálják.'
],[
['attribution','R','Becslés forrása gazdaság agronómusa, nem becslése névszói fej.'],
['numeric','R','4,6 tonna/hektár becsült feltételes hozam, nem betakarított összmennyiség.'],
['temporal','R','Tervezett betakarítás július; június elvetett korábbi idő.'],
['contrast/negation','R','8 gép elfogadott, 6 elvetett, feltételes munkavégzés.'],
['modality/scope','R','Hozam feltétele eső kitartása, lehetőség nem tény.'],
['ordinal/rank','R','Második kör vizsgálati szakasz, nem rang.']]],
['T','külpolitika',[
'Brüsszel válaszát várják a tárgyalók, de a közlemény nem azonosítja, melyik intézmény fog megszólalni.',
'A szóvivő nem a tanács, hanem a küldöttség álláspontjaként ismertette a javaslatot.',
'A támogatásról csak annyi hangzott el: nem 2, hanem később.'
],[
['actor','R','A várakozók tárgyalók, nem Brüsszel.'],
['entity boundary','U','Brüsszel intézményi referense nem egyértelmű, konkrét szervezet nem nevezhető meg.'],
['attribution','R','Álláspont forrása küldöttség, tanács elvetett; közvetítő szóvivő.'],
['contrast/negation','R','A tanács és küldöttség forrásalternatívák; ismertetés nincs tagadva.'],
['contrast/negation','U','2 és később nem bizonyítottan azonos slot alternatívái; unresolved.'],
['numeric','U','A 2 tulajdonsága és mértékegysége hiányzik, pozitív támogatási összeg nem oldható fel.']]]
];
const corpus=rows.map(([id,domain,sentences])=>({id,domain,text:sentences.join(' '),sentences,editorialSentenceCount:sentences.length,origin:'NEW SYNTHETIC MATERIAL'}));
const expected=rows.flatMap(([id,domain,sentences,items])=>items.map(([dimension,kind,meaning],i)=>({id:id+(i+1),snippet:id,dimension,gold:kind==='R'?'RESOLVE':'UNRESOLVED',expectation:meaning})));
const selected=expected.map(x=>({id:x.id,snippet:x.snippet,dimension:x.dimension}));
const write=(n,v)=>fs.writeFileSync(dir+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
if(corpus.length!==20||expected.length!==120)throw Error('Unexpected denominator');
write('corpus.json',corpus);write('expected.json',expected);write('selected_items.json',selected);
write('input_manifest.json',{createdAt:new Date().toISOString(),phase:'BEFORE ANY FRESH INFERENCE',snippets:20,editorialSentences:60,domains:20,decisions:120,positive:expected.filter(x=>x.gold==='RESOLVE').length,abstention:expected.filter(x=>x.gold==='UNRESOLVED').length,origin:{unseenExistingRawMaterial:0,newSyntheticMaterial:20,externalIndependence:false,limitation:'Same assistant authors gold and audits outputs. New synthetic structural stress test; not an external blind sample. No old output was used to modify this gold.'},adversarialDecisions:['A2','A5','A6','C2','E3','F1','F3','G5','K2','L3','M3','O3','P5','S2','S4','T3'],files:Object.fromEntries(['corpus.json','expected.json','selected_items.json'].map(n=>[n,sha(fs.readFileSync(dir+'/'+n))])),rules:{positive:'CR only when all semantic parts of item supported; explicit wrong resolved part => WR; absent or abstained correct positive => MISSED.',abstention:'CU only when no wrong positive binding in selected scope; wrong positive => WR.',duplicateSurface:'Equivalent duplicate frame outputs do not create extra decisions; contradictory positive frames fail item.',evidence:'Report recursively encountered span occurrences and distinct raw span triples separately.'}});
console.log('Frozen: 20 snippets / 60 sentences / 120 decisions');
