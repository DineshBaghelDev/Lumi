import type { ApiConfig, WorkerConfig } from "@lumi/config";
import { AsyncLocalStorage } from "node:async_hooks";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema.ts";
import * as authSchema from "./auth-schema.ts";

export * from "./auth-schema.ts";
export * from "./schema.ts";
export * from "./jobs.ts";
export * from "./courses.ts";
export * from "./rag.ts";

const fullSchema = { ...schema, ...authSchema };
export type LumiDb = NodePgDatabase<typeof fullSchema>;
export type LumiDbPool = Pool;
export type DbConfig = Readonly<{ databaseUrl: string }>;

export const createDbPool = ({ databaseUrl }: DbConfig): LumiDbPool =>
  new Pool({ connectionString: databaseUrl });

export const createDbClient = (config: DbConfig): LumiDb => drizzle(createDbPool(config), { schema: fullSchema });

export const createApiDbClient = (config: ApiConfig): LumiDb =>
  createDbClient({ databaseUrl: config.database.url });

export const createWorkerDbClient = (config: WorkerConfig): LumiDb =>
  createDbClient({ databaseUrl: config.database.url });

export const checkDbConnection = async (db: Pick<LumiDb, "execute">) => {
  await db.execute(sql`select 1`);
};

type RequestDbStore = { baseDb: LumiDb; db: LumiDb };
const requestDbStorage = new AsyncLocalStorage<RequestDbStore>();

export const runWithRequestDb = (baseDb: LumiDb, callback: () => void) =>
  requestDbStorage.run({ baseDb, db: baseDb }, callback);

export const setRequestDb = (db: LumiDb) => {
  const store = requestDbStorage.getStore();
  if (!store) throw new Error("Request database context is unavailable");
  store.db = db;
};

export const createRequestDbProxy = (baseDb: LumiDb): LumiDb => new Proxy(baseDb, {
  get(_target, property) {
    const active = requestDbStorage.getStore()?.db ?? baseDb;
    const value = Reflect.get(active, property, active);
    return typeof value === "function" ? value.bind(active) : value;
  },
});

export type RequestDbTransaction = {
  db: LumiDb;
  setUserId(userId: string): Promise<void>;
  finish(commit: boolean): Promise<void>;
};

const transactionDb = (client: PoolClient): LumiDb => drizzle(client, { schema: fullSchema });

export const beginRequestTransaction = async (baseDb: LumiDb, authUserId: string): Promise<RequestDbTransaction> => {
  const pool = baseDb.$client as Pool | undefined;
  if (!pool?.connect) return { db: baseDb, setUserId: async () => {}, finish: async () => {} };
  const client = await pool.connect();
  let finished = false;
  try {
    await client.query("begin");
    await client.query("select set_config('lumi.auth_user_id', $1, true)", [authUserId]);
  } catch (error) {
    client.release();
    throw error;
  }
  const db = transactionDb(client);
  return {
    db,
    setUserId: async (userId) => { await client.query("select set_config('lumi.user_id', $1, true)", [userId]); },
    finish: async (commit) => {
      if (finished) return;
      finished = true;
      try { await client.query(commit ? "commit" : "rollback"); } finally {
        client.release();
        const store = requestDbStorage.getStore();
        if (store) store.db = store.baseDb;
      }
    },
  };
};

export const withUserTransaction = async <T>(
  baseDb: LumiDb,
  identity: { authUserId: string; userId: string },
  callback: (db: LumiDb) => Promise<T>,
) => {
  const transaction = await beginRequestTransaction(baseDb, identity.authUserId);
  try {
    await transaction.setUserId(identity.userId);
    const result = await callback(transaction.db);
    await transaction.finish(true);
    return result;
  } catch (error) {
    await transaction.finish(false);
    throw error;
  }
};
