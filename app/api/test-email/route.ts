import { NextResponse } from "next/server";
import { mailer } from "@/lib/mailer";

export async function GET() {
  try {
    await mailer.sendMail({
      from: `"Utom.hu" <noreply@utom.hu>`,
      to: "support@utom.hu",
      subject: "Teszt email az Utom.hu rendszerből",
      text: "Ez egy teszt email, ha ezt látod, az SMTP működik.",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
