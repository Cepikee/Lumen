const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
// Authored before any new inference. R=defensible resolution, U=abstention.
// Tuple: dimension, status, sentence, role, target/owner, qualifier, evidence.
const specs=[
['A','választási adminisztráció',[
'Boros Katalin a külképviseletek vezetőinek kiosztotta a lezárt szavazási csomagokat, majd személyesen ellenőrizte a pecséteket.',
'A választási iroda hirdetménye úgy rendelkezik, hogy igazolt akadályoztatás esetén minimum 48 órával meghosszabbítható az átvétel.',
'A végleges névsort 2032. április 9-én tették borítékba, az összeállító nevét azonban nem tüntették fel.'
],[['actor','R',1,'kiosztó','Boros Katalin','nem a címzett vezetők','Boros Katalin ... kiosztotta'],['entity boundary','R',1,'személynév','Boros Katalin','a címzett nem része a névnek','Boros Katalin a külképviseletek'],['attribution','R',2,'rendelkezés eredete','választási iroda','hirdetmény az artifact','iroda hirdetménye úgy rendelkezik'],['modality/scope','R',2,'hosszabbítás','átvétel','akadályoztatás esetén; minimum 48 óra; lehetőség','esetén minimum 48 órával meghosszabbítható'],['temporal','R',3,'borítékba helyezés dátuma','2032-04-09','múlt esemény','2032. április 9-én'],['actor','U',3,'névsor összeállítója',null,'név és referens nem adott','összeállító nevét ... nem tüntették fel']]],
['B','városüzemeltetés',[
'A tizenegyedik kerület gondnokai a közös udvar kulcsát a lakóközösség megbízottjának vitték vissza.',
'A költségvetési függelékben nem 9 millió, hanem 11 millió forintot különítettek el árnyékolókra; a bejegyzés szerzője ismeretlen.',
'A két névtelen ajánlat közül az egyiket sürgősnek jelölték, de az árát nem rendelték hozzá az ajánlat azonosítójához.'
],[['actor','R',1,'visszavivő','gondnokok','a megbízott címzett','gondnokai ... vitték vissza'],['ordinal/rank','R',1,'kerületszám','kerület=11','nem versenyhelyezés','tizenegyedik kerület'],['contrast/negation','R',2,'pénzkorrekció','árnyékolók','9M HUF elvetett; 11M HUF elfogadott','nem 9 millió, hanem 11 millió forintot'],['numeric','R',2,'elkülönített pénz','árnyékolók','11000000 HUF; nem9M','árnyékolókra'],['attribution','U',2,'függelék szerzője',null,'dokumentum nem entitás','szerzője ismeretlen'],['numeric','U',3,'ajánlati ár tulajdonosa',null,'nem azonosítható ajánlat','árát nem rendelték hozzá']]],
['C','biztosítás',[
'Az ügyfélnek Varga Noémi kárszakértő magyarázta el: „Áradás után a pince biztosítása nem szűnik meg automatikusan.”',
'A biztosító feltétellapjából az olvasható ki, hogy beázáskor a térítés elérheti a 650 ezer forintot, de az önrész 12 százalék marad.',
'Egy kézzel odavetett „Hetedik” szó mellől hiányzik, hogy ügyfelet vagy szerződést soroltak-e be.'
],[['attribution','R',1,'idézet közlője','Varga Noémi','ügyfél címzett','Varga Noémi ... magyarázta el'],['contrast/negation','R',1,'tagadott megszűnés','pince biztosítása','nem szűnik meg automatikusan','nem szűnik meg'],['attribution','R',2,'feltétellap eredete','biztosító','artifact nem beszélő','biztosító feltétellapjából'],['numeric','R',2,'önrész','biztosítás','12% szint; nem változás','önrész 12 százalék marad'],['modality/scope','R',2,'lehetséges térítés','beázás térítése','beázáskor; elérheti650000HUF','beázáskor ... elérheti'],['ordinal/rank','U',3,'hetedik rang tárgya',null,'rang alanya/típusa nincs','ügyfelet vagy szerződést']]],
['D','banki szolgáltatások',[
'A Pannon Takarék fiókhálózata július 6-tól szeptember 2-ig próbarendben fogadja az ügyfeleket.',
'Nem a kamatot, hanem a számlavezetés díját csökkentenék, amennyiben legalább hatezer ügyfél választ elektronikus kivonatot.',
'„Erről már döntöttek” – hallatszott a folyosón, de a beszélőt senki sem látta.'
],[['actor','R',1,'ügyfeleket fogadó','Pannon Takarék fiókhálózata','birtokos bank és hálózat nem azonos slot','fiókhálózata ... fogadja'],['temporal','R',1,'próbarend időintervalluma','július6 → szeptember2','év ismeretlen; két határ','július 6-tól szeptember 2-ig'],['contrast/negation','R',2,'csökkentés tárgya','számlavezetés díja','kamat elvetett','Nem a kamatot, hanem'],['numeric','R',2,'feltételes ügyfélszám','elektronikus kivonatot választók','>=6000 fő; nem tényleges elért létszám','legalább hatezer ügyfél'],['modality/scope','R',2,'díjcsökkentés','számlavezetés','feltételes; amennyiben','csökkentenék, amennyiben'],['attribution','U',3,'idézet beszélője',null,'azonosíthatatlan folyosói hang','beszélőt senki sem látta']]],
['E','állásközvetítés',[
'A pályakezdők mentorának asszisztense tizenhárom önéletrajzot továbbított a szállodának.',
'A toborzási ügynökség helyesbített: nem 28, hanem 34 jelentkezőt hívtak be, közülük kilencen még tanulnak.',
'A visszautasító levelek szerda délig lettek kiküldve, a kiküldést végző munkatársat nem nevezték meg.'
],[['actor','R',1,'továbbító','pályakezdők mentorának asszisztense','nem mentor és nem szálloda','mentorának asszisztense ... továbbított'],['numeric','R',1,'önéletrajzok száma','továbbított önéletrajz','13; nem dolgozói létszám','tizenhárom önéletrajzot'],['attribution','R',2,'helyesbítő','toborzási ügynökség','nem jelentkezők','ügynökség helyesbített'],['contrast/negation','R',2,'behívott létszám korrekció','jelentkezők','28 elvetett;34elfogadott','nem 28, hanem 34'],['temporal','R',3,'kiküldési határidő','szerda dél','nincs abszolút dátum','szerda délig'],['actor','U',3,'passzív kiküldés végrehajtója',null,'implicit; nem a levelek','munkatársat nem nevezték meg']]],
['F','távhő',[
'Hidegindításkor a kazán másodpercenként kevesebb mint fél kilogramm pelletet égethet el a gyártó üzemnaplója szerint.',
'A mérnök a felügyelőnek külön megjegyezte, hogy az égőt nem szabad kézzel újragyújtani.',
'A margón két szám, 14 és 19 áll egység és megnevezett alkatrész nélkül.'
],[['numeric','R',1,'tüzelőanyag-fogyasztási ráta','kazán pelletfogyasztása','<0.5kg/s; lehetőség; hidegindítás','másodpercenként ... fél kilogramm'],['attribution','R',1,'üzemnapló eredete','gyártó','nem üzemnapló az entitás','gyártó üzemnaplója szerint'],['modality/scope','R',2,'újragyújtás tilalma','égő kézi újragyújtása','tilos; nem tényleges esemény','nem szabad kézzel újragyújtani'],['attribution','R',2,'tilalom közlője','mérnök','felügyelő címzett','mérnök a felügyelőnek'],['numeric','U',3,'14 numerikus tulajdonosa',null,'nincs egység vagy tárgy','14 és 19 ... nélkül'],['numeric','U',3,'19 numerikus tulajdonosa',null,'nincs egység vagy tárgy','14 és 19 ... nélkül']]],
['G','vasút',[
'A pályamester adatai szerint a síncsiszoló percenként 240 méternél többet nem haladhat a zajvédelmi szakaszon.',
'Rostás Lénárd diszpécser 04:25-kor engedélyezte a kihaladást, utána a menetíró elnémult.',
'A javítási lapon az szerepel, hogy kicserélték a biztosítékot, de szerelőt nem rögzítettek.'
],[['attribution','R',1,'adatközlő','pályamester','adatok nem személyforrás','pályamester adatai szerint'],['numeric','R',1,'sebességkorlát','síncsiszoló','<=240m/min; nem megtett út','percenként 240 méternél többet nem'],['modality/scope','R',1,'közlekedési korlátozás','síncsiszoló','engedett maximum; nem tényleges sebesség','nem haladhat'],['actor','R',2,'engedélyező','Rostás Lénárd','diszpécser szerep','Rostás Lénárd ... engedélyezte'],['temporal','R',2,'engedélyezés órája','04:25','nap nincs','04:25-kor'],['actor','U',3,'biztosítékcserélő',null,'implicit szerelő','szerelőt nem rögzítettek']]],
['H','katasztrófavédelem',[
'A tűzoltók az óvoda udvarából kimenekítették a kertész kutyáját, miközben a szomszédok az utat locsolták.',
'„A palack nem robbant fel” – közölte az ügyeletes a rádiós szerkesztővel, aki ezt azonnal beolvasta.',
'A beavatkozás a riasztást követő nyolcadik percben kezdődött; a riasztó személy kiléte nem derült ki.'
],[['actor','R',1,'kimenekítő','tűzoltók','nem kutya birtokosa','tűzoltók ... kimenekítették'],['actor','R',1,'locsoló','szomszédok','külön egyidejű cselekvés','szomszédok ... locsolták'],['contrast/negation','R',2,'robbanás tagadása','palack','nem történt robbanás','nem robbant fel'],['attribution','R',2,'eredeti közlő','ügyeletes','szerkesztő közvetítő/címzett','közölte az ügyeletes ... szerkesztővel'],['ordinal/rank','R',3,'relatív időhely','beavatkozás kezdete=8.perc','nem rang; riasztáshoz képest','nyolcadik percben'],['actor','U',3,'riasztást leadó',null,'kiléte nem adott','riasztó személy kiléte nem derült ki']]],
['I','vívás',[
'Sallai Zsófia a negyedik asszóban fordított, az összesített listán viszont hatodik lett.',
'A zsűri pontozólapjából kiderül, hogy csapata nem bronzot, hanem ezüstöt kapott; az edző mégis óvást nyújtott be.',
'A juniorok lapján csak annyi olvasható: „Ötödik lett”, név és versenyszám nélkül.'
],[['actor','R',1,'fordító sportoló','Sallai Zsófia','név nem asszó','Sallai Zsófia ... fordított'],['ordinal/rank','R',1,'asszó sorszáma','asszó=4','nem végső rang','negyedik asszóban'],['ordinal/rank','R',1,'összesített helyezés','Sallai Zsófia=6','hatodik; nem negyedik','összesített listán ... hatodik'],['attribution','R',2,'pontozólap eredete','zsűri','artifact nem entitás','zsűri pontozólapjából'],['contrast/negation','R',2,'érem korrekció','csapat','bronz elvetett; ezüst elfogadott','nem bronzot, hanem ezüstöt'],['ordinal/rank','U',3,'ötödik helyezett',null,'név és versenyszám hiányzik','név és versenyszám nélkül']]],
['J','gyógyszerellátás',[
'A gyógyszerész szerint a járási rendelő nem adhatja át a hűtést igénylő ampullákat futárnak.',
'Ha a szállítódoboz legalább 2 és legfeljebb 6 Celsius-fok között marad, a készítmény 36 óráig felhasználható lehet.',
'A lezáratlan címkén egyetlen aláírás sem szerepelt, így a csomagoló személyét nem lehetett megállapítani.'
],[['attribution','R',1,'tilalom közlője','gyógyszerész','futár címzett','gyógyszerész szerint'],['actor','R',1,'tiltott átadás alanya','járási rendelő','tiltott cselekvés; nem futár','rendelő nem adhatja át'],['numeric','R',2,'hőmérsékleti intervallum','szállítódoboz','2..6 Celsius; feltétel','legalább 2 és legfeljebb 6'],['temporal','R',2,'felhasználhatósági időtartam','készítmény','36óra; nem abszolút dátum','36 óráig'],['modality/scope','R',2,'felhasználhatóság','készítmény','Ha ... marad; lehet','Ha ... felhasználható lehet'],['actor','U',3,'csomagoló',null,'aláírás hiányzik','személyét nem lehetett megállapítani']]],
['K','szakképzés',[
'Az iskola műhelymestere a tanoncoknak átadta a marógép kezelési útmutatóját, és felolvasta a biztonsági részt.',
'Az útmutató szerint felügyelet mellett maximum három munkadarabot lehet egyszerre befogni, de a kiadó neve lemaradt.',
'Az egyik értékelőlapon „Harmadik” áll; nincs jelölve, hogy vizsganapot vagy tanulói helyezést jelent.'
],[['actor','R',1,'átadó és felolvasó','iskola műhelymestere','tanoncok címzettek','műhelymestere ... átadta ... felolvasta'],['numeric','R',2,'befogható darabok','munkadarab','maximum3; kapacitás nem actual','maximum három munkadarabot'],['modality/scope','R',2,'befogási feltétel','munkadarab','felügyelet mellett; lehet','felügyelet mellett ... lehet'],['entity boundary','R',1,'birtokolt emberi szerep','iskola műhelymestere','nem iskola mint ember','iskola műhelymestere'],['attribution','U',2,'útmutató kibocsátója',null,'bare artifact; kiadó hiányzik','kiadó neve lemaradt'],['ordinal/rank','U',3,'harmadik slot',null,'nap/helyezés kétértelmű','vizsganapot vagy tanulói helyezést']]],
['L','űrkutatás',[
'A csillagvizsgáló műszerkönyvében a kutatók nem 0,8, hanem 1,1 milliméteres elmozdulást jegyeztek fel a tükörnél.',
'A programvezető levelét idézve a szóvivő kijelentette, hogy a pályakorrekciót még nem rendelték el.',
'A korábbi jeladó leválasztása után megszakadt a vétel, a leválasztó parancs kiadóját nem azonosították.'
],[['actor','R',1,'feljegyző','kutatók','nem műszerkönyv','kutatók ... jegyeztek fel'],['contrast/negation','R',1,'elmozdulás korrekció','tükör','0.8 elvetett;1.1mm elfogadott','nem 0,8, hanem 1,1'],['numeric','R',1,'elmozdulás','tükör','1.1mm; nem tükörméret','elmozdulást ... a tükörnél'],['attribution','R',2,'idézett állítás lánca','programvezető → szóvivő','levél az eredet közvetítője','levelét idézve a szóvivő'],['contrast/negation','R',2,'elrendelés tagadása','pályakorrekció','még nem rendelték el','még nem rendelték el'],['actor','U',3,'parancskiadó',null,'nem azonosított','kiadóját nem azonosították']]],
['M','szennyvízkezelés',[
'A telep üzemviteli kartonja a membrán négyzetméterére óránként 27 liter átfolyást ír elő, nem a teljes berendezésre.',
'Nyomáseséskor ez az érték legfeljebb 18 literre mérséklődhet ugyanilyen terület és idő mellett.',
'A szelepet estére lezárták, de a műszakátadásból nem derül ki, ki végezte a műveletet.'
],[['attribution','R',1,'előírás eredete','telep','karton artifact; nem személy','telep üzemviteli kartonja'],['numeric','R',1,'felületi térfogatáram','membrán','27 liter/(m²*h); nem teljesgép liter','négyzetméterére óránként 27 liter'],['contrast/negation','R',1,'kizárt tulajdonos','teljes berendezés','ne kötődjön hozzá a27liter abszolút','nem a teljes berendezésre'],['numeric','R',2,'feltételes új felsőkorlát','ugyanazon membránráta','<=18L/(m²*h); nem delta18','18 literre ... ugyanilyen terület és idő'],['modality/scope','R',2,'mérséklődés','átfolyás','nyomáseséskor; lehetőség','mérséklődhet'],['actor','U',3,'szelep lezárója',null,'műszakátadás nem nevezi meg','ki végezte']]],
['N','méhészet',[
'A méhészeti egyesület titkára szerint a vándoroltatók kaptáronként nagyjából 23 kilogramm mézet pergettek.',
'Kerekes Dénes a második pergetésből 16 üveget ajándékozott a falugondnoknak, a címkén június 12. szerepelt.',
'A maradékot valamikor később vitték el, de a napot nem jegyezték fel.'
],[['attribution','R',1,'hozam közlője','méhészeti egyesület titkára','nem egyesület és nem vándoroltatók','titkára szerint'],['numeric','R',1,'hozam','vándoroltatók kaptárai','~23kg/kaptár; nem össztömeg','kaptáronként nagyjából'],['actor','R',2,'ajándékozó','Kerekes Dénes','falugondnok címzett','Kerekes Dénes ... ajándékozott'],['ordinal/rank','R',2,'pergetés menetszáma','pergetés=2','nem rang','második pergetésből'],['temporal','R',2,'címke dátuma','június12','év nincs; nem biztos ajándékozási idő','címkén június 12.'],['temporal','U',3,'elszállítás pontos napja',null,'később csak reláció; nap hiányzik','napot nem jegyezték fel']]],
['O','javítószolgáltatás',[
'A szerviz díjtáblázatából az derül ki, hogy a kiszállás megkezdett félóránként 7400 forintba kerülhet, ha hétvégén hívják a szerelőt.',
'Nem a tulajdonos, hanem a bérlő kérte a javítást, és a szerelőnek előleget adott.',
'A munkalap jobb felső sarkában 5200 szerepel, de nincs mellette pénznem vagy tételmegnevezés.'
],[['attribution','R',1,'díjszabás eredete','szerviz','díjtáblázat artifact','szerviz díjtáblázatából'],['numeric','R',1,'kiszállási díjráta','kiszállás','7400HUF/megkezdett0.5óra; nem teljesdíj','megkezdett félóránként'],['modality/scope','R',1,'díj alkalmazása','kiszállás','hétvége feltétel; kerülhet','kerülhet, ha hétvégén'],['contrast/negation','R',2,'megrendelő korrekció','bérlő','tulajdonos elvetett','Nem a tulajdonos, hanem a bérlő'],['actor','R',2,'előleget adó','bérlő','szerelő címzett','szerelőnek előleget adott'],['numeric','U',3,'5200 tulajdonos/egység',null,'ne találjon ki HUFtételt','nincs mellette pénznem vagy tételmegnevezés']]],
['P','színház',[
'A vendégrendező a főpróba harmadik napján cserélte fel a jelenetek sorrendjét, a súgó pedig új példányokat osztott szét.',
'„A szünet nem rövidül” – mondta a társulat ügyelője a büfésnek, majd a hangosbemondó is ezt ismételte.',
'Az öltözőben talált cetlin nem 7, hanem 10 állt, tárgy és mértékegység nélkül.'
],[['actor','R',1,'sorrendcserélő','vendégrendező','nem súgó','vendégrendező ... cserélte fel'],['ordinal/rank','R',1,'főpróba napja','nap=3','nem harmadik helyezés','harmadik napján'],['attribution','R',2,'idézet forrása','társulat ügyelője','büfés címzett; hangosbemondó közvetítő','mondta ... ügyelője a büfésnek'],['contrast/negation','R',2,'rövidülés tagadása','szünet','negatív esemény','nem rövidül'],['numeric','U',3,'7 pozitív mennyiség',null,'elvetett és egység/tárgyhiány','nem 7'],['contrast/negation','U',3,'korrekció szemantikai céltárgya',null,'7→10 felszín nem bizonyít számított slotot','tárgy és mértékegység nélkül']]],
['Q','régészet',[
'A feltárás vezetőjének terepnaplója alapján a segítők az ötödik rétegből emelték ki a csatot.',
'A lelet nem ezüstből, hanem ónból készült, tömege a restaurátor szerint hozzávetőleg 42 gramm.',
'A mellette heverő másik tárgyat nem mérték meg, így ahhoz tömegadatot nem lehet rendelni.'
],[['attribution','R',1,'terepnapló eredete','feltárás vezetője','birtokosi lánc; nem terepnapló','vezetőjének terepnaplója'],['actor','R',1,'kiemelő','segítők','vezető nem actor','segítők ... emelték ki'],['ordinal/rank','R',1,'rétegsorszám','réteg=5','nem versenyrang','ötödik rétegből'],['contrast/negation','R',2,'anyagkorrekció','csat','ezüst elvetett; ón elfogadott','nem ezüstből, hanem ónból'],['numeric','R',2,'tömeg','csat/lelet','~42g; restaurátor által közölt','hozzávetőleg 42 gramm'],['numeric','U',3,'másik tárgy tömege',null,'42g nem örökíthető át','másik tárgyat nem mérték meg']]],
['R','vadgazdálkodás',[
'A vadőr a turistáknak azt felelte, hogy a kerítésen belül nem etethetik az állatokat.',
'A számlálási ív 67 szarvast sorol fel, de a természetvédelmi őr szerint közülük legalább nyolc ugyanaz az állat lehet kétszer rögzítve.',
'Az ív készítőjéről sem név, sem szervezet nem szerepel a lapon.'
],[['attribution','R',1,'válasz közlője','vadőr','turisták címzettek','vadőr ... azt felelte'],['modality/scope','R',1,'etetési tilalom','turisták','nem etethetik; nem megtörténtetetés','nem etethetik'],['numeric','R',2,'nyilvántartott észlelések','számlálási ív szarvasbejegyzései','67; nem bizonyított67különállat','67 szarvast sorol fel'],['attribution','R',2,'duplikáció lehetőségének közlője','természetvédelmi őr','nem számlálási ív','őr szerint'],['modality/scope','R',2,'duplán számlálás','legalább8 bejegyzés','lehet; bizonytalan nem tény','ugyanaz az állat lehet kétszer'],['attribution','U',3,'ív szerzőjének identitása',null,'nincs név/szervezet','sem név, sem szervezet']]],
['S','távközlés',[
'A hálózati kártya adatlapja 2,4 gigabitet ad meg másodpercenként, de ezt a labor munkatársai még nem igazolták.',
'A mérési felelős az ügyfélszolgálatnak azt írta, hogy csúcsidőben akár 35 százalékkal is visszaeshet az átvitel, nem pedig 35 százalékra.',
'Az adatlap gyártója nem azonosítható a hiányos fejlécből.'
],[['numeric','R',1,'névleges átviteli ráta','hálózati kártya','2.4Gbit/s; nem adatmennyiség; nem laborigazolás','gigabitet ... másodpercenként'],['contrast/negation','R',1,'igazolás hiánya','laborigazolás','még nem igazolt','még nem igazolták'],['attribution','R',2,'figyelmeztetés közlője','mérési felelős','ügyfélszolgálat címzett','felelős ... azt írta'],['numeric','R',2,'átvitel csökkenés','átvitel','35% relatívváltozás; nem35%eredményszint','35 százalékkal ... nem pedig35százalékra'],['modality/scope','R',2,'visszaesés lehetősége','átvitel','csúcsidőben; akár; -het','akár ... visszaeshet'],['attribution','U',3,'adatlap gyártója',null,'artifactból nem gyártható identitás','nem azonosítható']]],
['T','határigazgatás',[
'Bécs új feltételeket kért a közös ellenőrzéshez, de a táviratból nem látszik, melyik osztrák szerv fogalmazta meg őket.',
'A határőrség szóvivője a minisztérium levelére hivatkozva közölte, hogy nem január 15-én, hanem február 1-jén kezdődhet az összehangolás.',
'Az indulást a kétoldalú megállapodás aláírásához kötötték.'
],[['actor','U',1,'Bécs konkrét intézményi referense',null,'város/intézmény metonímia nem feloldható','melyik osztrák szerv'],['entity boundary','R',1,'helynévi felszíni említés','Bécs','nem automatikus konkrét kormányidentitás','Bécs'],['attribution','R',2,'forráslánc','minisztérium → határőrség szóvivője','levél közvetít; külön entitások','levelére hivatkozva közölte'],['contrast/negation','R',2,'kezdés dátumkorrekció','összehangolás','jan15 elvetett;feb1elfogadott;évhiány','nem január 15-én, hanem február 1-jén'],['temporal','R',2,'lehetséges kezdet','február1','kezdődhet; nem rögzített tény','február 1-jén kezdődhet'],['modality/scope','R',3,'indulás feltétele','összehangolás','megállapodás aláírása','aláírásához kötötték']]],
['U','könyvkiadás',[
'A szerkesztőség hibajegyzéke szerint nem Sárközi Ilona, hanem Mészáros Hanna fordította a függeléket.',
'A harmadik kiadás előjegyzéséért 6800 forintot kérnek, miközben az első kiadásból megmaradt 22 példányt ingyen adják át az iskolának.',
'A névtelen ajánló a legjobbnak nevezi a kötetet, de nem derül ki, ki írta és milyen összehasonlításban.'
],[['contrast/negation','R',1,'fordító korrekció','Mészáros Hanna','Sárközi Ilona elvetett','nem Sárközi Ilona, hanem Mészáros Hanna'],['attribution','R',1,'hibajegyzék eredete','szerkesztőség','hibajegyzék artifact','szerkesztőség hibajegyzéke szerint'],['ordinal/rank','R',2,'kiadásszám','előjegyezhető kiadás=3','nem rang','harmadik kiadás'],['numeric','R',2,'előjegyzési ár','harmadik kiadás','6800HUF; nem22példány ára','előjegyzéséért 6800 forintot'],['attribution','U',3,'ajánló szerzője',null,'névtelen','nem derül ki, ki írta'],['ordinal/rank','U',3,'legjobb rang összehasonlítási alapja',null,'nincs rangsor vagy populáció','milyen összehasonlításban']]],
['V','zenei verseny',[
'A döntő eredménylapján Hegedűs Áron mögött Fodor Mira következik, akit a zsűri a második helyre sorolt.',
'A közönségszavazásban viszont Mira első, Áron harmadik; a két lista nem vonható össze.',
'A záróbeszédet nem a zsűri, hanem a műsorvezető olvasta fel, a szöveg íróját nem nevezték meg.'
],[['ordinal/rank','R',1,'zsűrihelyezés','Fodor Mira=2','zsűrilista nem közönség','második helyre sorolt'],['entity boundary','R',1,'név','Fodor Mira','ne terjedjen a zsűrire','Fodor Mira következik'],['ordinal/rank','R',2,'elliptikus közönséghelyezés','Mira=1','csak közönséglista','Mira első'],['ordinal/rank','R',2,'elliptikus közönséghelyezés','Áron=3','nem zsűrihelyezés','Áron harmadik'],['contrast/negation','R',3,'felolvasó korrekció','műsorvezető','zsűri elvetett','nem a zsűri, hanem a műsorvezető'],['actor','U',3,'beszédíró',null,'nem azonos a felolvasóval','szöveg íróját nem nevezték meg']]],
['W','hulladékgazdálkodás',[
'A szelektáló brigád a műszak első szakaszában 1,7 tonna papírt különített el, majd a műanyagokhoz vonult.',
'A vállalkozó fuvarlevele alapján a konténer tömege 600 kilogrammal lett kisebb, nem 600 kilogrammra csökkent.',
'Az elszállítás után valaki átírta a mérlegjegyet; az új érték mellett nincs aláírás.'
],[['actor','R',1,'válogató','szelektáló brigád','nem papír','brigád ... különített el'],['ordinal/rank','R',1,'munkaszakasz','szakasz=1','nem rang','első szakaszában'],['numeric','R',1,'elválasztott anyagtömeg','papír','1.7tonna','1,7 tonna papírt'],['attribution','R',2,'fuvarlevél eredete','vállalkozó','fuvarlevél artifact','vállalkozó fuvarlevele alapján'],['numeric','R',2,'tömegdelta','konténer','-600kg; nem600kg eredménytömeg','600 kilogrammal ... nem600kilogrammra'],['actor','U',3,'mérlegjegy átírója',null,'valaki; nincs azonosítás','valaki ... nincs aláírás']]],
['X','élelmiszerbiztonság',[
'A laboráns a pékség vezetőjének cáfolta, hogy a kovászban tiltott adalékot találtak volna.',
'A hatóság ellenőrzési lapja nem a tulajdonostól, hanem a műszakvezetőtől származó tájékoztatást idézi: a kemencét 2027-ben cserélhetik ki.',
'Az egyik mintát a másik mellé tették; a sorszámok hiányában nem állapítható meg, melyikből vették a második részmintát.'
],[['attribution','R',1,'cáfoló','laboráns','pékség vezetője címzett','laboráns ... cáfolta'],['contrast/negation','R',1,'cáfolt állítás','tiltott adalékot találtak','ne legyen pozitív találat','cáfolta, hogy ... találtak volna'],['contrast/negation','R',2,'idézett forrás korrekció','műszakvezető','tulajdonos elvetett','nem a tulajdonostól, hanem a műszakvezetőtől'],['attribution','R',2,'információlánc','műszakvezető → hatóság lapja','hatóság közvetít; műszakvezető eredet','származó tájékoztatást idézi'],['temporal','R',2,'lehetséges csere éve','kemence=2027','cserélhetik; nem megtörtént','2027-ben cserélhetik ki'],['numeric','U',3,'második részminta tulajdonosa',null,'két minta között nincs bizonyíték','melyikből vették']]],
['Y','szálláshely-szolgáltatás',[
'A panzió vendégkönyvéből idézett a recepciós: „Ha visszatérnénk, legalább öt éjszakát maradnánk.”',
'A foglalási rendszer naplója 18 százalékról 26 százalékra emelkedő hétköznapi kihasználtságot jelez, a növekmény tehát nyolc százalékpont.',
'A bejegyzéshez nem tartozik név, a recepciós pedig nem tudta azonosítani az idézett vendéget.'
],[['attribution','R',1,'idézet közvetítője','recepciós','nem eredeti vendég','idézett a recepciós'],['modality/scope','R',1,'tervezett tartózkodás','idézett vendégek','ha visszatérnének;>=5éjszaka; feltételes','Ha visszatérnénk ... maradnánk'],['numeric','R',2,'kihasználtság változás','hétköznapi kihasználtság','from18%;to26%;delta8százalékpont','18 százalékról 26 százalékra'],['attribution','R',2,'napló eredete','foglalási rendszer','napló informationalartifact; rendszer eredet','foglalási rendszer naplója'],['numeric','R',2,'eredményszint','hétköznapi kihasználtság','26%; nem26%relatívemelkedés','26 százalékra'],['attribution','U',3,'eredeti idézett vendég identitása',null,'névhiány; nem recepciós','nem tudta azonosítani']]]
];
const corpus=specs.map(([id,domain,sentences])=>({id,domain,sentences,text:sentences.join(' '),authoredSentenceCount:sentences.length,origin:'new assistant-authored synthetic measurement text; not published news'}));
const expected=specs.flatMap(([id,domain,sentences,items])=>items.map(([dimension,status,sentence,role,target,qualifier,evidence],i)=>({id:id+(i+1),snippet:id,dimension,expectedStatus:status==='R'?'RESOLVE':'UNRESOLVED',expectedSemanticRole:role,expectedTargetOwner:target,expectedQualifier:qualifier,evidenceDescription:evidence,sentence,adversarialComposition:sentence!==3,scopeText:sentences[sentence-1]})));
assert.equal(corpus.length,25);assert.equal(expected.length,150);assert.equal(expected.filter(x=>x.expectedStatus==='UNRESOLVED').length,30);
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const write=(name,x)=>fs.writeFileSync(__dirname+'/'+name,JSON.stringify(x,null,2),{flag:'wx'});
write('corpus.json',corpus);write('expected.json',expected);write('selected_items.json',expected.map(({scopeText,...x})=>x));
write('input_manifest.json',{frozenAt:new Date().toISOString(),snippetCount:25,authoredSentences:75,domains:25,totalDecisions:150,unresolvedGold:30,unresolvedShare:.2,adversarialDecisions:expected.filter(x=>x.adversarialComposition).length,authorshipLimitation:'Same assistant authors and adjudicates; independent of model inference, not independent human blind evaluation.',files:Object.fromEntries(['corpus.json','expected.json','selected_items.json'].map(p=>[p,hash(fs.readFileSync(__dirname+'/'+p))])),snippets:corpus.map(x=>({id:x.id,sha256:hash(x.text)}))});
console.log('Frozen: 25 snippets /75 authored sentences /150 decisions /30 abstentions');
