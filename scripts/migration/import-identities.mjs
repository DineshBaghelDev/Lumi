import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const requireFromDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const { Pool } = requireFromDb("pg");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

export const assertLocalDatabaseUrl = (value) => {
  if (!value) throw new Error("MIGRATION_DATABASE_URL is required");
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname)) {
    throw new Error(`Refusing identity write to non-local database host: ${url.hostname}`);
  }
  return value;
};

const parseJsonl = (compressed) => {
  const text = gunzipSync(compressed).toString("utf8");
  return { text, rows: text.trim() ? text.trimEnd().split("\n").map((line) => JSON.parse(line)) : [] };
};

const rejectDuplicates = (values, label) => {
  const seen = new Set();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
};

export const buildIdentityPlan = ({ appUsers, identityRows }) => {
  const sourceUsers = identityRows.filter((row) => row.recordType !== "provider");
  const providers = identityRows.filter((row) => row.recordType === "provider");
  rejectDuplicates(appUsers.map((row) => row.auth_user_id), "application auth ID");
  rejectDuplicates(appUsers.map((row) => normalizeEmail(row.email)), "application email");
  rejectDuplicates(sourceUsers.map((row) => row.id), "source auth ID");
  rejectDuplicates(sourceUsers.map((row) => normalizeEmail(row.email)), "source auth email");
  rejectDuplicates(providers.map((row) => `${row.provider}:${row.provider_account_id}`), "provider account");

  const sourceById = new Map(sourceUsers.map((row) => [String(row.id), row]));
  const appByAuthId = new Map(appUsers.map((row) => [String(row.auth_user_id), row]));
  const exceptions = [];
  const users = appUsers.map((appUser) => {
    const source = sourceById.get(String(appUser.auth_user_id));
    const email = normalizeEmail(source?.email ?? appUser.email);
    if (!email) throw new Error(`Application user ${appUser.id} has no usable email`);
    if (!source) exceptions.push({ type: "missing_source_identity", appUserId: appUser.id, authUserId: appUser.auth_user_id, emailSha256: sha256(email) });
    if (source && normalizeEmail(appUser.email) !== normalizeEmail(source.email)) {
      exceptions.push({ type: "email_mismatch", appUserId: appUser.id, authUserId: appUser.auth_user_id, emailSha256: sha256(email) });
    }
    const profile = source?.profile && typeof source.profile === "object" ? source.profile : {};
    return {
      id: String(appUser.auth_user_id),
      name: String(profile.name ?? profile.full_name ?? email.split("@")[0]),
      email,
      emailVerified: Boolean(source?.email_verified),
      image: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
      createdAt: source?.created_at ?? appUser.created_at,
      updatedAt: source?.updated_at ?? appUser.updated_at,
      placeholder: !source,
    };
  });

  const accounts = [];
  for (const provider of providers) {
    if (provider.provider !== "google") continue;
    if (!appByAuthId.has(String(provider.user_id))) {
      exceptions.push({ type: "orphan_provider", providerId: provider.id, authUserId: provider.user_id });
      continue;
    }
    accounts.push({
      id: String(provider.id),
      accountId: String(provider.provider_account_id),
      providerId: "google",
      userId: String(provider.user_id),
      createdAt: provider.created_at,
      updatedAt: provider.updated_at,
    });
  }
  const googleUsers = new Set(accounts.map((row) => row.userId));
  for (const user of users) {
    if (!googleUsers.has(user.id)) exceptions.push({ type: "missing_google_provider", authUserId: user.id, emailSha256: sha256(user.email) });
  }
  return { users, accounts, exceptions };
};

export const importIdentities = async ({ archiveDirectory, databaseUrl }) => {
  assertLocalDatabaseUrl(databaseUrl);
  const manifest = JSON.parse(await readFile(resolve(archiveDirectory, "manifest.json"), "utf8"));
  const usersArchive = parseJsonl(await readFile(resolve(archiveDirectory, "users.jsonl.gz")));
  const identitiesArchive = parseJsonl(await readFile(resolve(archiveDirectory, "auth-identities.jsonl.gz")));
  if (sha256(usersArchive.text) !== manifest.tables?.users?.sha256) throw new Error("users archive hash mismatch");
  if (sha256(identitiesArchive.text) !== manifest.auth?.sha256) throw new Error("auth archive hash mismatch");
  const plan = buildIdentityPlan({ appUsers: usersArchive.rows, identityRows: identitiesArchive.rows });
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const existing = await client.query("select (select count(*) from auth_user)::int as users, (select count(*) from auth_account)::int as accounts");
    if (existing.rows[0].users || existing.rows[0].accounts) throw new Error("Target auth tables must be empty");
    for (const user of plan.users) {
      await client.query(
        `insert into auth_user (id, name, email, email_verified, image, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [user.id, user.name, user.email, user.emailVerified, user.image, user.createdAt, user.updatedAt],
      );
    }
    for (const account of plan.accounts) {
      await client.query(
        `insert into auth_account (id, account_id, provider_id, user_id, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6)`,
        [account.id, account.accountId, account.providerId, account.userId, account.createdAt, account.updatedAt],
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  const report = { importedUsers: plan.users.length, importedGoogleAccounts: plan.accounts.length, placeholders: plan.users.filter((row) => row.placeholder).length, exceptions: plan.exceptions };
  await writeFile(resolve(archiveDirectory, "identity-import-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  return report;
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try { process.loadEnvFile(resolve(".env")); } catch { /* CI may inject env. */ }
  const archiveDirectory = process.argv[2];
  if (!archiveDirectory) throw new Error("Usage: pnpm migration:identities -- <archive-directory>");
  console.log(JSON.stringify(await importIdentities({ archiveDirectory: resolve(archiveDirectory), databaseUrl: process.env.MIGRATION_DATABASE_URL }), null, 2));
}
