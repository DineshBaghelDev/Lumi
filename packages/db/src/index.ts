import { createAdminClient, type InsForgeClient } from "@insforge/sdk";
import type { ApiConfig, WorkerConfig } from "@lumi/config";

export type ServerInsforgeConfig = Pick<ApiConfig["insforge"], "projectUrl" | "apiKey">;
export type ServerInsforgeClient = InsForgeClient;
export type ServerInsforgeConnectionClient = {
  auth: Pick<InsForgeClient["auth"], "getPublicAuthConfig">;
};

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

export const checkServerInsforgeConnection = async (client: ServerInsforgeConnectionClient) => {
  const { data, error } = await client.auth.getPublicAuthConfig();

  if (error || !data) {
    throw new Error(
      "InsForge connectivity check failed: " + (error?.message ?? "public auth config was missing"),
    );
  }

  return data;
};
