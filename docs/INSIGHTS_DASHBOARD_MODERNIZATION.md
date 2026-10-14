# Insights dashboard modernizálás – ellenőrzési jegyzet

## Eredmény
A meglévő /insights oldal változott, új demo oldal és új chart könyvtár nélkül.
1580 px-es konténer, zsugorodó üres panelek, kategória-kártyarács.
Hat kiemelt kategóriás trendgrafikon, clickbait forrásdiagram mintanagysággal,
átlagot mutató hangulat-donut, órás/napi heatmap, rendezett negatív arányok,
−1…+1 hangulat-idősor nullás alapvonallal. A hiányzó hangulatmérés null, nem 0.
A megjelenítés Europe/Budapest időzónát használ.

## API-k
Az oldal a meglévő /api/premium-insights proxy-n keresztül használja:
- gyökér összesítő, timeseries/all, clickbait, clickbait-ratio;
- sentiment/today, sentiment/by-category, sentiment/timeline, trending-keywords:
  immár opcionális 24h/7d/30d/90d period; paraméter nélkül a régi budapesti napi contract marad;
- heatmap, spike-detection, source-activity: külön jelölt Mai modulok;
- source-category-distribution és duplication: választott period;
- speedindex/leaderboard: külön jelölt teljes időszak;
- forecast: legutóbbi tárolt modellkimenet, nem a választott múltbeli időablak;
- /api/forecast-status: futásállapot és időpontok.
A régi timeseries végpont nem az új trendgrafikon adatforrása; az all változat az.

## Javított problémák
- Napi hangulat/kulcsszó KPI nem követte a kiválasztott periódust.
- Hangulat-idősor darabszámot mutatott a kért sentiment score helyett.
- DST-visszaállítás ismételt órájának felülírása és DB-ből stringként kapott sentiment.
- Kulcsszó KPI legfeljebb 20-as listahossz helyett a teljes jogosult kulcsszószámot használja.
- Hiányzó forecast/Speed Index/clickbait számok ne váljanak valódi nullás méréssé.
- Hibás/null sorok kezelése a kiegészítő forráskomponensekben.
- A korábbi oldal belső implementációjához kötött 4 regressziós teszt frissítése.

## Ellenőrzés
- TypeScript: PASS.
- Production build: PASS, 75/75 oldal.
- Insights + általános UI regressziók: 42/42 PASS.
- Célzott ESLint: 0 error, 7 warning (any/unused jelzések).
- API handler tesztek: stubolt DB, valódi route függvények, 4 period,
  napi default, DST 25 órás nap, invalid period, empty és DB error.
- Headless Edge: 1920/1440/900/390 szélesség; feltöltött, empty,
  loading, HTTP error, malformed response. Vízszintes oldalkilógás nem volt.
- Empty/error/malformed esetben 0 chart; feltöltött állapotban rajzolt chartok.
- 7d/30d/90d választás mind a 10 periodos requestben megjelent.
- Böngészős képernyőképek ideiglenesen: E:/Temp/utom-modern-*.png.
- A böngésző API-válaszai kizárólag a tesztfolyamatban voltak elfogva.
  Production UI-ban nincs fixture/mock vagy véletlen statisztika.
- Valódi MySQL integration / valós DB-s böngészőkapcsolat: NEM FUTOTT;
  helyi MySQL listener nem volt elérhető. Ez nem live-data acceptance.
- Forecast szöveges indoklás/confidence mező nem létezik a jelenlegi API-ban;
  a UI csak a mentett számszerű kimenetet jeleníti meg, nem talál ki elemzést.
- Commit, push, deploy: nem történt.

## Módosított / új fájlok
- app/api/insights/forecast/route.ts
- app/api/insights/sentiment/by-category/route.ts
- app/api/insights/sentiment/timeline/route.ts
- app/api/insights/sentiment/today/route.ts
- app/api/insights/speedindex/leaderboard/route.ts
- app/api/insights/trending-keywords/route.ts
- components/InsightsDashboard.module.css
- components/InsightsDashboard.tsx
- components/WSourceCategoryDistribution.tsx
- components/WSourceClickbait.tsx
- components/WSourceClickbaitRatio.tsx
- components/WSourceDuplication.tsx
- components/WSourceSpeedIndexLeaderboard.tsx
- lib/insights-dashboard.ts
- tests/unit/insights-category-number-safety.test.cjs
- tests/unit/insights-dashboard-presentation.test.cjs
- tests/unit/insights-dns-number-safety.test.cjs
- tests/unit/insights-error-render.test.cjs
- tests/unit/insights-forecast-fetch.test.cjs
- components/InsightsCharts.tsx
- tests/unit/insights-dashboard-period-api.test.cjs
- docs/INSIGHTS_DASHBOARD_MODERNIZATION.md (ez a jegyzet)
