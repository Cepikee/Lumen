# Source omission

A forrás által nem közölt adat `missing coverage`, nem pedig elhallgatás. A gold manifest explicit omission rekordokat tartalmaz, például V22-S01 és V22-S17 esetén az Index nem közöl összeget.

Elvárt megjelenítés:

`Az Index a vizsgált cikkben nem közölt összeget.`

A baseline nem jósol omissiont, ezért omission recall `0`, precision `N/A`.

Az omission állapot része a contractnak: `not_mentioned` és `explicit_unknown` nem cserélhető fel. A dense tier mindegyik scenarioja tartalmaz legalább egy kontrollált source omissiont.
