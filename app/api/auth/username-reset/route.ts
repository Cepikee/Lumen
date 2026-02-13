import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";

// IP kinyerése reverse proxy mögül
function getIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export async function POST(req: Request) {
  try {
    const ip = getIp(req);

    // 🔐 1) User azonosítása cookie alapján
    const cookie = req.headers.get("cookie") || "";
    const match = cookie.match(/session_user=([^;]+)/);

    if (!match) {
      return NextResponse.json({
        success: false,
        message: "Nem vagy bejelentkezve.",
      });
    }

    const userId = match[1];

    // 🔥 2) Body beolvasása
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({
        success: false,
        message: "Érvénytelen kérés.",
      });
    }

    const { newUsername } = body;

    if (!newUsername) {
      return NextResponse.json({
        success: false,
        message: "Új felhasználónév megadása kötelező.",
      });
    }

    // 🔥 3) Validáció
    const username = String(newUsername).trim();

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({
        success: false,
        message: "A felhasználónév 3–20 karakter között lehet.",
      });
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        message:
          "A felhasználónév csak betűket, számokat, pontot, kötőjelet és aláhúzást tartalmazhat.",
      });
    }

    if (/^[0-9]+$/.test(username)) {
      return NextResponse.json({
        success: false,
        message: "A felhasználónév nem lehet csak szám.",
      });
    }

    // 🔥 4) Jelenlegi user lekérése
    const [rows]: any = await db.query(
      "SELECT email, nickname, username_changed_at FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Felhasználó nem található.",
      });
    }

    const user = rows[0];

    if (user.nickname === username) {
      return NextResponse.json({
        success: false,
        message: "Ez már a jelenlegi felhasználóneved.",
      });
    }

    // 🔥 5) 30 napos cooldown ellenőrzése
    if (user.username_changed_at) {
      const [cooldown]: any = await db.query(
        `SELECT TIMESTAMPDIFF(DAY, username_changed_at, NOW()) AS days
         FROM users WHERE id = ?`,
        [userId]
      );

      if (cooldown[0].days < 30) {
        return NextResponse.json({
          success: false,
          message: `Felhasználónevet 30 naponta egyszer változtathatsz. Hátralévő napok: ${
            30 - cooldown[0].days
          }.`,
        });
      }
    }

    // 🔥 6) Foglaltság ellenőrzése
    const [exists]: any = await db.query(
      "SELECT id FROM users WHERE nickname = ? LIMIT 1",
      [username]
    );

    if (exists.length > 0) {
      return NextResponse.json({
        success: false,
        message: "Ez a felhasználónév már foglalt.",
      });
    }

    // 🔥 7) Frissítés az adatbázisban
    await db.query(
      `UPDATE users 
       SET nickname = ?, username_changed_at = NOW() 
       WHERE id = ?`,
      [username, userId]
    );

    // 🔥 8) Logolás (opcionális)
    await db.query(
      "INSERT INTO username_change_log (user_id, old_name, new_name, ip) VALUES (?, ?, ?, ?)",
      [userId, user.nickname, username, ip]
    ).catch(() => {});

    // 🔥 9) Email értesítés
    try {
      await mailer.sendMail({
        from: `"Utom.hu" <noreply@utom.hu>`,
        to: user.email,
        subject: "Felhasználónév módosítva",
        html: `
          <p>Szia!</p>
          <p>A felhasználóneved sikeresen megváltozott.</p>
          <p><strong>Régi név:</strong> ${user.nickname}</p>
          <p><strong>Új név:</strong> ${username}</p>
          <p>Ha nem te kezdeményezted a módosítást, azonnal változtasd meg a jelszavadat és PIN kódodat!</p>
          <p>Üdv,<br>Utom.hu</p>
        `,
      });
    } catch (err) {
      console.error("Email küldési hiba:", err);
    }

    return NextResponse.json({
      success: true,
      message: "A felhasználónév sikeresen megváltozott.",
      newUsername: username,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: err.message || "Váratlan hiba történt.",
    });
  }
}
