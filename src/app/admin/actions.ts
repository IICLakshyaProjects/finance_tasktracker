"use server";

import { refresh, revalidatePath } from "next/cache";

import {
  createAccountReceivable,
  createBranchRelated,
  createCampus,
  createTeamLead,
  createUser,
  deleteAccountReceivable,
  deleteBranchRelated,
  deleteCampus,
  deleteResponses,
  deleteTeamLead,
  deleteUser,
  updateAccountReceivable,
  updateBranchRelated,
  updateCampus,
  updateTeamLead,
  updateUser,
} from "@/lib/db";
import { hasSmtpConfig, sendPasswordSetupEmail } from "@/lib/mailer";
import {
  createRandomToken,
  hashPassword,
  hashToken,
} from "@/lib/password";

type AdminActionState = {
  error: string;
  message: string;
  loginLink: string;
  setupLink: string;
};

const initialState: AdminActionState = {
  error: "",
  message: "",
  loginLink: "",
  setupLink: "",
};

function success(
  message: string,
  loginLink = "",
  setupLink = "",
): AdminActionState {
  return {
    error: "",
    message,
    loginLink,
    setupLink,
  };
}

function failure(error: string): AdminActionState {
  return {
    error,
    message: "",
    loginLink: "",
    setupLink: "",
  };
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizeRole(value: string) {
  return value.toUpperCase() === "ADMIN" ? "ADMIN" : "USER";
}

function readId(formData: FormData) {
  return readString(formData, "id");
}

export async function addBranchRelatedAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const name = readString(formData, "name");

  if (!name) {
    return failure("Branch related name is required.");
  }

  try {
    await createBranchRelated(name);
    revalidatePath("/admin");
    refresh();
    return success(`Branch related "${name}" added.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      revalidatePath("/admin");
      refresh();
      return success(`Branch related "${name}" already exists.`);
    }

    return failure("Could not add branch related value.");
  }
}

export async function updateBranchRelatedAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  const name = readString(formData, "name");

  if (!id || !name) {
    return failure("Branch related name is required.");
  }

  try {
    await updateBranchRelated(id, name);
    revalidatePath("/admin");
    refresh();
    return success(`Branch related "${name}" updated.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return failure(`Branch related "${name}" already exists.`);
    }

    return failure("Could not update branch related value.");
  }
}

export async function deleteBranchRelatedAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  if (!id) {
    return failure("Branch related id is required.");
  }

  const deleted = await deleteBranchRelated(id);
  revalidatePath("/admin");
  refresh();
  return deleted ? success("Branch related deleted.") : failure("Could not delete branch related value.");
}

export async function addCampusAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const name = readString(formData, "name");

  if (!name) {
    return failure("Campus name is required.");
  }

  try {
    await createCampus(name);
    revalidatePath("/admin");
    refresh();
    return success(`Campus "${name}" added.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      revalidatePath("/admin");
      refresh();
      return success(`Campus "${name}" already exists.`);
    }

    return failure("Could not add campus value.");
  }
}

export async function updateCampusAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  const name = readString(formData, "name");

  if (!id || !name) {
    return failure("Campus name is required.");
  }

  try {
    await updateCampus(id, name);
    revalidatePath("/admin");
    refresh();
    return success(`Campus "${name}" updated.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return failure(`Campus "${name}" already exists.`);
    }

    return failure("Could not update campus value.");
  }
}

export async function addTeamLeadAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const name = readString(formData, "name");

  if (!name) {
    return failure("Team lead name is required.");
  }

  try {
    await createTeamLead(name);
    revalidatePath("/admin");
    refresh();
    return success(`Team lead "${name}" added.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      revalidatePath("/admin");
      refresh();
      return success(`Team lead "${name}" already exists.`);
    }

    return failure("Could not add team lead value.");
  }
}

export async function updateTeamLeadAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  const name = readString(formData, "name");

  if (!id || !name) {
    return failure("Team lead name is required.");
  }

  try {
    await updateTeamLead(id, name);
    revalidatePath("/admin");
    refresh();
    return success(`Team lead "${name}" updated.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return failure(`Team lead "${name}" already exists.`);
    }

    return failure("Could not update team lead value.");
  }
}

export async function deleteTeamLeadAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  if (!id) {
    return failure("Team lead id is required.");
  }

  const deleted = await deleteTeamLead(id);
  revalidatePath("/admin");
  refresh();
  return deleted ? success("Team lead deleted.") : failure("Could not delete team lead value.");
}

export async function deleteCampusAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  if (!id) {
    return failure("Campus id is required.");
  }

  const deleted = await deleteCampus(id);
  revalidatePath("/admin");
  refresh();
  return deleted ? success("Campus deleted.") : failure("Could not delete campus value.");
}

