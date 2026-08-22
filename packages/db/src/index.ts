import { createAdminClient, type InsForgeClient } from "@insforge/sdk";
import type { ApiConfig, WorkerConfig } from "@lumi/config";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

export * from "./schema.ts";
export * from "./jobs.ts";
export * from "./courses.ts";

export type ServerInsforgeConfig = Pick<ApiConfig["insforge"], "projectUrl" | "apiKey">;
export type ServerInsforgeClient = InsForgeClient;
export type ServerInsforgeConnectionClient = {
  auth: Pick<InsForgeClient["auth"], "getPublicAuthConfig">;
};
export type LumiDb = NodePgDatabase<typeof schema>;
export type LumiDbPool = Pool;
export type DbConfig = Pick<ApiConfig["insforge"], "databaseUrl">;

export const createServerInsforgeClient = ({
  projectUrl,
  apiKey,
}: ServerInsforgeConfig): ServerInsforgeClient =>
  createAdminClient({
    baseUrl: projectUrl,
    apiKey,
  });

export const createApiInsforgeClient = (config: ApiConfig): ServerInsforgeClient =>
  createServerInsforgeClient(config.insforge);

export const createWorkerInsforgeClient = (config: WorkerConfig): ServerInsforgeClient =>
  createServerInsforgeClient(config.insforge);

export const createDbPool = ({ databaseUrl }: DbConfig): LumiDbPool =>
  new Pool({ connectionString: databaseUrl });

export const createDbClient = (config: DbConfig): LumiDb => drizzle(createDbPool(config), { schema });

export const createApiDbClient = (config: ApiConfig): LumiDb => createDbClient(config.insforge);

export const createWorkerDbClient = (config: WorkerConfig): LumiDb => createDbClient(config.insforge);

export const checkDbConnection = async (db: Pick<LumiDb, "execute">) => {
  await db.execute(sql`select 1`);
};

export const checkServerInsforgeConnection = async (client: ServerInsforgeConnectionClient) => {
  const { data, error } = await client.auth.getPublicAuthConfig();

  if (error || !data) {
    throw new Error(
      "InsForge connectivity check failed: " + (error?.message ?? "public auth config was missing"),
    );
  }

  return data;
};
