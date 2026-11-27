import "server-only";

import { triggerMissedSubmissionAlertsIfDue } from "@/lib/missed-submissions";

const HOUR_MS = 60 * 60 * 1000;

let schedulerStarted = false;

export function startMissedSubmissionAutoScheduler() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;

  const tick = () => {
    triggerMissedSubmissionAlertsIfDue();
  };

  tick();
  setInterval(tick, HOUR_MS);
}