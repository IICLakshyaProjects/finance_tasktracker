import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

import { findUserForLogin } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export type Role = "admin" | "user";

export type Session = {
  role: Role;
  username: string;
  expiresAt: string;
};

const SESSION_COOKIE = "tasktracker_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

type AuthConfig = {
  adminUsername: string;
  adminPassword: string;
  sessionSecret: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getAuthConfig(): AuthConfig {
  return {
    adminUsername: requireEnv("ADMIN_LOGIN_USERNAME"),
    adminPassword: requireEnv("ADMIN_LOGIN_PASSWORD"),
    sessionSecret: requireEnv("AUTH_SESSION_SECRET"),
  };
}

function encodePayload(payload: Session) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(payload: string): Session | null {
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as
      | Session
      | undefined;

    if (
      !parsed ||
      (parsed.role !== "admin" && parsed.role !== "user") ||
      typeof parsed.username !== "string" ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    if (Number.isNaN(Date.parse(parsed.expiresAt))) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function sign(value: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function createSessionToken(session: Session, secret: string) {
  const payload = encodePayload(session);
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

function verifySessionToken(token: string, secret: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload, secret);

  if (expectedSignature.length !== signature.length) {
    return null;
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    )
  ) {
    return null;
  }

  const session = decodePayload(payload);

  if (!session) {
    return null;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  return session;
}

export async function authenticateAdmin(username: string, password: string) {
  const config = getAuthConfig();

  if (username === config.adminUsername && password === config.adminPassword) {
    return {
      role: "admin" as const,
      username,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
    };
  }

  const user = await findUserForLogin(username);

  if (!user || user.role.toUpperCase() !== "ADMIN" || !user.passwordHash) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    role: "admin" as const,
    username: user.username,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
}

export async function authenticateUser(username: string, password: string) {
  const user = await findUserForLogin(username);

  if (!user || user.role.toUpperCase() !== "USER" || !user.passwordHash) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    role: "user" as const,
    username: user.username,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
  };
}

export async function setSessionCookie(session: Session) {
  const config = getAuthConfig();
  const cookieStore = await cookies();
  const token = createSessionToken(session, config.sessionSecret);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const config = getAuthConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token, config.sessionSecret);
}
