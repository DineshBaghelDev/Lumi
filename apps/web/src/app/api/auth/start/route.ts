import { type NextRequest, NextResponse } from "next/server";
import { getLumiAuth } from "../../../../lib/auth";
import { authenticatedHomePath, authErrorRedirect } from "../../../../lib/auth-routes";

export async function GET(request: NextRequest) {
  try {
    return await getLumiAuth().api.signInSocial({
      headers: request.headers,
      body: {
        provider: "google",
        callbackURL: authenticatedHomePath,
        errorCallbackURL: "/sign-in?error=oauth_failed",
      },
      asResponse: true,
    });
  } catch {
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "oauth_start_failed"));
  }
}
