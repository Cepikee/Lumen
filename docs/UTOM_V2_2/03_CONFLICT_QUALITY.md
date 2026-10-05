# Conflict quality

A gold dataset három valódi konfliktust és több szándékos non-conflict esetet tartalmaz. A konfliktus csak azonos subject, predicate, semantic scope, unit és átfedő temporal scope mellett értelmezhető.

Kiemelt false-conflict esetek:

- azonos szám, de támogatás és teljes projektköltség;
- kilométer és méter azonos távolságra;
- terv és már befejezett próbaszakasz;
- közös tény és source-only részlet;
- névazonosság eltérő személyi kontextussal.

A baseline üres provider miatt false-conflict prediction nincs, ezért a false-conflict rate `N/A`, nem `0%` minőségi állításként. A következő futásban külön kell jelenteni a conflict precisiont, recallt és a hamis konfliktusok okát.

Az oracle és mutation suite ezt ellenőrzi: a false conflict, missed conflict és a unit conversion külön mutációként bukik el. A dense tier jelenleg nem deklarál konfliktust, mert annak célja a coverage, temporal és omission sűrűség.
