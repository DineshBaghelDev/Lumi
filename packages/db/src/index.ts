import type { ApiConfig, WorkerConfig } from "@lumi/config";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export * from "./schema.ts";
export * from "./jobs.ts";
export * from "./courses.ts";
export * from "./rag.ts";

export type LumiDb = NodePgDatabase<typeof schema>;
export type LumiDbPool = Pool;
export type DbConfig = Readonly<{ databaseUrl: string }>;

export const createDbPool = ({ databaseUrl }: DbConfig): LumiDbPool =>
  new Pool({ connectionString: databaseUrl });

export const createDbClient = (config: DbConfig): LumiDb => drizzle(createDbPool(config), { schema });

export const createApiDbClient = (config: ApiConfig): LumiDb =>
  createDbClient({ databaseUrl: config.database.url });

export const createWorkerDbClient = (config: WorkerConfig): LumiDb =>
  createDbClient({ databaseUrl: config.database.url });

export const checkDbConnection = async (db: Pick<LumiDb, "execute">) => {
  await db.execute(sql`select 1`);
};
