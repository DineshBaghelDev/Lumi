import { AppShell } from "../ui";
import { apiFetch } from "../../lib/api";
import { ProviderKeysForm } from "./provider-keys-form";

type ProviderKey = {
  id: string;
  provider: string;
  hasKey: boolean;
  createdAt: string;
  updatedAt: string;
};

export default async function SettingsPage() {
  let keys: ProviderKey[] = [];
  try {
    const response = await apiFetch("/settings/provider-keys");
    if (response.ok) {
      const body = await response.json() as { keys: ProviderKey[] };
      keys = body.keys ?? [];
    }
  } catch {
    // Settings unavailable
  }

  return (
    <AppShell active="Settings">
      <div className="page-title">
        <h1>Settings</h1>
        <p>Configure API keys for LLM providers used during course generation.</p>
      </div>
      <ProviderKeysForm existingKeys={keys} />
    </AppShell>
  );
}
