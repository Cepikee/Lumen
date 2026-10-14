# Coverage and audit limitations

Original corpus/gold/selected items remain unchanged. No second inference and no
post-output addition to the denominator. This is a synthetic structural stress
sample authored and assessed by the same assistant, not externally independent.

## Coverage map

| Requested layer | Fresh cases |
|---|---|
| Named actor / title | A1, B1–B2, I5, G4 |
| Generic actor, organisation/institution, possessor | G1, H1, J2, K5, R1 |
| Source/actor/recipient separation | A2, D2, G3, Q3, R3 |
| Coordinated/implicit actors; location ambiguity | D3, H5, N1, Q1–Q2, T2 |
| Possessive/bare nominal source | A4, C1, D4, E1, H2, J3, N2, O1, S1 |
| Nested/intermediary source, leading/trailing quotes | F1, G3, I6, P1, Q3 |
| Source plus modality/numeric/negation | C1–C2, E1–E4, K1–K3, O1–O4, S1–S2 |
| Count, money, share, relative percentage change | D5, F4, H3, C2–C4, O2 |
| Compound rates | E2, J4, K2, L4, O2, S2 |
| Bounds, approximate, ranges | C2, E3, H3, J5, M3, N3, O5, P5 |
| Capacity/possible/conditional | F3, K2–K3, O4, S2/S5 |
| Year, full/partial date, clock, deadline | A5, C5–C6, F5, L2, P4 |
| Duration, boundary, multiple temporal roles | E3, H4, F5, R6 |
| Explicit/elliptical/implicit rank | I2–I4, Q6 |
| Stage/round/day/district ordinal | B3/B6, I1, L6, Q5, S6 |
| Count/money/date/percent corrections | S4, L3, P3, O3 |
| Actor/object/source corrections | Q4, B4, G5, R2, T3–T4 |
| Omitted-target/malformed alternatives | T5–T6 |
| Negation/denial/quoted denial | A3, D6, F2, K4, N5, P2 |
| Possibility, obligation, conditional, hypothetical | A5, E3–E4, K3, P6, S4–S5 |
| Negative comparison | O5, M3 |
| Entity boundaries: multiword, title, role, possessive, inflection | B2, D1, G4, J1, N6, R4, T2 |
| Combined adversarial decisions | 16 prelisted IDs in input_manifest.json |

## Coverage gaps — no unearned 100% claim

- No dedicated plain `X szerint` control without a reporting nominal. Possessive
  nominal forms exercise `szerint`, but do not replace this exact microcase.
- No dedicated morphological passive construction. Impersonal active/passive-like
  news usage in N1 and H5 exercises omitted agents, not the full passive system.
- Nested sources are exercised by quotation/reference constructions (F1/P1), but
  there is no clean nested two-finite-reporting-verb control in this fresh set.
- Actor correction Q4 uses a pronoun versus a role, not two explicit named persons.
  This is intentional fresh difficulty, but cannot certify all actor corrections.

The headline volume requirements are met (20 snippets, 60 authored sentences,
120 decisions, 20 domains). The complete requested linguistic subcase checklist
is **PARTIAL**. Do not expand this frozen first pass after observing its output.
Its six wrong resolutions already independently prevent readiness.

## Gold wording errata discovered after inference

No expected.json edits, no denominator edits, no outcome silently relabeled.

1. **L1:** “Az igazgatóhelyettes felolvasott levelében” does not unambiguously prove
   that the deputy personally read the letter aloud. The source tankerület is
   explicit; the prewritten gold overstates the reader identity. Original M label
   retained because even the explicit request source is missing. Independent
   adjudication should revisit the extra reader requirement.
2. **R3:** “Szalai Emesének a jogi képviselője” admits a possessive parse rather than
   uniquely marking Emese as recipient. Original M retained: the explicit legal
   representative is not identified as reporting source either. Recipient gold
   should not become a future regression expectation without clarification.

Neither erratum affects any of the six wrong-resolved items or the FAIL verdict.
The published primary metrics use the original 120-item gold without correction.

## Extra observation outside the denominator

H frame 2 assigns “két ember” headcount to `állapotát`. This deserves later numeric
owner review, but is **not** a 121st decision and is not added to the six measured
wrong resolutions. It belongs to the numeric safety blocker, not a fourth blocker.
