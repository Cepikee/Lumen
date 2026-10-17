import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";
import { db } from "@/lib/db";
import { getIp, requireTrustedOrigin } from "@/lib/security";
import { consumeRateLimitFailClosed } from "@/lib/shared-rate-limit";

const MAX_BODY = 10_000;
const MAX_MESSAGE = 5_000;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

export async function POST(req: Request) {
  try {
    const originDenied = requireTrustedOrigin(req);
    if (originDenied) return originDenied;

    const ip = getIp(req);
    const now = Date.now();
    const ipAllowed = await consumeRateLimitFailClosed(db, {
      scope: "contact-ip",
      identity: ip,
      limit: 5,
      windowMs: 60_000,
    });
    if (!ipAllowed) {
      return NextResponse.json({ success: false, error: "Túl sok kérés. Próbáld újra később." }, { status: 429 });
    }

    const bodyText = await req.text();
    if (bodyText.length > MAX_BODY) {
      return NextResponse.json({ success: false, error: "Túl nagy kérés." }, { status: 413 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return NextResponse.json({ success: false, error: "Érvénytelen JSON." }, { status: 400 });
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ success: false, error: "Érvénytelen kérés." }, { status: 400 });
    }

    const { name, emailFrom, subject, customSubject, message, honey, turnstileToken } = parsed as Record<string, unknown>;
    if (typeof honey === "string" && honey.trim() !== "") return NextResponse.json({ success: true });

    const sentAt = req.headers.get("x-form-start");
    if (sentAt) {
      const diff = now - Number(sentAt);
      if (!Number.isFinite(diff) || diff < 2000) {
        return NextResponse.json({ success: false, error: "Érvénytelen vagy túl gyors küldés." }, { status: 400 });
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
      return NextResponse.json({ success: false, error: "Hiányzó mezők." }, { status: 400 });
    }

    const normalizedEmail = emailFrom.trim().toLowerCase();
    if (name.length > 100 || normalizedEmail.length > 254 || message.length > MAX_MESSAGE) {
      return NextResponse.json({ success: false, error: "Érvénytelen mezőhossz." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ success: false, error: "Érvénytelen email cím." }, { status: 400 });
    }

    const emailAllowed = await consumeRateLimitFailClosed(db, {
      scope: "contact-email",
      identity: normalizedEmail,
      limit: 2,
      windowMs: 30_000,
    });
    if (!emailAllowed) {
      return NextResponse.json({ success: false, error: "Túl gyakori küldés erről az email címről." }, { status: 429 });
    }

    if (typeof turnstileToken !== "string" || !turnstileToken.trim()) {
      return NextResponse.json({ success: false, error: "Hiányzó ellenőrző token." }, { status: 400 });
    }
    const secret = process.env.TURNSTILE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ success: false, error: "Hiányzó szerver konfiguráció." }, { status: 503 });
    }

    const verifyBody = new URLSearchParams({ secret, response: turnstileToken });
    if (ip !== "direct" && ip !== "unknown") verifyBody.set("remoteip", ip);
    const cfRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody.toString(),
      signal: AbortSignal.timeout(10_000),
    });
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
      return NextResponse.json({ success: false, error: "Ellenőrzés sikertelen." }, { status: 400 });
    }

    const subjectKey = typeof subject === "string" ? subject : "support";
    const customSubjectText = typeof customSubject === "string" ? customSubject.trim().slice(0, 200) : "";
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

    const safeName = escapeHtml(name.trim());
    const safeEmail = escapeHtml(normalizedEmail);
    const safeMessage = escapeHtml(message.trim()).replace(/\n/g, "<br>");
    const safeSubject = escapeHtml(finalSubject);
    const to = subjectKey === "press" ? "press@utom.hu" : "support@utom.hu";

    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to,
      subject: finalSubject.replace(/[\r\n]+/g, " "),
      html: `
        <h2>Új üzenet érkezett a Kapcsolat űrlapról</h2>
        <p><strong>Név:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Kategória:</strong> ${safeSubject}</p>
        <h3>Üzenet:</h3>
        <p>${safeMessage}</p>
        <hr>
        <p style="font-size:12px;opacity:0.6;">Utom.hu – Kapcsolat űrlap</p>
      `,
    });

    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to: normalizedEmail,
      subject: "Köszönjük a megkeresést – Utom.hu",
      html: `
        <h2>Köszönjük, hogy felvetted velünk a kapcsolatot!</h2>
        <p>Kedves ${safeName},</p>
        <p>Köszönjük az üzenetedet. A rendszerünk sikeresen fogadta a megkeresést, és hamarosan átnézzük.</p>
        <p><strong>Kategória:</strong> ${safeSubject}</p>
        <h3>Az általad küldött üzenet:</h3>
        <p>${safeMessage}</p>
        <p>Általában 24 órán belül válaszolunk, de a forgalomtól függően ez változhat.</p>
        <hr>
        <p style="font-size:12px;opacity:0.6;">Ez egy automatikus visszaigazoló üzenet. Kérjük, ne válaszolj rá.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Ismeretlen hiba." }, { status: 500 });
  }
}
