# V1 AI-költségvédelem és kontrollált próbaüzem

Állapot: **implementálva, alapértelmezetten kikapcsolva**. Ez a dokumentum előkészítési és üzemeltetési terv; a fejlesztési körben production adatbázis, provider, feature flag és service nem változott.

## Védelmi modell

A kanonikus V1 pipeline nyolc fizetős lépése ugyanazt a védelmet használja: rövid és hosszú összefoglaló, kategória, sentiment, cím, kulcsszavak, clickbait és embedding. Az ingestion, plágium-/publikációs ellenőrzés, trendmentés, forrásmentés, clustering és Speed Index nem indít fizetős AI-hívást. A külön TTS- és képgeneráló szolgáltatás nem része ennek a V1 cikk-pilotnak, ezért azokat a pilot alatt kikapcsolva kell tartani.

Minden valós provider-hívást megelőz egy MySQL-tranzakció. A tranzakció `SELECT ... FOR UPDATE` zárral sorosítja ugyanannak a pilotnak a napi, havi és teljes keretét, majd egyedi operation key alatt lefoglalja a konzervatív felső költséget. Emiatt párhuzamos workerek sem foglalhatnak a közös limit fölé. A napi, havi és pilot limitek külön-külön érvényesülnek.

A foglalás a bemenet UTF-8 bájthosszát token-felső korlátnak veszi, hozzáad 4096 token prompt-tartalékot, a konfigurált maximális outputot teljes egészében felszámítja, majd legalább 1,25-ös biztonsági szorzót alkalmaz. Ismeretlen modell, hiányzó vagy hibás ár, kikapcsolt guard, 2000 Ft fölötti pilotlimit és modell/ár eltérés esetén a worker fail-closed módon el sem indul.

Az OpenAI SDK automatikus retry értéke nulla. A foglalás `started` állapotba kerül közvetlenül a provider-hívás előtt. Timeout, provider-hiba, hiányzó usage, válasz utáni ledger-hiba vagy processzkiesés esetén az operation `uncertain` marad, a teljes foglalás bennmarad a keretben, a pipeline-lépés pedig `needs_recovery` állapotba kerül. Automatikus újrahívás nincs. A foglalás csak sikeres, usage-adattal igazolt hívás után alakul tényleges költséggé.

## Kötelező VPS kapuk

A production aktiválás előtt egy, kizárólag a VPS loopback interfészén elérhető, `_test` végű adatbázison kell futtatni a MySQL acceptance tesztet. A teszt a kanonikus migrációs runnerrel önállóan felviszi ezt a tesztadatbázist a szükséges sémaverzióra; a megadott felhasználónak ezért kizárólag ezen a tesztadatbázison kell DDL-jogosultság. Ez nem indít provider-hívást. Két párhuzamos foglalással bizonyítja, hogy a közös keret nem léphető túl, majd provider-timeoutot modellez és ellenőrzi, hogy ugyanaz az operation nem hívható újra.

```bash
cd /srv/utom/app
export UTOM_MYSQL_TEST_OPT_IN=true
export UTOM_TEST_MYSQL_URL='mysql://TEST_USER:TEST_PASSWORD@127.0.0.1:3306/utom_ai_cost_test'
npm run test:integration:mysql:ai-cost
unset UTOM_TEST_MYSQL_URL UTOM_MYSQL_TEST_OPT_IN
```

PASS nélkül a próbaüzem **NO-GO**.

## 1–3 napos pilot konfiguráció

Javasolt korlátok: napi 750 Ft, havi 2000 Ft, teljes pilot 2000 Ft. A 3000 Ft rendelkezésre álló összegből így legalább 1000 Ft szervezeti tartalék marad. A napi limit három nap alatt sem írja felül a teljes 2000 Ft-os plafont.

Az alábbi ármezőket közvetlenül az aktiválás előtt az OpenAI hivatalos díjtáblájából, az aktuális elszámolási deviza dokumentált HUF-konverziójával kell kitölteni. Becsült, emlékezetből vett vagy üres ár mellett a worker nem indulhat.

```dotenv
UTOM_PAID_AI_ENABLED=true
AI_PROVIDER=openai
REAL_AI_ENABLED=true
AI_COST_GUARD_ENABLED=true
AI_COST_PILOT_ENABLED=true
AI_COST_PILOT_ID=v1-pilot-YYYYMMDD
AI_COST_DAILY_LIMIT_HUF=750
AI_COST_MONTHLY_LIMIT_HUF=2000
AI_COST_PILOT_LIMIT_HUF=2000
AI_COST_SAFETY_MULTIPLIER=1.5
OPENAI_MODEL=gpt-4o-mini
AI_COST_CHAT_MODEL=gpt-4o-mini
AI_COST_EMBEDDING_MODEL=text-embedding-3-small
AI_COST_PRICING_VERSION=operator-verified-YYYYMMDD
AI_COST_CALL_TIMEOUT_MS=60000
AI_COST_CHAT_INPUT_HUF_PER_MILLION=<ELLENŐRZÖTT_HUF_ÁR>
AI_COST_CHAT_OUTPUT_HUF_PER_MILLION=<ELLENŐRZÖTT_HUF_ÁR>
AI_COST_EMBEDDING_INPUT_HUF_PER_MILLION=<ELLENŐRZÖTT_HUF_ÁR>
```

