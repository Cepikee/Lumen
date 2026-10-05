# Claim quality

## Mérési szerződés

A claim összehasonlítás kulcsa: source, predicate, value, unit, subject, scope és event. A puszta szövegegyezés nem elég. Külön mérjük a claim precision/recall értéket, valamint az evidence, attribution, temporal, negation és modality pontosságát.

## Baseline

A jelenlegi alapértelmezett mock claim provider üres listát ad. Ezért a baseline claim recall `0`, precision `N/A`, és minden szemantikai rész-metrika `N/A` (nincs kiértékelhető prediction). A következő körben kontrollált provider kimenetekkel kell lefuttatni a 46 gold claimet.

## Kritikus szabályok

- Negált claim nem alakítható affirmált ténnyé.
- Feltételes jövőbeli állítás nem alakítható végrehajtott eseménnyé.
- Source claim és az UTOM saját állítása külön marad.
- Evidence span nélkül claim nem számít bizonyítottnak.
- Uncertain és unresolved állapotot meg kell őrizni.

Az evaluator scenario-szinten is közli az expected/predicted/matched/FP/FN bontást. A teljes értékű claim matchhez a source, a claim-kulcs és az evidence substring egyezése szükséges. A deterministic text baseline külön reportban fut.