export async function addAccountReceivablesAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const name = readString(formData, "name");

  if (!name) {
    return failure("Account receivable name is required.");
  }

  try {
    await createAccountReceivable(name);
    revalidatePath("/admin");
    refresh();
    return success(`Account receivable "${name}" added.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      revalidatePath("/admin");
      refresh();
      return success(`Account receivable "${name}" already exists.`);
    }

    return failure("Could not add account receivable value.");
  }
}

export async function updateAccountReceivablesAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  const name = readString(formData, "name");

  if (!id || !name) {
    return failure("Account receivable name is required.");
  }

  try {
    await updateAccountReceivable(id, name);
    revalidatePath("/admin");
    refresh();
    return success(`Account receivable "${name}" updated.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return failure(`Account receivable "${name}" already exists.`);
    }

    return failure("Could not update account receivable value.");
  }
}

export async function deleteAccountReceivablesAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  if (!id) {
    return failure("Account receivable id is required.");
  }

  const deleted = await deleteAccountReceivable(id);
  revalidatePath("/admin");
  refresh();
  return deleted
    ? success("Account receivable deleted.")
    : failure("Could not delete account receivable value.");
}

export async function createUserAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const name = readString(formData, "name");
  const username = readString(formData, "username");
  const password = readString(formData, "password");
  const campusId = readString(formData, "campusId");
  const role = normalizeRole(readString(formData, "role"));

  if (!username) {
    return failure("Username / email is required.");
  }

  if (!campusId) {
    return failure("Campus is required.");
  }

  const setupToken = createRandomToken();
  const setupTokenHash = hashToken(setupToken);
  const setupExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3001";
  const loginLink = role === "ADMIN" ? `${appUrl}/admin/login` : `${appUrl}/`;
  const setupLink = `${appUrl}/set-password?token=${setupToken}&email=${encodeURIComponent(username)}`;

  try {
    await createUser({
      name: name || null,
      username,
      email: username,
      campusId,
      role,
      passwordHash: password ? hashPassword(password) : null,
      status: password ? "ACTIVE" : "INVITED",
      passwordSetupTokenHash: setupTokenHash,
      passwordSetupExpiresAt: setupExpiresAt,
      passwordSetAt: password ? new Date() : null,
    });

    let mailSent = false;

    try {
      const mailResult = await sendPasswordSetupEmail({
        to: username,
        username,
        loginUrl: loginLink,
        setupUrl: setupLink,
      });

      mailSent = mailResult.sent;
    } catch {
      mailSent = false;
    }

    revalidatePath("/admin");
    refresh();

    if (!hasSmtpConfig() || !mailSent) {
      return success(
        `${role === "ADMIN" ? "Admin" : "User"} "${username}" added. SMTP is not configured, so use the login and setup links below.`,
        loginLink,
        setupLink,
      );
    }

    return success(
      `${role === "ADMIN" ? "Admin" : "User"} "${username}" added and emailed to ${username}.`,
      loginLink,
      setupLink,
    );
  } catch {
    return failure("Could not create user. Username or email may already exist.");
  }
}

export async function updateUserAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  const name = readString(formData, "name");
  const username = readString(formData, "username");
  const password = readString(formData, "password");
  const campusId = readString(formData, "campusId");
  const role = normalizeRole(readString(formData, "role"));

  if (!id || !username) {
    return failure("Username / email is required.");
  }

  if (!campusId) {
    return failure("Campus is required.");
  }

  try {
    await updateUser({
      id,
      name: name || null,
      username,
      email: username,
      campusId,
      role,
      passwordHash: password ? hashPassword(password) : null,
    });

    revalidatePath("/admin");
    refresh();
    return success(`User "${username}" updated.`);
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return failure(`Username or email "${username}" already exists.`);
    }

    return failure("Could not update user.");
  }
}

export async function deleteUserAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const id = readId(formData);
  if (!id) {
    return failure("User id is required.");
  }

  const deleted = await deleteUser(id);
  revalidatePath("/admin");
  refresh();
  return deleted ? success("User deleted.") : failure("Could not delete user.");
}

export async function deleteResponsesAction(
  previousState: AdminActionState = initialState,
  formData: FormData,
): Promise<AdminActionState> {
  void previousState;

  const ids = formData.getAll("ids").map((value) => String(value).trim()).filter(Boolean);

  if (!ids.length) {
    return failure("Select at least one response.");
  }

  const deletedCount = await deleteResponses(ids);
  revalidatePath("/admin");
  refresh();

  return deletedCount > 0
    ? success(`${deletedCount} response${deletedCount === 1 ? "" : "s"} deleted.`)
    : failure("Could not delete the selected responses.");
}
