export default function KapcsolatPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">

      {/* Cím */}
      <h1 className="text-4xl font-bold text-center">Kapcsolat</h1>

      {/* Leírások */}
      <div className="space-y-6 text-lg leading-relaxed">

        <p>
          Ha kérdésed van az Utom működésével, technológiájával vagy médiamegkereséssel kapcsolatban, ezen a címen tudsz elérni:
        </p>

        <div className="space-y-2">
          <p>
            <strong>press@utom.hu</strong><br />
            <span className="opacity-70">média, sajtó, együttműködés</span>
          </p>

          <p>
            <strong>support@utom.hu</strong><br />
            <span className="opacity-70">technikai kérdések, hibajelentés</span>
          </p>
        </div>

        <p>
          Az Utom egy független, AI‑alapú automatikus hírgyártó és híradó platform.  
          A rendszer fejlesztését és üzemeltetését egyetlen fejlesztő végzi.
        </p>
      </div>

      {/* Whitepaper szekció */}
      <div className="border-t pt-10 space-y-4">
        <h2 className="text-2xl font-semibold">Whitepaper</h2>

        <p className="text-lg leading-relaxed">
          Az Utom hivatalos Whitepaper dokumentuma kizárólag <strong>befektetők és vásárlók</strong> számára érhető el, akik az Utom technológiájának megvásárlását vagy integrációját fontolgatják.
        </p>

        <ul className="list-disc pl-6 text-lg">
          <li>csak <strong>fizikai formátumban</strong> érhető el</li>
          <li>kizárólag <strong>előzetes egyeztetés</strong> után</li>
          <li><strong>NDA</strong> (titoktartási megállapodás) aláírását követően</li>
        </ul>

        <p className="text-lg">
          A dokumentum részletesen bemutatja az Utom architektúráját, működési modelljét, technológiai alapjait és a hosszú távú fejlesztési irányokat.
        </p>
      </div>

    </div>
  );
}
