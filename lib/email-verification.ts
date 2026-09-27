import { db } from "@/lib/db";
import { mailer } from "@/lib/mailer";
import { createOneTimeToken } from "@/lib/one-time-token";

export async function sendEmailVerification(userId: number, email: string): Promise<void> {
  const { token, tokenHash } = createOneTimeToken();
  await db.query(
    `UPDATE users SET email_verification_token = ?,
      email_verification_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE id = ?`,
    [tokenHash, userId],
  );
  const base = process.env.PUBLIC_APP_URL || "https://utom.hu";
  const verifyUrl = new URL("/verify-email", base);
  verifyUrl.searchParams.set("token", token);
  await mailer.sendMail({
    from: process.env.MAIL_FROM || '"Utom.hu" <noreply@utom.hu>',
    to: email,
    subject: "Erősítsd meg az email címed",
    text: `Email megerősítése: ${verifyUrl.toString()}`,
    html: `<p>Email megerősítése:</p><p><a href="${verifyUrl.toString()}">${verifyUrl.toString()}</a></p>`,
  });
}
