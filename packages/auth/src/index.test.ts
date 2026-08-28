import { strict as assert } from "node:assert";
import test from "node:test";
import { createDbClient } from "@lumi/db";
import { createLumiAuth } from "./index.ts";

test("creates the shared Better Auth handler without runtime migration", async () => {
  const databaseUrl = "postgresql://lumi_auth:password@localhost:5432/lumi";
  const db = createDbClient({ databaseUrl });
  const auth = createLumiAuth({
    databaseUrl,
    baseUrl: "http://localhost:3000",
    secret: "a-secure-development-secret-at-least-32-characters",
    trustedOrigins: ["http://localhost:3000"],
    google: { clientId: "google-client", clientSecret: "google-secret" },
    requireEmailVerification: false,
    secureCookies: false,
  }, db);
  assert.equal(typeof auth.handler, "function");
  assert.equal(typeof auth.api.getSession, "function");
  await (db as unknown as { $client: { end(): Promise<void> } }).$client.end();
});
