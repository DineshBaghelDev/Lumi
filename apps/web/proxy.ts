import { NextResponse, type NextRequest } from "next/server";
import { getLumiAuth } from "./src/lib/auth";
import { legacyAuthCookieNames, signInPath } from "./src/lib/auth-routes";

const clearLegacyCookies = (response: NextResponse) => {
  for (const name of legacyAuthCookieNames) response.cookies.delete(name);
  return response;
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (process.env.LUMI_E2E_SKIP_AUTH === "1") return response;

  const session = await getLumiAuth().api.getSession({ headers: request.headers }).catch(() => null);
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = signInPath;
    url.searchParams.set("next", request.nextUrl.pathname);
    return clearLegacyCookies(NextResponse.redirect(url));
  }
  return clearLegacyCookies(response);
}

export const config = {
  matcher: ["/courses/:path*", "/dashboard", "/projects", "/progress", "/account/:path*"],
};
