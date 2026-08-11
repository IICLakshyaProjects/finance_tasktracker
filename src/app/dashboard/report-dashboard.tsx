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
type PeriodMode = "custom" | "weekly" | "monthly";

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

const TABLE_LABEL_WIDTH = "10.5rem";
const TABLE_TOTAL_WIDTH = "5rem";
const WORKING_DAYS_COLUMN = "Working Days";
const AVG_COLUMN = "Avg";

const EXCLUDED_FROM_AVG = new Set(["Leave", "Pending", "Weekoff"]);

function getTableColumnWidth(column: string) {
  if (column === "Account Receivable related") {
    return "10.5rem";
  }

  if (column === "Branch related") {
    return "8.5rem";
  }

  if (column === "Leave") {
    return "5rem";
  }

  if (column === "Pending") {
    return "5.5rem";
  }

  if (column === "Weekoff") {
    return "5.5rem";
  }

  if (column === WORKING_DAYS_COLUMN) {
    return "6rem";
  }

  if (column === AVG_COLUMN) {
    return "5rem";
  }

  return "7rem";
}

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getWeekStartInputValue(reference = new Date()) {
  const date = new Date(reference);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;

  date.setDate(date.getDate() - diff);

  return formatInputDate(date);
}

function getMonthStartInputValue(reference = new Date()) {
  const date = new Date(reference.getFullYear(), reference.getMonth(), 1);

  return formatInputDate(date);
}

function sumWorkingMetrics(
  cells: Map<string, CellAggregate>,
  columns: string[],
) {
  let count = 0;
  let minutes = 0;

  for (const column of columns) {
    if (EXCLUDED_FROM_AVG.has(column)) {
      continue;
    }

    const cell = cells.get(column);

    if (!cell?.hasValue) {
      continue;
    }

    count += cell.count;
    minutes += cell.minutes;
  }

  return { count, minutes };
}

function countWorkingDayUnits(rows: NormalizedReportRow[], branchName?: string, agentName?: string) {
  const units = new Set<string>();

  for (const row of rows) {
    if (row.isPlaceholder || row.status !== "working" || !row.responseDate) {
      continue;
    }

    if (branchName && row.branchName !== branchName) {
      continue;
    }

    if (agentName && row.agentName !== agentName) {
      continue;
    }

    units.add(`${row.branchName}::${row.agentName}::${row.responseDate}`);
  }

  return units.size;
}

function formatAverageValue(count: number, minutes: number, workingDays: number, metric: MetricMode) {
  if (workingDays <= 0) {
    return "";
  }

  if (metric === "time") {
    return formatDuration(Math.round(minutes / workingDays));
  }

  const average = count / workingDays;

  return Number.isInteger(average) ? String(average) : average.toFixed(1);
}

