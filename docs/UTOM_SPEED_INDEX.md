# Utom.hu Speed Index deferred processing

## Call graph és változatlan üzleti szemantika

A referenciaútvonal korábban `pipeline/cron.js` → kötelező article `speed_index` lépés → `pipeline/updateSpeedIndex.js` volt. Minden új cikk után a teljes számítás lefutott. A számítás az aktuális UTC-nap összes clusterét olvassa, clusterenként lekéri a forrásonkénti legkorábbi `articles.published_at` értéket, a legelső forráshoz viszonyított pozitív, legfeljebb 240 perces késéseket átlagolja és mediánolja, majd a `speed_index` és `speed_index_history` táblákat írja. A history kulcsa továbbra is a cluster, a normalizált source és az egy tizedesre kerekített késés SHA-256 azonossága. A közös source-normalizálás (például `24hu` → `24.hu`) változatlan.

A közvetlen `node pipeline/updateSpeedIndex.js` karbantartási út megmaradt. Az alkalmazás API-i a `speed_index` táblát olvassák; szerződésük nem változott. A deferred modell miatt az érték rövid ideig a legutóbbi sikeres batch eredménye lehet.

## Tartós deferred modell

A `028_speed_index_deferred_batch.sql` egyetlen, additív MySQL 8 táblát hoz létre. A jelenlegi algoritmus globális UTC-napi bemenetet olvas, ezért bizonyítatlan részleges újraszámítás helyett egyetlen `utc-day-global:v1` scope maradt. Ez őrzi meg pontosan a referenciaeredményt.

Az article `speed_index` lépés új jelentése: a szükséges globális frissítés ugyanabban az article-step tranzakcióban tartósan ütemezve lett. A lépés nem futtat globális számítást, így az article elérheti a `done` állapotot. A már kész lépést retry esetén a state machine újrahasználja, ezért a generation nem nő meg ismét.

A dirty UPSERT egyetlen sor `generation` számlálóját növeli. Száz egyidejű esemény egy sort és egy pending batch-munkát eredményez, nem száz queue-elemet. A claim feltételes UPDATE-del állít `in_progress` állapotot, rögzíti a worker azonosítóját, egy véletlen claim tokent és a `claimed_generation` értéket. Két worker közül ugyanazt a generációt csak az egyik claimelheti. Lejárt heartbeat esetén a claim átvehető.

A batch a score-okat, a determinisztikus history-eseményeket és a marker completiont egy MySQL-tranzakcióban írja. Bármely számítási, history- vagy completion-hiba rollbacket és retry-képes `failed` állapotot eredményez. Commit előtti processzhalál esetén InnoDB rollbackel; a bent maradt claim a stale idő után átvehető.

A completion csak a claimelt generációt állítja `completed_generation` értékre. Ha számítás közben új dirty jelzés növelte a `generation` értéket, a sor `pending` marad, és a következő batch feldolgozza az új generációt. A claim token és a claimed generation együtt fence-eli a régi vagy elveszett workert.

## Trigger, lifecycle és diagnosztika

A meglévő pipeline worker minden ciklus elején, az article batch előtt legfeljebb egy pending Speed Index batch-et próbál felvenni. Így startupkor a pending, failed vagy stale munka automatikusan folytatható, üres article queue mellett is. Nincs új timer, queue service vagy publikus endpoint. A batch ugyanazt a MySQL poolt használja, a tranzakció minden ágon commitol vagy rollbackel, a kapcsolat pedig felszabadul; a meglévő shutdown zárja a poolt.

A job sor tartalmazza a státuszt, generációkat, claim ownershipot, hibát, sikeres futások számát és az utolsó completion idejét. A worker strukturált eseményt naplóz dirty advance, claim, start, completion és failure esetén.

## Bizonyítás

A valódi MySQL 8 suite ellenőrzi a 100 eseményes coalescingot, concurrent markot, két külön processzes claim-versenyt, stale recoveryt, dirty-during-processing generation race-t, article retryt, history idempotenciát, source aliast, UTC-időszemantikát és a teljes kanonikus pipeline-t. Fault injection bizonyítja a score utáni, history előtti, completion alatti és commit előtti rollbacket. Ugyanazon fixture közvetlen referenciafuttatása és deferred futtatása sorazonos `speed_index` és `speed_index_history` eredményt ad.

A migrációt productionön ez a munka nem futtatja. A repository migrációs runner checksum alapján egyszer alkalmazza; megismételt futtatáskor nem hajtja végre újra.

Az internal health snapshot megjeleníti a pending/stale batch számot, a legrégebbi pending kort, az utolsó sikeres completiont és a generation laget. A health lekérdezés nem indít recalculationt és nem olvassa végig a history táblát.
