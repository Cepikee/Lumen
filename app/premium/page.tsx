"use client";

export default function PremiumPage() {
  return (
    <main style={{ backgroundColor: "#f8f9fa", paddingBottom: "80px" }}>
      {/* Felső szakasz – Bevezető + Árazás */}
      <section style={{ padding: "60px 20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "20px" }}>
          A hirdetésmentesség csak a kezdet. Az Utom Prémium a minőség új szintje.
        </h1>
        <p style={{ maxWidth: "600px", margin: "0 auto", color: "#555", fontSize: "1.1rem" }}>
          Olyan eszközöket kapsz, amelyekkel tényleg átlátod a híreket — gyorsabban, tisztábban, okosabban.
        </p>

        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "30px",
          marginTop: "40px",
          flexWrap: "wrap"
        }}>
          <div style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px 30px",
            minWidth: "200px",
            backgroundColor: "white",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>1000 Ft / hó</h3>
          </div>

          <div style={{
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px 30px",
            minWidth: "200px",
            backgroundColor: "#e9f7ef",
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
          }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "10px" }}>9000 Ft / év</h3>
            <p style={{ color: "#28a745", fontWeight: "bold" }}>Megtakarítás: 25%</p>
          </div>
        </div>
      </section>

      {/* Funkciólista – ikon + szöveg + leírás */}
      <section style={{ padding: "60px 20px", backgroundColor: "white" }}>
        <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: "bold", marginBottom: "40px" }}>
          Az Utom prémium csomagja:
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "40px",
          maxWidth: "1000px",
          margin: "0 auto"
        }}>
          {[
            {
              icon: "🔍",
              title: "UTOM DNS – hírportál ujjlenyomat",
              desc: "Minden forrásnak saját digitális lenyomata van. Látod, honnan jön, mennyire megbízható."
            },
            {
              icon: "🧠",
              title: "Fake Detektor",
              desc: "AI kiszűri a manipulált, torzított vagy hamis tartalmakat."
            },
            {
              icon: "🧊",
              title: "Clickbait Detektor",
              desc: "Automatikusan felismeri a kattintásvadász címeket, és visszaveszi a zajt."
            },
            {
              icon: "🧱",
              title: "Cikk összehasonlítás",
              desc: "Több forrás egy kattintással összevetve. Látod, ki mit hallgat el."
            },
            {
              icon: "🧭",
              title: "Trendek automatikus súlyozása",
              desc: "Az Utom AI kiszűri a mesterségesen felfújt témákat — csak a valódi trendek maradnak."
            },
            {
              icon: "💬",
              title: "Prémium chat szoba",
              desc: "Zárt közösség, ahol a prémium tagok beszélgethetnek, vitázhatnak, elemezhetnek."
            },
            {
              icon: "🧑‍⚖️",
              title: "Hitelességi szavazás (prémium súlyozással)",
              desc: "A szavazatod többet ér. A közösségi minőségkontroll így sokkal pontosabb."
            },
            {
              icon: "🧘‍♂️",
              title: "Ultra‑minimalista mód",
              desc: "Csak a lényeg: reklám nélkül, sallang nélkül, egyetlen összefoglalóval (UtomScore)."
            }
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "20px" }}>
              <div style={{ fontSize: "2.5rem" }}>{item.icon}</div>
              <div>
                <h4 style={{ marginBottom: "8px", fontSize: "1.2rem" }}>{item.title}</h4>
                <p style={{ color: "#555" }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA gombok */}
      <section style={{ padding: "40px 20px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", gap: "20px", flexWrap: "wrap" }}>
          <button className="btn btn-primary">Előfizetés havi csomagra</button>
          <button className="btn btn-outline-primary">Előfizetés éves csomagra (25% kedvezmény)</button>
        </div>
      </section>

      {/* Lábléc */}
      <section style={{ textAlign: "center", color: "#777", fontSize: "0.9rem" }}>
        <p>Az előfizetések automatikusan megújulnak.</p>
        <p>Bizonyos funkciók csak aktív Prémium tagsággal érhetők el.</p>
        <a href="/premium-faq" className="text-decoration-underline">Gyakori kérdések a Prémiumról</a>
      </section>
    </main>
  );
}
