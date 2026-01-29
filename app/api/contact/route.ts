import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

// Egyszerű memória alapú rate limit (IP → count)
const rateMap = new Map<string, { count: number; last: number }>();

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const now = Date.now();

    // RATE LIMIT: max 5 kérés / 1 perc / IP
    const entry = rateMap.get(ip) || { count: 0, last: now };
    if (now - entry.last > 60_000) {
      entry.count = 0;
      entry.last = now;
    }
    entry.count++;
    rateMap.set(ip, entry);

    if (entry.count > 5) {
      return NextResponse.json({
        success: false,
        error: "Túl sok kérés. Próbáld újra később.",
      });
    }

    // BODY LIMIT
    const bodyText = await req.text();
    if (bodyText.length > 10_000) {
      return NextResponse.json({
        success: false,
        error: "Túl nagy kérés.",
      });
    }

    const { name, emailFrom, subject, customSubject, message, honey } =
      JSON.parse(bodyText);

    // HONEYPOT (botok kitöltik)
    if (honey && honey.trim() !== "") {
      return NextResponse.json({ success: true });
    }

    // MINIMUM KÜLDÉSI IDŐ (2 sec)
    const sentAt = req.headers.get("x-form-start");
    if (sentAt) {
      const diff = now - Number(sentAt);
      if (diff < 2000) {
        return NextResponse.json({
          success: false,
          error: "Túl gyors küldés.",
        });
      }
    }

    // VALIDÁCIÓ
    if (!name || !emailFrom || !message) {
      return NextResponse.json({
        success: false,
        error: "Hiányzó mezők.",
      });
    }

    if (name.length > 100 || emailFrom.length > 200) {
      return NextResponse.json({
        success: false,
        error: "Érvénytelen mezőhossz.",
      });
    }

    if (message.length > 5000) {
      return NextResponse.json({
        success: false,
        error: "Az üzenet túl hosszú.",
      });
    }

    // EMAIL VALIDÁCIÓ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFrom)) {
      return NextResponse.json({
        success: false,
        error: "Érvénytelen email cím.",
      });
    }

    // SANITIZATION
    const safe = (str: string) =>
      str.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

    const safeName = safe(name);
    const safeEmail = safe(emailFrom);
    const safeMsg = safe(message);

    // CÍMZETT
    const to =
      subject === "press"
        ? "press@utom.hu"
        : "support@utom.hu";

    // TÁRGY MAP
    const subjectMap: Record<string, string> = {
      press: "Média / sajtó megkeresés",
      support: "Rendszer & működés",
      bug: "Hiba bejelentése",
      feature: "Funkciókérés",
      business: "Üzleti megkeresés",
      legal: "Jogi / felhasználási kérdés",
      feedback: "Visszajelzés",
      account: "Fiók / hozzáférés",
      data: "Adatkezelés",
      collab: "Együttműködés",
      custom: customSubject || "Egyéb kérdés",
    };

    const finalSubject = subjectMap[subject] || "Kapcsolat";

    // EMAIL KÜLDÉS
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to,
      subject: finalSubject,
      html: `
        <h2>Új üzenet érkezett a Kapcsolat űrlapról</h2>

        <p><strong>Név:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Kategória:</strong> ${finalSubject}</p>

        <h3>Üzenet:</h3>
        <p>${safeMsg.replace(/\n/g, "<br>")}</p>

        <hr>
        <p style="font-size:12px;opacity:0.6;">Utom.hu – Kapcsolat űrlap</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Ismeretlen hiba.",
    });
  }
}
