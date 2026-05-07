import "server-only";

import crypto from "crypto";

import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  pool?: Pool;
  schemaReady?: Promise<void>;
  schemaBootstrapVersion?: number;
};

const SCHEMA_BOOTSTRAP_VERSION = 12;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing required environment variable: DATABASE_URL");
}

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString,
  });

if (!globalForDb.pool) {
  globalForDb.pool = pool;
}

async function ensureSchema() {
  if (globalForDb.schemaBootstrapVersion !== SCHEMA_BOOTSTRAP_VERSION) {
    globalForDb.schemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "BranchRelated" (
          id text PRIMARY KEY,
          name text NOT NULL UNIQUE,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "Campus" (
          id text PRIMARY KEY,
          name text NOT NULL UNIQUE,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "TeamLeads" (
          id text PRIMARY KEY,
          name text NOT NULL UNIQUE,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "AccountReceivables" (
          id text PRIMARY KEY,
          name text NOT NULL UNIQUE,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "Responses" (
          id text PRIMARY KEY,
          "agentId" text NOT NULL,
          "agentName" text NOT NULL,
          "agentUsername" text NOT NULL,
          status text NOT NULL DEFAULT 'working',
          "branchId" text NOT NULL,
          "branchName" text NOT NULL,
          "teamLeadName" text NOT NULL,
          category text NOT NULL,
          "categoryLabel" text NOT NULL,
          "categoryValueId" text NOT NULL,
          "categoryValueName" text NOT NULL,
          "responseDate" text NOT NULL,
          "totalCount" integer NOT NULL,
          "totalTimeTaken" text NOT NULL,
          remark text NOT NULL DEFAULT '',
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS "users" (
          id text PRIMARY KEY,
          name text,
          username text NOT NULL UNIQUE,
          email text NOT NULL UNIQUE,
          "campusId" text,
          role text NOT NULL DEFAULT 'USER',
          "passwordHash" text,
          status text NOT NULL DEFAULT 'INVITED',
          "passwordSetupTokenHash" text,
          "passwordSetupExpiresAt" timestamptz,
          "passwordSetAt" timestamptz,
          "createdAt" timestamptz NOT NULL DEFAULT now(),
          "updatedAt" timestamptz NOT NULL DEFAULT now()
        );

        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS name text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "campusId" text;
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'USER';
        ALTER TABLE "Responses" ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'working';
        ALTER TABLE "Responses" ADD COLUMN IF NOT EXISTS remark text NOT NULL DEFAULT '';
      `);

      const legacyUserTable = await pool.query<{ exists: boolean }>(
        `SELECT to_regclass('"User"') IS NOT NULL AS exists`
      );

      if (legacyUserTable.rows[0]?.exists) {
        await pool.query(`
          INSERT INTO "users" (
            id,
            name,
            username,
            email,
            role,
            "passwordHash",
            status,
            "passwordSetupTokenHash",
            "passwordSetupExpiresAt",
            "passwordSetAt",
            "createdAt",
            "updatedAt"
          )
          SELECT
            id,
            name,
            username,
            email,
            role,
            "passwordHash",
            status,
            "passwordSetupTokenHash",
            "passwordSetupExpiresAt",
            "passwordSetAt",
            "createdAt",
            "updatedAt"
          FROM "User"
          ON CONFLICT (id) DO NOTHING
        `);
      }
    })();

    globalForDb.schemaBootstrapVersion = SCHEMA_BOOTSTRAP_VERSION;
  }

  await globalForDb.schemaReady;
}

async function query<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  await ensureSchema();
  return pool.query<T>(text, values);
}

export type BranchRelatedRecord = {
  id: string;
  name: string;
};

export type CampusRecord = {
  id: string;
  name: string;
};

export type TeamLeadRecord = {
  id: string;
  name: string;
};

export type AccountReceivableRecord = {
  id: string;
  name: string;
};

export type ResponseRecord = {
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
  totalTimeTaken: string;
  remark: string;
  createdAt: Date;
};

export type UserRecord = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  campusId: string | null;
  campusName: string | null;
  role: string;
  status: string;
  createdAt: Date;
  passwordSetAt: Date | null;
};

export type UserAuthRecord = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  campusId: string | null;
  campusName: string | null;
  role: string;
  passwordHash: string | null;
  status: string;
  passwordSetupTokenHash: string | null;
  passwordSetupExpiresAt: Date | null;
};

export async function listBranchRelated(): Promise<BranchRelatedRecord[]> {
  const result = await query<BranchRelatedRecord>(
    `
      SELECT id, name
      FROM "BranchRelated"
      ORDER BY "createdAt" DESC
    `,
  );

  return result.rows;
}

export async function listCampuses(): Promise<CampusRecord[]> {
  const result = await query<CampusRecord>(
    `
      SELECT id, name
      FROM "Campus"
      ORDER BY "createdAt" DESC
    `,
  );

  return result.rows;
}

export async function listTeamLeads(): Promise<TeamLeadRecord[]> {
  const result = await query<TeamLeadRecord>(
    `
      SELECT id, name
      FROM "TeamLeads"
      ORDER BY "createdAt" DESC
    `,
  );

  return result.rows;
}

export async function listAccountReceivables(): Promise<AccountReceivableRecord[]> {
  const result = await query<AccountReceivableRecord>(
    `
      SELECT id, name
      FROM "AccountReceivables"
      ORDER BY "createdAt" DESC
    `,
  );

  return result.rows;
}

export async function listResponses(): Promise<ResponseRecord[]> {
  const result = await query<ResponseRecord>(
    `
      SELECT
        id,
        "agentName" AS name,
        status,
        "branchId",
        "branchName",
        "teamLeadName",
        "responseDate",
        category,
        "categoryLabel",
        "categoryValueId",
        "categoryValueName",
        "totalCount",
        "totalTimeTaken",
        remark,
        "createdAt"
      FROM "Responses"
      ORDER BY "responseDate" DESC, "createdAt" DESC
    `,
  );

  return result.rows;
}

export async function deleteResponses(ids: string[]): Promise<number> {
  if (!ids.length) {
    return 0;
  }

  const result = await query(
    `
      DELETE FROM "Responses"
      WHERE id = ANY($1::text[])
    `,
    [ids],
  );

  return result.rowCount ?? 0;
}

export async function createBranchRelated(name: string) {
  const id = crypto.randomUUID();

  try {
    const result = await query<BranchRelatedRecord & { createdAt: Date }>(
      `
        INSERT INTO "BranchRelated" (id, name)
        VALUES ($1, $2)
        RETURNING id, name, "createdAt"
      `,
      [id, name],
    );

    return result.rows[0] ?? { id, name, createdAt: new Date() };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const result = await query<BranchRelatedRecord & { createdAt: Date }>(
        `
          SELECT id, name, "createdAt"
          FROM "BranchRelated"
          WHERE name = $1
          LIMIT 1
        `,
        [name],
      );

      if (result.rows[0]) {
        return result.rows[0];
      }
    }

    throw error;
  }
}

export async function updateBranchRelated(id: string, name: string) {
  const result = await query<BranchRelatedRecord & { createdAt: Date }>(
    `
      UPDATE "BranchRelated"
      SET
        name = $2,
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, "createdAt"
    `,
    [id, name],
  );

  return result.rows[0] ?? null;
}

export async function deleteBranchRelated(id: string) {
  const result = await query(
    `
      DELETE FROM "BranchRelated"
      WHERE id = $1
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createCampus(name: string) {
  const id = crypto.randomUUID();

  try {
    const result = await query<CampusRecord & { createdAt: Date }>(
      `
        INSERT INTO "Campus" (id, name)
        VALUES ($1, $2)
        RETURNING id, name, "createdAt"
      `,
      [id, name],
    );

    return result.rows[0] ?? { id, name, createdAt: new Date() };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const result = await query<CampusRecord & { createdAt: Date }>(
        `
          SELECT id, name, "createdAt"
          FROM "Campus"
          WHERE name = $1
          LIMIT 1
        `,
        [name],
      );

      if (result.rows[0]) {
        return result.rows[0];
      }
    }

    throw error;
  }
}

export async function updateCampus(id: string, name: string) {
  const result = await query<CampusRecord & { createdAt: Date }>(
    `
      UPDATE "Campus"
      SET
        name = $2,
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, "createdAt"
    `,
    [id, name],
  );

  return result.rows[0] ?? null;
}

export async function createTeamLead(name: string) {
  const id = crypto.randomUUID();

  try {
    const result = await query<TeamLeadRecord & { createdAt: Date }>(
      `
        INSERT INTO "TeamLeads" (id, name)
        VALUES ($1, $2)
        RETURNING id, name, "createdAt"
      `,
      [id, name],
    );

    return result.rows[0] ?? { id, name, createdAt: new Date() };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const result = await query<TeamLeadRecord & { createdAt: Date }>(
        `
          SELECT id, name, "createdAt"
          FROM "TeamLeads"
          WHERE name = $1
          LIMIT 1
        `,
        [name],
      );

      if (result.rows[0]) {
        return result.rows[0];
      }
    }

    throw error;
  }
}

export async function deleteCampus(id: string) {
  const result = await query(
    `
      DELETE FROM "Campus"
      WHERE id = $1
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function updateTeamLead(id: string, name: string) {
  const result = await query<TeamLeadRecord & { createdAt: Date }>(
    `
      UPDATE "TeamLeads"
      SET
        name = $2,
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, "createdAt"
    `,
    [id, name],
  );

  return result.rows[0] ?? null;
}

export async function deleteTeamLead(id: string) {
  const result = await query(
    `
      DELETE FROM "TeamLeads"
      WHERE id = $1
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createAccountReceivable(name: string) {
  const id = crypto.randomUUID();

  try {
    const result = await query<AccountReceivableRecord & { createdAt: Date }>(
      `
        INSERT INTO "AccountReceivables" (id, name)
        VALUES ($1, $2)
        RETURNING id, name, "createdAt"
      `,
      [id, name],
    );

    return result.rows[0] ?? { id, name, createdAt: new Date() };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      const result = await query<AccountReceivableRecord & { createdAt: Date }>(
        `
          SELECT id, name, "createdAt"
          FROM "AccountReceivables"
          WHERE name = $1
          LIMIT 1
        `,
        [name],
      );

      if (result.rows[0]) {
        return result.rows[0];
      }
    }

    throw error;
  }
}

export async function updateAccountReceivable(id: string, name: string) {
  const result = await query<AccountReceivableRecord & { createdAt: Date }>(
    `
      UPDATE "AccountReceivables"
      SET
        name = $2,
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING id, name, "createdAt"
    `,
    [id, name],
  );

  return result.rows[0] ?? null;
}

export async function deleteAccountReceivable(id: string) {
  const result = await query(
    `
      DELETE FROM "AccountReceivables"
      WHERE id = $1
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function findBranchRelatedById(id: string) {
  const result = await query<BranchRelatedRecord>(
    `
      SELECT id, name
      FROM "BranchRelated"
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findCampusById(id: string) {
  const result = await query<CampusRecord>(
    `
      SELECT id, name
      FROM "Campus"
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findTeamLeadById(id: string) {
  const result = await query<TeamLeadRecord>(
    `
      SELECT id, name
      FROM "TeamLeads"
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findAccountReceivableById(id: string) {
  const result = await query<AccountReceivableRecord>(
    `
      SELECT id, name
      FROM "AccountReceivables"
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function findUserById(id: string) {
  const result = await query<UserRecord>(
    `
      SELECT
        id,
        name,
        username,
        email,
        "campusId",
        c.name AS "campusName",
        role::text AS role,
        status::text AS status,
        "createdAt",
        "passwordSetAt"
      FROM "users" u
      LEFT JOIN "Campus" c ON c.id = "users"."campusId"
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function listUsers(): Promise<UserRecord[]> {
  const result = await query<UserRecord>(
    `
      SELECT
        u.id,
        u.name,
        u.username,
        u.email,
        u."campusId",
        c.name AS "campusName",
        u.role::text AS role,
        u.status::text AS status,
        u."createdAt",
        u."passwordSetAt"
      FROM "users" u
      LEFT JOIN "Campus" c ON c.id = u."campusId"
      ORDER BY u."createdAt" DESC
    `,
  );

  return result.rows;
}

export async function updateUser(input: {
  id: string;
  name: string | null;
  username: string;
  email: string;
  campusId: string | null;
  role: string;
  passwordHash: string | null;
}) {
  const result = await query<UserRecord & { passwordHash: string | null }>(
    `
      UPDATE "users"
      SET
        name = $2,
        username = $3,
        email = $4,
        "campusId" = $5,
        role = $6,
        "passwordHash" = COALESCE($7, "passwordHash"),
        "passwordSetupTokenHash" = CASE WHEN $7 IS NULL THEN "passwordSetupTokenHash" ELSE NULL END,
        "passwordSetupExpiresAt" = CASE WHEN $7 IS NULL THEN "passwordSetupExpiresAt" ELSE NULL END,
        "passwordSetAt" = CASE WHEN $7 IS NULL THEN "passwordSetAt" ELSE NOW() END,
        status = CASE WHEN $7 IS NULL THEN status ELSE 'ACTIVE' END,
        "updatedAt" = NOW()
      WHERE id = $1
      RETURNING
        id,
        name,
        username,
        email,
        "campusId",
        role::text AS role,
        status::text AS status,
        "createdAt",
        "passwordHash"
    `,
    [input.id, input.name, input.username, input.email, input.campusId, input.role, input.passwordHash],
  );

  return result.rows[0] ?? null;
}

export async function deleteUser(id: string) {
  const result = await query(
    `
      DELETE FROM "users"
      WHERE id = $1
    `,
    [id],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function findUserForLogin(identifier: string): Promise<UserAuthRecord | null> {
  const result = await query<UserAuthRecord>(
    `
      SELECT
        id,
        name,
        username,
        email,
        role::text AS role,
        "passwordHash",
        status::text AS status,
        "passwordSetupTokenHash",
        "passwordSetupExpiresAt"
      FROM "users" u
      WHERE (username = $1 OR email = $1)
        AND status::text <> 'DISABLED'
      LIMIT 1
    `,
    [identifier],
  );

  return result.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<UserAuthRecord | null> {
  const result = await query<UserAuthRecord>(
      `
        SELECT
          u.id,
          u.name,
          u.username,
          u.email,
          u."campusId",
          c.name AS "campusName",
          u.role::text AS role,
          u."passwordHash",
          u.status::text AS status,
          u."passwordSetupTokenHash",
          u."passwordSetupExpiresAt"
        FROM "users" u
        LEFT JOIN "Campus" c ON c.id = u."campusId"
        WHERE u.email = $1
        LIMIT 1
      `,
      [email],
    );

  return result.rows[0] ?? null;
}

export async function updateUserPasswordSetupToken(input: {
  email: string;
  passwordSetupTokenHash: string;
  passwordSetupExpiresAt: Date;
}) {
  const result = await query(
    `
      UPDATE "users"
      SET
        "passwordSetupTokenHash" = $1,
        "passwordSetupExpiresAt" = $2,
        "updatedAt" = NOW()
      WHERE email = $3
    `,
    [input.passwordSetupTokenHash, input.passwordSetupExpiresAt, input.email],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function createUser(input: {
  name: string | null;
  username: string;
  email: string;
  campusId: string | null;
  role: string;
  passwordHash: string | null;
  passwordSetupTokenHash: string;
  passwordSetupExpiresAt: Date;
  passwordSetAt: Date | null;
  status: string;
}) {
  const id = crypto.randomUUID();

  const result = await query<
    {
      id: string;
      name: string | null;
      username: string;
      email: string;
      campusId: string | null;
      role: string;
      status: string;
      createdAt: Date;
    }
  >(
    `
      INSERT INTO "users" (
        id,
        name,
        username,
        email,
        "campusId",
        role,
        "passwordHash",
        status,
        "passwordSetupTokenHash",
        "passwordSetupExpiresAt",
        "passwordSetAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING
        id,
        name,
        username,
        email,
        role::text AS role,
        status::text AS status,
        "createdAt"
    `,
    [
      id,
      input.name,
      input.username,
      input.email,
      input.campusId,
      input.role,
      input.passwordHash,
      input.status,
      input.passwordSetupTokenHash,
      input.passwordSetupExpiresAt,
      input.passwordSetAt,
    ],
  );

  return result.rows[0] ?? {
    id,
    name: input.name,
    username: input.username,
    email: input.email,
    campusId: input.campusId,
    campusName: null,
    role: input.role,
    status: input.status,
    createdAt: new Date(),
  };
}

export async function createResponse(input: {
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
  totalTimeTaken: string;
  remark: string;
}) {
  const id = crypto.randomUUID();

  const result = await query<ResponseRecord>(
    `
      INSERT INTO "Responses" (
        id,
        "agentId",
        "agentName",
        "agentUsername",
        status,
        "branchId",
        "branchName",
        "teamLeadName",
        "responseDate",
        category,
        "categoryLabel",
        "categoryValueId",
        "categoryValueName",
        "totalCount",
        "totalTimeTaken",
        remark
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      )
      RETURNING
        id,
        "agentName" AS name,
        status,
        "branchId",
        "branchName",
        "teamLeadName",
        "responseDate",
        category,
        "categoryLabel",
        "categoryValueId",
        "categoryValueName",
        "totalCount",
        "totalTimeTaken",
        remark,
        "createdAt"
    `,
    [
      id,
      crypto.randomUUID(),
      input.name,
      input.name,
      input.status,
      input.branchId,
      input.branchName,
      input.teamLeadName,
      input.responseDate,
      input.category,
      input.categoryLabel,
      input.categoryValueId,
      input.categoryValueName,
      input.totalCount,
      input.totalTimeTaken,
      input.remark,
    ],
  );

  return result.rows[0] ?? {
    id,
    name: input.name,
    status: input.status,
    branchId: input.branchId,
    branchName: input.branchName,
    teamLeadName: input.teamLeadName,
    responseDate: input.responseDate,
    category: input.category,
    categoryLabel: input.categoryLabel,
    categoryValueId: input.categoryValueId,
    categoryValueName: input.categoryValueName,
    totalCount: input.totalCount,
    totalTimeTaken: input.totalTimeTaken,
    remark: input.remark,
    createdAt: new Date(),
  };
}

export async function updateUserPassword(input: {
  email: string;
  passwordHash: string;
}) {
  await query(
    `
      UPDATE "users"
      SET
        "passwordHash" = $1,
        "passwordSetupTokenHash" = NULL,
        "passwordSetupExpiresAt" = NULL,
        "passwordSetAt" = NOW(),
        status = 'ACTIVE',
        "updatedAt" = NOW()
      WHERE email = $2
    `,
    [input.passwordHash, input.email],
  );
}
