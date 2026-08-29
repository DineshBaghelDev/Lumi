"use server";

import { apiFetch } from "../../lib/api";

export type FormState = { ok: boolean; message: string };

export async function saveProviderKey(provider: string, apiKey: string): Promise<FormState> {
  try {
    const response = await apiFetch("/settings/provider-keys", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    if (!response.ok) {
      const body = await response.json() as { error?: { message?: string } };
      return { ok: false, message: body?.error?.message || "Failed to save key." };
    }
    return { ok: true, message: "Key saved." };
  } catch {
    return { ok: false, message: "API server is not reachable." };
  }
}

export async function deleteProviderKey(provider: string): Promise<FormState> {
  try {
    const response = await apiFetch(`/settings/provider-keys/${encodeURIComponent(provider)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json() as { error?: { message?: string } };
      return { ok: false, message: body?.error?.message || "Failed to remove key." };
    }
    return { ok: true, message: "Key removed." };
  } catch {
    return { ok: false, message: "API server is not reachable." };
  }
}
