type SignInPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  exchange_failed: "Google sign-in could not be completed. Try again.",
  missing_verifier: "The sign-in session expired. Start again.",
  oauth_failed: "Google sign-in was cancelled or rejected.",
  oauth_start_failed: "Google sign-in is not available right now.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { error } = await searchParams;
  const message = error ? errorMessages[error] : undefined;

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="eyebrow">Lumi</p>
        <h1>Learn anything with sources in sight.</h1>
        <p>
          Sign in with Google to start building courses, track progress, and keep your learning
          history tied to your account.
        </p>
        {message ? <p className="error">{message}</p> : null}
        <form action="/api/auth/start" method="get">
          <button type="submit" className="primary-button">
            Continue with Google
          </button>
        </form>
      </section>
    </main>
  );
}
