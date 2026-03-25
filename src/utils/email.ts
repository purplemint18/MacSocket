import { Env } from "@/env";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import { Logger } from "./logger";

const transproter: nodemailer.Transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: Env.emailAddress,
    pass: Env.emailPassword,
  },
});

export const sendResetEmail = async (email: string, token: string) => {
  try {
    const mailOptions: Mail.Options = {
      from: Env.emailAddress,
      to: email,
      subject: "Password Reset",
      text: `Please click the following link to reset your password: http://${Env.serverAddress}:${Env.port}${Env.resetUrl}/${token}`,
    };
    await transproter.sendMail(mailOptions);
  } catch (err) {
    Logger.error(err);
  }
};
