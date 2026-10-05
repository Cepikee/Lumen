# V2.2 acceptance

Az első session elfogadási állapota:

| Gate | Állapot |
|---|---|
| 20 mandatory scenario | PASS |
| 2–4 source variant/scenario | PASS |
| 500–1200 words/source | PASS |
| machine-readable gold manifest | PASS |
| direct DB writes from oracle | PASS – nincs |
| reproducible empty-provider baseline | PASS |
| dense tier: 5 × 3 sources, 700–1200 words | PASS |
| oracle provider-boundary validation | PASS – core perfect, no DB writes |
| mutation/anti-cheat suite | PASS |
| deterministic text baseline | PASS – separate measured report |
| intelligence bug fixes | N/A – baseline session |
| `V22-INT-F001` owner presentation mapping | PASS – targeted regression |
| showcase scenario selector | OPEN – következő slice |
| paid AI | 0 |
| production | untouched |

Parancsok:

```text
node scripts/generate-v22-benchmark.cjs
node scripts/run-v22-benchmark.cjs
node --test tests/unit/v22-intelligence-benchmark.test.cjs
```

Az első session nem állít 100%-os quality célt. A következő acceptance gate-ben a precision-first kritikus szemantikákat (negation, subject identity, attribution, false conflict) külön kell mérni.
