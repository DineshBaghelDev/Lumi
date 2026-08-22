import { createAuthActions } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getWebConfig } from "../../../lib/auth";
import {
  authenticatedHomePath,
  authErrorRedirect,
  codeVerifierCookie,
} from "../../../lib/auth-routes";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "oauth_failed"));
  }

  const codeVerifier = request.cookies.get(codeVerifierCookie)?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "missing_verifier"));
  }

  const config = getWebConfig();
  const response = NextResponse.redirect(new URL(authenticatedHomePath, request.url));
  const auth = createAuthActions({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
  });

  const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);
  if (error || !data?.user) {
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "exchange_failed"));
  }

  response.cookies.delete(codeVerifierCookie);
  return response;
}
