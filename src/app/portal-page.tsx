import { logoutAction } from "./actions";
import type { Session } from "@/lib/auth";

type PortalPageProps = {
  session: Session;
  title: string;
  summary: string;
  primaryLabel: string;
  primaryText: string;
  secondaryText: string;
};

export function PortalPage({
  session,
  title,
  summary,
  primaryLabel,
  primaryText,
  secondaryText,
}: PortalPageProps) {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-stretch">
        <section className="relative grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/75 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(14,165,233,0.08),transparent_35%,rgba(30,41,59,0.2))]" />
          <div className="relative flex flex-col justify-between gap-8 border-b border-white/10 px-8 py-8 sm:px-10 lg:border-b-0 lg:border-r">
            <div className="space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-300">
                TaskTracker
              </p>
              <div className="space-y-4">
                <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  You are signed in as{" "}
                  <span className="font-semibold text-white">
                    {session.username}
                  </span>{" "}
                  with the{" "}
                  <span className="font-semibold text-white">
                    {session.role}
                  </span>{" "}
                  role.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Access</p>
                <p className="mt-2 text-lg font-semibold text-white">Granted</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Session</p>
                <p className="mt-2 text-lg font-semibold text-white">httpOnly</p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-slate-400">Expires</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {new Date(session.expiresAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </article>
            </div>
          </div>

          <div className="relative px-8 py-8 sm:px-10">
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
                    {primaryLabel}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {summary}
                  </h2>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                    <p className="text-sm text-slate-400">Primary view</p>
                    <p className="mt-2 text-base text-slate-100">
                      {primaryText}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                    <p className="text-sm text-slate-400">Security</p>
                    <p className="mt-2 text-base text-slate-100">
                      {secondaryText}
                    </p>
                  </div>
                </div>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
