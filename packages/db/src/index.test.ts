import { strict as assert } from "node:assert";
import test from "node:test";
import { InsForgeError, type InsForgeClient } from "@insforge/sdk";
import { checkServerInsforgeConnection, createServerInsforgeClient } from "./index.ts";

test("creates an InsForge admin client for trusted processes", () => {
  const client = createServerInsforgeClient({
    projectUrl: "https://project.example.insforge.app",
    apiKey: "server-api-key",
  });

  assert.ok(client.database);
  assert.ok(client.storage);
  assert.equal(client.getHttpClient().getHeaders().Authorization, "Bearer server-api-key");
});

test("reports InsForge auth-config probe failures", async () => {
  const getPublicAuthConfig = async () => ({
    data: {} as NonNullable<Awaited<ReturnType<InsForgeClient["auth"]["getPublicAuthConfig"]>>["data"]>,
    error: null,
  });

  await assert.doesNotReject(checkServerInsforgeConnection({ auth: { getPublicAuthConfig } }));

  const failedProbe = async () => ({
    data: null,
    error: new InsForgeError("upstream unavailable", 503, "SERVER_ERROR"),
  });

  await assert.rejects(
    checkServerInsforgeConnection({ auth: { getPublicAuthConfig: failedProbe } }),
    /InsForge connectivity check failed: upstream unavailable/,
  );
});
