"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type DemoData = {
  meta: { schema: string; generatedAt: string; selectedUser: string };
  articles: Array<{ id: number; title: string; contentText: string | null; canonicalUrl: string; publishedAt: string; source: string; category: string | null }>;
  intelligence: { entities: Array<Record<string, unknown>>; relations: Array<Record<string, unknown>>; claims: Array<Record<string, unknown>>; events: Array<Record<string, unknown>>; conflicts: Array<Record<string, unknown>>; timeline: Array<Record<string, unknown>>; comparison: Array<Record<string, unknown>> };
  pipelineTrace: Array<{ step: string; inputCount: number; outputCount: number; status: string }>;
  counts: Record<string, number>;
  entitlement: { selectedUser: string; active: boolean; reason: string; tier: string | null; premiumUntil: string | null };
  demoUsers: Array<{ nickname: string; premium: boolean; premiumUntil: string | null }>;
  retention: { rawPresent: number; rawPurged: number; automaticPurgeOnView: boolean; policy: { successHours: number; failedDays: number }; audit: Array<Record<string, unknown>> };
  evidence: { claimSpans: number; relationSpans: number };
};

const tabs = ["raw", "understood", "comparison", "timeline", "trace", "preview", "expected", "retention"] as const;
type Tab = typeof tabs[number];

function formatDate(value: unknown) {
  if (!value) return "nincs adat";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "érvénytelen dátum" : date.toLocaleString("hu-HU");
}

