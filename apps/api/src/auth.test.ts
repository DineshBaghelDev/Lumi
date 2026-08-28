import { strict as assert } from "node:assert";
import test from "node:test";
import { createBetterAuthSessionResolver, credentialHeaders } from "./auth.ts";

test("API auth keeps only a valid bearer credential and cookie", () => {
  const headers = credentialHeaders({
    headers: {
      authorization: "Bearer session-token",
      cookie: "lumi.session_token=cookie-token; analytics=drop-me",
      "x-forwarded-host": "evil.example",
    },
  } as never);
  assert.equal(headers.get("authorization"), "Bearer session-token");
  assert.equal(headers.get("cookie"), "lumi.session_token=cookie-token; analytics=drop-me");
  assert.equal(headers.has("x-forwarded-host"), false);
  assert.equal(credentialHeaders({ headers: { authorization: "Basic nope" } } as never).has("authorization"), false);
});

test("Better Auth sessions retain the application identity contract", async () => {
  const resolve = createBetterAuthSessionResolver({
    api: { getSession: async () => ({ user: { id: "auth-1", email: "one@example.test" } }) },
  } as never);
  assert.deepEqual(await resolve(new Headers({ cookie: "lumi.session_token=valid" })), {
    authUserId: "auth-1",
    email: "one@example.test",
  });
});
