import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  getActivityDateSettings,
  listAccountReceivables,
  listBranchRelated,
  listCampuses,
  listBranchHeads,
  listTeamLeads,
  listResponses,
  listUsers,
} from "@/lib/db";
import { triggerMissedSubmissionAlertsIfDue } from "@/lib/missed-submissions";
import { AdminDashboard } from "./admin-dashboard";

export default async function AdminPage() {
  triggerMissedSubmissionAlertsIfDue();

  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "admin") {
    redirect("/");
  }

  const [users, branchRelated, campuses, teamLeads, branchHeads, accountReceivables, responses] =
    await Promise.all([
      listUsers(),
      listBranchRelated(),
      listCampuses(),
      listTeamLeads(),
      listBranchHeads(),
      listAccountReceivables(),
      listResponses(),
    ]);
  const activityDateSettings = await getActivityDateSettings();

  return (
    <AdminDashboard
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        campusId: user.campusId,
        campusName: user.campusName,
        teamLeadId: user.teamLeadId,
        teamLeadName: user.teamLeadName,
        branchHeadId: user.branchHeadId,
        branchHeadName: user.branchHeadName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        passwordSetAt: user.passwordSetAt ? user.passwordSetAt.toISOString() : null,
      }))}
      branchRelated={branchRelated}
      campuses={campuses}
      teamLeads={teamLeads}
      branchHeads={branchHeads}
      accountReceivables={accountReceivables}
      responses={responses.map((response) => ({
        id: response.id,
        agentUsername: response.agentUsername,
        name: response.name,
        status: response.status,
        branchId: response.branchId,
        branchName: response.branchName,
        teamLeadName: response.teamLeadName,
        branchHeadName: response.branchHeadName,
        responseDate: response.responseDate,
        category: response.category,
        categoryLabel: response.categoryLabel,
        categoryValueId: response.categoryValueId,
        categoryValueName: response.categoryValueName,
        totalCount: response.totalCount,
        totalTimeTaken: response.totalTimeTaken,
        totalTimeTakenHours: response.totalTimeTakenHours,
        totalTimeTakenMinutes: response.totalTimeTakenMinutes,
        remark: response.remark,
        createdAt: response.createdAt.toISOString(),
      }))}
      activityDateSettings={activityDateSettings}
    />
  );
}
