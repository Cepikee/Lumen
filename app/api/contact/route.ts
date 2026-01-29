import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { name, emailFrom, subject, customSubject, message } = await req.json();

    if (!name || !emailFrom || !message) {
      return NextResponse.json({
        success: false,
        error: "Hiányzó mezők",
      });
    }

    // Ki legyen a címzett?
    const to =
      subject === "press"
        ? "press@utom.hu"
        : "support@utom.hu"; // minden más ide megy

    // Tárgy
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

    // Email küldése
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to,
      subject: finalSubject,
      html: `
        <h2>Új üzenet érkezett a Kapcsolat űrlapról</h2>

        <p><strong>Név:</strong> ${name}</p>
        <p><strong>Email:</strong> ${emailFrom}</p>
        <p><strong>Kategória:</strong> ${finalSubject}</p>

        <h3>Üzenet:</h3>
        <p>${message.replace(/\n/g, "<br>")}</p>

        <hr>
        <p style="font-size:12px;opacity:0.6;">Utom.hu – Kapcsolat űrlap</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}
