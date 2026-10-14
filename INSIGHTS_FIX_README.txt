UTOM Insights javitas

Felulirando fajlok:
- app/insights/category/[category]/page.tsx
- app/insights/page.tsx
- components/InsightsCharts.tsx
- components/InsightsDashboard.tsx
- components/InsightsDashboard.module.css
- components/WSourceClickbait.tsx
- components/WSourceClickbaitRatio.tsx
- tests/unit/insights-ux-regressions.test.cjs

Javitasok:
- sotet tema Recharts tooltip szovegek olvashatoak, hover szurke overlay kikapcsolva
- hangulatelemzes felirat emberibb: N elemzett cikk alapjan
- Insights informacios ikonok kattintasra magyarazatot nyitnak
- 24h/7d/30d/90d period URL-ben es localStorage-ban megmarad
- kategoriakra kattintva a period tovabbadodik
- kategoriaoldal 24h periodot is kezel
- reszletes clickbait grafikonok dinamikus, kompakt magassaguak
- clickbait tooltip mintanagysagot is mutat
- AI elorejelzes ures allapota erthetobb

Ellenorzes:
- TSX szintaktikai transpile: PASS a 6 modositott TSX fajlon
- celzott regresszios tesztek: 21/21 PASS
- teljes npm build: ebben a sandboxban nem futott, mert node_modules nincs a forrascsomagban es az offline npm cache hianyos
