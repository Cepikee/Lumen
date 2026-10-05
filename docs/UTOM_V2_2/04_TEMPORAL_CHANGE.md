# Temporal change

A benchmark külön kezeli a publication, observation, event, validity és planned future időt. A V22-S05 dátumkonfliktus, a V22-S06 plan/completed külön modalitás, a V22-S16 pedig időben változó terv, amelyet change detectionként kell megjeleníteni.

Elvárt emberi állítás például:

`A közölt tervezett kezdés márciusról júniusra változott.`

Ez nem automatikusan conflict. A változáshoz mindkét claim source-a és evidence-e szükséges.

Az evaluator külön `temporalChangeRecall` mérőszámot ad, és a mutation suite a változás kihagyását ellenőrzi. A dense tier mind az öt scenarioja tartalmaz időbeli változást.
