import { Agent, run } from "@openai/agents";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY HIANYZIK");
  process.exit(1);
}

const MODEL = "gpt-5.4-mini";

const linguist = new Agent({
  name: "UTOM Hungarian Linguist",
  model: MODEL,
  instructions: `
Te az UTOM V2.2 magyar nyelvész kutatóagentje vagy.
Elemezd a kapott magyar mondat szemantikai és nyelvtani szerkezetét.
Keresd: actor, object, source, numeric ownership, dependency,
birtokos szerkezet, negáció és többértelműség.
Ne találj ki bizonytalan kapcsolatot.
Inkább unresolved, mint magabiztosan hibás.
Adj rövid strukturált jelentést.
`
});

const redTeam = new Agent({
  name: "UTOM Red Team",
  model: MODEL,
  instructions: `
Te az UTOM V2.2 adversarial tesztelője vagy.
A kapott magyar mondat alapján találj olyan értelmezési csapdákat,
amelyek miatt egy semantic binder rossz actort, source-ot vagy
numeric ownert választhat.
Ne javíts kódot.
Adj rövid RED_TEAM_REPORT jelentést.
`
});

const safety = new Agent({
  name: "UTOM Evidence Safety",
  model: MODEL,
  instructions: `
Te az UTOM semantic evidence ellenőrzője vagy.
Vizsgáld meg, mely állítások oldhatók fel tényleges szöveges
bizonyítékkal és melyeknek kell unresolved állapotban maradniuk.
A WRONG_RESOLVED súlyosabb hiba, mint az unresolved.
Adj rövid SAFETY_REPORT jelentést.
`
});

const judge = new Agent({
  name: "UTOM Orchestrator Judge",
  model: MODEL,
  instructions: `
Te vagy az UTOM Brain orchestrator.
Három szakértő jelentését kapod.
Ezekből készíts egyetlen konzervatív semantic döntést.

Kimenet:
ACTOR:
SOURCE:
NUMERIC_BINDINGS:
AMBIGUITIES:
DECISION:
REASON:

Soha ne találj ki olyan bindinget, amelyhez nincs evidence.
`
});

const sentence =
  process.argv.slice(2).join(" ") ||
  "A rendőrség szerint a tanú azt mondta, hogy Kovács Péter cége 2026-ban 120 embert vett fel.";

console.log("\n=== UTOM AGENT NETWORK ===");
console.log("INPUT:", sentence);
console.log("\n3 kutatóagent indul párhuzamosan...\n");

const [l, r, s] = await Promise.all([
  run(linguist, sentence),
  run(redTeam, sentence),
  run(safety, sentence),
]);

console.log("=== LINGUIST ===");
console.log(l.finalOutput);

console.log("\n=== RED TEAM ===");
console.log(r.finalOutput);

console.log("\n=== SAFETY ===");
console.log(s.finalOutput);

console.log("\n=== ORCHESTRATOR ===");

const combined = `
EREDETI MONDAT:
${sentence}

LINGUIST_REPORT:
${l.finalOutput}

RED_TEAM_REPORT:
${r.finalOutput}

SAFETY_REPORT:
${s.finalOutput}
`;

const decision = await run(judge, combined);

console.log(decision.finalOutput);
console.log("\n=== NETWORK COMPLETE ===");
