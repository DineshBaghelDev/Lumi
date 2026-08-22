import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import { parseWebPublicEnv } from "@lumi/config";
import { cookies } from "next/headers";

export const getWebConfig = () => parseWebPublicEnv(process.env);

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
