import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  if (session.role === "admin") {
    redirect("/admin");
  }

  redirect("/response");
}
