import { expect, test } from "@playwright/test";

const mockApiUrl = process.env.LUMI_E2E_MOCK_API_URL ?? "http://127.0.0.1:3107";

const mock = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(new URL(path, mockApiUrl), init);
  if (!response.ok) throw new Error(`Mock API ${path} failed with ${response.status}`);
  return response;
};

const tokenPart = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const accessToken = `${tokenPart({ alg: "none", typ: "JWT" })}.${tokenPart({ exp: 4_102_444_800, sub: "user-e2e" })}.e2e`;

test.beforeEach(async ({ context }) => {
  await mock("/__reset", { method: "POST" });
  await context.addCookies([
    {
      name: "insforge_access_token",
      value: accessToken,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
    },
  ]);
});

test("seeded authenticated V1 journey proves creation, learning, assessment, project, chat, notes, reload, and resume", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Create your first course" })).toBeVisible();

  await page.getByRole("link", { name: "Create course" }).first().click();
  await page.getByLabel("What do you want to learn?").fill("PostgreSQL indexing");
  await page.getByLabel("What should this course help you do?").fill("Build projects");
  await page.getByRole("button", { name: "Create course" }).click();

  await expect(page).toHaveURL(/\/courses\/course-e2e$/);
  await expect(page.getByRole("heading", { name: "PostgreSQL indexing" })).toBeVisible();
  await expect(page.getByText("1 / 2 lessons ready")).toBeVisible();
  await expect(page.getByText("Lesson running")).toBeVisible();

  let state = await (await mock("/__state")).json();
  expect(state.createdPayload).toMatchObject({ topic: "PostgreSQL indexing", goal: "Build projects", difficultyLevel: "beginner" });
  expect(state.idempotencyKey).toEqual(expect.any(String));

  await mock("/__phase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phase: "ready" }),
  });
  await page.reload();
  await expect(page.getByText("2 / 2 lessons ready")).toBeVisible();
  await page.getByRole("link", { name: "View roadmap" }).click();
  await expect(page.getByRole("heading", { name: "Index fundamentals" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Read an index plan/ })).toBeVisible();

  await page.getByRole("link", { name: /Read an index plan/ }).click();
  await expect(page.getByRole("heading", { name: "Read an index plan" })).toBeVisible();
  await expect(page.getByText("An Index Scan can avoid reading unrelated table rows.")).toBeVisible();
  await expect(page.getByText("2 cited source references in this lesson.")).toBeVisible();

  await expect(page.getByText("No notes or bookmarks yet.")).toBeVisible();
  await page.getByPlaceholder("Add a note...").fill("Remember to compare scanned rows.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Remember to compare scanned rows.")).toBeVisible();

  await page.getByRole("button", { name: "Start lesson" }).click();
  await expect(page.getByText("In Progress")).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText("You have completed this lesson.")).toBeVisible();
  state = await (await mock("/__state")).json();
  expect(state.progress).toMatchObject({ status: "completed", currentBlockIndex: 3 });
  expect(state.notes).toHaveLength(1);

  await page.getByRole("link", { name: "Assessment" }).click();
  await expect(page.getByText("Question 1 of 2")).toBeVisible();
  await page.getByRole("button", { name: "Index Scan" }).click();
  await expect(page.getByText("Correct.")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByPlaceholder("Type your answer").fill("rows");
  await page.getByRole("button", { name: "Submit assessment" }).click();
  await expect(page.getByRole("heading", { name: "Results" })).toBeVisible();
  await expect(page.getByText("Score: 100%")).toBeVisible();

  await page.getByRole("link", { name: "Roadmap" }).click();
  await page.getByRole("link", { name: /Tune a slow dashboard query/ }).click();
  await expect(page.getByRole("heading", { name: /Milestone 1: Inspect the plan/ })).toBeVisible();
  await page.getByRole("button", { name: /Reveal a hint/ }).click();
  await expect(page.getByText("Start with the equality column before the range column.")).toBeVisible();
  await page.getByRole("button", { name: "I'm done with this milestone" }).click();
  await expect(page.getByRole("heading", { name: "Project complete" })).toBeVisible();

  await page.goto("/courses/course-e2e/chat");
  await expect(page.getByText("Ask a question about the course material.")).toBeVisible();
  await page.getByPlaceholder("Ask about the course...").fill("What evidence supports using the index?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("The lesson source says an Index Scan avoids unrelated rows.")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Course chat/ }).click();
  await expect(page.getByRole("link", { name: "PostgreSQL docs" })).toBeVisible();

  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/courses\/course-e2e\/lesson\/lesson-index-basics$/);
  await expect(page.getByText("Remember to compare scanned rows.")).toBeVisible();
});

test("failure retry reuses the failed generation job and preserves available course content", async ({ page }) => {
  await mock("/__phase", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phase: "failed" }),
  });

  await page.goto("/courses/course-e2e");
  await expect(page.getByRole("heading", { name: "Generation needs attention" })).toBeVisible();
  await expect(page.getByText("Question generation failed for this lesson.")).toBeVisible();
  await expect(page.getByRole("link", { name: "View roadmap" })).toBeEnabled();

  await page.getByRole("button", { name: "Retry questions" }).click();
  await expect(page).toHaveURL(/success=Generation\+retry\+queued/);
  await expect(page.getByText("Generation retry queued.")).toBeVisible();

  const state = await (await mock("/__state")).json();
  expect(state.retryCount).toBe(1);
});
