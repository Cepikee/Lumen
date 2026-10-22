# UTOM legal safety and copyright compliance hardening

Audit date: 2026-10-22  
Scope: local repository, `develop/utom-recovery` working tree  
Status: technical hardening completed locally; legal conclusions and production activation are not approved

This document records technical facts and open questions. It is not a legal opinion, does not create a licence, and does not classify UTOM as or as not being a press product.

## A. Current operation

### A.1 Actual data flow

1. `app/api/fetch-feed/route.ts` downloads every active, database-registered RSS feed with a non-empty `feed_url` after internal-worker authentication and capability checks.
2. `rss-parser` reads title, link, publication time, GUID and available RSS body fields.
3. `lib/feed-ingestion.js` canonicalizes the URL and source hostname and writes the source payload to `articles.content_text` (maximum 100,000 characters). A source must have an active database record, but it need not be listed in the seven-entry legal registry.
4. `pipeline/cron.js` processes pending articles. If the retained input is shorter than 400 characters, `pipeline/scrapeArticle.js` can fetch the article page through `safe-fetch`. The 444 parser continues to use RSS `content:encoded` and skips redundant page retrieval. Portfolio retains its feed-route fallback page fetch when its feed body is shorter than 500 characters.
5. Short and long AI outputs are created from `articles.content_text`. The source text is wrapped as untrusted prompt data. The current production AI capability remains disabled by environment policy; this audit made no provider call.
6. `pipeline/plagiarismCheck.js` compares generated output with the retained source. Token similarity, exact sentence overlap, long contiguous overlap and direct-quote overlap now produce a review decision.
7. `pipeline/saveSummary.js` stores UTOM-created output in `summaries`. A review-required result receives `ai_clean=0`; public feed, detail metadata, sitemap, related items, source list, trend article projection and V2 public context require `ai_clean=1`.
8. The frontend displays UTOM summaries, source identity and an original-article link. It does not expose `articles.content_text` through the public summary API.
9. Public article images come from UTOM-generated or explicitly reused local generated-image records. The policy registry denies external source-image use without documented rights.

### A.2 Data classes

| Class | Current fields / storage | Publicly returned | Purpose |
|---|---|---:|---|
| Source metadata | canonical URL, original URL, title, source ID/key, time, external ID | selected fields | identity, deduplication, attribution |
| Temporary/raw processing input | `articles.content_text` | no through public summary API | extraction, summaries, V2 evidence, recovery |
| UTOM-created output | `summaries.content`, `detailed_content`, title, category, keywords, trends, V2 projections | yes only when publication-clean | reader product |
| Generated image | `article_images` local storage path, generation status/source type | ready, validated local path only | article illustration |
| Operational/security data | sessions, rate limits, logs, encrypted e-mail outbox | no | security and operation |

Raw text may also enter an AI request when the relevant capability is enabled. Application logs record lengths, IDs and errors; the audited pipeline does not intentionally log the complete article body. Database backups may contain `content_text`; backup retention and deletion need an owner/processor policy.

## B. Copyright and content-use risks

1. A public RSS feed is a technical access route, not proof of permission for commercial reuse, persistent storage or AI processing.
2. Direct article retrieval is technically available for valid public destinations and remains subject to `safe-fetch`. Registry membership is not treated as permission or as a technical download gate; each source still requires source-specific legal and operational review.
3. Full or substantial source text is retained in `articles.content_text` until a separately approved retention run purges it. The purge worker remains dry-run by default and now requires approval plus explicit windows before execution.
4. A paraphrase can still reproduce protected expression or replace the source. Prompt instructions reduce this risk but are not legal clearance.
5. Token-set Jaccard alone missed sentence copying and word order. The added checks create a conservative review hold. Thresholds require real-world tuning and legal/editorial approval.
6. Source attribution and a link are necessary product controls but do not by themselves authorize use.
7. Source-site photographs are not considered reusable merely because the article is accessible. Current public image projection uses generated/local assets; the policy keeps external images denied without documented rights.
8. Schema.org `NewsArticle`, the “hírszolgáltató” wording and the named responsible editor are facts relevant to regulatory classification. No classification conclusion is made here.

## C. Source policy registry

Canonical machine-readable legal-review registry: `lib/source-policy.js`. All listed entries remain `legal_review_required`, require manual legal review and deny external images without documented rights. The registry is evidence and review metadata, not a network allowlist: an otherwise valid, publicly reachable source is not rejected merely because it has no registry entry. Actual network access continues through `safe-fetch` and its SSRF, DNS pinning/rebinding, redirect, port, response-type and size controls.

