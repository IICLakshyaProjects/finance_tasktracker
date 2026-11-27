import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  getActivityDateSettings,
  getUserByEmail,
  listAccountReceivables,
  listBranchRelated,
  listBranchHeads,
  listTeamLeads,
} from "@/lib/db";
import { triggerMissedSubmissionAlertsIfDue } from "@/lib/missed-submissions";
import { IntakeForm } from "../intake-form";

export default async function ResponsePage() {
  triggerMissedSubmissionAlertsIfDue();

  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  if (session.role === "admin") {
    redirect("/admin");
  }

  const user = await getUserByEmail(session.username);

  const initialName = user?.name?.trim() ?? "";
  const initialBranchId = user?.campusId ?? "";
  const initialBranchName = user?.campusName ?? "";
  const initialTeamLeadName = user?.teamLeadName?.trim() ?? "";
  const initialBranchHeadName = user?.branchHeadName?.trim() ?? "";

  const [teamLeads, branchHeads, accountReceivables, branchRelated] = await Promise.all([
    listTeamLeads(),
    listBranchHeads(),
    listAccountReceivables(),
    listBranchRelated(),
  ]);
  const activityDateSettings = await getActivityDateSettings();

  return (
    <IntakeForm
      initialName={initialName}
      initialBranchId={initialBranchId}
      initialBranchName={initialBranchName}
      initialTeamLeadName={initialTeamLeadName}
      initialBranchHeadName={initialBranchHeadName}
      teamLeads={teamLeads.map((item) => ({
        id: item.id,
        label: item.name,
      }))}
      branchHeads={branchHeads.map((item) => ({
        id: item.id,
        label: item.name,
      }))}
      accountReceivables={accountReceivables.map((item) => ({
        id: item.id,
        label: item.name,
      }))}
      branchRelated={branchRelated.map((item) => ({
        id: item.id,
        label: item.name,
      }))}
      activityDateSettings={activityDateSettings}
    />
  );
}
