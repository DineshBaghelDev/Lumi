import { cookies, headers as requestHeaders } from "next/headers";
import { forwardedAuthHeaders } from "./forward-auth";

export const apiFetch = async (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  headers.delete("authorization");
  headers.delete("cookie");
  const auth = forwardedAuthHeaders((await requestHeaders()).get("authorization"), await cookies());
  for (const [name, value] of auth) headers.set(name, value);

  try {
    return await fetch(new URL(path, getInternalApiBaseUrl()), {
      ...init,
      headers,
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "API unavailable" }, { status: 503 });
  }
};

const getInternalApiBaseUrl = () => {
  const value = process.env.INTERNAL_API_BASE_URL;
  if (!value) throw new Error("Missing INTERNAL_API_BASE_URL");
  return value;
};
