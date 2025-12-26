import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import ClientLayout from "../components/ClientLayout";

export const metadata = {
  title: "Utom.hu – AI‑alapú hírtrend elemzés",
  description:
    "Valós idejű hírtrendek, spike‑detektálás és kategorizálás több száz magyar forrásból.",
  openGraph: {
    title: "Utom.hu – AI‑alapú hírtrend elemzés",
    description:
      "Valós idejű hírtrendek, spike‑detektálás és kategorizálás több száz magyar forrásból.",
    url: "https://utom.hu",
    siteName: "Utom.hu",
    images: ["/og-image.png"],
    locale: "hu_HU",
    type: "website",
  },
};

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
        <ClientLayout>{children}</ClientLayout>

        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          defer
        ></script>
      </body>
    </html>
  );
}
