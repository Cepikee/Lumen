import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

export async function GET() {
  try {
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to: "vashiri6562@gmail.com",
      subject: "Teszt email az Utom.hu rendszerből",
      text: "Ez egy automatikusan küldött teszt email. Ha ezt látod, minden működik.",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
