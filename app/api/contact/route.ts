import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

const rateMap = new Map<string, { count: number; last: number }>();
const failMap = new Map<string, { count: number; last: number }>();
const banSet = new Set<string>();
const emailCooldown = new Map<string, number>();

const MAX_REQ_PER_MIN = 5;
const MAX_FAIL = 10;
const FAIL_WINDOW = 10 * 60_000; // 10 perc
const EMAIL_COOLDOWN_MS = 30_000; // 30 mp

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ua = req.headers.get("user-agent") || "unknown";
    const now = Date.now();

    if (banSet.has(ip)) {
      return NextResponse.json({
        success: false,
        error: "Ideiglenesen blokkolva.",
      }, { status: 429 });
    }

    if (
      ua === "unknown" ||
      /curl|wget|python|scrapy|bot|spider|crawler/i.test(ua)
    ) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Érvénytelen kliens.",
      }, { status: 400 });
    }

    const rateEntry = rateMap.get(ip) || { count: 0, last: now };
    if (now - rateEntry.last > 60_000) {
      rateEntry.count = 0;
      rateEntry.last = now;
    }
    rateEntry.count++;
    rateMap.set(ip, rateEntry);

    if (rateEntry.count > MAX_REQ_PER_MIN) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Túl sok kérés. Próbáld újra később.",
      }, { status: 429 });
    }

    const bodyText = await req.text();
    if (bodyText.length > 10_000) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Túl nagy kérés.",
      }, { status: 413 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      registerFail(ip);
      return NextResponse.json({ success: false, error: "Érvénytelen JSON." }, { status: 400 });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      registerFail(ip);
      return NextResponse.json({ success: false, error: "Érvénytelen kérés." }, { status: 400 });
    }

    const {
      name,
      emailFrom,
      subject,
      customSubject,
      message,
      honey,
      turnstileToken,
    } = parsed as Record<string, unknown>;

    if (typeof honey === "string" && honey.trim() !== "") {
      registerFail(ip);
      return NextResponse.json({ success: true });
    }

    const sentAt = req.headers.get("x-form-start");
    if (sentAt) {
      const diff = now - Number(sentAt);
      if (!Number.isFinite(diff)) {
        registerFail(ip);
        return NextResponse.json({ success: false, error: "Érvénytelen kérés." }, { status: 400 });
      }
      if (diff < 2000) {
        registerFail(ip);
        return NextResponse.json({
          success: false,
          error: "Túl gyors küldés.",
        }, { status: 400 });
      }
    }

    if (typeof emailFrom === "string" && emailFrom) {
      const lastSent = emailCooldown.get(emailFrom) || 0;
      if (now - lastSent < EMAIL_COOLDOWN_MS) {
        registerFail(ip);
        return NextResponse.json({
          success: false,
          error: "Túl gyakori küldés erről az email címről.",
        }, { status: 429 });
      }
    }

    if (
      typeof name !== "string" ||
      typeof emailFrom !== "string" ||
      typeof message !== "string" ||
      !name.trim() ||
      !emailFrom.trim() ||
      !message.trim()
    ) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Hiányzó mezők.",
      }, { status: 400 });
    }

    if (name.length > 100 || emailFrom.length > 200) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Érvénytelen mezőhossz.",
      }, { status: 400 });
    }

    if (message.length > 5000) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Az üzenet túl hosszú.",
      }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailFrom)) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Érvénytelen email cím.",
      }, { status: 400 });
    }

    // TURNSTILE ELLENŐRZÉS
    if (typeof turnstileToken !== "string" || !turnstileToken.trim()) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Hiányzó ellenőrző token.",
      }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({
        success: false,
        error: "Hiányzó szerver konfiguráció.",
      }, { status: 503 });
    }

    const cfRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(
          secret
        )}&response=${encodeURIComponent(turnstileToken)}`,
      }
    );

    if (!cfRes.ok) {
      return NextResponse.json({ success: false, error: "Ellenőrzés átmenetileg nem érhető el." }, { status: 502 });
    }
    let cfData: unknown;
    try {
      cfData = await cfRes.json();
    } catch {
      return NextResponse.json({ success: false, error: "Érvénytelen ellenőrzési válasz." }, { status: 502 });
    }
    if (!cfData || typeof cfData !== "object" || (cfData as { success?: unknown }).success !== true) {
      registerFail(ip);
      return NextResponse.json({
        success: false,
        error: "Ellenőrzés sikertelen.",
      }, { status: 400 });
    }

    const safe = (str: string) =>
      str.replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));

    const safeName = safe(name);
    const safeEmail = safe(emailFrom);
    const safeMsg = safe(message);

    const subjectKey = typeof subject === "string" ? subject : "support";
    const customSubjectText = typeof customSubject === "string" ? customSubject.slice(0, 200) : "";
    const to =
      subjectKey === "press"
        ? "press@utom.hu"
        : "support@utom.hu";

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
      custom: customSubjectText || "Egyéb kérdés",
    };

    const finalSubject = subjectMap[subjectKey] || "Kapcsolat";

    // EMAIL NEKED
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

    // 🔥 AUTOMATIKUS VÁLASZ A FELHASZNÁLÓNAK
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to: safeEmail,
      subject: "Köszönjük a megkeresést – Utom.hu",
      html: `
        <h2>Köszönjük, hogy felvetted velünk a kapcsolatot!</h2>

        <p>Kedves ${safeName},</p>

        <p>Köszönjük az üzenetedet. A rendszerünk sikeresen fogadta a megkeresést, és hamarosan átnézzük.</p>

        <p><strong>Kategória:</strong> ${finalSubject}</p>

        <h3>Az általad küldött üzenet:</h3>
        <p>${safeMsg.replace(/\n/g, "<br>")}</p>

        <p>Általában 24 órán belül válaszolunk, de a forgalomtól függően ez változhat.</p>

        <hr>
        <p style="font-size:12px;opacity:0.6;">Ez egy automatikus visszaigazoló üzenet. Kérjük, ne válaszolj rá.</p>
      `,
    });

    emailCooldown.set(emailFrom, now);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({
      success: false,
      error: "Ismeretlen hiba.",
    }, { status: 500 });
  }
}

function registerFail(ip: string) {
  const now = Date.now();
  const entry = failMap.get(ip) || { count: 0, last: now };
  if (now - entry.last > FAIL_WINDOW) {
    entry.count = 0;
  }
  entry.count++;
  entry.last = now;
  failMap.set(ip, entry);

  if (entry.count >= MAX_FAIL) {
    banSet.add(ip);
  }
}
// Ezzel a kóddal egy Next.js API route-ot hozunk létre a /api/contact útvonalon,
// amely kezeli a kapcsolatfelvételi űrlapok beküldését.
// A kód különböző biztonsági intézkedéseket alkalmaz, mint például
// a kérések gyakoriságának korlátozása, botok elleni védelem Cloudflare Turnstile segítségével,
// valamint a mezők érvényesítése és tisztítása az email küldés előtt.
