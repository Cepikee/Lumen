import nodemailer, { type SendMailOptions } from "nodemailer";
import { assertCapability } from "./config/runtime";

export const mailer = {
  async sendMail(options: SendMailOptions) {
    assertCapability("emailSend");
    const transport = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT || 587),
      secure: process.env.MAIL_SECURE === "true",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    return transport.sendMail(options);
  },
};
