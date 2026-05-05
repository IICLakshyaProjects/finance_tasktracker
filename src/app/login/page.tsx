import { redirect } from "next/navigation";

import { LoginForm } from "@/app/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
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
        role="user"
        helpText="Use your username and password from the account created in the database."
        buttonLabel="Continue as user"
      />
    </main>
  );
}
