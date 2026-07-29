"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

type ResponseRecord = {
  id: string;
  agentUsername: string;
  name: string;
  status: string;
  branchName: string;
  teamLeadName: string;
  responseDate: string;
  category: string;
  categoryLabel: string;
  categoryValueName: string;
  totalCount: number;
  totalTimeTaken: string;
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

type DashboardReportProps = {
  responses: ResponseRecord[];
  users: UserRecord[];
};

type MetricMode = "count" | "time";

type NormalizedReportRow = {
  responseDate: string;
  branchName: string;
  agentName: string;
  agentUsername: string;
  status: string;
  category: string;
  categoryLabel: string;
  categoryValueName: string;
  totalCount: number;
  totalMinutes: number;
  totalTimeTaken: string;
  isPending: boolean;
  isPlaceholder?: boolean;
};

type CellAggregate = {
  count: number;
  minutes: number;
  hasValue: boolean;
};

type AgentGroup = {
  id: string;
  label: string;
  cells: Map<string, CellAggregate>;
  totalCount: number;
  totalMinutes: number;
};

type BranchGroup = {
  branchName: string;
  agents: AgentGroup[];
  totals: Map<string, CellAggregate>;
  totalCount: number;
  totalMinutes: number;
};

const COLUMN_ORDER = [
  "Account Receivable related",
  "Branch related",
  "Leave",
  "Pending",
  "Weekoff",
];

const CATEGORY_ORDER = ["account-receivable", "branch-related", "leave", "weekoff", "pending"];

function getColumnWidthClass(column: string) {
  if (column === "Leave") {
    return "w-[28px] sm:w-[26px]";
  }

  if (column === "Pending") {
    return "w-[32px] sm:w-[20px]";
  }

  if (column === "Weekoff") {
    return "w-[32px] sm:w-[20px]";
  }

  if (column === "Account Receivable related") {
    return "w-[72px] sm:w-[40px]";
  }

  if (column === "Branch related") {
    return "w-[42px] sm:w-[30px]";
  }

  return "w-[36px] sm:w-[48px]";
}

function formatDropdownLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDuration(totalMinutes: number) {
  const normalized = Number.isFinite(totalMinutes) ? Math.max(0, Math.trunc(totalMinutes)) : 0;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseRowDurationMinutes(
  item: Pick<ResponseRecord, "totalTimeTaken" | "totalTimeTakenHours" | "totalTimeTakenMinutes">,
) {
  const storedValue = item.totalTimeTaken.trim();
  const match = storedValue.match(/^(\d+):(\d{2})$/);

  if (match) {
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);

    if (Number.isInteger(hours) && Number.isInteger(minutes)) {
      return hours * 60 + minutes;
    }
  }

  const hours = Number.isFinite(item.totalTimeTakenHours)
    ? Math.max(0, Math.trunc(item.totalTimeTakenHours))
    : 0;
  const minutes = Number.isFinite(item.totalTimeTakenMinutes)
    ? Math.max(0, Math.trunc(item.totalTimeTakenMinutes))
    : 0;

  return hours * 60 + minutes;
}

function normalizeIdentity(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

const excludedResponseIdentities = new Set(
  [
    "sudeesh.s@iiclakshya.com",
    "siddarth@iiclakshya.com",
    "alvinjose@iiclakshya.com",
    "Siddarth P",
    "Sudeesh S",
  ].map((value) => normalizeIdentity(value)),
);

function isExcludedResponseIdentity(...values: Array<string | null | undefined>) {
  return values.map(normalizeIdentity).some((value) => excludedResponseIdentities.has(value));
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();

  return trimmed || fallback;
}

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeResponseRows(responses: ResponseRecord[]) {
  return responses
    .filter((item) => !isExcludedResponseIdentity(item.agentUsername, item.name))
    .map<NormalizedReportRow>((item) => {
      const status = item.status.trim().toLowerCase();
      const categoryLabel =
        status === "leave"
          ? "Leave"
          : status === "weekoff"
            ? "Weekoff"
            : status === "pending"
              ? "Pending"
              : item.categoryLabel?.trim() || "Uncategorized";

      return {
        responseDate: item.responseDate,
        branchName: normalizeLabel(item.branchName, "Unassigned"),
        agentName: normalizeLabel(item.name || item.agentUsername, "-"),
        agentUsername: normalizeLabel(item.agentUsername, "-"),
        status,
        category: normalizeLabel(item.category, "uncategorized").trim().toLowerCase(),
        categoryLabel,
        categoryValueName: normalizeLabel(item.categoryValueName, "-"),
        totalCount: Number.isFinite(item.totalCount) ? Math.max(0, Math.trunc(item.totalCount)) : 0,
        totalMinutes: parseRowDurationMinutes(item),
        totalTimeTaken: item.totalTimeTaken.trim(),
        isPending: status === "pending",
      };
    });
}

function buildPendingRows(users: UserRecord[], responseRows: NormalizedReportRow[]) {
  const respondedIdentities = new Set(
    responseRows.flatMap((item) => [normalizeIdentity(item.agentUsername), normalizeIdentity(item.agentName)]),
  );

  return users
    .filter((user) => user.role.trim().toUpperCase() !== "ADMIN")
    .filter((user) => !isExcludedResponseIdentity(user.username, user.email, user.name))
    .filter((user) => {
      const identities = [user.username, user.email, user.name ?? ""];

      return !identities.some((identity) => respondedIdentities.has(normalizeIdentity(identity)));
    })
    .map<NormalizedReportRow>((user) => ({
      responseDate: "",
      branchName: normalizeLabel(user.campusName, "Unassigned"),
      agentName: normalizeLabel(user.name || user.username, "-"),
      agentUsername: normalizeLabel(user.username, "-"),
      status: "pending",
      category: "pending",
      categoryLabel: "Pending",
      categoryValueName: "",
      totalCount: 1,
      totalMinutes: 0,
      totalTimeTaken: "",
      isPending: true,
    }));
}

function buildEmployeeSeedRows(users: UserRecord[]) {
  return users
    .filter((user) => user.role.trim().toUpperCase() !== "ADMIN")
    .filter((user) => !isExcludedResponseIdentity(user.username, user.email, user.name))
    .map<NormalizedReportRow>((user) => ({
      responseDate: "",
      branchName: normalizeLabel(user.campusName, "Unassigned"),
      agentName: normalizeLabel(user.name || user.username, "-"),
      agentUsername: normalizeLabel(user.username, "-"),
      status: "seed",
      category: "seed",
      categoryLabel: "Seed",
      categoryValueName: "",
      totalCount: 0,
      totalMinutes: 0,
      totalTimeTaken: "",
      isPending: false,
      isPlaceholder: true,
    }));
}

function getCellValue(cell: CellAggregate | undefined, metric: MetricMode) {
  if (!cell?.hasValue) {
    return "";
  }

  return metric === "time" ? formatDuration(cell.minutes) : String(cell.count);
}

function getDetailCellValue(
  column: string,
  cell: CellAggregate | undefined,
  metric: MetricMode,
  storedTime?: string,
) {
  if (!cell?.hasValue) {
    return "";
  }

  if (column === "Leave" || column === "Weekoff") {
    return column;
  }

  if (metric === "time" && storedTime) {
    return storedTime;
  }

  return getCellValue(cell, metric);
}

function makeCellAggregate(count = 0, minutes = 0, hasValue = false): CellAggregate {
  return { count, minutes, hasValue };
}

function addCellValue(target: Map<string, CellAggregate>, key: string, count: number, minutes: number) {
  const existing = target.get(key);

  if (existing) {
    existing.count += count;
    existing.minutes += minutes;
    existing.hasValue = true;
    return;
  }

  target.set(key, {
    count,
    minutes,
    hasValue: true,
  });
}

function buildGroups(rows: NormalizedReportRow[]) {
  const branchMap = new Map<string, BranchGroup>();

  for (const row of rows) {
    const branchKey = row.branchName;
    const agentKey = row.agentName;

    const branch =
      branchMap.get(branchKey) ??
      (() => {
        const created: BranchGroup = {
          branchName: branchKey,
          agents: [],
          totals: new Map<string, CellAggregate>(),
          totalCount: 0,
          totalMinutes: 0,
        };
        branchMap.set(branchKey, created);
        return created;
      })();

    let agent = branch.agents.find((item) => item.label === agentKey);

    if (!agent) {
      agent = {
        id: `${branchKey}::${agentKey}`,
        label: agentKey,
        cells: new Map<string, CellAggregate>(),
        totalCount: 0,
        totalMinutes: 0,
      };
      branch.agents.push(agent);
    }

    if (row.isPlaceholder) {
      continue;
    }

    const cellCount = row.isPending || row.status !== "working" ? 1 : row.totalCount;
    const cellMinutes = row.isPending || row.status !== "working" ? 0 : row.totalMinutes;

    addCellValue(agent.cells, row.categoryLabel, cellCount, cellMinutes);
    agent.totalCount += cellCount;
    agent.totalMinutes += cellMinutes;

    addCellValue(branch.totals, row.categoryLabel, cellCount, cellMinutes);
    branch.totalCount += cellCount;
    branch.totalMinutes += cellMinutes;
  }

  return Array.from(branchMap.values())
    .sort((left, right) => left.branchName.localeCompare(right.branchName))
    .map((branch) => ({
      ...branch,
      agents: branch.agents.sort((left, right) => left.label.localeCompare(right.label)),
    }));
}

export function DashboardReport({ responses, users }: DashboardReportProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>("time");
  const today = getTodayInputValue();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountReceivableFilter, setAccountReceivableFilter] = useState("");
  const [branchRelatedFilter, setBranchRelatedFilter] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (branchDropdownRef.current && !branchDropdownRef.current.contains(target)) {
        setIsBranchDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  const responseRows = useMemo(() => normalizeResponseRows(responses), [responses]);

  const dateFilteredResponses = useMemo(() => {
    const from = dateFrom.trim();
    const to = dateTo.trim();

    const start = from && to ? (from <= to ? from : to) : from || to;
    const end = from && to ? (from <= to ? to : from) : to || from;

    const filteredResponses = responseRows.filter((row) => {
      if (!row.responseDate) {
        return false;
      }

      if (!start || !end) {
        return row.responseDate === start || row.responseDate === end;
      }

      return row.responseDate >= start && row.responseDate <= end;
    });

    return filteredResponses;
  }, [dateFrom, dateTo, responseRows]);

  const branchOptions = useMemo(() => {
    const discovered = new Set<string>();

    for (const row of dateFilteredResponses) {
      if (row.branchName) {
        discovered.add(row.branchName);
      }
    }

    for (const row of buildPendingRows(users, dateFilteredResponses)) {
      if (row.branchName) {
        discovered.add(row.branchName);
      }
    }

    for (const row of buildEmployeeSeedRows(users)) {
      if (row.branchName) {
        discovered.add(row.branchName);
      }
    }

    return Array.from(discovered).sort((left, right) => left.localeCompare(right));
  }, [dateFilteredResponses, users]);

  const categoryFilteredResponses = useMemo(() => {
    return dateFilteredResponses.filter((row) => {
      if (selectedBranches.length && !selectedBranches.includes(row.branchName)) {
        return false;
      }

      if (categoryFilter && row.category !== categoryFilter) {
        return false;
      }

      if (row.categoryLabel === "Account Receivable related") {
        return accountReceivableFilter
          ? row.categoryValueName === accountReceivableFilter
          : true;
      }

      if (row.categoryLabel === "Branch related") {
        return branchRelatedFilter ? row.categoryValueName === branchRelatedFilter : true;
      }

      return true;
    });
  }, [accountReceivableFilter, branchRelatedFilter, categoryFilter, dateFilteredResponses, selectedBranches]);

  const pendingRows = useMemo(
    () => buildPendingRows(users, dateFilteredResponses),
    [dateFilteredResponses, users],
  );

  const employeeSeedRows = useMemo(() => buildEmployeeSeedRows(users), [users]);

  const pendingFilteredRows = useMemo(() => {
    if (categoryFilter && categoryFilter !== "pending") {
      return [];
    }

    if (!selectedBranches.length) {
      return pendingRows;
    }

    return pendingRows.filter((row) => selectedBranches.includes(row.branchName));
  }, [categoryFilter, pendingRows, selectedBranches]);

  const filteredRows = useMemo(
    () => [...categoryFilteredResponses, ...pendingFilteredRows],
    [categoryFilteredResponses, pendingFilteredRows],
  );

  const categoryOptions = useMemo(() => {
    const discovered = new Set<string>();

    for (const row of [...dateFilteredResponses, ...pendingRows]) {
      if (row.category) {
        discovered.add(row.category);
      }
    }

    const ordered = CATEGORY_ORDER.filter((value) => discovered.has(value));
    const remaining = Array.from(discovered).filter((value) => !CATEGORY_ORDER.includes(value));

    return [...ordered, ...remaining.sort((left, right) => left.localeCompare(right))];
  }, [dateFilteredResponses, pendingRows]);

  const accountReceivableOptions = useMemo(() => {
    return Array.from(
      new Set(
        dateFilteredResponses
          .filter((row) => row.categoryLabel === "Account Receivable related")
          .map((row) => row.categoryValueName)
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [dateFilteredResponses]);

  const branchRelatedOptions = useMemo(() => {
    return Array.from(
      new Set(
        dateFilteredResponses
          .filter((row) => row.categoryLabel === "Branch related")
          .map((row) => row.categoryValueName)
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [dateFilteredResponses]);

  const tableRows = filteredRows;

  const pivotRows = useMemo(() => {
    if (categoryFilter !== "account-receivable" && categoryFilter !== "branch-related") {
      return tableRows;
    }

    const seededRows = selectedBranches.length
      ? employeeSeedRows.filter((row) => selectedBranches.includes(row.branchName))
      : employeeSeedRows;

    return [...seededRows, ...tableRows].map((row) => {
      if (row.categoryLabel === "Account Receivable related" || row.categoryLabel === "Branch related") {
        return {
          ...row,
          categoryLabel: row.categoryValueName || "Uncategorized",
        };
      }

      return row;
    });
  }, [categoryFilter, employeeSeedRows, selectedBranches, tableRows]);

  const columns = useMemo(() => {
    if (categoryFilter === "account-receivable") {
      return [...accountReceivableOptions, "Leave", "Pending", "Weekoff"];
    }

    if (categoryFilter === "branch-related") {
      return [...branchRelatedOptions, "Leave", "Pending", "Weekoff"];
    }

    const discovered = new Set<string>();

    for (const row of pivotRows) {
      if (!COLUMN_ORDER.includes(row.categoryLabel)) {
        discovered.add(row.categoryLabel);
      }
    }

    return [...COLUMN_ORDER, ...Array.from(discovered).sort((left, right) => left.localeCompare(right))];
  }, [accountReceivableOptions, branchRelatedOptions, categoryFilter, pivotRows]);

  const groupedBranches = useMemo(() => buildGroups(pivotRows), [pivotRows]);

  const grandTotals = useMemo(() => {
    const totals = new Map<string, CellAggregate>();
    let totalCount = 0;
    let totalMinutes = 0;

    for (const branch of groupedBranches) {
      for (const column of columns) {
        const cell = branch.totals.get(column);

        if (!cell) {
          continue;
        }

        const existing = totals.get(column) ?? makeCellAggregate();
        existing.count += cell.count;
        existing.minutes += cell.minutes;
        existing.hasValue = true;
        totals.set(column, existing);
      }

      totalCount += branch.totalCount;
      totalMinutes += branch.totalMinutes;
    }

    return { totals, totalCount, totalMinutes };
  }, [columns, groupedBranches]);

  const formatMetric = (count: number, minutes: number) =>
    metricMode === "time" ? formatDuration(minutes) : String(count);

  const handleScreenshot = async () => {
    const element = dashboardRef.current;

    if (!element) {
      return;
    }

    const captureWidth = Math.max(element.scrollWidth, element.clientWidth);
    const captureHeight = Math.max(element.scrollHeight, element.clientHeight);

    const dataUrl = await toPng(element, {
      cacheBust: true,
      width: captureWidth,
      height: captureHeight,
      canvasWidth: captureWidth,
      canvasHeight: captureHeight,
      pixelRatio: Math.max(2, window.devicePixelRatio || 1),
      backgroundColor: "#ffffff",
      style: {
        width: `${captureWidth}px`,
        height: `${captureHeight}px`,
        overflow: "visible",
      },
      filter: (node) => !(node instanceof HTMLElement && node.dataset.screenshotIgnore === "true"),
    });

    const link = document.createElement("a");
    link.download = `ar-tracker-${dateFrom || today}${dateTo && dateTo !== dateFrom ? `-to-${dateTo}` : ""}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:px-4 lg:px-6">
      <div ref={dashboardRef} className="mx-auto flex w-full max-w-[1600px] flex-col gap-3">
        <section className="rounded-none border border-slate-400 bg-white shadow-sm">
          <div
            className="border-b border-slate-400 bg-sky-100 px-3 py-2"
            data-screenshot-ignore="true"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  AR Tracker
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                  Branch Activity Report
                </h1>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setMetricMode("time")}
                  className={`rounded-full px-4 py-2 transition ${
                    metricMode === "time"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => setMetricMode("count")}
                  className={`rounded-full px-4 py-2 transition ${
                    metricMode === "count"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Count
                </button>
                <button
                  type="button"
                  onClick={() => void handleScreenshot()}
                  data-screenshot-ignore="true"
                  className="rounded-full px-4 py-2 text-slate-600 transition hover:bg-slate-100"
                >
                  Screenshot
                </button>
              </div>

              <div
                className="flex flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2"
              >
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="bg-transparent text-sm text-slate-900 outline-none"
                />
                <span className="text-slate-300">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="bg-transparent text-sm text-slate-900 outline-none"
                />
                {(dateFrom || dateTo) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom(today);
                      setDateTo(today);
                      setCategoryFilter("");
                      setAccountReceivableFilter("");
                      setBranchRelatedFilter("");
                      setSelectedBranches([]);
                    }}
                    className="text-xs font-semibold text-sky-700"
                  >
                    Clear
                  </button>
                ) : null}
              </div>

              <div className="grid w-full gap-2 sm:grid-cols-2 lg:w-auto lg:min-w-[520px]">
                <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 print:hidden">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Category
                  </label>
                  <select
                    value={categoryFilter}
                    onChange={(event) => {
                      const nextCategory = event.target.value;
                      setCategoryFilter(nextCategory);

                      if (nextCategory !== "account-receivable") {
                        setAccountReceivableFilter("");
                      }

                      if (nextCategory !== "branch-related") {
                        setBranchRelatedFilter("");
                      }
                    }}
                    className="min-w-[140px] bg-transparent text-sm text-slate-900 outline-none"
                  >
                    <option value="">All</option>
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {formatDropdownLabel(option)}
                      </option>
                    ))}
                  </select>
                </div>

                {categoryFilter === "account-receivable" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 print:hidden">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Account receivable
                    </label>
                    <select
                      value={accountReceivableFilter}
                      onChange={(event) => setAccountReceivableFilter(event.target.value)}
                      className="min-w-[140px] bg-transparent text-sm text-slate-900 outline-none"
                    >
                      <option value="">All</option>
                      {accountReceivableOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                {categoryFilter === "branch-related" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 print:hidden">
                    <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Branch related
                    </label>
                    <select
                      value={branchRelatedFilter}
                      onChange={(event) => setBranchRelatedFilter(event.target.value)}
                      className="min-w-[140px] bg-transparent text-sm text-slate-900 outline-none"
                    >
                      <option value="">All</option>
                      {branchRelatedOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                                <div ref={branchDropdownRef} className="relative print:hidden">
                  <button
                    type="button"
                    onClick={() => setIsBranchDropdownOpen((current) => !current)}
                    className="flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm outline-none"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Branch
                    </span>
                    <span className="truncate text-sm font-medium text-slate-700">
                      {!selectedBranches.length
                        ? "All"
                        : selectedBranches.length === 1
                          ? selectedBranches[0]
                          : `${selectedBranches.length} selected`}
                    </span>
                    <span className="text-slate-400">▾</span>
                  </button>

                  {isBranchDropdownOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 w-[320px] rounded-xl border border-slate-300 bg-white p-3 shadow-lg">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Select branches
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedBranches([])}
                            className="text-xs font-semibold text-sky-700"
                          >
                            Reset filter
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsBranchDropdownOpen(false)}
                            className="text-xs font-semibold text-slate-500"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                      <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pr-1">
                        <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={!selectedBranches.length}
                            onChange={() => setSelectedBranches([])}
                          />
                          All
                        </label>
                        {branchOptions.map((branch) => (
                          <label
                            key={branch}
                            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-sm text-slate-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBranches.includes(branch)}
                              onChange={(event) => {
                                setSelectedBranches((current) => {
                                  if (event.target.checked) {
                                    return current.includes(branch) ? current : [...current, branch];
                                  }

                                  return current.filter((item) => item !== branch);
                                });
                              }}
                            />
                            {branch}
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-400 bg-sky-50 px-2 py-2 text-slate-800 sm:gap-3 sm:px-3">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                Date Range: {dateFrom || "Start"} to {dateTo || "End"}
              </div>
              <div className="text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                Grand Total: {formatMetric(grandTotals.totalCount, grandTotals.totalMinutes)}
              </div>
            </div>
            <table className="min-w-[460px] w-full table-fixed border-collapse text-[10px] leading-tight sm:min-w-[560px] sm:text-sm">
              <colgroup>
                <col className="w-[52px] sm:w-[72px]" />
                {columns.map((column) => (
                  <col key={column} className={getColumnWidthClass(column)} />
                ))}
                <col className="w-[40px] sm:w-[56px]" />
              </colgroup>
              <thead>
                <tr className="bg-sky-100">
                  <th
                    colSpan={columns.length + 2}
                    className="border-b border-r border-slate-400 px-1 py-1 text-center text-sm font-bold text-slate-950 sm:px-1.5 sm:text-lg"
                  >
                    AR Tracker
                  </th>
                </tr>
                <tr className="bg-sky-100">
                  <th className="border border-slate-400 px-0.5 py-1 text-left font-bold text-slate-900 sm:px-1">
                    <div className="flex items-center gap-0.5">
                      <span>Row Labels</span>
                      <span className="inline-flex h-4 w-4 items-center justify-center border border-slate-300 bg-white text-[9px] text-slate-500">
                        v
                      </span>
                    </div>
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column}
                      className="border border-slate-400 px-0.5 py-1 text-center text-[10px] font-bold text-slate-900 break-words sm:text-sm"
                    >
                      {column}
                    </th>
                  ))}
                  <th className="border border-slate-400 px-0.5 py-1 text-center text-[9px] font-bold text-slate-900 sm:px-1 sm:text-sm">
                    Grand Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {groupedBranches.map((branch) => (
                  <Fragment key={branch.branchName}>
                    <tr className="bg-white">
                      <td className="border border-slate-400 px-0.5 py-1 font-bold text-slate-950 break-words sm:px-1">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <span className="inline-flex h-3 w-3 items-center justify-center border border-slate-400 bg-slate-100 text-[9px] leading-none text-slate-700 sm:h-3.5 sm:w-3.5 sm:text-[10px]">
                            -
                          </span>
                          <span>{branch.branchName}</span>
                        </div>
                      </td>
                        {columns.map((column) => (
                          <td
                            key={`${branch.branchName}-subtotal-${column}`}
                            className="border border-slate-400 px-0.5 py-1 text-center font-bold text-slate-950"
                          >
                            {getCellValue(branch.totals.get(column), metricMode)}
                          </td>
                        ))}
                      <td className="border border-slate-400 px-0.5 py-1 text-center font-bold text-slate-950 sm:px-1">
                        {formatMetric(branch.totalCount, branch.totalMinutes)}
                      </td>
                    </tr>

                    {branch.agents.map((agent) => (
                      <tr key={agent.id} className="bg-white">
                        <td className="border border-slate-400 px-0.5 py-1 pl-1.5 text-slate-950 break-words sm:px-1 sm:pl-3">
                          {agent.label}
                        </td>
                        {columns.map((column) => (
                          <td
                            key={`${agent.id}-${column}`}
                            className="border border-slate-400 px-0.5 py-1 text-center text-slate-900"
                          >
                            {getDetailCellValue(column, agent.cells.get(column), metricMode)}
                          </td>
                        ))}
                        <td className="border border-slate-400 px-0.5 py-1 text-center text-slate-900 sm:px-1">
                          {formatMetric(agent.totalCount, agent.totalMinutes)}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}

                <tr className="bg-sky-100">
                  <td className="border border-slate-400 px-0.5 py-1 font-bold text-slate-950 sm:px-1">
                    Grand Total
                  </td>
                  {columns.map((column) => (
                    <td
                      key={`grand-total-${column}`}
                      className="border border-slate-400 px-0.5 py-1 text-center font-bold text-slate-950"
                    >
                      {getCellValue(grandTotals.totals.get(column), metricMode)}
                    </td>
                  ))}
                  <td className="border border-slate-400 px-0.5 py-1 text-center font-bold text-slate-950 sm:px-1">
                    {formatMetric(grandTotals.totalCount, grandTotals.totalMinutes)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
