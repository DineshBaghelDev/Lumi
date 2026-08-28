import { createLumiAuthFromEnv, type LumiAuth } from "@lumi/auth";
import { loadEnvConfig } from "@next/env";
import { parseWebPublicEnv } from "@lumi/config";
import { headers } from "next/headers";
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

let auth: LumiAuth | undefined;

export const getLumiAuth = () => {
  loadWorkspaceEnv();
  return auth ??= createLumiAuthFromEnv(process.env);
};

export const getCurrentUser = async () =>
  (await getLumiAuth().api.getSession({ headers: await headers() }))?.user ?? null;

export const requireCurrentUser = async () => {
  const user = await getCurrentUser();

  if (!user) {
    redirect(signInPath);
  }

  return user;
};
