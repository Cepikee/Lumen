// ollama-test.js

async function run() {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3:latest", // vagy "llama3", ha azt töltötted le
      prompt: "Foglalj össze röviden magyarul egy hírt: Lando Norris az F1 2025-ös világbajnoka."
    })
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let output = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: false });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          output += parsed.response;
        }
      } catch {
        // ha nem JSON, átugorjuk
      }
    }
  }

  console.log("AI összefoglalás:", output.trim());
}

run().catch(err => console.error("Hiba:", err));
