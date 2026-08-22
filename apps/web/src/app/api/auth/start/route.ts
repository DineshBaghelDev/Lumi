import { createAuthActions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getWebConfig } from "../../../../lib/auth";
import {
  authErrorRedirect,
  buildOAuthRedirectTo,
  codeVerifierCookie,
} from "../../../../lib/auth-routes";

export async function GET(request: NextRequest) {
  const config = getWebConfig();
  const auth = createAuthActions({
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
  });

  const { data, error } = await auth.signInWithOAuth("google", {
    redirectTo: buildOAuthRedirectTo(request.nextUrl.origin),
    skipBrowserRedirect: true,
    additionalParams: { prompt: "select_account" },
  });

  if (error || !data.url || !data.codeVerifier) {
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "oauth_start_failed"));
  }

  const response = NextResponse.redirect(data.url);
  response.cookies.set(codeVerifierCookie, data.codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
