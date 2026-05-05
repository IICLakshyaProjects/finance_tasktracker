import "server-only";

import nodemailer from "nodemailer";

function readEnv(name: string) {
  return process.env[name]?.trim();
}

function readSmtpPassword() {
  return readEnv("SMTP_PASSWORD") ?? readEnv("SMTP_PASS");
}

export function hasSmtpConfig() {
  return Boolean(
    readEnv("SMTP_HOST") &&
      readEnv("SMTP_PORT") &&
      readEnv("SMTP_USER") &&
      readSmtpPassword() &&
      readEnv("SMTP_FROM") &&
      readEnv("APP_URL"),
  );
}

export async function sendPasswordSetupEmail(options: {
  to: string;
  username: string;
  loginUrl: string;
  setupUrl: string;
}) {
  if (!hasSmtpConfig()) {
    return { sent: false };
  }

  const port = Number(readEnv("SMTP_PORT"));

  const transporter = nodemailer.createTransport({
    host: readEnv("SMTP_HOST"),
    port,
    secure: port === 465,
    auth: {
      user: readEnv("SMTP_USER"),
      pass: readSmtpPassword(),
    },
  });

  await transporter.sendMail({
    from: readEnv("SMTP_FROM"),
    to: options.to,
    subject: "TaskTracker access and password setup",
    text: [
      `Hello ${options.username},`,
      "",
      "Your TaskTracker account has been created and the invitation was sent to this username email address.",
      `Login link: ${options.loginUrl}`,
      `Set your password here: ${options.setupUrl}`,
      "",
      "If you did not expect this email, you can ignore it.",
    ].join("\n"),
    html: `
      <p>Hello ${options.username},</p>
      <p>Your TaskTracker account has been created and the invitation was sent to this username email address.</p>
      <p><a href="${options.loginUrl}">Login here</a></p>
      <p><a href="${options.setupUrl}">Set your password</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    `,
  });

  return { sent: true };
}
