"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { logoutAction } from "./actions";
import { createResponseAction, type ResponseState } from "./actions";

type SelectOption = {
  id: string;
  label: string;
};

type IntakeFormProps = {
  initialName: string;
  initialBranchId: string;
  initialBranchName: string;
  teamLeads: SelectOption[];
  accountReceivables: SelectOption[];
  branchRelated: SelectOption[];
};

type CategoryKey = "account-receivable" | "branch-related";
type Step = 1 | 2;

const initialState: ResponseState = {
  error: "",
  message: "",
  submittedAt: 0,
};

const categoryOptions: Array<{ value: CategoryKey; label: string }> = [
  { value: "account-receivable", label: "Account Receivable related" },
  { value: "branch-related", label: "Branch related" },
];

export function IntakeForm({
  initialName,
  initialBranchId,
  initialBranchName,
  teamLeads,
  accountReceivables,
  branchRelated,
}: IntakeFormProps) {
  const [state, formAction, pending] = useActionState(createResponseAction, initialState);
  const today = new Date();
  const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(initialName);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [responseDate, setResponseDate] = useState(localToday);
  const [teamLeadName, setTeamLeadName] = useState("");
  const [category, setCategory] = useState<CategoryKey | "">("");
  const [categoryValueId, setCategoryValueId] = useState("");
  const [totalCount, setTotalCount] = useState("");
  const [totalTimeTaken, setTotalTimeTaken] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submissionRef = useRef(0);

  const selectedOptions = useMemo(() => {
    if (category === "account-receivable") {
      return accountReceivables;
    }

    if (category === "branch-related") {
      return branchRelated;
    }

    return [];
  }, [accountReceivables, branchRelated, category]);

  useEffect(() => {
    if (state.submittedAt && state.submittedAt !== submissionRef.current && !state.error) {
      formRef.current?.reset();
      setStep(1);
      setName(initialName);
      setBranchId(initialBranchId);
      setResponseDate(localToday);
      setTeamLeadName("");
      setCategory("");
      setCategoryValueId("");
      setTotalCount("");
      setTotalTimeTaken("");
      setHasAttemptedSubmit(false);
    }

    submissionRef.current = state.submittedAt;
  }, [initialBranchId, initialName, localToday, state.error, state.submittedAt]);

  const goNext = () => {
    if (!name.trim() || !branchId || !responseDate || !teamLeadName.trim()) {
      return;
    }

    setHasAttemptedSubmit(false);
    setStep(2);
  };

  const isStep1Complete = Boolean(name.trim() && branchId && responseDate && teamLeadName.trim());

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 sm:px-8">
            <div className="flex flex-1 items-center justify-center gap-3">
              <Image
                src="https://lakshyamailerimages.s3.ap-south-1.amazonaws.com/BLUE.png"
                alt="Finance Task Tracker"
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
                unoptimized
              />
              <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Finance Task Tracker
              </p>
            </div>
            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </form>
          </div>

          <div className="px-5 py-5 sm:px-8 sm:py-8">
            <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 sm:p-8">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-sky-500">
                  Response intake
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {step === 1 ? "" : "Choose category and totals"}
                </h2>
              </div>

              <form ref={formRef} action={formAction} className="mt-8 grid gap-5">
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="branchId" value={branchId} />
                <input type="hidden" name="responseDate" value={responseDate} />
                <input type="hidden" name="teamLeadName" value={teamLeadName} />
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="categoryValueId" value={categoryValueId} />
                <input type="hidden" name="totalCount" value={totalCount} />
                <input type="hidden" name="totalTimeTaken" value={totalTimeTaken} />

                <div className={step === 1 ? "grid gap-5" : "hidden"}>
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Example: Ananya Rao"
                        autoComplete="name"
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="branchName"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Branch
                      </label>
                      <input
                        id="branchName"
                        type="text"
                        value={initialBranchName || "Unassigned branch"}
                        readOnly
                        className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="responseDate"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Date
                      </label>
                      <input
                        id="responseDate"
                        type="date"
                        value={responseDate}
                        onChange={(event) => setResponseDate(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="teamLeadName"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Team Lead Name
                      </label>
                      <select
                        id="teamLeadName"
                        value={teamLeadName}
                        onChange={(event) => setTeamLeadName(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">Select a team lead</option>
                        {teamLeads.map((item) => (
                          <option key={item.id} value={item.label}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={step === 2 ? "grid gap-4" : "hidden"}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="category"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Category
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(event) => {
                        const nextCategory = event.target.value as CategoryKey | "";
                        setCategory(nextCategory);
                        const nextOptions =
                          nextCategory === "account-receivable"
                            ? accountReceivables
                            : nextCategory === "branch-related"
                              ? branchRelated
                              : [];
                        setCategoryValueId(nextOptions[0]?.id ?? "");
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">Select a category</option>
                        {categoryOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="categoryValueId"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                      Values from admin
                    </label>
                    <select
                      id="categoryValueId"
                      value={categoryValueId || selectedOptions[0]?.id || ""}
                      onChange={(event) => setCategoryValueId(event.target.value)}
                      disabled={!category || !selectedOptions.length}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">
                        {!category
                          ? "Choose a category first"
                          : selectedOptions.length
                            ? "Select a value"
                            : "No values added yet"}
                      </option>
                      {selectedOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label
                        htmlFor="totalCount"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Total count
                      </label>
                      <input
                        id="totalCount"
                        type="number"
                        min="0"
                        step="1"
                        value={totalCount}
                        onChange={(event) => setTotalCount(event.target.value)}
                        placeholder="Example: 12"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="totalTimeTaken"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Total time taken
                      </label>
                      <input
                        id="totalTimeTaken"
                        type="text"
                        value={totalTimeTaken}
                        onChange={(event) => setTotalTimeTaken(event.target.value)}
                        placeholder="Example: 1h 30m"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                </div>

                {state.message ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {state.message}
                  </div>
                ) : null}

                {hasAttemptedSubmit && state.error && state.error !== "Choose a valid category." ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {state.error}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-3">
                  {step === 2 ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back
                    </button>
                  ) : null}

                  {step === 1 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!isStep1Complete}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(14,165,233,0.25)] transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      onClick={() => setHasAttemptedSubmit(true)}
                      disabled={pending}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(14,165,233,0.25)] transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending ? "Saving..." : "Save response"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
