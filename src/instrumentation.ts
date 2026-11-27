export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { startMissedSubmissionAutoScheduler } = await import("@/lib/missed-submission-scheduler");
  startMissedSubmissionAutoScheduler();
}