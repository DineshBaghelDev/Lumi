"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";

const getFields = (form: HTMLFormElement) => {
  const data = new FormData(form);
  return {
    email: String(data.get("email") ?? "").trim(),
    password: String(data.get("password") ?? ""),
    name: String(data.get("name") ?? "").trim(),
  };
};

export function AuthForms() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>, create: boolean) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const fields = getFields(event.currentTarget);
    const result = create
      ? await authClient.signUp.email({ ...fields, callbackURL: "/courses" })
      : await authClient.signIn.email({ email: fields.email, password: fields.password, callbackURL: "/courses" });
    setPending(false);
    if (result.error) return setMessage(result.error.message ?? "Authentication failed.");
    window.location.assign("/courses");
  };

  return (
    <>
      <form className="auth-form" onSubmit={(event) => submit(event, false)}>
        <label htmlFor="sign-in-email">Email</label>
        <input id="sign-in-email" name="email" type="email" autoComplete="email" required suppressHydrationWarning />
        <label htmlFor="sign-in-password">Password</label>
        <input id="sign-in-password" name="password" type="password" autoComplete="current-password" minLength={12} required suppressHydrationWarning />
        <button className="auth-button" type="submit" disabled={pending}>Sign in with password</button>
      </form>
      <details className="auth-sign-up">
        <summary>Create a local account</summary>
        <form className="auth-form" onSubmit={(event) => submit(event, true)}>
          <label htmlFor="sign-up-name">Name</label>
          <input id="sign-up-name" name="name" autoComplete="name" required suppressHydrationWarning />
          <label htmlFor="sign-up-email">Email</label>
          <input id="sign-up-email" name="email" type="email" autoComplete="email" required suppressHydrationWarning />
          <label htmlFor="sign-up-password">Password</label>
          <input id="sign-up-password" name="password" type="password" autoComplete="new-password" minLength={12} required suppressHydrationWarning />
          <button className="auth-button" type="submit" disabled={pending}>Create account</button>
        </form>
      </details>
      {message ? <p className="error" role="alert">{message}</p> : null}
    </>
  );
}
