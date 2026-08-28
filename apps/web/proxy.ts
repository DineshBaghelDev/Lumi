import { updateSession } from "@insforge/sdk/ssr/middleware";
import { NextResponse, type NextRequest } from "next/server";

const requiredEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (process.env.LUMI_E2E_SKIP_AUTH === "1") return response;

  await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
    baseUrl: requiredEnv("NEXT_PUBLIC_INSFORGE_URL"),
    anonKey: requiredEnv("NEXT_PUBLIC_INSFORGE_ANON_KEY"),
  });

  return response;
}

export const config = {
  matcher: ["/courses/:path*", "/dashboard", "/projects", "/progress"],
};
