import { DEFAULT_ACCESS_TOKEN_COOKIE } from "@insforge/sdk/ssr";
import { cookies } from "next/headers";
import { getWebConfig } from "./auth";

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const token = (await cookies()).get(DEFAULT_ACCESS_TOKEN_COOKIE)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const config = getWebConfig();
  try {
    return await fetch(new URL(path, config.apiBaseUrl), {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "API unavailable" }, { status: 503 });
  }
};
