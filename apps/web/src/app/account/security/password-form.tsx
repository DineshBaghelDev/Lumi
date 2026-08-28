"use client";

import { useActionState } from "react";
import { updatePasswordAction, type FormState } from "../../actions";

const initialState: FormState = { ok: true, message: "" };

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  return (
    <form className="form-box" action={action}>
      <p>Google-only accounts may leave the current password blank when setting their first password.</p>
      <label htmlFor="currentPassword">Current password</label>
      <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      <label htmlFor="newPassword">New password</label>
      <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save password"}</button>
      {state.message ? <p className={state.ok ? "success-text" : "error"} role="status">{state.message}</p> : null}
    </form>
  );
}
