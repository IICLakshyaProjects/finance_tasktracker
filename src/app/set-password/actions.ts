"use server";

import { redirect } from "next/navigation";

import { getUserByEmail, updateUserPassword, updateUserPasswordSetupToken } from "@/lib/db";
import { hasSmtpConfig, sendPasswordSetupEmail } from "@/lib/mailer";
import { createRandomToken, hashPassword, hashToken } from "@/lib/password";

type PasswordState = {
  error: string;
};

const initialState: PasswordState = {
  error: "",
};

export async function setPasswordAction(
  previousState: PasswordState = initialState,
  formData: FormData,
): Promise<PasswordState> {
  void previousState;

  const token = String(formData.get("token") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token || !email) {
    return { error: "Missing password setup token." };
  }

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const user = await getUserByEmail(email);

  if (
    !user ||
    !user.passwordSetupTokenHash ||
    !user.passwordSetupExpiresAt ||
    user.passwordSetupTokenHash !== hashToken(token) ||
    user.passwordSetupExpiresAt.getTime() <= Date.now()
  ) {
    return { error: "This setup link is invalid or has expired." };
  }

  await updateUserPassword({
    email,
    passwordHash: hashPassword(password),
  });

  redirect("/login");
}

type RequestState = {
  error: string;
  message: string;
};

const initialRequestState: RequestState = {
  error: "",
  message: "",
};

export async function resendPasswordSetupAction(
  previousState: RequestState = initialRequestState,
  formData: FormData,
): Promise<RequestState> {
  void previousState;

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter the email address first.", message: "" };
  }

  const user = await getUserByEmail(email);

  if (!user) {
    return { error: "No account found for that email address.", message: "" };
  }

  const setupToken = createRandomToken();
  const setupTokenHash = hashToken(setupToken);
  const setupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3001";
  const loginLink = user.role.toUpperCase() === "ADMIN" ? `${appUrl}/admin/login` : `${appUrl}/`;
  const setupLink = `${appUrl}/set-password?token=${setupToken}&email=${encodeURIComponent(email)}`;

  await updateUserPasswordSetupToken({
    email,
    passwordSetupTokenHash: setupTokenHash,
    passwordSetupExpiresAt: setupExpiresAt,
  });

  let mailSent = false;
  try {
    const mailResult = await sendPasswordSetupEmail({
      to: email,
      username: user.username,
      loginUrl: loginLink,
      setupUrl: setupLink,
    });

    mailSent = mailResult.sent;
  } catch {
    mailSent = false;
  }

  if (!hasSmtpConfig() || !mailSent) {
    return {
      error: "",
      message: "A fresh setup link was generated. SMTP is not configured, so check the admin links or use the link shown in the email section.",
    };
  }

  return {
    error: "",
    message: "A fresh password setup email was sent.",
  };
}
