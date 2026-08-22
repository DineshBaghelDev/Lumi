import { refreshAuth } from "@insforge/sdk/ssr";
import type { NextRequest } from "next/server";
import { getWebConfig } from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const config = getWebConfig();
  const result = await refreshAuth({
    request,
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
  });

  return result.response;
}
