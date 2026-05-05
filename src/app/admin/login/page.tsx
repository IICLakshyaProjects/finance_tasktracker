import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login-form";
import { getSession } from "@/lib/auth";

export default async function AdminLoginPage() {
  const session = await getSession();

  if (session?.role === "admin") {
    redirect("/admin");
  }

  if (session?.role === "user") {
    redirect("/response");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <LoginForm
        role="admin"
        helpText="Use the admin account configured in .env."
        buttonLabel="Continue as admin"
      />
    </main>
  );
}
