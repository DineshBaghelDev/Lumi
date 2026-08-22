export const authenticatedHomePath = "/courses";
export const codeVerifierCookie = "insforge_code_verifier";
export const signInPath = "/sign-in";

export const buildOAuthRedirectTo = (origin: string) =>
  new URL("/auth/callback", origin).toString();

export const authErrorRedirect = (origin: string, error: string) => {
  const url = new URL(signInPath, origin);
  url.searchParams.set("error", error);
  return url;
};

export const resolveSessionHomePath = (user: unknown) =>
  user ? authenticatedHomePath : signInPath;
