import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  getActivityDateSettings,
  getUserByEmail,
  listAccountReceivables,
  listBranchRelated,
  listTeamLeads,
} from "@/lib/db";
import { IntakeForm } from "../intake-form";

export default async function ResponsePage() {
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

  const [teamLeads, accountReceivables, branchRelated] = await Promise.all([
    listTeamLeads(),
    listAccountReceivables(),
    listBranchRelated(),
  ]);
  const activityDateSettings = await getActivityDateSettings();

  return (
    <IntakeForm
      initialName={initialName}
      initialBranchId={initialBranchId}
      initialBranchName={initialBranchName}
      teamLeads={teamLeads.map((item) => ({
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
