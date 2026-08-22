import { strict as assert } from "node:assert";
import test from "node:test";
import { createWebInsforgeClient } from "./insforge.ts";

test("creates an SSR browser client from public configuration only", () => {
  const client = createWebInsforgeClient({
    apiBaseUrl: "http://localhost:3001",
    insforge: {
      projectUrl: "https://project.example.insforge.app",
      anonKey: "public-anon-key",
    },
    auth: {
      baseUrl: "https://project.example.insforge.app",
      anonKey: "public-anon-key",
    },
    storage: {
      baseUrl: "https://project.example.insforge.app",
      anonKey: "public-anon-key",
    },
    realtime: {
      baseUrl: "https://project.example.insforge.app",
      anonKey: "public-anon-key",
      pollingFallbackMs: 5_000,
    },
  });

  assert.ok(client.auth);
  assert.ok(client.realtime);
});