## Aktiválás

Az aktiválás csak review-zott commitból, friss adatbázismentéssel és a fenti VPS acceptance PASS után végezhető. A migrációk additívak. A webszolgáltatást nem kell leállítani, de a pipeline workert a migráció és konfiguráció közben le kell állítani.

```bash
sudo systemctl stop utom-pipeline
cd /srv/utom/app
sudo systemd-run --wait --pipe --collect --unit=utom-ai-db-status -p User=utom -p Group=utom -p WorkingDirectory=/srv/utom/app -p EnvironmentFile=/etc/utom/production.env -E DB_MIGRATION_ENABLED=true -E UTOM_MIGRATION_TARGET=production -E UTOM_PRODUCTION_BACKUP_CONFIRMED=true /usr/bin/npm run db:status
sudo systemd-run --wait --pipe --collect --unit=utom-ai-db-migrate -p User=utom -p Group=utom -p WorkingDirectory=/srv/utom/app -p EnvironmentFile=/etc/utom/production.env -E DB_MIGRATION_ENABLED=true -E UTOM_MIGRATION_TARGET=production -E UTOM_PRODUCTION_BACKUP_CONFIRMED=true /usr/bin/npm run db:migrate:local
sudoedit /etc/utom/production.env
sudo systemd-run --wait --pipe --collect --unit=utom-ai-cost-status -p User=utom -p Group=utom -p WorkingDirectory=/srv/utom/app -p EnvironmentFile=/etc/utom/production.env /usr/bin/npm run ai:cost:status
sudo systemctl start utom-pipeline
sudo systemctl status utom-pipeline --no-pager
sudo journalctl -u utom-pipeline -n 100 --no-pager
```

Megjegyzés: a migration CLI környezeti változókat olvas, `.env` fájlt szándékosan nem tölt be. Ha a host shell nem kapja meg a systemd environment fájl változóit, az operátor a host jóváhagyott secret-kezelőjén keresztül adja át ugyanazokat; a secret értékeket nem szabad historyba vagy dokumentumba másolni.

## Megfigyelés

Az első órában 10 percenként, utána legalább óránként:

```bash
cd /srv/utom/app
sudo systemd-run --wait --pipe --collect --unit=utom-ai-cost-status -p User=utom -p Group=utom -p WorkingDirectory=/srv/utom/app -p EnvironmentFile=/etc/utom/production.env /usr/bin/npm run ai:cost:status
sudo journalctl -u utom-pipeline --since '15 minutes ago' --no-pager | grep -E 'ai_cost_|external_operation_|step_failed'
```

A státusz parancs cikkenként nem közöl tartalmat; pilot scope-onként mutatja a limitet, a még foglalt és a tényleges költséget, a maradékot, a hívásszámot, a feldolgozott cikkek számát és a tokeneket. `uncertain` megjelenésekor a workert le kell állítani és az operationt manuálisan egyeztetni kell a provider usage adataival. Automatikus retry tilos.

## Azonnali leállítás

```bash
sudo systemctl stop utom-pipeline
sudo systemctl status utom-pipeline --no-pager
cd /srv/utom/app
sudo systemd-run --wait --pipe --collect --unit=utom-ai-cost-status -p User=utom -p Group=utom -p WorkingDirectory=/srv/utom/app -p EnvironmentFile=/etc/utom/production.env /usr/bin/npm run ai:cost:status
```

A keret elérésekor a worker automatikusan pause állapotba kerül: nem indít új ingestiont vagy provider-hívást, a még el nem kezdett cikket `pending` állapotba teszi, de életben marad és heartbeatet küld. Így a systemd nem indít restart-loopot. Új UTC-nap napi keretét csak operátori felülvizsgálat és service-restart után kezdi használni.

## Visszaállítás

```bash
sudo systemctl stop utom-pipeline
sudoedit /etc/utom/production.env
# UTOM_PAID_AI_ENABLED=false
# REAL_AI_ENABLED=false
# AI_COST_PILOT_ENABLED=false
# AI_COST_GUARD_ENABLED=false
sudo systemctl start utom-pipeline
sudo systemctl status utom-pipeline --no-pager
```

Kódrollbacknél a korábbi review-zott release-re kell visszaváltani, majd a service-t újraindítani. A 065–066 migráció tábláit nem kell és nem szabad ad hoc módon visszatörölni: additívak, az audit- és bizonytalansági bizonyítékot őrzik. `uncertain` foglalást csak dokumentált manuális provider-egyeztetés után szabad külön recovery eljárásban rendezni.

## Stop feltételek

- bármely `uncertain` AI-operation;
- tényleges plusz foglalt költség eléri bármely scope limitjét;
- hiányzó usage vagy ár-/modellkonfigurációs hiba;
- ismétlődő provider timeout vagy 5xx;
- feldolgozási adatintegritási hiba;
- a status lekérdezés vagy a MySQL ledger elérhetetlensége.

A pilot csak akkor nevezhető GO-nak, ha az offline quality gate és a VPS MySQL concurrency/failure acceptance is PASS, az aktuális árakat az operátor ellenőrizte, a production backup elkészült, és az AI kapcsolók a kezdés pillanatáig kikapcsolva maradtak.
