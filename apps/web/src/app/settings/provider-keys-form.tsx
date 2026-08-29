"use client";

import { useState, useTransition } from "react";
import { saveProviderKey, deleteProviderKey } from "./actions";

type ProviderKey = {
  id: string;
  provider: string;
  hasKey: boolean;
  createdAt: string;
  updatedAt: string;
};

const providers = [
  { id: "groq", name: "Groq", placeholder: "gsk_..." },
  { id: "codex", name: "Codex (Local)", placeholder: "no-key-required" },
  { id: "moonshot", name: "Moonshot (Kimi)", placeholder: "sk-..." },
  { id: "gemini", name: "Google Gemini", placeholder: "AIza..." },
  { id: "claude", name: "Anthropic Claude", placeholder: "sk-ant-..." },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-..." },
];

export function ProviderKeysForm({ existingKeys }: { existingKeys: ProviderKey[] }) {
  const [keys, setKeys] = useState<ProviderKey[]>(existingKeys);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const hasKey = (providerId: string) => keys.some((k) => k.provider === providerId);

  const handleSave = async (providerId: string, apiKey: string) => {
    setMessage(null);
    const result = await saveProviderKey(providerId, apiKey);
    if (result.ok) {
      setKeys((prev) => {
        const existing = prev.find((k) => k.provider === providerId);
        if (existing) {
          return prev.map((k) => k.provider === providerId ? { ...k, hasKey: true, updatedAt: new Date().toISOString() } : k);
        }
        return [...prev, { id: crypto.randomUUID(), provider: providerId, hasKey: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      });
      setMessage({ text: `${providerId} key saved.`, ok: true });
    } else {
      setMessage({ text: result.message || "Failed to save key.", ok: false });
    }
  };

  const handleDelete = async (providerId: string) => {
    setMessage(null);
    const result = await deleteProviderKey(providerId);
    if (result.ok) {
      setKeys((prev) => prev.filter((k) => k.provider !== providerId));
      setMessage({ text: `${providerId} key removed.`, ok: true });
    } else {
      setMessage({ text: result.message || "Failed to remove key.", ok: false });
    }
  };

  return (
    <div className="form-box">
      <div className="form-intro">
        <h2>Provider API Keys</h2>
        <p>Add API keys for the LLM providers you want to use. Keys are encrypted at rest. Providers without keys will use environment defaults.</p>
      </div>
      {message && (
        <p className={`center-note ${message.ok ? "" : "error"}`} role="status">
          {message.text}
        </p>
      )}
      {providers.map((provider) => {
        const configured = hasKey(provider.id);
        return (
          <ProviderKeyRow
            key={provider.id}
            provider={provider}
            configured={configured}
            onSave={handleSave}
            onDelete={handleDelete}
            disabled={pending}
          />
        );
      })}
    </div>
  );
}

function ProviderKeyRow({
  provider,
  configured,
  onSave,
  onDelete,
  disabled,
}: {
  provider: { id: string; name: string; placeholder: string };
  configured: boolean;
  onSave: (providerId: string, apiKey: string) => void;
  onDelete: (providerId: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [showInput, setShowInput] = useState(false);

  return (
    <div style={{ marginBottom: "1rem", padding: "0.75rem", border: "1px solid var(--slate-200)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div>
          <strong>{provider.name}</strong>
          <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: configured ? "var(--green-600)" : "var(--slate-400)" }}>
            {configured ? "● Key configured" : "○ No key"}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            className="button"
            type="button"
            onClick={() => setShowInput(!showInput)}
            disabled={disabled}
            style={{ fontSize: "0.85rem" }}
          >
            {showInput ? "Cancel" : configured ? "Update" : "Add key"}
          </button>
          {configured && (
            <button
              className="button"
              type="button"
              onClick={() => onDelete(provider.id)}
              disabled={disabled}
              style={{ fontSize: "0.85rem", color: "var(--red-600)" }}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {showInput && (
        <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
          <input
            className="search"
            type="password"
            placeholder={provider.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={disabled}
            style={{ flex: 1 }}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              if (value.trim()) {
                onSave(provider.id, value.trim());
                setValue("");
                setShowInput(false);
              }
            }}
            disabled={disabled || !value.trim()}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
