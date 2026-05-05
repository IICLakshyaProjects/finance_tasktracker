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

const initialState: LoginState = {
  error: "",
};

const initialResponseState: ResponseState = {
  error: "",
  message: "",
  submittedAt: 0,
};

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
  const category = readString(formData, "category");
  const categoryValueId = readString(formData, "categoryValueId");
  const totalCountRaw = readString(formData, "totalCount");
  const totalTimeTaken = readString(formData, "totalTimeTaken");

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

  if (category !== "account-receivable" && category !== "branch-related") {
    return { error: "Choose a valid category.", message: "", submittedAt: 0 };
  }

  if (!categoryValueId) {
    return { error: "Choose a value for the selected category.", message: "", submittedAt: 0 };
  }

  const totalCount = Number.parseInt(totalCountRaw, 10);
  if (!Number.isInteger(totalCount) || totalCount < 0) {
    return { error: "Enter a valid total count.", message: "", submittedAt: 0 };
  }

  if (!totalTimeTaken) {
    return { error: "Enter the total time taken.", message: "", submittedAt: 0 };
  }

  const branch = await findCampusById(branchId);
  if (!branch) {
    return { error: "Selected branch was not found.", message: "", submittedAt: 0 };
  }

  const categoryLabel =
    category === "account-receivable" ? "Account Receivable related" : "Branch related";

  const categoryValue =
    category === "account-receivable"
      ? await findAccountReceivableById(categoryValueId)
      : await findBranchRelatedById(categoryValueId);

  if (!categoryValue) {
    return { error: "Selected category value was not found.", message: "", submittedAt: 0 };
  }

  await createResponse({
    name,
    branchId: branch.id,
    branchName: branch.name,
    teamLeadName,
    responseDate,
    category,
    categoryLabel,
    categoryValueId: categoryValue.id,
    categoryValueName: categoryValue.name,
    totalCount,
    totalTimeTaken,
  });

  revalidatePath("/admin");
  refresh();

  return {
    error: "",
    message: "Response saved.",
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