export default function V2DemoShowcase() {
  const [tab, setTab] = useState<Tab>("raw");
  const [mode, setMode] = useState<"owner" | "engineering">("owner");
  const [user, setUser] = useState("anonymous");
  const [data, setData] = useState<DemoData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (selectedUser: string) => {
    setStatus("loading"); setError(null);
    try {
      const response = await fetch(`/api/dev/v2-demo?user=${encodeURIComponent(selectedUser)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || !Array.isArray(payload.articles)) throw new Error(payload?.error || "A demo válasza érvénytelen.");
      setData(payload as DemoData); setStatus("ready");
    } catch (cause) {
      setStatus("error"); setError(cause instanceof Error ? cause.message : "A demo nem tölthető be.");
    }
  }, []);

  useEffect(() => { void load(user); }, [load, user]);

  const selectedArticle = data?.articles[0] || null;
  const premiumVisible = Boolean(data?.entitlement.active);
  const productLabel = useMemo(() => ({ anonymous: "Névtelen", free: "Free", premium: "Aktív Premium", expired: "Lejárt Premium" }[user] || user), [user]);

  if (status === "loading") return <main className="v2-demo-shell"><div className="v2-demo-loading">A valódi demo read-model betöltése…</div></main>;
  if (status === "error" || !data) return <main className="v2-demo-shell"><div className="v2-demo-error"><h1>V2 Intelligence Demo</h1><p>{error || "A demo adat nem érhető el."}</p><button type="button" onClick={() => void load(user)}>Újrapróbálom</button><p className="v2-demo-muted">A demo csak localhoston, `utom_dev` adatbázissal és explicit flaggel érhető el.</p></div></main>;

  return <main className="v2-demo-shell">
    <header className="v2-demo-hero">
      <div><span className="v2-demo-eyebrow">UTOM V2 · LOCALHOST PRODUCT LAB</span><h1>Mit kapott, mit értett meg és mit mutat az Utom?</h1><p>Három saját készítésű, kontrollált cikkből felépített valódi V2 állapot.</p></div>
      <div className="v2-demo-controls"><label>Nézet<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="owner">Owner mode</option><option value="engineering">Engineering mode</option></select></label><label>Felhasználói állapot<select value={user} onChange={(event) => setUser(event.target.value)}><option value="anonymous">Anonymous</option><option value="free">Free</option><option value="premium">Active Premium</option><option value="expired">Expired Premium</option></select></label></div>
    </header>
    <nav className="v2-demo-tabs" aria-label="V2 demo panelek">{tabs.map((name) => <button key={name} type="button" className={tab === name ? "active" : ""} onClick={() => setTab(name)}>{({ raw: "Nyers cikkek", understood: "Megértés", comparison: "Forrás-összevetés", timeline: "Idővonal + graph", trace: "Pipeline trace", preview: "Olvasói nézet", expected: "Expected vs actual", retention: "Raw retention" } as Record<Tab, string>)[name]}</button>)}</nav>
    <section className="v2-demo-statusbar"><span>Schema {data.meta.schema}</span><span>{productLabel}</span><span>{data.intelligence.entities.length} entity · {data.intelligence.claims.length} claim · {data.intelligence.conflicts.length} conflict</span><span>Frissítve: {formatDate(data.meta.generatedAt)}</span></section>

    {tab === "raw" ? <section className="v2-demo-section"><SectionTitle title="Mit kapott a rendszer?" text="A teljes saját fixture-szöveg fejlesztői környezetben látható, a forrásidentitással és a canonical URL-lel együtt." /> <div className="v2-demo-grid three">{data.articles.map((article) => <article className="v2-demo-card" key={article.id}><div className="v2-demo-card-meta"><strong>{article.source}</strong><span>{formatDate(article.publishedAt)}</span></div><h2>{article.title}</h2><p className="v2-demo-url">{article.canonicalUrl}</p><p>{article.category || "Kategória nélkül"}</p><details><summary>Teljes saját fixture-szöveg</summary><p className="v2-demo-raw">{article.contentText || "RAW TEXT: PURGED"}</p></details></article>)}</div></section> : null}

    {tab === "understood" ? <section className="v2-demo-section"><SectionTitle title="Mit értett meg az Utom?" text="Az állapot közvetlenül a V2 táblákból érkezik. Az unresolved és review állapot nem jelenik meg elfogadottként." /><div className="v2-demo-grid two"><Panel title="Entityk"><div className="v2-demo-list">{data.intelligence.entities.map((entity: any) => <div className="v2-demo-row" key={String(entity.id)}><div><strong>{String(entity.name)}</strong><small>{String(entity.type)} · {String(entity.status)}</small></div><span className={`v2-demo-badge ${entity.status === "accepted" ? "good" : entity.status === "review" ? "warn" : "neutral"}`}>{String(entity.status)}</span>{mode === "engineering" ? <code>#{String(entity.id)} · {entity.confidence == null ? "—" : Number(entity.confidence).toFixed(2)}</code> : null}</div>)}</div></Panel><Panel title="Kapcsolatok"><div className="v2-demo-list">{data.intelligence.relations.map((relation: any) => <div className="v2-demo-relation" key={String(relation.id)}><strong>{String(relation.subject)}</strong><span>→ {String(relation.predicate).replaceAll("_", " ")} →</span><strong>{String(relation.object)}</strong>{mode === "engineering" ? <small>{String(relation.status)} · {relation.confidence == null ? "—" : Number(relation.confidence).toFixed(2)}</small> : null}</div>)}</div></Panel></div><Panel title="Claims"><div className="v2-demo-list">{data.intelligence.claims.map((claim: any) => <div className="v2-demo-claim" key={String(claim.id)}><p><strong>{claim.source} szerint</strong> {claim.subject ? `${claim.subject} — ` : ""}{String(claim.predicate).replaceAll("_", " ")}: <b>{claim.normalizedValue || "nincs normalizált érték"}</b></p><small>{claim.evidence || "Nincs mentett evidence span"} · confidence {claim.confidence == null ? "—" : Number(claim.confidence).toFixed(2)}{mode === "engineering" ? ` · claim #${claim.id} · ${claim.type}` : ""}</small></div>)}</div></Panel></section> : null}

    {tab === "comparison" ? <section className="v2-demo-section"><SectionTitle title="Forrás-összevetés" text="A közös, source-only, hiányzó és eltérő állítások külön láthatók. Konfliktusnál nincs automatikus győztes." /><div className="v2-demo-source-strip">{data.articles.map((article) => <div key={article.id}><strong>{article.source}</strong><span>{article.title}</span></div>)}</div><div className="v2-demo-list">{data.intelligence.comparison.map((item: any) => <div className={`v2-demo-comparison ${item.coverage === "conflict" ? "conflict" : ""}`} key={String(item.predicate)}><div><strong>{String(item.predicate).replaceAll("_", " ")}</strong><span className="v2-demo-badge">{item.coverage === "shared" ? "Mindhárom / közös" : item.coverage === "conflict" ? "Eltérő forrásállítás" : "Source-only"}</span></div><div className="v2-demo-variants">{item.variants.map((variant: any) => <div key={String(variant.value)}><b>{String(variant.value)}</b><small>{variant.sources.join(", ")}</small></div>)}</div>{item.missing?.length ? <small>Erről nem írt: {item.missing.join(", ")}</small> : null}{item.coverage === "conflict" ? <p className="v2-demo-conflict-note">ELLENTMONDÓ / ELTÉRŐ FORRÁSÁLLÍTÁS · Nincs automatikus győztes.</p> : null}</div>)}</div></section> : null}

    {tab === "timeline" ? <section className="v2-demo-section"><SectionTitle title="Idővonal és entity graph" text="A meglévő timeline és relation state egyszerű, mobilon is olvasható nézetben." /><div className="v2-demo-grid two"><Panel title="Idővonal"> <ol className="v2-demo-timeline">{data.intelligence.timeline.slice(0, 8).map((item: any, index) => <li key={String(item.id)}><span>{index === 0 ? "Korábbi esemény" : index === 1 ? "Jelenlegi esemény" : "Tervezett / kapcsolódó lépés"}</span><strong>{String(item.itemType)} #{String(item.itemId)}</strong><small>{formatDate(item.displayAt || item.validAt)}</small></li>)}</ol></Panel><Panel title="Entity graph"><div className="v2-demo-graph">{data.intelligence.relations.slice(0, 5).map((relation: any) => <div key={String(relation.id)}><span>{String(relation.subject)}</span><b>↓ {String(relation.predicate).replaceAll("_", " ")}</b><span>{String(relation.object)}</span></div>)}</div></Panel></div></section> : null}

    {tab === "trace" ? <section className="v2-demo-section"><SectionTitle title="Pipeline trace" text="A fejlesztői accordion minden lépés input/output számát a valódi demo state-ből mutatja." /><div className="v2-demo-trace">{data.pipelineTrace.map((item) => <details key={item.step} open><summary><strong>{item.step}</strong><span>{item.status}</span></summary><div><span>Input: {item.inputCount}</span><span>Output: {item.outputCount}</span><span>Duration: n/a</span></div></details>)}</div>{mode === "engineering" ? <pre className="v2-demo-json">{JSON.stringify(data.pipelineTrace, null, 2)}</pre> : null}</section> : null}

    {tab === "preview" ? <section className="v2-demo-section"><SectionTitle title="Mit lát ebből az olvasó?" text="Ugyanaz a fixture terméknézetben, a fejlesztői technikai részletek nélkül." /><div className="v2-demo-grid two"><Panel title="FREE · Mi történt?"><p>{selectedArticle?.title}</p><p>A Tiszapart vízvédelmi programja új mérőállomásokkal és nyilvános adatokkal indul. Az összefoglaló és az alapvető forrásjelzés minden olvasó számára látható.</p><p className="v2-demo-muted">Előzmény: korábbi árhullám és lakossági riasztási igény.</p></Panel><Panel title="PREMIUM · Mi van mögötte?">{premiumVisible ? <div><p>Az aktív Premium állapot alapján elérhető a részletes context, timeline, source comparison, conflict és attribution.</p><ul><li>Context: elérhető</li><li>Timeline: {data.intelligence.timeline.length} elem</li><li>Forrás-összevetés: {data.intelligence.comparison.length} állítás</li><li>Konfliktus: {data.intelligence.conflicts.length} nyitott</li></ul></div> : <div className="v2-demo-locked"><strong>Premium tartalom zárolva</strong><p>{data.entitlement.reason === "expired" ? "A Premium jogosultság lejárt." : data.entitlement.reason === "not_authenticated" ? "Jelentkezz be az eléréshez." : "Aktív Premium jogosultság szükséges."}</p></div>}</Panel></div></section> : null}

    {tab === "expected" ? <section className="v2-demo-section"><SectionTitle title="Expected vs actual" text="A demo acceptance gyors, emberileg olvasható ellenőrző nézete." /><div className="v2-demo-table-wrap"><table className="v2-demo-table"><thead><tr><th>Intelligence</th><th>Expected</th><th>Actual</th><th>Status</th></tr></thead><tbody>{[["entities", "entityk + unresolved állapot", data.intelligence.entities.length], ["relations", "kapcsolatok", data.intelligence.relations.length], ["claims", "forrásállítások", data.intelligence.claims.length], ["events", "esemény", data.intelligence.events.length], ["conflicts", "nincs automatikus winner", data.intelligence.conflicts.length], ["timeline", "idővonal", data.intelligence.timeline.length], ["comparison", "3 forrás", data.articles.length]].map(([name, expected, actual]) => <tr key={String(name)}><td>{String(name)}</td><td>{String(expected)}</td><td>{String(actual)}</td><td><span className="v2-demo-badge good">PASS</span></td></tr>)}</tbody></table></div><Panel title="Adatbázis számlálók"><div className="v2-demo-counts">{Object.entries(data.counts).map(([name, count]) => <div key={name}><span>{name}</span><strong>{count}</strong></div>)}</div></Panel></section> : null}

    {tab === "retention" ? <section className="v2-demo-section"><SectionTitle title="Raw retention lifecycle" text="A bemutató oldalmegnyitáskor soha nem purge-ol. Az explicit retention worker külön futtatható dry-run/execute módban." /><div className="v2-demo-retention"><div><span>BEFORE PURGE</span><strong>RAW TEXT: {data.retention.rawPresent ? "PRESENT" : "PURGED"}</strong><small>{data.retention.rawPresent} demo article raw body-ja elérhető</small></div><div><span>POLICY</span><strong>{data.retention.policy.successHours}h / {data.retention.policy.failedDays}d</strong><small>UTC, terminal és recovery-safe feltételek mellett</small></div><div><span>AFTER PURGE READ MODELS</span><strong>SUMMARY · ENTITIES · CLAIMS · COMPARISON</strong><small>Az oldal nem indít automatikus törlést.</small></div></div><p className="v2-demo-muted">A tényleges purge műveletet a `npm run retention:raw-text` dry-runja és az explicit execute guard vezérli. Raw szöveg nem kerül a böngésző konzoljába vagy az audit naplóba.</p></section> : null}
  </main>;
}

function SectionTitle({ title, text }: { title: string; text: string }) { return <div className="v2-demo-section-title"><span className="v2-demo-eyebrow">V2 INTELLIGENCE</span><h2>{title}</h2><p>{text}</p></div>; }
function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="v2-demo-panel"><h3>{title}</h3>{children}</section>; }
