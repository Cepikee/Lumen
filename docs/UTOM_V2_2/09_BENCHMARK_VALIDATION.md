# V2.2 benchmark validation

## Rétegek

- **Core safety tier:** 20 scenario, 45 forrásváltozat, 521–532 szó/forrás.
- **Dense tier:** 5 scenario, 15 forrásváltozat, 720–733 szó/forrás, 4 entity/scenario és 8 observation/forrás.

A két réteg külön reportot kap. A scenario-level report minden mezőnél expected, predicted, matched, false positive és false negative adatot tartalmaz.

## Oracle

`tests/fixtures/v22-intelligence-benchmark/oracle-predictions.cjs` test-only oracle. A kimenet a `normalizeProviderOutput` határon megy át, nem ír DB-t, és nem része a production pipeline-nak. Az oracle core eredménye minden támogatott dimenzióban 1.000, az unsupported prediction rate 0.

## Mutation suite

`tests/unit/v22-intelligence-benchmark-mutation.test.cjs` ellenőrzi:

- elvesztett negációt;
- elvesztett feltételességet;
- hibás attribúciót;
- namesake identity összeolvasztást;
- false és missed conflictet;
- temporal change kihagyását;
- explicit unknown és not-mentioned omission eltérését.

Futtatás:

```text
node --test tests/unit/v22-intelligence-benchmark*.test.cjs
```

Az oracle tökéletes eredménye a mérési útvonal helyességét bizonyítja; nem állítja, hogy a jelenlegi production provider tökéletes.
