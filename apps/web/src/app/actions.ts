"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createLumiAuthActions } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { signInPath } from "../lib/auth-routes";

export async function signOutAction() {
  const auth = await createLumiAuthActions();
  await auth.signOut();
  redirect(signInPath);
}

export async function createCourseAction(formData: FormData) {
  const topic = String(formData.get("topic") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const difficultyLevel = String(formData.get("difficultyLevel") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  const response = await apiFetch("/courses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({ topic, goal, difficultyLevel }),
  });
  if (!response.ok) redirect(`/courses/new?error=${encodeURIComponent("Could not create that course. Check the fields and try again.")}`);
  const body = await response.json() as { course?: { id?: string } };
  redirect(`/courses/${body.course?.id ?? ""}`);
}
