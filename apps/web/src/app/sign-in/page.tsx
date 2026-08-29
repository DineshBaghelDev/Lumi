import { Logo } from "../ui";
import { AuthForms } from "./auth-forms";

type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  exchange_failed: "Google sign-in could not be completed. Try again.",
  missing_verifier: "The sign-in session expired. Start again.",
  oauth_failed: "Sign-in did not finish. You can try again.",
  oauth_start_failed: "Google sign-in is not available right now.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const message = error ? errorMessages[error] : undefined;

  return (
    <main className="auth-page">
      <section className="auth-copy">
        <Logo />
        <h1>
          Learn anything.
          <br />
          Understood deeply.
        </h1>
        <p>Lumi researches, structures and teaches any topic through a clear, personalized learning journey.</p>
        <img src="/mascot-waving.png" alt="" />
      </section>
      <section className="auth-card">
        <h2>Welcome back</h2>
        <p>Your courses, notes, and progress stay with your account.</p>
        {message ? <p className="error">{message}</p> : null}
        <form action="/api/auth/start" method="get">
          <button type="submit" className="auth-button">
            Continue with Google
          </button>
        </form>
        <details className="secondary-auth">
          <summary>Other sign-in options</summary>
          <AuthForms />
        </details>
      </section>
    </main>
  );
}
