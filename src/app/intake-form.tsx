"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";

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
type ResponseStatus = "working" | "leave" | "weekoff" | "";
type Step = 1 | 2;

type ResponseRow = {
  id: string;
  category: CategoryKey | "";
  categoryValueId: string;
  totalCount: string;
  totalTimeTaken: string;
  remark: string;
};

const initialState: ResponseState = {
  error: "",
  message: "",
  submittedAt: 0,
};

const categoryOptions: Array<{ value: CategoryKey; label: string }> = [
  { value: "account-receivable", label: "Account Receivable related" },
  { value: "branch-related", label: "Branch related" },
];

const statusOptions: Array<{ value: Exclude<ResponseStatus, "">; label: string }> = [
  { value: "working", label: "Working" },
  { value: "leave", label: "Leave" },
  { value: "weekoff", label: "Weekoff" },
];

function createRow(): ResponseRow {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "",
    categoryValueId: "",
    totalCount: "",
    totalTimeTaken: "",
    remark: "",
  };
}

function getOptionsForCategory(
  category: CategoryKey | "",
  accountReceivables: SelectOption[],
  branchRelated: SelectOption[],
) {
  if (category === "account-receivable") {
    return accountReceivables;
  }

  if (category === "branch-related") {
    return branchRelated;
  }

  return [];
}

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
  const [name] = useState(initialName);
  const [branchId] = useState(initialBranchId);
  const [responseDate, setResponseDate] = useState(localToday);
  const [teamLeadName, setTeamLeadName] = useState("");
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>("");
  const [rows, setRows] = useState<ResponseRow[]>([createRow()]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submissionRef = useRef(0);

  useEffect(() => {
    if (state.submittedAt && state.submittedAt !== submissionRef.current && !state.error) {
      formRef.current?.reset();
      setStep(1);
      setResponseDate(localToday);
      setTeamLeadName("");
      setResponseStatus("");
      setRows([createRow()]);
      setHasAttemptedSubmit(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    submissionRef.current = state.submittedAt;
  }, [localToday, state.error, state.submittedAt]);

  const isStep1Complete = Boolean(
    name.trim() && branchId && responseDate && teamLeadName.trim() && responseStatus,
  );

  const goNext = () => {
    if (!isStep1Complete || responseStatus !== "working") {
      return;
    }

    setHasAttemptedSubmit(false);
    setStep(2);
  };

  const updateRow = (id: string, patch: Partial<ResponseRow>) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== id) {
          return row;
        }

        const nextRow = { ...row, ...patch };

        if (patch.category) {
          const nextOptions = getOptionsForCategory(patch.category, accountReceivables, branchRelated);
          nextRow.categoryValueId = nextOptions[0]?.id ?? "";
        }

        return nextRow;
      }),
    );
  };

  const addRow = () => {
    setRows((current) => [...current, createRow()]);
  };

  const removeRow = (id: string) => {
    setRows((current) => (current.length > 1 ? current.filter((row) => row.id !== id) : current));
  };

  const buttonLabel =
    responseStatus === "working" ? (step === 1 ? "Next" : "Save response") : "Save response";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center justify-center">
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
                  {responseStatus === "working" && step === 2
                    ? "Add response rows"
                    : "Capture response details"}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-slate-500">
                  {responseStatus === "working"
                    ? step === 1
                      ? "Name and branch are fetched from your login account. Select the date, team lead, and working status first."
                      : "Add one or more response rows using the plus button. Remark supports multiple paragraphs."
                    : "Select leave or weekoff to save immediately, or choose working to continue to the response rows."}
                </p>
              </div>

              <form ref={formRef} action={formAction} className="mt-8 grid gap-5">
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="branchId" value={branchId} />
                <input type="hidden" name="responseDate" value={responseDate} />
                <input type="hidden" name="teamLeadName" value={teamLeadName} />
                <input type="hidden" name="status" value={responseStatus} />
                <input
                  type="hidden"
                  name="responseRows"
                  value={JSON.stringify(
                    rows.map((row) => {
                      return {
                        category: row.category,
                        categoryValueId: row.categoryValueId,
                        totalCount: row.totalCount,
                        totalTimeTaken: row.totalTimeTaken,
                        remark: row.remark,
                      };
                    }),
                  )}
                />

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

                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <label
                        htmlFor="responseStatus"
                        className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600"
                      >
                        Status
                      </label>
                      <select
                        id="responseStatus"
                        value={responseStatus}
                        onChange={(event) => {
                          const nextStatus = event.target.value as ResponseStatus;
                          setResponseStatus(nextStatus);
                          if (nextStatus !== "working") {
                            setStep(1);
                          }
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      >
                        <option value="">Select status</option>
                        {statusOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={step === 2 && responseStatus === "working" ? "grid gap-4" : "hidden"}>
                  {rows.map((row, index) => {
                    const rowOptions = getOptionsForCategory(row.category, accountReceivables, branchRelated);

                    return (
                      <div
                        key={row.id}
                        className="grid gap-4 lg:items-start lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.75fr)_minmax(0,0.95fr)_minmax(0,1.5fr)_auto_auto]"
                      >
                        <div>
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                            Category
                          </label>
                          <select
                            value={row.category}
                            onChange={(event) => {
                              const nextCategory = event.target.value as CategoryKey | "";
                              updateRow(row.id, { category: nextCategory });
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
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                            Values from admin
                          </label>
                          <select
                            value={row.categoryValueId}
                            onChange={(event) =>
                              updateRow(row.id, { categoryValueId: event.target.value })
                            }
                            disabled={!row.category || !rowOptions.length}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          >
                            <option value="">
                              {!row.category
                                ? "Choose a category first"
                                : rowOptions.length
                                  ? "Select a value"
                                  : "No values added yet"}
                            </option>
                            {rowOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                            Count
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={row.totalCount}
                            onChange={(event) => updateRow(row.id, { totalCount: event.target.value })}
                            placeholder="12"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                            Total time taken
                          </label>
                          <input
                            type="text"
                            value={row.totalTimeTaken}
                            onChange={(event) =>
                              updateRow(row.id, { totalTimeTaken: event.target.value })
                            }
                            placeholder="1h 30m"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                            Remark
                          </label>
                          <textarea
                            value={row.remark}
                            onChange={(event) => updateRow(row.id, { remark: event.target.value })}
                            placeholder="Add one or more paragraphs of notes"
                            rows={4}
                            className="min-h-[132px] w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <button
                            type="button"
                            onClick={addRow}
                            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-sky-500 text-2xl font-semibold text-white transition hover:bg-sky-600"
                            aria-label="Add response row"
                          >
                            +
                          </button>
                          {rows.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="inline-flex h-[52px] items-center justify-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        {index === 0 ? (
                          <div className="lg:col-span-7 flex items-start text-xs text-slate-500">
                            Add more rows with the plus button on the right.
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {state.message ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {state.message}
                  </div>
                ) : null}

                {hasAttemptedSubmit &&
                state.error &&
                state.error !== "Choose a valid category." &&
                state.error !== "Add at least one response row." ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {state.error}
                  </div>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-3">
                  {step === 2 && responseStatus === "working" ? (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-4 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Back
                    </button>
                  ) : null}

                  {responseStatus === "working" && step === 1 ? (
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!isStep1Complete}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(14,165,233,0.25)] transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {buttonLabel}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      onClick={() => setHasAttemptedSubmit(true)}
                      disabled={pending || !isStep1Complete}
                      className="inline-flex items-center justify-center rounded-full bg-sky-500 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(14,165,233,0.25)] transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending ? "Saving..." : buttonLabel}
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
