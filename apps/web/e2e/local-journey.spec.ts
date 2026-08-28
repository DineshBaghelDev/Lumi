/**
 * T18 — Real authenticated E2E against the local Compose stack.
 *
 * Preconditions:
 *   docker compose -f compose.yaml up -d --build
 *   node scripts/migration/import-application.mjs <archive-directory>
 *
 * Environment:
 *   WEB_BASE_URL  — web origin (default http://127.0.0.1:3000)
 *   TEST_EMAIL    — sign-up / sign-in email (default lumi-e2e-{timestamp}@test.local)
 *   TEST_PASSWORD — password (default Test-Password-1234567890!)
 *
 * The test signs up a disposable user, enrolls in a generated course,
 * and exercises the full authenticated journey against real DB/auth/storage.
 */

import { expect, test } from "@playwright/test";

const WEB_BASE = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3000";
const TEST_EMAIL = process.env.TEST_EMAIL ?? `lumi-e2e-${Date.now()}@test.local`;
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "Test-Password-1234567890!";

// ── Helpers ────────────────────────────────────────────────────────
const authApi = (path: string) => `${WEB_BASE}/api/auth/${path}`;
const apiProxy = (path: string) => `${WEB_BASE}/api/proxy/${path}`;

const signUp = async (page: import("@playwright/test").Page) => {
  const response = await page.request.post(authApi("sign-up/email"), {
    data: {
      name: "E2E Test User",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });
  // 200 = created, 422 = already exists (idempotent)
  return response.status();
};

const signIn = async (page: import("@playwright/test").Page) => {
  const response = await page.request.post(authApi("sign-in/email"), {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  return response.status();
};

const getSession = async (page: import("@playwright/test").Page) => {
  const response = await page.request.get(authApi("get-session"));
  if (response.status() !== 200) return null;
  return response.json();
};

// ── Tests ──────────────────────────────────────────────────────────

test.describe("Local authenticated journey", () => {
  test("signs up, signs in, creates course, and exercises core flows", async ({ page }) => {
    // 1. Sign up (idempotent)
    const signUpStatus = await signUp(page);
    expect([200, 422]).toContain(signUpStatus);

    // 2. Sign in — sets session cookie
    const signInStatus = await signIn(page);
    expect(signInStatus).toBe(200);

    // 3. Verify session is valid
    const session = await getSession(page);
    expect(session).toBeTruthy();
    expect(session?.user?.email).toBe(TEST_EMAIL);

    // 4. Navigate to dashboard
    await page.goto(`${WEB_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Should NOT redirect to sign-in
    expect(page.url()).not.toContain("/sign-in");

    // 5. Create a course via API proxy
    const idempotencyKey = `e2e-${Date.now()}`;
    const createResponse = await page.request.post(apiProxy("courses"), {
      headers: { "idempotency-key": idempotencyKey },
      data: {
        topic: "Docker container networking",
        goal: "Understand bridge and overlay networks",
        difficultyLevel: "beginner",
      },
    });
    expect(createResponse.status()).toBe(201);
    const { course } = await createResponse.json();
    expect(course?.id).toBeTruthy();
    expect(course?.status).toMatch(/generating|ready/);

    // 6. Verify course appears on dashboard
    await page.goto(`${WEB_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Docker container networking")).toBeVisible({ timeout: 15_000 });

    // 7. Navigate to course detail
    await page.goto(`${WEB_BASE}/courses/${course.id}`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Docker container networking")).toBeVisible();

    // 8. Check curriculum endpoint via API proxy
    const curriculumResponse = await page.request.get(apiProxy(`courses/${course.id}/curriculum`));
    expect(curriculumResponse.status()).toBe(200);
    const curriculum = await curriculumResponse.json();
    expect(curriculum.modules).toBeDefined();

    // 9. Sign out — session cookie should be cleared
    await page.request.post(authApi("sign-out"));
    const afterSignOut = await getSession(page);
    expect(afterSignOut).toBeNull();

    // 10. After sign-out, dashboard redirects to sign-in
    await page.goto(`${WEB_BASE}/dashboard`);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/sign-in");
  });

  test("cross-user denial: user B cannot see user A courses", async ({ page }) => {
    // Sign in as the primary test user
    await signIn(page);
    const sessionA = await getSession(page);
    expect(sessionA?.user?.id).toBeTruthy();

    // Create a course as user A
    const idempotencyKey = `e2e-cross-${Date.now()}`;
    const createResponse = await page.request.post(apiProxy("courses"), {
      headers: { "idempotency-key": idempotencyKey },
      data: { topic: "Secret course A", goal: "Learn secrets", difficultyLevel: "beginner" },
    });
    expect(createResponse.status()).toBe(201);
    const { course } = await createResponse.json();

    // Sign out
    await page.request.post(authApi("sign-out"));

    // Sign up and sign in as user B
    const emailB = `e2e-user-b-${Date.now()}@test.local`;
    await page.request.post(authApi("sign-up/email"), {
      data: { name: "User B", email: emailB, password: TEST_PASSWORD },
    });
    await page.request.post(authApi("sign-in/email"), {
      data: { email: emailB, password: TEST_PASSWORD },
    });
    const sessionB = await getSession(page);
    expect(sessionB?.user?.id).toBeTruthy();
    expect(sessionB?.user?.id).not.toBe(sessionA?.user?.id);

    // User B cannot see user A's course
    const courseResponse = await page.request.get(apiProxy(`courses/${course.id}`));
    expect(courseResponse.status()).toBe(404);

    // User B's course list does not include user A's course
    const listResponse = await page.request.get(apiProxy("courses"));
    const { courses } = await listResponse.json();
    expect(courses.some((c: { id: string }) => c.id === course.id)).toBe(false);

    // Sign out user B
    await page.request.post(authApi("sign-out"));
  });

  test("unauthenticated requests are rejected", async ({ page }) => {
    // Clear any cookies
    await page.context().clearCookies();

    const response = await page.request.get(apiProxy("courses"));
    expect(response.status()).toBe(401);
  });
});
