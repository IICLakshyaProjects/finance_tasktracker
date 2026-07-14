import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { listResponses, listUsers } from "@/lib/db";
import { DashboardReport } from "./report-dashboard";

export const metadata = {
  title: "AR Tracker",
  description: "Pivot-style report grouped by branch and agent.",
};

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/admin/login");
  }

  if (session.role !== "admin") {
    redirect("/admin/login");
  }

  const [responses, users] = await Promise.all([listResponses(), listUsers()]);

  return (
    <DashboardReport
      responses={responses.map((response) => ({
        id: response.id,
        agentUsername: response.agentUsername,
        name: response.name,
        status: response.status,
        branchName: response.branchName,
        teamLeadName: response.teamLeadName,
        responseDate: response.responseDate,
        category: response.category,
        categoryLabel: response.categoryLabel,
        categoryValueName: response.categoryValueName,
        totalCount: response.totalCount,
        totalTimeTaken: response.totalTimeTaken,
        totalTimeTakenHours: response.totalTimeTakenHours,
        totalTimeTakenMinutes: response.totalTimeTakenMinutes,
        remark: response.remark,
        createdAt: response.createdAt.toISOString(),
      }))}
      users={users.map((user) => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        campusId: user.campusId,
        campusName: user.campusName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
        passwordSetAt: user.passwordSetAt ? user.passwordSetAt.toISOString() : null,
      }))}
    />
  );
}
