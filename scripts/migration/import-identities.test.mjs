import { strict as assert } from "node:assert";
import test from "node:test";
import { assertLocalDatabaseUrl, buildIdentityPlan } from "./import-identities.mjs";

const appUsers = [
  { id: "app-1", auth_user_id: "auth-1", email: "one@example.test", created_at: "2025-01-01", updated_at: "2025-01-02" },
  { id: "app-2", auth_user_id: "auth-2", email: "two@example.test", created_at: "2025-01-01", updated_at: "2025-01-02" },
];
const identityRows = [
  { id: "auth-1", email: "ONE@example.test", email_verified: true, profile: { name: "One" }, created_at: "2025-01-01", updated_at: "2025-01-02" },
  { id: "provider-1", user_id: "auth-1", provider: "google", provider_account_id: "google-1", access_token: "must-not-import", recordType: "provider" },
];

test("plans stable identities, token-free Google accounts, and locked placeholders", () => {
  const plan = buildIdentityPlan({ appUsers, identityRows });
  assert.deepEqual(plan.users.map(({ id, placeholder }) => ({ id, placeholder })), [
    { id: "auth-1", placeholder: false },
    { id: "auth-2", placeholder: true },
  ]);
  assert.deepEqual(plan.accounts[0], {
    id: "provider-1", accountId: "google-1", providerId: "google", userId: "auth-1", createdAt: undefined, updatedAt: undefined,
  });
  assert.equal("accessToken" in plan.accounts[0], false);
  assert.ok(plan.exceptions.some((row) => row.type === "missing_source_identity" && row.authUserId === "auth-2"));
});

test("rejects duplicate identities and non-local write targets", () => {
  assert.throws(() => buildIdentityPlan({ appUsers: [appUsers[0], appUsers[0]], identityRows }), /Duplicate application auth ID/);
  assert.throws(() => assertLocalDatabaseUrl("postgres://user:pass@db.example.test/lumi"), /non-local/);
  assert.equal(assertLocalDatabaseUrl("postgres://user:pass@localhost:5432/lumi"), "postgres://user:pass@localhost:5432/lumi");
});
