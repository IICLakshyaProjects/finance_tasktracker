"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type LoginState } from "./actions";
import type { Role } from "@/lib/auth";

const initialState: LoginState = {
  error: "",
};

type LoginFormProps = {
  role: Role;
  helpText: string;
  buttonLabel: string;
};

export function LoginForm({
  role,
  helpText,
  buttonLabel,
}: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.12)]">
      <div className="px-8 py-8 sm:px-10">
        <div className="relative flex items-center justify-center border-b border-slate-200 pb-6">
          <div className="absolute left-0 flex items-center gap-5">
            <Image
              src="https://lakshyamailerimages.s3.ap-south-1.amazonaws.com/BLUE.png"
              alt="Finance Task Tracker logo"
              width={88}
              height={88}
              unoptimized
              className="h-22 w-22 rounded-2xl object-contain"
            />
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-sky-600">
            Finance Task Tracker
          </p>
        </div>

        <div className="mt-8">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold text-slate-950">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{helpText}</p>

            <form action={formAction} className="mt-8 space-y-5">
              <input type="hidden" name="role" value={role} />

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                >
                  {state.error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Signing in..." : buttonLabel}
              </button>

              <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                {/* <p>Forgot your password?</p> */}
                <Link
                  href="/set-password?request=1"
                  className="font-medium text-sky-600 hover:text-sky-700"
                >
                  {/* Reset password */}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
