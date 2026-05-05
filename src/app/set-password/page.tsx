import Link from "next/link";

import { PasswordSetupForm } from "./password-setup-form";
import { RequestLinkForm } from "./request-link-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string; request?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const token = resolvedSearchParams.token?.trim() ?? "";
  const email = resolvedSearchParams.email?.trim() ?? "";
  const requestValue = resolvedSearchParams.request?.trim() ?? "";
  const requestMode = requestValue === "1" || requestValue.toLowerCase() === "true";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-2xl rounded-[2rem] border border-white/12 bg-slate-950/85 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
          TaskTracker
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Set your password
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Create the password linked to your email address and use it to sign
          in when you access the application later.
        </p>

        {token && email ? (
          <PasswordSetupForm token={token} email={email} />
        ) : requestMode ? (
          <div className="mt-8 space-y-4">
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm leading-6 text-slate-300">
              Request a fresh password setup link below. Use the same email address that was used for your account.
            </div>
            <RequestLinkForm />
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-sm leading-6 text-slate-300">
            Open the direct setup link from your email to set a new password. If you need a new link, use the reset password option on the login page.
          </div>
        )}

        <div className="mt-6">
          <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