As of 2026-10-23, RSS execution is driven by active `sources` database records with a non-empty `feed_url`, rather than the seven-entry legal registry. A newly registered source uses a canonical hostname key and the same URL deduplication path. Source-specific parsing for 444.hu, Origo and the Portfolio short-feed fallback remains explicit. Authentication, paywalls and other access restrictions must not be bypassed.

Robots rules and terms are recorded separately. Robots governs crawler instructions and is not treated as a copyright licence. “Unknown” means this audit did not verify an applicable permission, not that use is necessarily unlawful.

| Source | Feed / observed parser path | Direct article path now | Terms / rights evidence | Robots evidence | Assessment |
|---|---|---|---|---|---|
| Telex | `https://telex.hu/rss`; RSS 2.0 parser; title/link/date/GUID and body fields if present | not registry-blocked; `safe-fetch` enforced | [Telex ÁSZF](https://telex.hu/dokumentum/altalanos-szerzodesi-feltetelek) concerns the supporter/user service; a content-reuse permission was not verified | `https://telex.hu/robots.txt` was unavailable to the audit client | legal basis unknown; manual review required |
| 24.hu | `https://24.hu/feed`; RSS parser; body cleaned from RSS when present | not registry-blocked; `safe-fetch` enforced | [24.hu usage terms](https://24.hu/felhasznalasi-feltetelek-20250410/) reserve content/database rights and specify linking/attribution conditions | [robots.txt](https://24.hu/robots.txt) restricts administrative and parameter paths, not a reuse licence | explicit restrictions; written permission/legal analysis required |
| Index | `https://index.hu/24ora/rss/`; RSS parser | not registry-blocked; `safe-fetch` enforced | [Index impressum](https://index.hu/impresszum/) links copyright/contact material; applicable automated-use permission not verified | [robots.txt](https://index.hu/robots.txt) blocks named AI/extended crawlers including GPTBot, ChatGPT-User, Google-Extended and others | machine restriction is material; owner/legal decision required before production continuation |
| HVG | `https://hvg.hu/rss`; RSS parser | not registry-blocked; `safe-fetch` enforced | [HVG publisher terms PDF](https://cdn.hvg.hu/assets/hvghu/documents/HVG-ASZF-2026-04-13.pdf); applicability to article reuse requires review | `https://hvg.hu/robots.txt` returned 403 to the audit client | unknown/restricted; manual review required |
| Portfolio | `https://www.portfolio.hu/rss/all.xml`; RSS parser; feed route also has page fallback below 500 characters | not registry-blocked; `safe-fetch` enforced | [Portfolio copyright statement](https://www.portfolio.hu/info/szerzoi-jogok) expressly reserves copying, processing, storage and redistribution rights, with limited attribution rules | `https://www.portfolio.hu/robots.txt` was unavailable to the audit client | highest documented source risk; written permission/legal decision required |
| 444 | `https://444.hu/feed`; `content:encoded` is treated as full feed content | canonical pipeline skips redundant page retrieval; no legal-registry denial | [444 principles](https://444.hu/alapelveink) is not a reuse licence; applicable permission not verified | [robots.txt](https://444.hu/robots.txt) disallows admin/editorial paths | legal basis unknown; parser-specific RSS behaviour retained |
| Origo | `https://www.origo.hu/publicapi/hu/rss/origo/articles`; RSS body intentionally treated as empty by current parser | not registry-blocked; `safe-fetch` enforced | [Origo impressum entry](https://www.origo.hu/cimke/impresszum-2) identifies Mediaworks and reserved rights; detailed applicable terms require review | [robots.txt](https://www.origo.hu/robots.txt) disallows `/publicapi` generally but explicitly allows `/publicapi/hu/rss/` | feed machine access allowed, reuse licence still unverified |

The live XML endpoints use XML/RSS content types that the documentation browser could not render. The repository parser contract, not an invented feed payload, is therefore the source of truth for field handling. Before production approval, capture dated feed-header and representative-field evidence without persisting full article bodies in this document.

### C.1 Technical policy effects

- Existing seven-source ingestion remains available, and active database-registered RSS sources outside the registry are also processed.
- `app/api/analyze`, Portfolio fallback and the canonical scraper no longer consult the legal registry as an allowlist; all remote retrieval still uses `safe-fetch`.
- An unregistered URL does not create a source row automatically. Registration and activation in `sources` remain required for RSS ingestion.
- 444 keeps its RSS-first parser behaviour, independently of legal-review status.
- No policy value claims permission. Every source remains manual/legal review required.

## D. Data protection and retention

### D.1 Current storage

- Account: e-mail, user profile and password hash.
- Session: hashed session token and expiry.
- Contact: message is sent through the configured mailer; sensitive outbox fields are application-encrypted where queued.
- Consent: `cookie-consent=accepted|rejected` in browser local storage.
- Analytics: Google tag loads only when the environment flag is active and stored consent is `accepted`; sensitive token routes are excluded and query strings are not sent by this component.
- Source input: full or partial feed/page text in `articles.content_text`.

### D.2 Retention control

`scripts/raw-text-retention.cjs` is dry-run unless `--execute` is supplied. Execution now requires all of:

- `UTOM_RETENTION_EXECUTE=true`;
- `UTOM_RAW_TEXT_POLICY_APPROVED=true`;
- explicit `UTOM_RAW_TEXT_SUCCESS_HOURS`;
- explicit `UTOM_RAW_TEXT_FAILED_DAYS`.

The worker protects active claims, incomplete steps, incomplete V2 projection and missing evidence spans, and records an audit row. No deletion was executed during this work. Existing defaults remain useful for dry-run modelling only; they are not represented as legally approved periods.

Open privacy items:

- decide and publish real retention periods for accounts, sessions, logs, backups, analytics and contact mail;
- verify hosting, mail, Cloudflare and analytics processor identities and agreements;
- verify Google Analytics configuration in the live property;
- decide whether a DPIA is required and document its real status;
- define verified account export/deletion execution and backup propagation. Current intake is e-mail/contact based, not self-service.

## E. Implemented fixes

| ID | Technical problem | Fix / control | Risk reduced |
|---|---|---|---|
| LS-01 | no central source-use gate | canonical source policy registry | uncontrolled source expansion |
| LS-02 | internal analyze route could fetch any safe public URL | known-source gate before fetch | unreviewed full-text retrieval |
| LS-03 | scraper used a substring-only 444 exception | canonical policy decision | bypass/misclassification |
| LS-04 | Portfolio fallback bypassed source policy | same gate used before fallback fetch | inconsistent controls |
| LS-05 | Jaccard ignored word order and sentence copying | exact sentence and longest contiguous token checks | verbatim reuse |
| LS-06 | direct quotes were indistinguishable | quote-overlap signal and reason | long quote risk |
| LS-07 | similarity only stored a score | `ai_clean=0` review hold | automatic publication of risky output |
| LS-08 | public readers did not consistently honor the hold | filters in feed, detail metadata, sitemap, related, source/trend/V2 projections | held content leakage |
| LS-09 | prompts did not explicitly prohibit source substitution/copying | independent wording, attribution/modality and quote limits | copying and unsupported claims |
| LS-10 | Analytics ignored the consent banner | affirmative-consent gate and disable flag | non-consensual analytics load |
| LS-11 | banner had no decline choice | “Csak szükséges” state | invalid consent interaction |
| LS-12 | retention execution needed only one operational flag | policy approval plus explicit windows | unapproved deletion schedule |
| LS-13 | disclosure claimed RSS-only operation and automatic regeneration | corrected to actual feed/scrape/review behaviour | misleading technical disclosure |
| LS-14 | legal pages claimed full database encryption | limited claim to evidenced hashes/outbox encryption | unsupported security guarantee |
| LS-15 | pages claimed fixed retention, GA anonymization and completed/available DPIA | removed unsupported claims | inaccurate privacy notice |
| LS-16 | pages promised fixed 14-day/24-hour response | removed unverified SLA | misleading complaint handling |
| LS-17 | legal/copyright/correction contact categories were incomplete | real mail-backed categories added | lost or misrouted complaints |
| LS-18 | external image rights were implicit | per-source deny-without-rights policy plus generated-image audit | unlicensed image reuse |

No source was disabled, no raw data was deleted, no migration was run, no production flag changed and no external AI/provider call was made.

## F. Document discrepancies

| Document statement before audit | Actual operation | Problem | Applied correction / legal follow-up |
|---|---|---|---|
| “only publicly available RSS sources” | six source paths may fetch article pages; Portfolio has an extra fallback | false technical description | corrected |
| high similarity causes automatic regeneration | only a score was stored | false control claim | implemented hold; corrected text |
| every item/source/legal status is always labelled | supported summary views label source/AI, but “legal status” was not stored | overbroad claim | narrowed to verified views |
| complete database encryption | password/session hashes and encrypted mail fields exist; database-at-rest encryption is unproven | unsupported security claim | corrected |
| fixed 30/180-day and 8-year retention | no universal code-enforced schedule proves these periods | unsupported retention promise | removed pending owner/legal approval |
| GA anonymization and retention are configured | repository did not prove live property settings; tag previously ignored consent | unsupported claim and missing control | consent fixed; live settings left for verification |
| completed/available DPIA | no DPIA artifact was verified | unsupported compliance claim | replaced with review requirement |
| fixed 14-day/24-hour response | no workflow enforces it | unsupported SLA | removed; real mail intake retained |
| definitely not a news product / definitely a news service | code contains automated publication, editor wording and `NewsArticle` schema | legal classification cannot be inferred from a label | neutral technical description; lawyer question |

The remaining liability, jurisdiction, limitation, provider-identity and business-identity wording in the legal pages needs a lawyer and owner review. This technical audit did not validate those legal clauses or invent missing company data.

## G. Questions for legal counsel / owner

1. For each of the seven sources, what agreement, statutory basis or licensed use permits feed content, direct page retrieval, temporary full-text storage, AI processing and commercial output?
2. Should 24.hu and Portfolio direct/page processing be suspended pending written permission given their explicit terms? If yes, approve the per-source policy change and impact plan.
3. How should the Index robots restrictions apply to the UTOM crawler and AI-processing purpose? Confirm the appropriate user-agent and whether collection should stop.
4. Is using 444 `content:encoded` as processing input permitted beyond reader/feed use, and what retention is allowed?
5. What raw-text windows are necessary and lawful for successful, failed, disputed and evidence-bearing articles? Approve exact values before enabling execution.
6. What overlap/quote thresholds require human editorial review, rejection or documented quotation treatment?
7. Does UTOM qualify as an internet press product or another regulated media service? Consider automated summaries, responsible-editor wording, regular publication, economic purpose and `NewsArticle` schema.
8. If registration is required, what start date and deadline apply? [NMHH information and forms](https://nmhh.hu/cikk/859/Tajekoztato_a_nyomtatott_es_internetes_sajtotermekek_bejelenteserol_es_nyilvantartasarol) must be reviewed; this audit did not file anything.
9. Who is the verified controller/service provider, hosting provider and each processor, and what identifiers/addresses must be published?
10. What are the actual legal bases and approved retention periods for accounts, sessions, security logs, contact mail, analytics and backups?
11. Is a DPIA required? If one exists, where is the approved version and what public statement is accurate?
12. What formal correction/copyright workflow, response targets, evidence requirements, interim hold rules and appeal/escalation steps should apply?
13. Should UTOM provide self-service export/deletion, or is verified support intake sufficient for the current service?
14. Are generated-image provider terms, output rights and disclosure text acceptable for all commercial uses?

## H. Production introduction plan

1. Legal/owner review the registry and decide each source independently. Do not deploy a blanket allow/deny decision.
2. Review corrected legal copy and provide verified service-provider/processor/retention data.
3. In staging, run feed ingestion with network calls disabled or controlled fixtures; verify both historical and newly registered source behaviour, canonical identity and inactive/unregistered-source rejection.
4. In staging with synthetic content, verify overlap hold: `ai_clean=0` content must be absent from feed, detail, sitemap, related, source and trend article projections.
5. Verify consent in a clean browser: reject produces no Google request; accept loads once; sensitive paths and query tokens are excluded.
6. Run retention in dry-run only. Review audit counts and evidence dependencies. Enabling execution requires separate owner/legal approval and explicit windows.
7. Deploy reversibly after backup and change review. Keep production AI and retention execution disabled until separately approved.
8. After deployment, perform read-only production checks and monitor complaint intake. No existing article deletion or mass source disable is part of this change.

### Minimum complaint workflow

The existing contact form now sends “Helyesbítési kérelem” and “Szerzői jogi kifogás” to the real support mailbox and returns a receipt. Until an admin case system exists, the minimum safe operation is: preserve the received message and headers, assign an internal case ID in the support system, record affected URL/source, triage severity, optionally hold the public summary, record decision/evidence, notify the requester, and record restoration/correction if approved. The application does not promise a fixed response time and does not claim an admin workflow that does not exist.

## Audit conclusion

- Technical problems identified: 18
- Fixed or materially mitigated locally: 18
- Unresolved legal decisions: source permissions, regulatory classification, legal bases/retention, DPIA, processor contracts, complaint policy and image/provider terms
- Legal risk reduction: **HIGH** at technical-control level
- Copyright exposure: **csökkent, de további forrásonkénti vizsgálat szükséges**
- Technical compliance controls: **PARTIAL** (implemented controls pass local verification; legal/operational approvals remain)
- Production readiness: **NO-GO until owner and legal source-policy decisions are recorded**

Commit: NOT CREATED  
Push: NOT EXECUTED  
Deploy: NOT EXECUTED
