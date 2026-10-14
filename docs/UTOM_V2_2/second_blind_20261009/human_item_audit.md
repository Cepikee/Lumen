# SECOND — item-level human audit

Expected semantics were frozen before NLP/inference. Strict full-bundle scoring; partial correct fields do not satisfy an entire selected item. Output frame binding can be unresolved while individual numeric/source edges are positively resolved. Labels assess those edges.

| Item | Dimension | Expected | Actual | Output / assessment |
|---|---|---|---|---|
| P1 | attribution | CORRECT_RESOLVED | WRONG_RESOLVED | P.output.frames[0].source/sourceEvidence: értesülése is emitted as resolved attribution_source; publication possessor and inner spokesman chain are lost. A report noun is not the speaker. |
| P2 | actor | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | P.output.frames[1].actor: Cabinet actor missing; no positive substitute. |
| P3 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | P.output.frames[1].numericArguments[0]: December 3 year null, resolved date, dependency target tárgyalja. |
| P4 | contrast/negation | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | P.output.frames[2].contrasts[0]: Alternatives retained but contrast/actor unresolved; no resolved minister leak. |
| P5 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | P.output.frames[3].polarity: Denied support confined to opposition frame. |
| P6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | P.output.entities[0]: Exact Reggeli Hír organization span, no person split. |
| M1 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | M.output.entities[0]: Kovács Ilona exact PER; title excluded from name. |
| M2 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | M.output.frames[0].source/recipient: Source is local polgármester and recipient képviselőknek; no structured link from title to named Kovács Ilona. Partial source recovery, not a different fabricated speaker. |
| M3 | numeric | CORRECT_RESOLVED | CORRECT_RESOLVED | M.output.frames[0].numericArguments[1]: 64 count owned by bérlakást, attached to felújít. |
| M4 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | M.output.frames[0].numericArguments[0]: 2029 temporal year on renovation predicate. |
| M5 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | M.output.frames[1].numericArguments[0]: Ordinal 4 owned by kerületben, not ranking. |
| M6 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | M.output.frames[1].numericArguments[1]: July/end with null year/day, boundary and exact governing path. |
| E1 | actor | CORRECT_RESOLVED | CORRECT_RESOLVED | E.output.frames[0].actor: Delta Alap named actor, nsubj path to vásárolt. |
| E2 | numeric | CORRECT_RESOLVED | CORRECT_RESOLVED | E.output.frames[0].numericArguments[0]: 22 % property share owned by részesedést. |
| E3 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | E.output.frames[1].numericArguments[0]: 8 % and esett predicate retained, but no change-magnitude/direction; property only percentage. Not explicitly share or another wrong quantity, so incomplete rather than categorical contradiction. |
| E4 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | E.output.frames[2].source: elemző local source with explicit szerint and exact source span; legacy evidence lacks a stored dependency proof. |
| E5 | contrast/negation | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | E.output.frames[2].contrasts[0]: Nominal predicate correction misclassified as actor candidate but unresolved; money also unresolved. |
| E6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | E.output.entities[0]: Delta Alap exact organization span. |
| C1 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | C.output.frames[0..1]: Quote and hangsúlyozta reporting fragment separated; named person actor on reporting fragment does not establish quote-source edge. |
| C2 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | C.output.frames[0].polarity: lemond denied inside quote. |
| C3 | actor | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | C.output.frames[2].actor: gyár actor missing. |
| C4 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | C.output.frames[2].numericArguments[0..1]: Partial date October 8 and clock 06:45 separately resolved to same restart predicate. |
| C5 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | C.output.frames[2].numericArguments[2]: Ordinal 3 modifies gyártósort. |
| C6 | numeric | CORRECT_RESOLVED | CORRECT_RESOLVED | C.output.frames[3].numericArguments[0]: 31 person/headcount owned by dolgozó in shift clause. |
| R1 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | R.output.frames[0].source/recipient: kapitányság source, lapnak recipient, governed cáfol predicate. |
| R2 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | R.output.frames[0].numericArguments[0]: Age 52 candidate exists but no owner and unresolved. |
| R3 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | R.output.frames[0].numericArguments[1]: km/h denominator preserved and scope denied; candidate unresolved, so not a successfully resolved rate. |
| R4 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | R.output.frames[0].polarity/modalities: denied_claim with counterfactual, Cnd, hypotheticalContext true. |
| R5 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | R.output.frames[1].source: szakértő own chain/source for second quote, no inheritance from police. |
| R6 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | R.output.frames[1].polarity: Hitelesség proposition denied. |
| B1 | actor | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | B.output.frames[0].actor: Woman actor absent; ambulance not promoted. |
| B2 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | B.output.frames[0].numericArguments[0]: 2 retained as unknown unresolved without child owner. |
| B3 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | B.output.frames[1].actor: No guessed treating actor; injured patients not actor. |
| B4 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | B.output.frames[2].actor: No resolution among driver or passenger. |
| B5 | entity boundary | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | B.output.entities/frames[0].syntacticRoles: No false named entity, but no positive woman generic-human representation; negative half alone does not satisfy full expected bundle. |
| B6 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | B.output.frames[1..2].polarity: Both asserted polarity, no negation introduced by viszont. |
| S1 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | S.output.frames[0].numericArguments[0]: Ordinal 5 attaches to fordulójában. |
| S2 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | S.output.frames[0].numericArguments[1]: Rank 2 resolved, owner head Nagy lies in unique exact Nagy Emese entity; same frame full actor Nagy Emese and matching nsubj. Head-only stored rank owner is documented, not a different person. |
| S3 | ordinal/rank | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | S.output.frames[1].numericArguments: No first-place argument emitted for Bence. |
| S4 | ordinal/rank | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | S.output.frames[2].numericArguments[0]: Rank 3 unresolved with null owner for Bori or Noémi. |
| S5 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | S.output.frames[3..4]: fogalmazott reporter and quote separated; no source. |
| S6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | S.output.entities[0]: Exact Nagy Emese PER span. |
| W1 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | W.output.frames[0].numericArguments[0]: Compound km/hour retained unresolved; threshold qualifier missing. Safety abstention, not resolved threshold. |
| W2 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | W.output.frames[1].conditionality/status: Suspension frame conditional and has antecedent trigger. |
| W3 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | W.output.frames[1].actor: No guessed suspension agent. |
| W4 | numeric | CORRECT_RESOLVED | WRONG_RESOLVED | W.output.frames[2].numericArguments[0]: 4 emitted resolved count with unit count and owner fokhoz (lemma f); temperature reference/comparison lost. |
| W5 | numeric | CORRECT_RESOLVED | WRONG_RESOLVED | W.output.frames[2].numericArguments[1] and modalities: 9 emitted resolved C measurement; modalities only reported, Mood Ind, hypothetical false. Potential mérhetnek not represented. Strict qualifier-safety error, not a claim that canonical DB facts were written. |
| W6 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | W.output.frames[2].source: meteorológus resolved szerint source and exact dependency path. |
| T1 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | T.output.frames[0].source/recipient: szolgáltató source and utasoknak recipient. |
| T2 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | T.output.frames[0].contrasts[0] and numericArguments[0]: Aug 6 rejected, Aug 9 accepted with year null, positive opening and only accepted resolved date. |
| T3 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | T.output.frames[1].numericArguments[0]: Second day ordinal, not rank. |
| T4 | numeric | CORRECT_RESOLVED | CORRECT_RESOLVED | T.output.frames[1].numericArguments[1]: 14 count owned by vonat on közlekedik. |
| T5 | numeric | CORRECT_RESOLVED | WRONG_RESOLVED | T.output.frames[2].numericArguments[1] and modalities: 240 emitted as resolved bare count; no upper-bound qualifier, capacity role or possible modality. legfeljebb and vihet scope omitted. |
| T6 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | T.output.frames[0].actor: Opening actor remains null rather than source promoted to actor. |
| I1 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | I.output.frames[0].source and syntacticRoles: Szabó Dénes source recovered; organisation possessor/role relation absent, so selected composite only partially satisfied. |
| I2 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | I.output.frames[0].numericArguments[0]: 800 csomag/second retained as unresolved compound candidate; not an absolute count, but no resolved rate. |
| I3 | actor | CORRECT_RESOLVED | CORRECT_RESOLVED | I.output.frames[1].actor: Tóth Éva full actor with predicate path. |
| I4 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | I.output.frames[1].contrasts[0]/object: szoftver rejected; érzékelő accepted; positive kicserél action. |
| I5 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | I.output.frames[2].numericArguments[0]: 3 hour duration with át and local dependency proof. |
| I6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | I.output.entities / frames[1].actor: Tóth Éva exact PER and actor, not source/object. |
| H1 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | H.output.frames[0].source and chain: klinika vezetője source phrase, governing head vezetője, not clinic alone. |
| H2 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | H.output.frames[0].contrasts[0]: 90 rejected and 72 accepted, no resolved rejected numeric. |
| H3 | numeric | CORRECT_RESOLVED | CORRECT_RESOLVED | H.output.frames[0].numericArguments[0]: 72 count with accepted evidence főből, bound to áll in waiting-list proposition; owner is semantic slot not clinic. |
| H4 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | H.output.frames[1..2]: válaszolta attribution unsupported; no quote source or recipient edge. |
| H5 | contrast/negation | CORRECT_RESOLVED | CORRECT_RESOLVED | H.output.frames[1].polarity: Opening new practice denied. |
| H6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | H.output.frames[0].source and chain structuralEvidence: Single possessive source phrase; structural head vezetője and separate nominal clinic token, no two named people invented. |
| O1 | actor | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | O.output.frames[0..1].actor: School actor not recovered across unresolved contrast. |
| O2 | contrast/negation | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | O.output.contrasts[0]: Omitted-target correction unresolved, neither alternative positively resolved. |
| O3 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | O.output.frames[1].numericArguments[0]: 26 unknown unresolved; target not inherited. |
| O4 | temporal | CORRECT_RESOLVED | CORRECT_RESOLVED | O.output.frames[2].numericArguments[0]: September 2 boundary with null year. |
| O5 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | O.output.frames[3].numericArguments[0]: Ordinal 3 owned by nap, not rank. |
| O6 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | O.output.frames[3].actor: Announcement actor remains null. |
| N1 | ordinal/rank | CORRECT_RESOLVED | CORRECT_RESOLVED | N.output.frames[0].numericArguments[0]: Second stage ordinal attaches to szakaszában. |
| N2 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | N.output.entities[0]: Északi Energia Zrt. exact organization span. |
| N3 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | N.output.frames[0].numericArguments[1]: 36 unknown unresolved; MW/capacity not structured. |
| N4 | actor | CORRECT_RESOLVED | CORRECT_RESOLVED | N.output.frames[0].actor: Északi Energia Zrt. actor with governing telepített evidence. |
| N5 | contrast/negation | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | N.output.frames[1..2]/contrasts[0]: Rate correction unresolved; accepted 5 candidate does not become resolved share. |
| N6 | actor | CORRECT_UNRESOLVED | CORRECT_UNRESOLVED | N.output.frames[3].actor: Chosen contractor not emitted as actor; no guessed active selector. |
| K1 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | K.output.attributionChains[0]: Resolved folyóirat -> labor szóvivője chain, parent edges retained. |
| K2 | temporal | CORRECT_RESOLVED | WRONG_RESOLVED | K.output.frames[0].numericArguments[0] and modalities: 2030 year resolved but full selected expectation includes possible starting event: output modalities asserted/reported, no possible flag; uncertainty missing. Same scope failure as K3, two fixed selected dimensions, not two independent bugs. |
| K3 | contrast/negation | CORRECT_RESOLVED | WRONG_RESOLVED | K.output.frames[0].modalities/hypotheticalContext: kezdődhet possibility absent; asserted/reported, Ind and false hypothetical. Strict qualified-proposition safety error. |
| K4 | ordinal/rank | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | K.output.frames[1].numericArguments[0]: Ordinal 9 exists but unresolved. |
| K5 | attribution | CORRECT_RESOLVED | CORRECT_RESOLVED | K.output.frames[1].source: Kiss Áron full speaker reference and exact report evidence; legacy evidence lacks explicit stored dependency proof. |
| K6 | temporal | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | K.output.frames[2].numericArguments[0]: Only November partial candidate; day 11 missing and unresolved, promised modality retained. |
| F1 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | F.output.frames[0].numericArguments[0]/contrasts: 580 HUF retained but unresolved; no full corrected price relation. |
| F2 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | F.output.frames[1].numericArguments[0]: 40 unknown unresolved, not a structured price delta. |
| F3 | numeric | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | F.output.frames[2..3].numericArguments: Age 67 disappears; 2 unknown unresolved; neither relation properly structured. |
| F4 | attribution | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | F.output.frames[2].source: Buyer source cleared by unresolved attribution scope. |
| F5 | contrast/negation | CORRECT_RESOLVED | MISSED_DEFENSIBLE_RESOLUTION | F.output.frames[3].polarity: Price report polarity unresolved instead of denied; no false 580 binding to package. |
| F6 | entity boundary | CORRECT_RESOLVED | CORRECT_RESOLVED | F.output.entities[0]: Fenyő Piac exact organization, no Fenyő person. |
