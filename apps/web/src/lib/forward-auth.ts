export const betterAuthSessionCookieNames = ["lumi.session_token", "__Secure-lumi.session_token"] as const;

type CookieReader = { get(name: string): { value: string } | undefined };

export const forwardedAuthHeaders = (authorization: string | null, cookies: CookieReader) => {
  const headers = new Headers();
  if (authorization && /^Bearer\s+\S+$/i.test(authorization)) {
    headers.set("authorization", authorization);
    return headers;
  }
  for (const name of betterAuthSessionCookieNames) {
    const value = cookies.get(name)?.value;
    if (value && !/[;\s\x00-\x1f\x7f]/.test(value)) {
      headers.set("cookie", `${name}=${value}`);
      break;
    }
  }
  return headers;
};
