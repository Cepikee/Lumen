# Runtime – tényleges helyi mérés

Modellbetöltés: 1045.2 ms. Cold start + teljes #003 első kérés: 5941.5 ms. Újraindítás + rövid ellenőrző kérés: 1444.8 ms.
Worker csúcs RSS: 595.3 MiB. Ez a Python-folyamat high-water markja, nem teljes gép/WSL RAM.

| Sorozat | Teljes idő | Átlag / szöveg | P50 | P95 | Szöveg/s | Karakter | Token |
|---|---:|---:|---:|---:|---:|---:|---:|
| 100 | 143.12 s | 1431.23 ms | 1789.99 ms | 1897.53 ms | 0.699 | 1178554 | 192044 |
| 500 | 687.83 s | 1375.66 ms | 1729.24 ms | 1811.24 ms | 0.727 | 5873256 | 957150 |

Mindkét sorozat a három változatlanul átadott #001/#002/#003 szöveget ismételte, sorban, egy perzisztens workerrel. Hossz: 15040 / 5388 / 14830 UTF-16 kódegység. A #002 a felhasználó által átadott részlet. Nem 600 független cikk, nem minőségi újramérés, és egyik kimenet alapján sem történt tuning. A warm idő tartalmazza a WSL transportot, nyelvi elemzést és E kötést.

A korábbi ~23 ms „article” valójában 10 darab 70–118 karakteres szintetikus mondat ismétléséből származott. A mostani teljes szöveges latency ezzel közvetlenül nem hasonlítható. A korábbi ~636 MB memóriaérték eltérő környezetből származik; nem kontrollált javulás/regresszió. Az induló mérés alatt a quality/MySQL gate részben párhuzamosan futott.
