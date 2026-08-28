import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import { loadEnvConfig } from "@next/env";
import { parseWebPublicEnv } from "@lumi/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolve } from "node:path";
import { signInPath } from "./auth-routes";

let loadedWorkspaceEnv = false;

const loadWorkspaceEnv = () => {
  if (!loadedWorkspaceEnv) {
    loadEnvConfig(resolve(process.cwd(), "../.."));
    loadedWorkspaceEnv = true;
  }
};

export const getWebConfig = () => {
  loadWorkspaceEnv();
  return parseWebPublicEnv(process.env);
};

export const createLumiServerClient = async () => {
  const config = getWebConfig();

  return createServerClient({
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
    cookies: await cookies(),
  });
};

export const createLumiAuthActions = async () => {
  const config = getWebConfig();

  return createAuthActions({
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
    cookies: await cookies(),
  });
};

export const getCurrentUser = async (): Promise<Record<string, unknown> | null> => {
  const client = await createLumiServerClient();
  const { data, error } = await client.auth.getCurrentUser();

  if (error || !data?.user) {
    return null;
  }

  return data.user as Record<string, unknown>;
};

export const requireCurrentUser = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(signInPath);
  }

  return user;
};
