import { type NextRequest, NextResponse } from "next/server";
import { getLumiAuth } from "../../../../lib/auth";
import { authenticatedHomePath, authErrorRedirect } from "../../../../lib/auth-routes";

export async function GET(request: NextRequest) {
  try {
    const response = await getLumiAuth().api.signInSocial({
      headers: request.headers,
      body: {
        provider: "google",
        callbackURL: authenticatedHomePath,
        errorCallbackURL: "/sign-in?error=oauth_failed",
      },
      asResponse: true,
    });

    const redirectUrl = response.headers.get("location") ?? (await response.clone().json().catch(() => null))?.url;
    if (redirectUrl) {
      const redirect = NextResponse.redirect(redirectUrl);
      const cookie = response.headers.get("set-cookie");
      if (cookie) redirect.headers.set("set-cookie", cookie);
      return redirect;
    }

    return response;
  } catch (error) {
    console.error("OAuth start failed:", error instanceof Error ? error.message : error);
    return NextResponse.redirect(authErrorRedirect(request.nextUrl.origin, "oauth_start_failed"));
  }
}
