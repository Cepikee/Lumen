import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";

import ClientLayout from "../components/ClientLayout";
import Analytics from "../components/Analytics";
import BootstrapClient from "../components/BootstrapClient";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const analyticsEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";

export const metadata = {
  metadataBase: new URL(appUrl),
  title: "Utom.hu – AI‑alapú automatikus hírgyártó és híradó platform",
  description:
    "Az Utom egy független, AI-alapú automatikus hírgyártó és híradó platform.",
  openGraph: {
    title: "Utom.hu – AI‑alapú automatikus hírgyártó és híradó platform",
    description:
      "Az Utom egy független, AI-alapú automatikus hírgyártó és híradó platform.",
    url: appUrl,
    siteName: "Utom.hu",
    images: ["/utom.png"],
    locale: "hu_HU",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Utom.hu – AI‑alapú automatikus hírgyártó és híradó platform",
    description: "Az Utom egy független, AI-alapú automatikus hírgyártó és híradó platform.",
    images: ["/utom.png"],
  },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        {/* Faviconok */}
        <link rel="icon" href="/favicon-v2.ico" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* reCAPTCHA */}

      </head>

      <body className="d-flex flex-column min-vh-100">
        <Analytics enabled={analyticsEnabled} />
        <BootstrapClient />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
