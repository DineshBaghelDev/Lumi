import { strict as assert } from "node:assert";
import test from "node:test";
import { forwardedAuthHeaders } from "./forward-auth.ts";

const cookies = (values: Record<string, string>) => ({ get: (name: string) => values[name] ? { value: values[name] } : undefined });

test("BFF forwards one Better Auth credential and no unrelated cookies", () => {
  const cookieHeaders = forwardedAuthHeaders(null, cookies({ "lumi.session_token": "session.token", analytics: "secret" }));
  assert.equal(cookieHeaders.get("cookie"), "lumi.session_token=session.token");
  assert.equal(cookieHeaders.get("authorization"), null);

  const bearerHeaders = forwardedAuthHeaders("Bearer operator-token", cookies({ "lumi.session_token": "session.token" }));
  assert.equal(bearerHeaders.get("authorization"), "Bearer operator-token");
  assert.equal(bearerHeaders.get("cookie"), null);
  assert.equal(forwardedAuthHeaders("Basic unsafe", cookies({})).entries().next().done, true);
});
