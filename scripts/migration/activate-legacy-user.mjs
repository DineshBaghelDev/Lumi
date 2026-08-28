import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { assertLocalDatabaseUrl } from "./import-identities.mjs";

const requireFromDb = createRequire(new URL("../../packages/db/package.json", import.meta.url));
const requireFromAuth = createRequire(new URL("../../packages/auth/package.json", import.meta.url));
const { Pool } = requireFromDb("pg");
const { hashPassword } = requireFromAuth("better-auth/crypto");

export const activateLegacyUser = async ({ databaseUrl, email, password }) => {
  assertLocalDatabaseUrl(databaseUrl);
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("ACTIVATION_EMAIL is required");
  if (String(password ?? "").length < 12) throw new Error("ACTIVATION_PASSWORD must contain at least 12 characters");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `select u.auth_user_id
         from users u
         join auth_user au on au.id = u.auth_user_id
        where lower(u.email) = $1 and lower(au.email) = $1`,
      [normalizedEmail],
    );
    if (result.rowCount !== 1) throw new Error(`Expected exactly one imported legacy user, found ${result.rowCount}`);
    const userId = result.rows[0].auth_user_id;
    const existing = await client.query("select 1 from auth_account where user_id = $1 and provider_id = 'credential'", [userId]);
    if (existing.rowCount) throw new Error("Credential account already exists; use the authenticated password-change flow");
    const passwordHash = await hashPassword(password);
    await client.query(
      `insert into auth_account (id, account_id, provider_id, user_id, password)
       values ($1, $2, 'credential', $2, $3)`,
      [`credential:${userId}`, userId, passwordHash],
    );
    await client.query("commit");
    return { activated: true, userId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try { process.loadEnvFile(resolve(".env")); } catch { /* CI may inject env. */ }
  const result = await activateLegacyUser({
    databaseUrl: process.env.MIGRATION_DATABASE_URL,
    email: process.env.ACTIVATION_EMAIL,
    password: process.env.ACTIVATION_PASSWORD,
  });
  console.log(JSON.stringify(result));
}
