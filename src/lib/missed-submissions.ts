import "server-only";

import { getActivityDateString } from "@/lib/activity-date";
import {
  findUserEmailByDisplayName,
  getAppSettingValue,
  hasMissedSubmissionNotification,
  listUsersForSubmissionCheck,
  recordMissedSubmissionNotification,
  setAppSettingValue,
} from "@/lib/db";
import { hasSmtpConfig, sendMissedSubmissionAlert } from "@/lib/mailer";

const IST_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
});

function formatCreatedAtDate(createdAt: Date) {
  return IST_DATE.format(createdAt);
}

function daysBetweenCalendarDates(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+05:30`);
  const end = new Date(`${to}T00:00:00+05:30`);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function lastResponseDateKey(lastResponseDate: string | null) {
  return lastResponseDate ?? "__none__";
}

export type MissedSubmissionRunResult = {
  checked: number;
  overdue: number;
  emailed: number;
  skippedAlreadyNotified: number;
  skippedNoRecipients: number;
  smtpConfigured: boolean;
  skippedToday?: boolean;
};

const DAILY_RUN_SETTING_KEY = "missedSubmissionAlertsLastRunDate";

let autoRunInFlight: Promise<MissedSubmissionRunResult> | null = null;

export async function runMissedSubmissionAlerts(): Promise<MissedSubmissionRunResult> {
  const today = getActivityDateString(0);
  const users = await listUsersForSubmissionCheck();

  const result: MissedSubmissionRunResult = {
    checked: users.length,
    overdue: 0,
    emailed: 0,
    skippedAlreadyNotified: 0,
    skippedNoRecipients: 0,
    smtpConfigured: hasSmtpConfig(),
  };

  if (!result.smtpConfigured) {
    return result;
  }

  for (const user of users) {
    const baselineDate = user.lastResponseDate ?? formatCreatedAtDate(user.createdAt);
    const daysSince = daysBetweenCalendarDates(baselineDate, today);

    if (daysSince < 2) {
      continue;
    }

    result.overdue += 1;

    const responseKey = lastResponseDateKey(user.lastResponseDate);
    if (await hasMissedSubmissionNotification(user.id, responseKey)) {
      result.skippedAlreadyNotified += 1;
      continue;
    }

    const recipients = new Map<string, "team-lead" | "branch-head">();

    if (user.teamLeadName?.trim()) {
      const email = await findUserEmailByDisplayName(user.teamLeadName);
      if (email) {
        recipients.set(email, "team-lead");
      }
    }

    if (user.branchHeadName?.trim()) {
      const email = await findUserEmailByDisplayName(user.branchHeadName);
      if (email) {
        recipients.set(email, "branch-head");
      }
    }

    if (!recipients.size) {
      result.skippedNoRecipients += 1;
      continue;
    }

    const agentLabel = user.name?.trim() || user.email || user.username;
    const lastSubmittedLabel = user.lastResponseDate ?? "Never";

    for (const [to, role] of recipients) {
      await sendMissedSubmissionAlert({
        to,
        recipientRole: role,
        agentName: agentLabel,
        agentEmail: user.email,
        lastSubmittedDate: lastSubmittedLabel,
        daysSince,
        teamLeadName: user.teamLeadName,
        branchHeadName: user.branchHeadName,
      });
    }

    await recordMissedSubmissionNotification(user.id, responseKey);
    result.emailed += 1;
  }

  return result;
}

export async function runMissedSubmissionAlertsIfDue(): Promise<MissedSubmissionRunResult> {
  const today = getActivityDateString(0);
  const lastRun = await getAppSettingValue(DAILY_RUN_SETTING_KEY);

  if (lastRun === today) {
    return {
      checked: 0,
      overdue: 0,
      emailed: 0,
      skippedAlreadyNotified: 0,
      skippedNoRecipients: 0,
      smtpConfigured: hasSmtpConfig(),
      skippedToday: true,
    };
  }

  const result = await runMissedSubmissionAlerts();
  await setAppSettingValue(DAILY_RUN_SETTING_KEY, today);
  return result;
}

/** Non-blocking: safe to call from server pages while the app is running. */
export function triggerMissedSubmissionAlertsIfDue() {
  if (autoRunInFlight) {
    return;
  }

  autoRunInFlight = runMissedSubmissionAlertsIfDue()
    .catch((error) => {
      console.error("[missed-submissions] auto run failed:", error);
      return {
        checked: 0,
        overdue: 0,
        emailed: 0,
        skippedAlreadyNotified: 0,
        skippedNoRecipients: 0,
        smtpConfigured: hasSmtpConfig(),
      };
    })
    .finally(() => {
      autoRunInFlight = null;
    });
}