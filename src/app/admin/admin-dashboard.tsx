"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { logoutAction } from "../actions";
import {
  getActivityDateString,
  getAllowedActivityDateBounds,
  type ActivityDateSettings,
} from "@/lib/activity-date";
import {
  addAccountReceivablesAction,
  addBranchRelatedAction,
  addCampusAction,
  addTeamLeadAction,
  createUserAction,
  deleteAccountReceivablesAction,
  deleteBranchRelatedAction,
  deleteCampusAction,
  deleteTeamLeadAction,
  deleteResponsesAction,
  deleteUserAction,
  updateActivityDateSettingsAction,
  updateAccountReceivablesAction,
  updateBranchRelatedAction,
  updateCampusAction,
  updateTeamLeadAction,
  updateUserAction,
} from "./actions";

type BranchRelatedRecord = {
  id: string;
  name: string;
};

type CampusRecord = {
  id: string;
  name: string;
};

type TeamLeadRecord = {
  id: string;
  name: string;
};

type AccountReceivableRecord = {
  id: string;
  name: string;
};

type ResponseRecord = {
  id: string;
  name: string;
  status: string;
  branchId: string;
  branchName: string;
  teamLeadName: string;
  responseDate: string;
  category: string;
  categoryLabel: string;
  categoryValueId: string;
  categoryValueName: string;
  totalCount: number;
  totalTimeTakenHours: number;
  totalTimeTakenMinutes: number;
  remark: string;
  createdAt: string;
};

type UserRecord = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  campusId: string | null;
  campusName: string | null;
  role: string;
  status: string;
  createdAt: string;
  passwordSetAt: string | null;
};

type AdminActionState = {
  error: string;
  message: string;
  loginLink: string;
  setupLink: string;
};

type FormAction = React.ComponentProps<"form">["action"];

type AdminDashboardProps = {
  users: UserRecord[];
  branchRelated: BranchRelatedRecord[];
  campuses: CampusRecord[];
  teamLeads: TeamLeadRecord[];
  accountReceivables: AccountReceivableRecord[];
  responses: ResponseRecord[];
  activityDateSettings: ActivityDateSettings;
};

type TabKey = "users" | "campus" | "team-leads" | "account-receivables" | "branch-related" | "response";

type EditingEntity =
  | { kind: "user"; item: UserRecord }
  | { kind: "campus"; item: CampusRecord }
  | { kind: "team-lead"; item: TeamLeadRecord }
  | { kind: "account"; item: AccountReceivableRecord }
  | { kind: "branch"; item: BranchRelatedRecord }
  | null;

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "users", label: "User creation" },
  { key: "campus", label: "Campus" },
  { key: "team-leads", label: "Team Lead" },
  { key: "account-receivables", label: "Account receivables" },
  { key: "branch-related", label: "Branch related" },
  { key: "response", label: "Response" },
];

const emptyState: AdminActionState = {
  error: "",
  message: "",
  loginLink: "",
  setupLink: "",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "â€”";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(hours: number, minutes: number) {
  const safeHours = Number.isFinite(hours) ? Math.max(0, Math.trunc(hours)) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.trunc(minutes)) : 0;
  const totalMinutes = safeHours * 60 + safeMinutes;
  const normalizedHours = Math.floor(totalMinutes / 60);
  const normalizedMinutes = totalMinutes % 60;

  return `${normalizedHours}:${String(normalizedMinutes).padStart(2, "0")}`;
}

