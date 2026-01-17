"use client";

import UtomModal from "./UtomModal";

export default function PremiumModal({ onClose }: { onClose: () => void }) {
  return (
    <UtomModal show={true} onClose={onClose} title="Utom Prémium">
      <div className="text-center mb-4">
        <h4 className="fw-bold">A hirdetésmentesség csak a kezdet.</h4>
        <p className="text-muted">
          Az Utom Prémium a minőség új szintje. Olyan eszközöket kapsz, amelyekkel tényleg átlátod a híreket — gyorsabban, tisztábban, okosabban.
        </p>
      </div>

      {/* Árazás blokk */}
      <div className="d-flex justify-content-center gap-3 mb-4">
        <div className="border rounded p-3 text-center" style={{ minWidth: "140px" }}>
          <h5>Havi</h5>
          <p className="fw-bold">1000 Ft / hó</p>
          <small className="text-muted">Bármikor lemondható</small>
        </div>
        <div className="border rounded p-3 text-center bg-light" style={{ minWidth: "140px" }}>
          <h5>Éves</h5>
          <p className="fw-bold">9000 Ft / év</p>
          <small className="text-muted">Megtakarítás: 25%</small>
        </div>
      </div>

      {/* Funkciólista */}
      <div className="mb-4">
        <ul className="list-unstyled">
          <li className="mb-3">
            🔍 <strong>UTOM DNS – hírportál ujjlenyomat</strong><br />
            Minden forrásnak saját digitális lenyomata van. Látod, honnan jön, mennyire megbízható.
          </li>
          <li className="mb-3">
            🧠 <strong>Fake Detektor</strong><br />
            AI kiszűri a manipulált, torzított vagy hamis tartalmakat.
          </li>
          <li className="mb-3">
            🧊 <strong>Clickbait Detektor</strong><br />
            Automatikusan felismeri a kattintásvadász címeket, és visszaveszi a zajt.
          </li>
          <li className="mb-3">
            🧱 <strong>Cikk összehasonlítás</strong><br />
            Több forrás egy kattintással összevetve. Látod, ki mit hallgat el.
          </li>
          <li className="mb-3">
            🧭 <strong>Trendek automatikus súlyozása</strong><br />
            Az Utom AI kiszűri a mesterségesen felfújt témákat — csak a valódi trendek maradnak.
          </li>
          <li className="mb-3">
            💬 <strong>Prémium chat szoba</strong><br />
            Zárt közösség, ahol a prémium tagok beszélgethetnek, vitázhatnak, elemezhetnek.
          </li>
          <li className="mb-3">
            🧑‍⚖️ <strong>Hitelességi szavazás (prémium súlyozással)</strong><br />
            A szavazatod többet ér. A közösségi minőségkontroll így sokkal pontosabb.
          </li>
          <li className="mb-3">
            🧘‍♂️ <strong>Ultra‑minimalista mód</strong><br />
            Csak a lényeg: reklám nélkül, sallang nélkül, egyetlen összefoglalóval (UtomScore).
          </li>
        </ul>
      </div>

      {/* CTA gombok */}
      <div className="d-grid gap-2 mb-3">
        <button className="btn btn-primary">Előfizetés havi csomagra</button>
        <button className="btn btn-outline-primary">Előfizetés éves csomagra (25% kedvezmény)</button>
      </div>

      {/* Lábléc */}
      <div className="text-muted small text-center">
        <p>Az előfizetések automatikusan megújulnak.</p>
        <p>Bizonyos funkciók csak aktív Prémium tagsággal érhetők el.</p>
        <a href="/premium-faq" className="text-decoration-underline">Gyakori kérdések a Prémiumról</a>
      </div>
    </UtomModal>
  );
}
