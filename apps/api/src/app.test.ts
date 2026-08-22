import { strict as assert } from "node:assert";
import test from "node:test";
import { parseApiEnv } from "@lumi/config";
import { createApp } from "./app.ts";

const config = parseApiEnv({
  INSFORGE_PROJECT_URL: "http://localhost:7130",
  INSFORGE_ANON_KEY: "anon",
  INSFORGE_API_KEY: "api",
  INSFORGE_DB_STRING: "postgres://u:p@localhost/db",
  LITELLM_API_KEY: "litellm",
});

test("health returns success", async () => {
  const db = { execute: async () => ({ rows: [{ "?column?": 1 }] }) };
  const app = createApp({ config, db: db as never, verifyToken: async () => null });

  const response = await app.inject("/health");

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
  await app.close();
});

test("errors use the shared envelope", async () => {
  const db = { execute: async () => ({ rows: [] }) };
  const app = createApp({ config, db: db as never, verifyToken: async () => null });

  const response = await app.inject({ method: "POST", url: "/courses", payload: {} });

  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.json(), {
    error: { code: "unauthorized", message: "Missing bearer token" },
  });
  await app.close();
});
