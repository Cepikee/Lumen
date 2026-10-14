# #003 – kizárólag befagyasztás utáni diagnosztika

Forrás: változatlan `../real_world/003_source_article.txt`. Teljes új nyers eredmény: `04_article003_diagnostic.json`. E futás után sem binder-, sem evaluator-, sem goldmódosítás nem történt. A cikk állításait nem ellenőriztük külső forrásból; a mérés a megadott szöveg megértéséről szól.

186 frame, 39 resolved; 29 számemlítés, 9 resolved számkötés. A 605 egyedi evidence span mind pontosan megfelel a raw UTF-16 offsetnek. Canonical claim/event/relation/conflict projection OFF, mindkét kimeneti lista üres. Ez a nullakonfliktus nem konfliktusdetektor-eredmény.

## A kért diagnosztikai pontok

| Ellenőrzés | Tényleges eredmény | Megítélés |
|---|---|---|
| 100% feldolgozottság | frame6: ownerType=process, owner=feldolgozás, property=completion | Helyes; nem Flávio eredménye |
| Flávio47,3% | frame6: owner=Flávio Bolsonaro, entity/share, resolved | Helyes |
| Lula45,16% | frame7: owner=Lula, entity/share, resolved | Helyes |
| „tagadta, hogy … elkövetett volna” | frame59: source=Bolsonaro; denied; Cnd; logical conditional=false | A célzott elkülönítés helyes. Az actor omitted; counterfactual túl erős |
| Entity typing | Lula egy helyen organization; Flávio Bolsonaro egy helyen location; Miolo bár neve person | Nem stabil |
| Source role | Guardian/rendőrség/CNN több helyen helyes; frame53 és82 hibás beszélő | FAIL |
| Tariff + year | frame138: 2025-ben jelölt évre is vám/tariff_rate kerül; unresolved marad. 50 százalékos egysége hiányzik | Nem biztonságos általános megoldás |

## Bizonyított hibás resolved frame-ek

Az indexek nullától indulnak, a nyers JSON `output.frames` tömbjében kereshetők. Ez a diagnosztikai alsó korlát nem kerül vissza a frozen held-out goldjába.

| Frame | Kimeneti hiba | Mit támaszt alá a forrás? |
|---:|---|---|
| 25 | actor=Bolsonaro, action=kér | A választók kérnek Bolsonaro ígéreteiből |
| 27 | actor=Lula, action=ad | A választók adnak esélyt Lulának; az életkor80 helyes, a cselekvő nem |
| 50 | actor=Jair Bolsonaro, action=újraválaszt | A volt minisztert választották újra; Bolsonaro birtokos kontextus |
| 54 | actor=Flávio Bolsonaro, action=indul | Eljárás indult ellene, nem Flávio az eljárás cselekvője |
| 56 | actor=Banco Master, action=vizsgál | Az ügy/nyomozás vizsgálja a bank összeomlását |
| 66 | polarity=denied | A „már nem is annyira sejtelmes” a fenyegetőzés jelzője; nem tagadja az igyekezetet |
| 74 | actor=Lula, action=érint | A korrupciós vádak érintik a fiát/tanácsadóját |
| 93 | 27→Jair Bolsonaro/age | Huszonhét éves büntetés időtartama, nem Jair életkora |
| 103 | actor=Bolsonaro, action=fektet | Bolsonaro támogatói fektettek hangsúlyt valamire |
| 104 | actor=bíróság, action=mozdíthat | A szenátorok mozdíthatják el a bírákat |
| 139 | actor=Jair Bolsonaro, polarity=denied, action=büntet | Az amerikai fél bünteti az eljárást; „nem titkolva” nem tagadja a büntetést |
| 149 | actor=Trump, action=nyer | Trump iránt elkötelezett jelöltek nyernek |
| 162 | polarity=denied | „Brazília jobbra fordult, és nem is kicsit”: a fő állítás pozitív |
| 172 | actor=Flávio Bolsonaro, action=szavaz | A munkások/megnevezett szavazók szavaznak rá |
| 184 | modality=asserted | „A másik opció, hogy…” jövőbeli lehetőség, nem bizonyított tény |

Legalább **15/39 resolved frame** tartalmaz hibás actor/property/polarity/modalitást. Ez nem a held-out 0/60 számlálójának része, és nem teljes, külső szakértővel adjudikált cikkpontosság. A számkötések között legalább **1/9** biztosan hibás (frame93). A frame107 ország→elnök és frame148 személy→győzelme leképezése további nominalizációs/owner–actor kockázat; ezeket a 15-ös alsó korlát nem tartalmazza.

## Unresolved frame sem jelent minden mezőre biztonságot

| Frame | Hibás nem-null mező | Ok |
|---:|---|---|
| 5 | recipient=megszakításokkal | Instrumentalis körülmény nem címzett |
| 53 | source=Bolsonaro; reportingVerb=ígér | A mondatot Lula mondta, a Bolsonaro családra utalva. Az előző ígéret és a következő idézet összevonódik |
| 82 | source=Lula Munkáspártja; recipient=szempontjából | A beszélő Flávio; a párt a mondat témája, a szempont nem címzett |
| 155 | recipient=gyülekezőhelynek | Dativus jelzői szerkezet, nem közlési címzett |
| 138 | year2025→tariff_rate | Közeli vám-szó felülírja a year tulajdonságot; a binding unresolved, mégis hamis owner/property marad |

A mezőket nem szabad a teljes frame `unresolved` jelzésének figyelmen kívül hagyásával biztos adatként fogyasztani. A source/címzett mezőknek önálló kockázatjelzésre vagy kiürítésre lenne szükségük; ebben a körben a stop rule miatt nem módosítottuk őket.

## Feltétel, tagadás, modalitás

A Cnd nem kapcsolja be automatikusan a logikai feltételt, ez a célzott javítás működik. A hosszú cikkben azonban a frame22 következmény nem örökli a későbbi, közbevetéssel elválasztott ha-feltételt. A frame59 denial-counterfactual címke túl erős; frame135 célmondat és184 opció assertedként jelenik meg. A negáció nem-szemantikai tokenkeresése frame66/139/162 esetén téves polaritást ad. Ezért a teljes logical/scope és entailment gate nem PASS.

## Következtetés

A rövid adversarial példákon mért előrelépés valós; a hosszú szövegben a roles/scope továbbra sem production-safe. #003 ismert diagnosztikai adat, nem új generalizációs bizonyíték. Új valós vakteszt elé a biztonsági lezárás még nem engedhető. Javítás csak külön következő körben, új development és új frozen held-out mellett.