function responseStatusTone(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === "working") {
    return "bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-400/20";
  }

  if (normalized === "leave") {
    return "bg-amber-500/12 text-amber-700 ring-1 ring-amber-400/20";
  }

  if (normalized === "pending") {
    return "bg-slate-500/12 text-slate-700 ring-1 ring-slate-400/20";
  }

  return "bg-sky-500/12 text-sky-700 ring-1 ring-sky-400/20";
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function downloadResponsesCsv(rows: ResponseRecord[], filename: string) {
  const header = [
    "Name",
    "Status",
    "Branch",
    "Date",
    "Team Lead",
    "Category",
    "Value",
    "Count",
    "Total Time Taken",
    "Remark",
    "Created",
  ];

  const lines = rows.map((item) =>
    [
      item.name,
      item.status,
      item.branchName,
      item.responseDate,
      item.teamLeadName,
      item.categoryLabel,
      item.categoryValueName,
      String(item.totalCount),
      formatDuration(item.totalTimeTakenHours, item.totalTimeTakenMinutes),
      item.remark,
      item.createdAt ? formatDateTime(String(item.createdAt)) : "—",
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  const blob = new Blob([`${header.join(",")}\n${lines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "ACTIVE") {
    return "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/20";
  }

  if (normalized === "INVITED") {
    return "bg-amber-500/12 text-amber-200 ring-1 ring-amber-300/20";
  }

  return "bg-slate-500/12 text-slate-200 ring-1 ring-slate-400/20";
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
      <div className="mb-6 space-y-2">
        <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function InlineStatus({
  state,
}: {
  state: AdminActionState;
}) {
  if (!state.message && !state.error) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3">
      {state.message ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}
      {state.error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}

function DeleteButton({
  action,
  id,
  label,
}: {
  action: FormAction;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-rose-300 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50"
        onClick={(event) => {
          if (!window.confirm(`Delete ${label}?`)) {
            event.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}

export function AdminDashboard({
  users,
  branchRelated,
  campuses,
  teamLeads,
  accountReceivables,
  responses,
  activityDateSettings,
}: AdminDashboardProps) {
  const todayActivityDate = getActivityDateString(0);
  const { min: activityDateMin, max: activityDateMax } = getAllowedActivityDateBounds(
    activityDateSettings,
  );
  const [activeTab, setActiveTab] = useState<TabKey>("users");
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EditingEntity>(null);
  const [responseNameFilter, setResponseNameFilter] = useState("");
  const [responseBranchFilter, setResponseBranchFilter] = useState("");
  const [responseStatusFilter, setResponseStatusFilter] = useState("");
  const [responseTeamLead, setResponseTeamLead] = useState("");
  const [responseDateFrom, setResponseDateFrom] = useState(todayActivityDate);
  const [responseDateTo, setResponseDateTo] = useState(todayActivityDate);
  const [selectedResponseIds, setSelectedResponseIds] = useState<string[]>([]);

  const [userCreateState, userCreateAction, userCreatePending] = useActionState(
    createUserAction,
    emptyState,
  );
  const [userEditState, userEditAction, userEditPending] = useActionState(updateUserAction, emptyState);
  const [branchCreateState, branchCreateAction, branchCreatePending] = useActionState(
    addBranchRelatedAction,
    emptyState,
  );
  const [branchEditState, branchEditAction, branchEditPending] = useActionState(
    updateBranchRelatedAction,
    emptyState,
  );
  const [campusCreateState, campusCreateAction, campusCreatePending] = useActionState(
    addCampusAction,
    emptyState,
  );
  const [campusEditState, campusEditAction, campusEditPending] = useActionState(
    updateCampusAction,
    emptyState,
  );
  const [teamLeadCreateState, teamLeadCreateAction, teamLeadCreatePending] = useActionState(
    addTeamLeadAction,
    emptyState,
  );
  const [teamLeadEditState, teamLeadEditAction, teamLeadEditPending] = useActionState(
    updateTeamLeadAction,
    emptyState,
  );
  const [accountCreateState, accountCreateAction, accountCreatePending] = useActionState(
    addAccountReceivablesAction,
    emptyState,
  );
  const [accountEditState, accountEditAction, accountEditPending] = useActionState(
    updateAccountReceivablesAction,
    emptyState,
  );
  const [activityDateState, activityDateAction, activityDatePending] = useActionState(
    updateActivityDateSettingsAction,
    emptyState,
  );
  const [responseDeleteState, responseDeleteAction, responseDeletePending] = useActionState(
    deleteResponsesAction,
    emptyState,
  );

  const userMessageRef = useRef(userCreateState.message);
  const userEditMessageRef = useRef(userEditState.message);
  const branchMessageRef = useRef(branchCreateState.message);
  const branchEditMessageRef = useRef(branchEditState.message);
  const campusMessageRef = useRef(campusCreateState.message);
  const campusEditMessageRef = useRef(campusEditState.message);
  const teamLeadMessageRef = useRef(teamLeadCreateState.message);
  const teamLeadEditMessageRef = useRef(teamLeadEditState.message);
  const accountMessageRef = useRef(accountCreateState.message);
  const accountEditMessageRef = useRef(accountEditState.message);
  const activityDateMessageRef = useRef(activityDateState.message);

  const filteredResponseRows = useMemo(() => {
    const from = responseDateFrom.trim();
    const to = responseDateTo.trim();
    const lowerBound = from && to ? (from <= to ? from : to) : from || to;
    const upperBound = from && to ? (from <= to ? to : from) : to || from;

    return responses.filter((item) => {
      const dateMatch =
        !lowerBound || !upperBound
          ? true
          : item.responseDate >= lowerBound && item.responseDate <= upperBound;
      const nameMatch = responseNameFilter
        ? item.name.toLowerCase().includes(responseNameFilter.toLowerCase())
        : true;
      const branchMatch = responseBranchFilter
        ? item.branchName.toLowerCase() === responseBranchFilter.toLowerCase()
        : true;
      const statusMatch = responseStatusFilter
        ? item.status.toLowerCase() === responseStatusFilter.toLowerCase()
        : true;
      const teamLeadMatch = responseTeamLead
        ? item.teamLeadName.toLowerCase().includes(responseTeamLead.toLowerCase())
        : true;

      return dateMatch && nameMatch && branchMatch && statusMatch && teamLeadMatch;
    });
  }, [responseBranchFilter, responseDateFrom, responseDateTo, responseNameFilter, responseStatusFilter, responseTeamLead, responses]);

  const responseBranchOptions = useMemo(() => {
    return Array.from(
      new Set(filteredResponseRows.map((item) => item.branchName.trim()).filter(Boolean)),
    ).sort();
  }, [filteredResponseRows]);

  const responseStatusOptions = useMemo(() => {
    return Array.from(
      new Set(filteredResponseRows.map((item) => item.status.trim()).filter(Boolean)),
    ).sort();
  }, [filteredResponseRows]);

  const visibleResponseIds = useMemo(
    () => filteredResponseRows.map((item) => item.id),
    [filteredResponseRows],
  );

  const selectedResponses = useMemo(
    () => responses.filter((item) => selectedResponseIds.includes(item.id)),
    [responses, selectedResponseIds],
  );

  const allFilteredSelected =
    visibleResponseIds.length > 0 &&
    visibleResponseIds.every((item) => selectedResponseIds.includes(item));

  const resetResponseFilters = () => {
    setResponseNameFilter("");
    setResponseBranchFilter("");
    setResponseStatusFilter("");
    setResponseTeamLead("");
    setResponseDateFrom(todayActivityDate);
    setResponseDateTo(todayActivityDate);
  };

  useEffect(() => {
    const messageChanged =
      userCreateState.message && userCreateState.message !== userMessageRef.current;

    if (messageChanged || userCreateState.error) {
      setCreateUserOpen(false);
    }

    userMessageRef.current = userCreateState.message;
  }, [userCreateState.error, userCreateState.message]);

  useEffect(() => {
    const messageChanged = userEditState.message && userEditState.message !== userEditMessageRef.current;

    if (messageChanged || userEditState.error) {
      setEditingEntity(null);
    }

    userEditMessageRef.current = userEditState.message;
  }, [userEditState.error, userEditState.message]);

  useEffect(() => {
    const messageChanged =
      branchCreateState.message && branchCreateState.message !== branchMessageRef.current;

    if (messageChanged || branchCreateState.error) {
      branchMessageRef.current = branchCreateState.message;
    }
  }, [branchCreateState.error, branchCreateState.message]);

  useEffect(() => {
    const messageChanged =
      branchEditState.message && branchEditState.message !== branchEditMessageRef.current;

    if (messageChanged || branchEditState.error) {
      setEditingEntity(null);
    }

    branchEditMessageRef.current = branchEditState.message;
  }, [branchEditState.error, branchEditState.message]);

  useEffect(() => {
    const messageChanged =
      campusCreateState.message && campusCreateState.message !== campusMessageRef.current;

    if (messageChanged || campusCreateState.error) {
      campusMessageRef.current = campusCreateState.message;
    }
  }, [campusCreateState.error, campusCreateState.message]);

  useEffect(() => {
    const messageChanged =
      campusEditState.message && campusEditState.message !== campusEditMessageRef.current;

    if (messageChanged || campusEditState.error) {
      setEditingEntity(null);
    }

    campusEditMessageRef.current = campusEditState.message;
  }, [campusEditState.error, campusEditState.message]);

  useEffect(() => {
    const messageChanged =
      teamLeadCreateState.message && teamLeadCreateState.message !== teamLeadMessageRef.current;

    if (messageChanged || teamLeadCreateState.error) {
      teamLeadMessageRef.current = teamLeadCreateState.message;
    }
  }, [teamLeadCreateState.error, teamLeadCreateState.message]);

  useEffect(() => {
    const messageChanged =
      teamLeadEditState.message && teamLeadEditState.message !== teamLeadEditMessageRef.current;

    if (messageChanged || teamLeadEditState.error) {
      setEditingEntity(null);
    }

    teamLeadEditMessageRef.current = teamLeadEditState.message;
  }, [teamLeadEditState.error, teamLeadEditState.message]);

  useEffect(() => {
    const messageChanged =
      accountCreateState.message && accountCreateState.message !== accountMessageRef.current;

    if (messageChanged || accountCreateState.error) {
      accountMessageRef.current = accountCreateState.message;
    }
  }, [accountCreateState.error, accountCreateState.message]);

  useEffect(() => {
    const messageChanged =
      accountEditState.message && accountEditState.message !== accountEditMessageRef.current;

    if (messageChanged || accountEditState.error) {
      setEditingEntity(null);
    }

    accountEditMessageRef.current = accountEditState.message;
  }, [accountEditState.error, accountEditState.message]);

  useEffect(() => {
    activityDateMessageRef.current = activityDateState.message;
  }, [activityDateState.message]);

  const activeEditState =
    editingEntity?.kind === "user"
      ? userEditState
      : editingEntity?.kind === "branch"
        ? branchEditState
    : editingEntity?.kind === "campus"
      ? campusEditState
      : editingEntity?.kind === "team-lead"
        ? teamLeadEditState
      : editingEntity?.kind === "account"
        ? accountEditState
        : emptyState;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-4 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] gap-6">
        <aside className="w-[280px] shrink-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_18px_70px_rgba(15,23,42,0.05)]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-sky-500">Admin menu</p>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Logout
              </button>
            </form>
          </div>
          <div className="mt-6 space-y-3">
            {tabs.map((tab) => {
              const active = tab.key === activeTab;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-semibold transition",
                    active
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          {activeTab === "users" ? (
            <>
              <SectionCard
                title="User management"
                subtitle="Create users, assign a role, store them in the database, and send the password setup link."
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm leading-6 text-slate-500">
                    Name, username/email, and password are optional. Choose the user type to grant admin access.
                  </p>
                  <button
                    type="button"
                    onClick={() => setCreateUserOpen(true)}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Create user
                  </button>
                </div>
                <InlineStatus state={userCreateState} />
              </SectionCard>

              <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                  <div className="grid grid-cols-12 gap-4 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <div className="col-span-3">Email</div>
                    <div className="col-span-2">Campus</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Created</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {users.length ? (
                    users.map((user) => (
                    <div key={user.id} className="grid grid-cols-12 items-center gap-4 px-6 py-6">
                        <div className="col-span-3 min-w-0">
                          <p className="truncate text-[1.05rem] font-medium text-slate-950">
                            {user.email || user.username}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{user.name || "Unnamed user"}</p>
                        </div>
                        <div className="col-span-2 text-sm font-medium text-slate-600">
                          {user.campusName || "No campus"}
                        </div>
                        <div className="col-span-2 text-sm font-medium uppercase tracking-[0.14em] text-slate-700">
                          {user.role}
                        </div>
                        <div className="col-span-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                              statusTone(user.status),
                            ].join(" ")}
                          >
                            {user.status.charAt(0).toUpperCase() + user.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                        <div className="col-span-2 text-sm text-slate-600">{formatDateTime(user.createdAt)}</div>
                        <div className="col-span-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setEditingEntity({ kind: "user", item: user })}
                            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <DeleteButton
                            action={async (formData) => {
                              await deleteUserAction(undefined, formData);
                            }}
                            id={user.id}
                            label={user.email}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-6 py-12 text-sm text-slate-500">No users added yet.</div>
                  )}
                </div>
              </section>

              {createUserOpen ? (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
                  <div className="mt-4 w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_120px_rgba(15,23,42,0.20)]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Create user</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          Add a user, choose the user type, and send a password setup email and link to the username email.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCreateUserOpen(false)}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>

                    <form action={userCreateAction} className="mt-8 grid gap-5">
                      <div>
                        <label htmlFor="user-name" className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Name
                        </label>
                        <input
                          id="user-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          placeholder="Example: Ananya Rao"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="user-username" className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Username / Email ID
                        </label>
                        <input
                          id="user-username"
                          name="username"
                          type="email"
                          autoComplete="email"
                          placeholder="user@example.com"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="user-campus" className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Campus
                        </label>
                        <select
                          id="user-campus"
                          name="campusId"
                          defaultValue=""
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="" disabled>
                            Select campus
                          </option>
                          {campuses.map((campus) => (
                            <option key={campus.id} value={campus.id}>
                              {campus.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="user-password" className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                          Password
                        </label>
                        <input
                          id="user-password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Optional initial password"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="user-role" className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
                          User type
                        </label>
                        <select
                          id="user-role"
                          name="role"
                          defaultValue="USER"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={userCreatePending}
                        className="mt-2 inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-4 text-base font-semibold text-white shadow-[0_16px_36px_rgba(16,185,129,0.24)] transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {userCreatePending ? "Creating..." : "Create user"}
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}

              {editingEntity?.kind === "user" ? (
                <EditModal
                  title="Edit user"
                  onClose={() => setEditingEntity(null)}
                  action={userEditAction}
                  pending={userEditPending}
                  state={activeEditState}
                >
                  <input type="hidden" name="id" value={editingEntity.item.id} />
                  <Field label="Name" name="name" defaultValue={editingEntity.item.name ?? ""} />
                  <Field label="Username / Email ID" name="username" defaultValue={editingEntity.item.username} type="email" />
                  <SelectField
                    name="campusId"
                    label="Campus"
                    defaultValue={editingEntity.item.campusId ?? ""}
                    options={[
                      ["", "Select campus"],
                      ...campuses.map((campus) => [campus.id, campus.name] as [string, string]),
                    ]}
                  />
                  <Field label="Password" name="password" type="password" placeholder="Leave blank to keep current password" />
                  <SelectField name="role" label="User type" defaultValue={editingEntity.item.role.toUpperCase() === "ADMIN" ? "ADMIN" : "USER"} options={[["USER", "User"], ["ADMIN", "Admin"]]} />
                </EditModal>
              ) : null}
            </>
          ) : null}

          {activeTab === "campus" ? (
            <SectionCard title="Add campus" subtitle="Create campus values like Kochi and Kottayam for admin-managed location lists.">
              <form action={campusCreateAction} className="grid gap-4 max-w-xl">
                <Field label="Campus name" name="name" placeholder="Example: Kochi" />
                <button type="submit" disabled={campusCreatePending} className="inline-flex w-fit items-center justify-center rounded-full bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {campusCreatePending ? "Adding..." : "Add campus"}
                </button>
              </form>
              <InlineStatus state={campusCreateState} />
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <div className="col-span-10">Name</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {campuses.length ? campuses.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                      <div className="col-span-10 text-sm text-slate-700">{item.name}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingEntity({ kind: "campus", item })} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Edit</button>
                        <DeleteButton
                          action={async (formData) => {
                            await deleteCampusAction(undefined, formData);
                          }}
                          id={item.id}
                          label={item.name}
                        />
                      </div>
                    </div>
                  )) : <div className="px-4 py-8 text-sm text-slate-500">No campuses added yet.</div>}
                </div>
              </div>
              {editingEntity?.kind === "campus" ? (
                <EditModal title="Edit campus" onClose={() => setEditingEntity(null)} action={campusEditAction} pending={campusEditPending} state={activeEditState}>
                  <input type="hidden" name="id" value={editingEntity.item.id} />
                  <Field label="Campus name" name="name" defaultValue={editingEntity.item.name} />
                </EditModal>
              ) : null}
            </SectionCard>
          ) : null}

          {activeTab === "team-leads" ? (
            <SectionCard title="Add team lead" subtitle="Create team lead values for response entry and admin-managed lists.">
              <form action={teamLeadCreateAction} className="grid gap-4 max-w-xl">
                <Field label="Team lead name" name="name" placeholder="Example: Priya Nair" />
                <button type="submit" disabled={teamLeadCreatePending} className="inline-flex w-fit items-center justify-center rounded-full bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {teamLeadCreatePending ? "Adding..." : "Add team lead"}
                </button>
              </form>
              <InlineStatus state={teamLeadCreateState} />
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <div className="col-span-10">Name</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {teamLeads.length ? teamLeads.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                      <div className="col-span-10 text-sm text-slate-700">{item.name}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingEntity({ kind: "team-lead", item })} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Edit</button>
                        <DeleteButton
                          action={async (formData) => {
                            await deleteTeamLeadAction(undefined, formData);
                          }}
                          id={item.id}
                          label={item.name}
                        />
                      </div>
                    </div>
                  )) : <div className="px-4 py-8 text-sm text-slate-500">No team leads added yet.</div>}
                </div>
              </div>
              {editingEntity?.kind === "team-lead" ? (
                <EditModal title="Edit team lead" onClose={() => setEditingEntity(null)} action={teamLeadEditAction} pending={teamLeadEditPending} state={activeEditState}>
                  <input type="hidden" name="id" value={editingEntity.item.id} />
                  <Field label="Team lead name" name="name" defaultValue={editingEntity.item.name} />
                </EditModal>
              ) : null}
            </SectionCard>
          ) : null}

          {activeTab === "account-receivables" ? (
            <SectionCard title="Add account receivables" subtitle="Create account receivable names that can be stored and reused.">
              <form action={accountCreateAction} className="grid gap-4 max-w-xl">
                <Field label="Account receivable name" name="name" placeholder="Example: Collections Team" />
                <button type="submit" disabled={accountCreatePending} className="inline-flex w-fit items-center justify-center rounded-full bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {accountCreatePending ? "Adding..." : "Add account receivable"}
                </button>
              </form>
              <InlineStatus state={accountCreateState} />
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <div className="col-span-10">Name</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {accountReceivables.length ? accountReceivables.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                      <div className="col-span-10 text-sm text-slate-700">{item.name}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingEntity({ kind: "account", item })} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Edit</button>
                        <DeleteButton
                          action={async (formData) => {
                            await deleteAccountReceivablesAction(undefined, formData);
                          }}
                          id={item.id}
                          label={item.name}
                        />
                      </div>
                    </div>
                  )) : <div className="px-4 py-8 text-sm text-slate-500">No account receivables added yet.</div>}
                </div>
              </div>
              {editingEntity?.kind === "account" ? (
                <EditModal title="Edit account receivable" onClose={() => setEditingEntity(null)} action={accountEditAction} pending={accountEditPending} state={activeEditState}>
                  <input type="hidden" name="id" value={editingEntity.item.id} />
                  <Field label="Account receivable name" name="name" defaultValue={editingEntity.item.name} />
                </EditModal>
              ) : null}
            </SectionCard>
          ) : null}

          {activeTab === "branch-related" ? (
            <SectionCard title="Add branch related" subtitle="Create branch related values for front-end user response flows.">
              <form action={branchCreateAction} className="grid gap-4 max-w-xl">
                <Field label="Branch related name" name="name" placeholder="Example: South Zone" />
                <button type="submit" disabled={branchCreatePending} className="inline-flex w-fit items-center justify-center rounded-full bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-60">
                  {branchCreatePending ? "Adding..." : "Add branch related"}
                </button>
              </form>
              <InlineStatus state={branchCreateState} />
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="grid grid-cols-12 gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  <div className="col-span-10">Name</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="divide-y divide-slate-100 bg-white">
                  {branchRelated.length ? branchRelated.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 items-center gap-4 px-4 py-3">
                      <div className="col-span-10 text-sm text-slate-700">{item.name}</div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <button type="button" onClick={() => setEditingEntity({ kind: "branch", item })} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50">Edit</button>
                        <DeleteButton
                          action={async (formData) => {
                            await deleteBranchRelatedAction(undefined, formData);
                          }}
                          id={item.id}
                          label={item.name}
                        />
                      </div>
                    </div>
                  )) : <div className="px-4 py-8 text-sm text-slate-500">No branch related values added yet.</div>}
                </div>
              </div>
              {editingEntity?.kind === "branch" ? (
                <EditModal title="Edit branch related" onClose={() => setEditingEntity(null)} action={branchEditAction} pending={branchEditPending} state={activeEditState}>
                  <input type="hidden" name="id" value={editingEntity.item.id} />
                  <Field label="Branch related name" name="name" defaultValue={editingEntity.item.name} />
                </EditModal>
              ) : null}
            </SectionCard>
          ) : null}

          {activeTab === "response" ? (
            <SectionCard title="Response" subtitle="Latest admin responses and saved status.">
              <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Activity date setting
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Enable this to allow only today and yesterday. Disable it to allow any date.
                  </p>
                </div>
                <form action={activityDateAction} className="grid gap-4">
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      name="restrictActivityDate"
                      defaultChecked={activityDateSettings.restrictActivityDate}
                      className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                    />
                    Enable date restriction
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">
                      When enabled, only today and yesterday can be selected.
                    </p>
                    <button
                      type="submit"
                      disabled={activityDatePending}
                      className="rounded-full bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {activityDatePending ? "Saving..." : "Save settings"}
                    </button>
                  </div>
                </form>
                <InlineStatus state={activityDateState} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Filters</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Showing {filteredResponseRows.length} of {responses.length} rows in the selected date range
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="min-w-[180px]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Activity date from
                      </label>
                      <input
                        type="date"
                        value={responseDateFrom}
                        onChange={(event) => setResponseDateFrom(event.target.value)}
                        min={activityDateMin || undefined}
                        max={activityDateMax || undefined}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Activity date to
                      </label>
                      <input
                        type="date"
                        value={responseDateTo}
                        onChange={(event) => setResponseDateTo(event.target.value)}
                        min={activityDateMin || undefined}
                        max={activityDateMax || undefined}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={resetResponseFilters}
                      className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Clear filters
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadResponsesCsv(selectedResponses, "selected-responses.csv")}
                      disabled={!selectedResponses.length}
                      className="rounded-full border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Download selected
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadResponsesCsv(filteredResponseRows, `responses-${responseDateFrom || "start"}-${responseDateTo || "end"}.csv`)
                      }
                      disabled={!filteredResponseRows.length}
                      className="rounded-full border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Bulk download
                    </button>
                    <form action={responseDeleteAction}>
                      {selectedResponseIds.map((id) => (
                        <input key={id} type="hidden" name="ids" value={id} />
                      ))}
                      <button
                        type="submit"
                        disabled={!selectedResponseIds.length || responseDeletePending}
                        className="rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {responseDeletePending ? "Deleting..." : "Delete selected"}
                      </button>
                    </form>
                    <form action={responseDeleteAction}>
                      {visibleResponseIds.map((id) => (
                        <input key={id} type="hidden" name="ids" value={id} />
                      ))}
                      <button
                        type="submit"
                        disabled={!visibleResponseIds.length || responseDeletePending}
                        className="rounded-full border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {responseDeletePending ? "Deleting..." : "Bulk delete"}
                      </button>
                    </form>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Name
                    </label>
                    <input
                      type="text"
                      value={responseNameFilter}
                      onChange={(event) => setResponseNameFilter(event.target.value)}
                      placeholder="Search name"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Branch
                    </label>
                    <select
                      value={responseBranchFilter}
                      onChange={(event) => setResponseBranchFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">All branches</option>
                      {responseBranchOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Status
                    </label>
                    <select
                      value={responseStatusFilter}
                      onChange={(event) => setResponseStatusFilter(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">All statuses</option>
                      {responseStatusOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Team lead
                    </label>
                    <input
                      type="text"
                      value={responseTeamLead}
                      onChange={(event) => setResponseTeamLead(event.target.value)}
                      placeholder="Search team lead"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        <th className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            disabled={!visibleResponseIds.length}
                            onChange={(event) => {
                              const nextChecked = event.target.checked;
                              setSelectedResponseIds((current) => {
                                if (nextChecked) {
                                  return Array.from(new Set([...current, ...visibleResponseIds]));
                                }

                                return current.filter((id) => !visibleResponseIds.includes(id));
                              });
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
                          />
                        </th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Branch</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Team Lead</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Value</th>
                        <th className="px-4 py-3">Count</th>
                        <th className="px-4 py-3">Total Time Taken</th>
                        <th className="px-4 py-3">Remark</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredResponseRows.length ? (
                        filteredResponseRows.map((item) => (
                          <tr key={item.id} className="align-top">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedResponseIds.includes(item.id)}
                                onChange={(event) => {
                                  const nextChecked = event.target.checked;
                                  setSelectedResponseIds((current) =>
                                    nextChecked
                                      ? Array.from(new Set([...current, item.id]))
                                      : current.filter((id) => id !== item.id),
                                  );
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-sky-500 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-950">{item.name || "—"}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${responseStatusTone(item.status)}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.branchName || "—"}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.responseDate || "—"}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.teamLeadName || "—"}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.categoryLabel || "—"}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">{item.categoryValueName || "—"}</td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-700">{item.totalCount}</td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {formatDuration(item.totalTimeTakenHours, item.totalTimeTakenMinutes)}
                            </td>
                            <td className="px-4 py-4 text-sm leading-6 text-slate-700 whitespace-pre-wrap break-words">
                              {item.remark || "—"}
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-700">
                              {item.createdAt ? formatDateTime(item.createdAt) : "—"}
                            </td>
                          </tr>
                        ))
                        ) : (
                        <tr>
                          <td className="px-4 py-8 text-sm text-slate-500" colSpan={12}>
                            No responses match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <InlineStatus state={responseDeleteState} />
            </SectionCard>
          ) : null}

        </main>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: Array<[string, string]>;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-semibold uppercase tracking-[0.06em] text-slate-600">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      >
        {options.map(([value, labelValue]) => (
          <option key={value} value={value}>
            {labelValue}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditModal({
  title,
  onClose,
  action,
  pending,
  state,
  children,
}: {
  title: string;
  onClose: () => void;
  action: FormAction;
  pending: boolean;
  state: AdminActionState;
  children?: React.ReactNode;
}) {
  if (!children) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 px-4 py-8 backdrop-blur-sm">
      <div className="mt-4 w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_30px_120px_rgba(15,23,42,0.20)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Edit the selected record, then save the changes.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form action={action} className="mt-8 grid gap-5">
          {children}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save changes"}
          </button>
        </form>

        <InlineStatus state={state} />
      </div>
    </div>
  );
}


