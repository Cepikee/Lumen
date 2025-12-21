import './globals.css';
import Link from "next/link";
import "bootstrap/dist/css/bootstrap.min.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const setInitialTheme = `
    (() => {
      try {
        const stored = localStorage.getItem('theme');
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = stored ?? (systemDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-bs-theme', theme);
      } catch {}
    })();
  `;

  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: setInitialTheme }} />
      </head>
      <body className="d-flex flex-column min-vh-100">
        {/* NAVBAR */}
        <nav className="navbar navbar-expand-lg bg-body shadow-sm sticky-top">
          <div className="container-fluid">
            <Link href="/" className="navbar-brand fw-bold">💡 Lumen AI</Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav ms-auto">
                <li className="nav-item">
                  <Link href="/" className="nav-link">🏠 Főoldal</Link>
                </li>
                <li className="nav-item">
                  <Link href="/trends" className="nav-link">Kulcsszavak</Link>
                </li>
                <li className="nav-item">
                  <a className="nav-link" href="#">Beállítások</a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

       
        {/* MAIN */}
        <main className="flex-grow-1 container-fluid px-0 py-4">
  <div className="container" style={{ maxWidth: "1100px" }}>
    {children}
  </div>
</main>


        {/* FOOTER */}
        <footer className="bg-body-tertiary border-top py-3 mt-auto">
          <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center small">
            <div className="d-flex gap-3 mb-2 mb-md-0">
              <a href="#" className="link-secondary">Kapcsolat</a>
              <a href="#" className="link-secondary">Adatvédelem</a>
              <a href="https://github.com/" target="_blank" className="link-secondary">GitHub Repo</a>
            </div>
            <p className="text-muted mb-0">© 2025 Lumen AI | Next.js + Ollama + MySQL</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
