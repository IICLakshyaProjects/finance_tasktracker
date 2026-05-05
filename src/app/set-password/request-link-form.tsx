"use client";

import { useActionState } from "react";

import { resendPasswordSetupAction } from "./actions";

type RequestState = {
  error: string;
  message: string;
};

const initialState: RequestState = {
  error: "",
  message: "",
};

export function RequestLinkForm() {
  const [state, formAction, pending] = useActionState(
    resendPasswordSetupAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label htmlFor="request-email" className="mb-2 block text-sm font-medium text-slate-200">
          Email address
        </label>
        <input
          id="request-email"
          name="email"
          type="email"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
          placeholder="user@example.com"
        />
      </div>

      {state.error ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending..." : "Send new setup link"}
      </button>
    </form>
  );
}
