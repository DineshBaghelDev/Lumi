import { AppShell } from "../../ui";
import { PasswordForm } from "./password-form";

export default function SecurityPage() {
  return (
    <AppShell active="Account">
      <section className="page-header"><div><p className="eyebrow">Account</p><h1>Security</h1></div></section>
      <PasswordForm />
    </AppShell>
  );
}
