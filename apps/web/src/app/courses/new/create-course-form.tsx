"use client";

import { useActionState, useState } from "react";
import { createCourseAction, type FormState } from "../../actions";

type ProviderModel = { id: string; name: string; provider: string };
type Provider = { id: string; name: string; models: ProviderModel[] };

const initialState: FormState = { ok: true, message: "" };
const depths = [
  { value: "beginner", icon: "1", title: "Beginner", body: "New to the topic" },
  { value: "intermediate", icon: "2", title: "Intermediate", body: "Know the basics" },
  { value: "advanced", icon: "3", title: "Advanced", body: "Want depth" },
];

export function CreateCourseForm({ idempotencyKey, providers }: { idempotencyKey: string; providers: Provider[] }) {
  const [state, action, pending] = useActionState(createCourseAction, initialState);
  const [depth, setDepth] = useState("beginner");
  const [selectedProvider, setSelectedProvider] = useState(providers[0]?.id ?? "");
  const [selectedModel, setSelectedModel] = useState(providers[0]?.models[0]?.id ?? "");

  const activeProvider = providers.find((p) => p.id === selectedProvider);
  const modelsForProvider = activeProvider?.models ?? [];

  // When provider changes, auto-select the first model of that provider
  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    const provider = providers.find((p) => p.id === providerId);
    setSelectedModel(provider?.models[0]?.id ?? "");
  };

  return (
    <form className="form-box" action={action}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="model" value={selectedModel} />
      <div className="form-intro">
        <h2>Build a learning path</h2>
        <p>Lumi will research the topic, draft a roadmap, and unlock lessons as they become ready.</p>
      </div>
      <label htmlFor="topic">What do you want to learn?</label>
      <textarea id="topic" name="topic" className="textarea" placeholder="e.g., Quantum Computing, Basic Financial Modeling..." required />
      <label>Depth</label>
      <div className="choice-grid">
        {depths.map((option) => (
          <label className={`choice ${depth === option.value ? "selected" : ""}`} key={option.value}>
            <input
              checked={depth === option.value}
              name="difficultyLevel"
              onChange={() => setDepth(option.value)}
              type="radio"
              value={option.value}
            />
            <span className="iconbox">{option.icon}</span>
            <div>
              <strong>{option.title}</strong>
              <p>{option.body}</p>
            </div>
          </label>
        ))}
      </div>
      {providers.length >= 1 ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label htmlFor="provider-select">Provider</label>
              <select
                id="provider-select"
                className="select"
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="model-select">Model</label>
              <select
                id="model-select"
                className="select"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
              >
                {modelsForProvider.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      ) : (
        <p className="center-note" style={{ fontSize: "0.85rem" }}>
          No providers configured. Add an API key in <a href="/settings">Settings</a> to choose a model.
        </p>
      )}
      <label htmlFor="goal">What should this course help you do?</label>
      <textarea
        id="goal"
        name="goal"
        className="textarea compact-textarea"
        placeholder="e.g., debug slow SQL queries and explain index tradeoffs"
        required
      />
      <button className="button wide-button" type="submit" disabled={pending}>
        {pending ? (
          <span className="spinner-row">
            <span className="spinner" aria-hidden="true" />
            Creating…
          </span>
        ) : (
          "Create course"
        )}
      </button>
      {!state.ok ? <p className="center-note" role="alert">{state.message}</p> : null}
    </form>
  );
}
