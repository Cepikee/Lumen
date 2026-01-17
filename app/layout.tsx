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
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        {/* reCAPTCHA */}
        <script
          src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`}
          async
          defer
        />

        {/* Google Analytics */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-TZ5DTR2N2S"
        ></script>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-TZ5DTR2N2S');
            `,
          }}
        />
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
