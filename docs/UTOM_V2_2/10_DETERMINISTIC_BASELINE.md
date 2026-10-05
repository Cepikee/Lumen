# V2.2 determinisztikus szöveg-baseline

## Határ

`lib/v22/deterministic-text-provider.cjs` cikk-szövegből dolgozik. A provider nem olvassa a gold manifestet, nem használ scenario-ID alapján kivételt, és nem ír V2 táblákat. A `scripts/run-v22-deterministic-baseline.cjs` csak a generált articles fixture-t és a normál evaluator boundary-t használja.

## Fagyasztott benchmark-azonosító

`v22.benchmark.1`; evaluator `v22.evaluator.3`. A report a generált articles
fixture és gold manifest SHA-256 hashét, valamint a provider konfigurációját is
tartalmazza.

## Felismert jelek

- szám és mértékegység;
- dátumjelölő;
- explicit negáció;
- feltételes jelölő;
- egyszerű `szerint` attribúció;
- context-bound tulajdonnévi entity-jelölt és namesake identity hint;
- canonical predicate/unit mapping és explicit abstention.

A provider szándékosan konzervatív, ezért a bizonytalan szemantikai következtetéseket nem gyártja le. Az integrity-korrigált jelenlegi mérés:

| Tier | Claim precision | Claim recall | Attribution | Evidence | Negation | Modality |
|---|---:|---:|---:|---:|---:|---:|
| Core | 0.5806 | 0.3913 | 0.8333 | 1.0000 | 1.0000 | 0.7778 |
| Dense | 0.5700 | 0.4750 | 0.7719 | 1.0000 | 1.0000 | 0.9123 |

A teljes JSON report: `docs/UTOM_V2_2/10_deterministic_baseline.json`. A gold
unmatched legacy rate és a source-grounded truly unsupported rate külön mező.

Precision Hardening Round 1 top-50 false-positive riport: `docs/UTOM_V2_2/11_false_positives_top50.json`; supported-subset mérőszámok ugyanebben a JSON reportban szerepelnek.

Futtatás:

```text
npm run benchmark:v22:deterministic
```
