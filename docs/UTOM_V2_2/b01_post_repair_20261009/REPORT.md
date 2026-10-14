# B01 compound measurement / numeric-role safety

2026-10-09 · research-only · canonical projection OFF

## Root cause és javítás

A korábbi numeric réteg a numerator → unit → predicate út alapján resolved
measurement/money/count értéket adott, de nem ellenőrizte a distributive,
periodic vagy slash nevezőt. W3-ban így a km/hour sebességküszöb km méréssé
csonkolódott. Pozitív dependency-út önmagában nem bizonyított teljes egységet.

Új research loss-prevention gate a meglévő binding után:

- `compound.numerator`: value, baseUnit, originalKind, eredeti evidence;
- `compound.denominators`: per-unit, marker form, evidence, dependency path;
- `compound.qualifiers`: bound/comparison/delta/conditional threshold
  marker és evidence; nem automatikusan absolute property;
- teljes compound evidence, numerator út, frameId;
- `semanticKind=compound_rate`, object unit `{numerator, denominator}`;
- `scopeStatus=candidate_only`, binding unresolved, owner/subject null;
- nincs resolved bindingEvidence és nincs canonical projection.

A slash és ragozott distributive mintázatok általánosak. A napi/havonta stb.
táblázat morfológiai értékdekódolás; a unit nincs néhány mértékegységre szűkítve.
Ismeretlen denominator felszíni/lemma formában megmarad, nem találunk ki hozzá
canonical egységet. Ha nem bizonyított az attachment vagy több szám osztozik
a scope-on, csak unresolved candidate tárolódik. Nincs proximity-only positive
binding. Ez konzervatív abstentiont okozhat összetett clause-okban.

Nem állítjuk, hogy a production schema képtelen rate-et tárolni: nem változtattuk
és nem integráltuk. A research binderben nincs teljes, igazolt pozitív rate-owner
feloldás, ezért ebben a körben minden compound argumentum unresolved. Ez
szándékos safety fallback, nem a teljes rate-felismerés funkcionális lezárása.

## Regressziók

21 új, helyi HuSpaCy-val ténylegesen annotált mondat több domainből;
23 új teszt: egyszerű távolság, inflected km/hour, slash km/h, méter/másodperc,
liter/perc, kérés/másodperc, HUF/hour/month, napi betegszám, területre vetített
tömeg, ismeretlen unit, upper/lower/under comparison, comparative delta,
inflected count delta, duration/clock/percentage negatív kontroll,
attributed rate, ambiguous correction, exact evidence és W3.

Az ambiguous rate correction továbbra is unresolved: a régi B03 contrast
hiányt nem javítottuk. A rejected numerator nem kap pozitív resolved státuszt;
az accepted candidate teljes denominatort őriz. Nem állítjuk, hogy ez teljes
pozitív correction resolution. B02/B03 implementációja érintetlen maradt.

Minden jelenlegi `tests/unit/v22-*.test.cjs`: **266/266 PASS, 0 FAIL**.
A korábbi 243 teszt változtatás nélkül megmaradt. Nem futott full project suite,
production build/preflight; nincs production change, commit, push, deploy vagy
fizetős agenthálózat.

## POST_REPAIR — befagyasztott corpus újrajátszása

Pontosan a korábbi hét raw mintát és befagyasztott HuSpaCy-annotációit játszottuk
újra az új binderrel. Ez a binder-változást izolálja; nem új független vakteszt.
A BEFORE_REPAIR corpus/expected/raw/labels/metrics/freeze/verification és minden
más korábbi audit-artefaktum SHA-256-ja változatlan (historical_integrity.json).
A régi könyvtárba nem írtunk.

Csak W outputja változott. A másik hat minta byte-equivalent JSON outputot
adott; W-ben a numerator-csonkolás helyett compound unresolved candidate áll.
A többi előre rögzített item címkéje változatlan. Új WRONG_RESOLVED nem látható
a kiválasztott 39 döntésen; ez nem univerzális hibamentességi állítás.

W3 BEFORE: resolved measurement, value 60, unit km, threshold nélkül.
W3 POST: unresolved compound_rate, numerator 60 km, denominator hour,
conditional-reaches threshold evidence megőrizve, owner null.

W3 címke: WRONG_RESOLVED → MISSED_DEFENSIBLE_RESOLUTION. Nem nevezhető
CORRECT_UNRESOLVED-nek, mert a nyers szöveg sebessége értelmezhető; a rendszer
nem oldja fel pozitívan. A 39-es nevező változatlan.

| Metrika | BEFORE | POST |
|---|---:|---:|
| Correct resolved | 25 | 25 |
| Wrong resolved | 1 | 0 |
| Correct unresolved | 2 | 2 |
| Missed defensible resolution | 11 | 12 |
| Resolved precision | 25/26 = 96,15% | 25/25 = 100% |
| Resolution rate | 26/39 = 66,67% | 25/39 = 64,10% |
| Correct-resolution coverage | 25/39 | 25/39 |
| Exact evidence offsets | 299/299 | 302/302 |

## Fájlok ebben a körben

- scripts/experimental/compound-rate-safety.cjs (új)
- scripts/experimental/real-text-a-binder.cjs (research gate bekötése)
- tests/fixtures/real-text-a/rate-annotations.json (új)
- tests/unit/v22-compound-rate-safety.test.cjs (új)
- docs/UTOM_V2_2/real_text_round_a/09_b01_before_hashes.json
- docs/UTOM_V2_2/b01_post_repair_20261009/ (külön POST artefaktumok)

## Státusz

B01: PASS a tesztelt loss-prevention / safe-fallback invariánsokra.
Pozitív compound rate owner és teljes szemantikai resolution: továbbra nincs.
B02 és B03: érintetlen, nyitott; új outputjuk nincs.

NEXT_REAL_WORLD_BLIND_TEST_READY: NO

A következő külön blocker B02: forrásvesztés és idézet utáni mondatkihagyás.
Ennek javítását ebben a körben nem kezdtük el.
