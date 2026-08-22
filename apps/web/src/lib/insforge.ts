import { createBrowserClient } from "@insforge/sdk/ssr";
import type { WebPublicConfig } from "@lumi/config";

export type WebInsforgeClient = ReturnType<typeof createBrowserClient>;

export const createWebInsforgeClient = (config: WebPublicConfig): WebInsforgeClient =>
  createBrowserClient({
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
  });
