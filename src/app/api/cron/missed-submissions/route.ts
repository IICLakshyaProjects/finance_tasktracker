import { NextResponse } from "next/server";

import { runMissedSubmissionAlertsIfDue } from "@/lib/missed-submissions";

function readCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function isAuthorized(request: Request) {
  const secret = readCronSecret();
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization")?.trim() ?? "";
  if (authHeader === `Bearer ${secret}`) {
    return true;
  }

  const querySecret = new URL(request.url).searchParams.get("secret")?.trim() ?? "";
  return querySecret.length > 0 && querySecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMissedSubmissionAlertsIfDue();
  return NextResponse.json({ ok: true, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}