# V2.2 determinisztikus szöveg-baseline

## Határ

`lib/v22/deterministic-text-provider.cjs` cikk-szövegből dolgozik. A provider nem olvassa a gold manifestet, nem használ scenario-ID alapján kivételt, és nem ír V2 táblákat. A `scripts/run-v22-deterministic-baseline.cjs` csak a generált articles fixture-t és a normál evaluator boundary-t használja.

## Felismert jelek

- szám és mértékegység;
- dátumjelölő;
- explicit negáció;
- feltételes jelölő;
- egyszerű `szerint` attribúció;
- egyszerű tulajdonnévi entity-jelölt.

A provider szándékosan konzervatív, ezért a bizonytalan szemantikai következtetéseket nem gyártja le. A jelenlegi mérés:

| Tier | Claim precision | Claim recall | Attribution | Evidence | Negation | Modality |
|---|---:|---:|---:|---:|---:|---:|
| Core | 0.0479 | 0.1739 | 0.7500 | 1.0000 | 1.0000 | 1.0000 |
| Dense | 0.2143 | 0.1500 | 0.7222 | 1.0000 | 1.0000 | 1.0000 |

A teljes JSON report: `docs/UTOM_V2_2/10_deterministic_baseline.json`.

Futtatás:

```text
npm run benchmark:v22:deterministic
```
