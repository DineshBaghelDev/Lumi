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
  const [selectedModel, setSelectedModel] = useState(providers[0]?.models[0]?.id ?? "");

  const allModels = providers.flatMap((p) => p.models.map((m) => ({ ...m, providerName: p.name })));

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
      {allModels.length > 1 ? (
        <>
          <label htmlFor="model-select">Model provider</label>
          <select
            id="model-select"
            className="select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {providers.map((provider) => (
              <optgroup key={provider.id} label={provider.name}>
                {provider.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </>
      ) : null}
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
