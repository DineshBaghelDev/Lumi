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
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : "unknown";
    // Improve common Node.js fetch error messages for user clarity
    const message = rawMsg === "fetch failed"
      ? "Could not connect to the API server. Ensure the API is running and INTERNAL_API_BASE_URL is correct."
      : rawMsg === "connect ECONNREFUSED"
        ? "API server refused the connection. Check that the API process is running."
      : rawMsg.startsWith("getaddrinfo")
        ? "Could not resolve API server hostname. Check INTERNAL_API_BASE_URL."
      : `API unavailable: ${rawMsg}`;
    return Response.json({ error: { code: "api_unavailable", message } }, { status: 503 });
  }
};

const getInternalApiBaseUrl = () => {
  const value = process.env.INTERNAL_API_BASE_URL;
  if (!value) throw new Error("Missing INTERNAL_API_BASE_URL");
  return value;
};
