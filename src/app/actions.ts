"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";

import {
  authenticateAdmin,
  authenticateUser,
  clearSessionCookie,
  getSession,
  setSessionCookie,
  type Role,
} from "@/lib/auth";
import {
  createResponse,
  findAccountReceivableById,
  findBranchRelatedById,
  findCampusById,
} from "@/lib/db";

export type LoginState = {
  error: string;
};

export type ResponseState = {
  error: string;
  message: string;
  submittedAt: number;
};

type ResponseStatus = "working" | "leave" | "weekoff";
type ResponseCategory = "account-receivable" | "branch-related";

type ResponseRowInput = {
  category: ResponseCategory;
  categoryValueId: string;
  totalCount: string;
  totalTimeTaken: string;
};

const initialState: LoginState = {
  error: "",
};

const initialResponseState: ResponseState = {
  error: "",
  message: "",
  submittedAt: 0,
};

function normalizeResponseStatus(value: string): ResponseStatus | null {
  if (value === "working" || value === "leave" || value === "weekoff") {
    return value;
  }

  return null;
}

function parseResponseRows(raw: string): ResponseRowInput[] | null {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const rows: ResponseRowInput[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        return null;
      }

      const row = item as Partial<ResponseRowInput>;

      if (row.category !== "account-receivable" && row.category !== "branch-related") {
        return null;
      }

      rows.push({
        category: row.category,
        categoryValueId: String(row.categoryValueId ?? "").trim(),
        totalCount: String(row.totalCount ?? "").trim(),
        totalTimeTaken: String(row.totalTimeTaken ?? "").trim(),
      });
    }

    return rows;
  } catch {
    return null;
  }
}

function normalizeRole(value: FormDataEntryValue | null): Role | null {
  if (value === "admin" || value === "user") {
    return value;
  }

  return null;
}

export async function loginAction(
  previousState: LoginState = initialState,
  formData: FormData,
): Promise<LoginState> {
  void previousState;

  const role = normalizeRole(formData.get("role"));
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!role) {
    return {
      error: "Choose a valid role before signing in.",
    };
  }

  if (!username || !password) {
    return {
      error: "Enter both username and password.",
    };
  }

  const session =
    role === "admin"
      ? await authenticateAdmin(username, password)
      : await authenticateUser(username, password);

  if (!session) {
    return {
      error: "Invalid credentials for the selected role.",
    };
  }

  await setSessionCookie(session);

  if (role === "admin") {
    redirect("/admin");
  }

  redirect("/response");
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createResponseAction(
  previousState: ResponseState = initialResponseState,
  formData: FormData,
): Promise<ResponseState> {
  void previousState;

  const name = readString(formData, "name");
  const branchId = readString(formData, "branchId");
  const responseDate = readString(formData, "responseDate");
  const teamLeadName = readString(formData, "teamLeadName");
  const status = normalizeResponseStatus(readString(formData, "status"));
  const responseRows = parseResponseRows(readString(formData, "responseRows"));

  if (!name) {
    return { error: "Enter the name.", message: "", submittedAt: 0 };
  }

  if (!branchId) {
    return { error: "Choose a branch.", message: "", submittedAt: 0 };
  }

  if (!responseDate) {
    return { error: "Choose a date.", message: "", submittedAt: 0 };
  }

  if (!teamLeadName) {
    return { error: "Enter the team lead name.", message: "", submittedAt: 0 };
  }

  if (!status) {
    return { error: "Choose a valid status.", message: "", submittedAt: 0 };
  }

  const branch = await findCampusById(branchId);
  if (!branch) {
    return { error: "Selected branch was not found.", message: "", submittedAt: 0 };
  }

  if (status !== "working") {
    await createResponse({
      name,
      status,
      branchId: branch.id,
      branchName: branch.name,
      teamLeadName,
      responseDate,
      category: status,
      categoryLabel: status === "leave" ? "Leave" : "Weekoff",
      categoryValueId: "",
      categoryValueName: "",
      totalCount: 0,
      totalTimeTaken: "",
    });

    revalidatePath("/admin");
    refresh();

    return {
      error: "",
      message: "Response saved. Returned to the first step.",
      submittedAt: Date.now(),
    };
  }

  if (!responseRows || !responseRows.length) {
    return { error: "Add at least one response row.", message: "", submittedAt: 0 };
  }

  for (let index = 0; index < responseRows.length; index += 1) {
    const row = responseRows[index];
    const rowNumber = index + 1;

    if (!row.categoryValueId) {
      return { error: `Row ${rowNumber}: choose a value for the selected category.`, message: "", submittedAt: 0 };
    }

    const totalCount = Number.parseInt(row.totalCount, 10);
    if (!Number.isInteger(totalCount) || totalCount < 0) {
      return { error: `Row ${rowNumber}: enter a valid total count.`, message: "", submittedAt: 0 };
    }

    if (!row.totalTimeTaken) {
      return { error: `Row ${rowNumber}: enter the total time taken.`, message: "", submittedAt: 0 };
    }

    const categoryLabel =
      row.category === "account-receivable" ? "Account Receivable related" : "Branch related";

    const categoryValue =
      row.category === "account-receivable"
        ? await findAccountReceivableById(row.categoryValueId)
        : await findBranchRelatedById(row.categoryValueId);

    if (!categoryValue) {
      return { error: `Row ${rowNumber}: selected category value was not found.`, message: "", submittedAt: 0 };
    }

    await createResponse({
      name,
      status,
      branchId: branch.id,
      branchName: branch.name,
      teamLeadName,
      responseDate,
      category: row.category,
      categoryLabel,
      categoryValueId: categoryValue.id,
      categoryValueName: categoryValue.name,
      totalCount,
      totalTimeTaken: row.totalTimeTaken,
    });
  }

  revalidatePath("/admin");
  refresh();

  return {
    error: "",
    message: `${responseRows.length} response${responseRows.length === 1 ? "" : "s"} saved. Returned to the first step.`,
    submittedAt: Date.now(),
  };
}

export async function logoutAction() {
  const session = await getSession();
  await clearSessionCookie();

  if (session?.role === "admin") {
    redirect("/admin/login");
  }

  redirect("/");
}
