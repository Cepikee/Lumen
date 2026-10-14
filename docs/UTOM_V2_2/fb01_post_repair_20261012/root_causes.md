# FB-01 investigation before edits

Frozen expected, labels/manual audit and raw frame/token/dependency outputs inspected.

| Case | Expected / actual | Lost feature | Root cause / module |
|---|---|---|---|
| C2 | Potential value exceeds 8e9 EUR / possible equal | greater-than | numeric-scope-safety examines premarkers/postpositions but not governing threshold predicate; numeric path does reach meghaladhatja, whose NLP lemma retains potential suffix. |
| C4 | 6% relative increase / equal percentage | change magnitude | numeric-scope-safety change rule requires a small verb list excluding bővül, despite Ins unit and local predicate dependency. |
| E4 | Windless-condition + possible max11h / possible max11h only | condition | numeric-scope-safety trusts preexisting conditionality and ha; nominal esetén is an obl head with a nominal child, not handled. |
| J5 | 12–18ms range / resolved count12 and unresolved18 | interval + dimension | range regex accepts és only immediately before között; intervening unit blocks detection. Existing generic numeric attachment then promotes the first endpoint. |
| O2 | 412 HUF/kg / resolved412HUF | denominator | compound-rate-safety suffix alternatives omit ónként and ignore Case=Dis; parser lemma kilónként is not normalized. |

Common family: syntactic numeric attachment is treated as equality if a qualifier
detector misses its shape. Fix in the existing numeric-scope and compound-rate
gates, retaining unresolved candidates whenever complete interpretation is unsafe.
No source, actor, rank or general contrast recall repair is in scope.
