import { redirect } from "next/navigation";
import { signOutAction } from "../actions";
import { getCurrentUser } from "../../lib/auth";
import { signInPath } from "../../lib/auth-routes";

export const dynamic = "force-dynamic";

const userLabel = (user: Record<string, unknown>) => {
  const name = user.name;
  const email = user.email;

  return typeof name === "string" && name.length > 0
    ? name
    : typeof email === "string" && email.length > 0
      ? email
      : "Learner";
};

export default async function CoursesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(signInPath);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Lumi</p>
          <h1>Courses</h1>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="secondary-button">
            Sign out
          </button>
        </form>
      </header>
      <section className="empty-state">
        <p>Welcome, {userLabel(user)}.</p>
        <h2>Your generated courses will appear here.</h2>
      </section>
    </main>
  );
}
