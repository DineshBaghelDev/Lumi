"use client";

import { useActionState } from "react";
import { createCourseAction, type FormState } from "../../actions";

const initialState: FormState = { ok: true, message: "" };

export function CreateCourseForm({ idempotencyKey }: { idempotencyKey: string }) {
  const [state, action, pending] = useActionState(createCourseAction, initialState);

  return (
    <form className="form-box" action={action}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <label htmlFor="topic">What do you want to learn?</label>
      <textarea id="topic" name="topic" className="textarea" placeholder="e.g., Quantum Computing, Basic Financial Modeling..." required />
      <label>Depth</label>
      <div className="choice-grid">
        <label className="choice selected">
          <input type="radio" name="difficultyLevel" value="beginner" defaultChecked />
          <span className="iconbox">1</span>
          <div>
            <strong>Beginner</strong>
            <p>New to the topic</p>
          </div>
        </label>
        <label className="choice">
          <input type="radio" name="difficultyLevel" value="intermediate" />
          <span className="iconbox">2</span>
          <div>
            <strong>Intermediate</strong>
            <p>Know the basics</p>
          </div>
        </label>
        <label className="choice">
          <input type="radio" name="difficultyLevel" value="advanced" />
          <span className="iconbox">3</span>
          <div>
            <strong>Advanced</strong>
            <p>Want depth</p>
          </div>
        </label>
      </div>
      <label htmlFor="goal">Learning goal</label>
      <select id="goal" name="goal" className="select" defaultValue="" required>
        <option value="" disabled>
          Select your goal
        </option>
        <option>Build projects</option>
        <option>Prepare for interviews</option>
      </select>
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