function getAverageValue(
  cells: Map<string, CellAggregate>,
  columns: string[],
  rows: NormalizedReportRow[],
  metric: MetricMode,
  branchName?: string,
  agentName?: string,
) {
  const { count, minutes } = sumWorkingMetrics(cells, columns);
  const workingDays = countWorkingDayUnits(rows, branchName, agentName);

  return formatAverageValue(count, minutes, workingDays, metric);
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

function getCellValue(cell: CellAggregate | undefined, metric: MetricMode, column?: string) {
  if (!cell?.hasValue) {
    return "";
  }

  if (column && isStatusCountColumn(column)) {
    return String(cell.count);
  }

  return metric === "time" ? formatDuration(cell.minutes) : String(cell.count);
}

function isStatusCountColumn(column: string) {
  return column === "Leave" || column === "Weekoff" || column === "Pending";
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

  if (isStatusCountColumn(column)) {
    return getCellValue(cell, metric, column);
  }

  if (metric === "time" && storedTime) {
    return storedTime;
  }

  return getCellValue(cell, metric, column);
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
  const [periodMode, setPeriodMode] = useState<PeriodMode>("custom");
  const today = getTodayInputValue();
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountReceivableFilter, setAccountReceivableFilter] = useState("");
  const [branchRelatedFilter, setBranchRelatedFilter] = useState("");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const reportCaptureRef = useRef<HTMLDivElement>(null);
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

  const applyWeeklyRange = () => {
    setPeriodMode("weekly");
    setDateFrom(getWeekStartInputValue());
    setDateTo(today);
  };

  const applyMonthlyRange = () => {
    setPeriodMode("monthly");
    setDateFrom(getMonthStartInputValue());
    setDateTo(today);
  };

  const grandAverage = useMemo(
    () => getAverageValue(grandTotals.totals, columns, pivotRows, metricMode),
    [columns, grandTotals.totals, metricMode, pivotRows],
  );

  const grandWorkingDays = useMemo(() => String(countWorkingDayUnits(pivotRows)), [pivotRows]);

  const getWorkingDaysValue = (branchName?: string, agentName?: string) =>
    String(countWorkingDayUnits(pivotRows, branchName, agentName));

  const handleScreenshot = async () => {
    const source = reportCaptureRef.current ?? dashboardRef.current;

    if (!source) {
      return;
    }

    const clone = source.cloneNode(true) as HTMLElement;
    const sourceRect = source.getBoundingClientRect();
    const captureWidth = Math.ceil(Math.max(source.scrollWidth, sourceRect.width, 1));
    const captureHeight = Math.ceil(Math.max(source.scrollHeight, sourceRect.height, 1));

    clone.querySelectorAll<HTMLElement>('[data-screenshot-ignore="true"]').forEach((node) => {
      node.remove();
    });

    clone.style.position = "fixed";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    clone.style.margin = "0";
    clone.style.background = "#ffffff";
    clone.style.display = "inline-block";
    clone.style.width = `${captureWidth}px`;
    clone.style.height = "auto";
    clone.style.maxWidth = "none";
    clone.style.maxHeight = "none";
    clone.style.overflow = "visible";
    clone.style.pointerEvents = "none";

    document.body.appendChild(clone);

    try {
      await document.fonts?.ready;

      const dataUrl = await toPng(clone, {
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
      });

      const link = document.createElement("a");
      link.download = `ar-tracker-${dateFrom || today}${dateTo && dateTo !== dateFrom ? `-to-${dateTo}` : ""}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      clone.remove();
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-4 text-slate-900 sm:px-4 lg:px-6">
      <div ref={dashboardRef} className="mx-auto flex w-fit max-w-none flex-col gap-3">
        <section className="w-fit rounded-none border border-slate-400 bg-white shadow-sm">
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
                  onClick={applyWeeklyRange}
                  className={`rounded-full px-4 py-2 transition ${
                    periodMode === "weekly"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={applyMonthlyRange}
                  className={`rounded-full px-4 py-2 transition ${
                    periodMode === "monthly"
                      ? "bg-sky-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Monthly
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
                  onChange={(event) => {
                    setPeriodMode("custom");
                    setDateFrom(event.target.value);
                  }}
                  className="bg-transparent text-sm text-slate-900 outline-none"
                />
                <span className="text-slate-300">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => {
                    setPeriodMode("custom");
                    setDateTo(event.target.value);
                  }}
                  className="bg-transparent text-sm text-slate-900 outline-none"
                />
                {(dateFrom || dateTo) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodMode("custom");
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
            <div ref={reportCaptureRef} className="mx-auto w-max">
              <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-2 py-1.5 text-slate-700 sm:gap-3 sm:px-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                  Date Range: {dateFrom || "Start"} to {dateTo || "End"}
                </div>
                <div className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                  Grand Total: {formatMetric(grandTotals.totalCount, grandTotals.totalMinutes)}
                </div>
              </div>
              <div className="flex justify-center px-2 py-2">
                <table className="inline-table min-w-max table-fixed border-separate border-spacing-0 text-[10px] leading-tight sm:text-sm">
                <colgroup>
                  <col style={{ width: TABLE_LABEL_WIDTH }} />
                  {columns.map((column) => (
                    <col key={column} style={{ width: getTableColumnWidth(column) }} />
                  ))}
                  <col style={{ width: getTableColumnWidth(WORKING_DAYS_COLUMN) }} />
                  <col style={{ width: getTableColumnWidth(AVG_COLUMN) }} />
                  <col style={{ width: TABLE_TOTAL_WIDTH }} />
                </colgroup>
                <thead>
                  <tr className="bg-sky-100">
                    <th
                      colSpan={columns.length + 4}
                    className="border-b border-slate-300 px-1.5 py-1 text-center text-sm font-semibold tracking-tight text-slate-950 sm:text-[15px]"
                  >
                    AR Tracker
                  </th>
                </tr>
                <tr className="bg-slate-50">
                    <th className="border-b border-r border-slate-300 px-1 py-[3px] text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 sm:text-[11px]">
                      <div className="flex items-center gap-1">
                        <span className="truncate">Row Labels</span>
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[9px] text-slate-500">
                          v
                        </span>
                      </div>
                    </th>
                    {columns.map((column) => (
                      <th
                        key={column}
                        title={column}
                      className="border-b border-r border-slate-300 px-0.5 py-[3px] text-center text-[10px] font-semibold text-slate-700 sm:text-[11px]"
                      >
                        <span className="block truncate px-0.5">{column}</span>
                      </th>
                    ))}
                    <th
                      title={WORKING_DAYS_COLUMN}
                      className="border-b border-r border-slate-300 px-0.5 py-[3px] text-center text-[10px] font-semibold text-slate-700 sm:text-[11px]"
                    >
                      <span className="block truncate px-0.5">{WORKING_DAYS_COLUMN}</span>
                    </th>
                    <th
                      title={AVG_COLUMN}
                      className="border-b border-r border-slate-300 px-0.5 py-[3px] text-center text-[10px] font-semibold text-slate-700 sm:text-[11px]"
                    >
                      <span className="block truncate px-0.5">{AVG_COLUMN}</span>
                    </th>
                    <th className="border-b border-slate-300 px-0.5 py-[3px] text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 sm:text-[11px]">
                      Grand Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groupedBranches.map((branch) => (
                    <Fragment key={branch.branchName}>
                      <tr className="bg-white">
                      <td className="border-b border-r border-slate-200 px-1 py-[3px] font-semibold text-slate-950">
                          <div className="flex items-center gap-1">
                            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-[9px] leading-none text-slate-600">
                              -
                            </span>
                            <span className="truncate" title={branch.branchName}>
                              {branch.branchName}
                            </span>
                          </div>
                        </td>
                        {columns.map((column) => (
                          <td
                            key={`${branch.branchName}-subtotal-${column}`}
                            className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950"
                          >
                            {getCellValue(branch.totals.get(column), metricMode, column)}
                          </td>
                        ))}
                        <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                          {getWorkingDaysValue(branch.branchName)}
                        </td>
                        <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                          {getAverageValue(
                            branch.totals,
                            columns,
                            pivotRows,
                            metricMode,
                            branch.branchName,
                          )}
                        </td>
                        <td className="border-b border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                          {formatMetric(branch.totalCount, branch.totalMinutes)}
                        </td>
                      </tr>

                      {branch.agents.map((agent) => (
                        <tr key={agent.id} className="bg-white">
                          <td className="border-b border-r border-slate-200 px-1 py-[3px] pl-3 text-slate-700">
                            <span className="block truncate" title={agent.label}>
                              {agent.label}
                            </span>
                          </td>
                          {columns.map((column) => (
                            <td
                              key={`${agent.id}-${column}`}
                              className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center text-slate-800"
                            >
                              {getDetailCellValue(column, agent.cells.get(column), metricMode)}
                            </td>
                          ))}
                          <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center text-slate-800">
                            {getWorkingDaysValue(branch.branchName, agent.label)}
                          </td>
                          <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center text-slate-800">
                            {getAverageValue(
                              agent.cells,
                              columns,
                              pivotRows,
                              metricMode,
                              branch.branchName,
                              agent.label,
                            )}
                          </td>
                          <td className="border-b border-slate-200 px-0.5 py-[3px] text-center text-slate-800">
                            {formatMetric(agent.totalCount, agent.totalMinutes)}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}

                  <tr className="bg-slate-100">
                    <td className="border-b border-r border-slate-200 px-1.5 py-[3px] font-semibold text-slate-950">
                      Grand Total
                    </td>
                    {columns.map((column) => (
                      <td
                        key={`grand-total-${column}`}
                        className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950"
                      >
                        {getCellValue(grandTotals.totals.get(column), metricMode, column)}
                      </td>
                    ))}
                    <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                      {grandWorkingDays}
                    </td>
                    <td className="border-b border-r border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                      {grandAverage}
                    </td>
                    <td className="border-b border-slate-200 px-0.5 py-[3px] text-center font-semibold text-slate-950">
                      {formatMetric(grandTotals.totalCount, grandTotals.totalMinutes)}
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
