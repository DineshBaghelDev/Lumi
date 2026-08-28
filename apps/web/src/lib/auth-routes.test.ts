import { strict as assert } from "node:assert";
import test from "node:test";
import {
  authenticatedHomePath,
  authErrorRedirect,
  legacyAuthCookieNames,
  resolveSessionHomePath,
  signInPath,
} from "./auth-routes.ts";

test("google auth redirects stay inside the app", () => {
  assert.equal(authErrorRedirect("http://localhost:3000", "missing_verifier").pathname, signInPath);
  assert.equal(
    authErrorRedirect("http://localhost:3000", "missing_verifier").searchParams.get("error"),
    "missing_verifier",
  );
  assert.equal(authenticatedHomePath, "/courses");
  assert.deepEqual(legacyAuthCookieNames, ["insforge_access_token", "insforge_refresh_token", "insforge_code_verifier"]);
});

test("session restoration routes users to the correct shell", () => {
  assert.equal(resolveSessionHomePath(null), signInPath);
  assert.equal(resolveSessionHomePath({ id: "user-1" }), authenticatedHomePath);
});
