"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createLumiAuthActions } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { signInPath } from "../lib/auth-routes";

export async function signOutAction() {
  const auth = await createLumiAuthActions();
  await auth.signOut();
  redirect(signInPath);
}

export type FormState = { ok: boolean; message: string };

const fail = (message: string): FormState => ({ ok: false, message });

export async function createCourseAction(_state: FormState, formData: FormData): Promise<FormState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const difficultyLevel = String(formData.get("difficultyLevel") ?? "").trim();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  if (!topic || !goal) return fail("Add a topic and learning goal to create a course.");

  const response = await apiFetch("/courses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
    },
    body: JSON.stringify({ topic, goal, difficultyLevel }),
  });
  if (!response.ok) return fail("Could not create that course. Check the fields and try again.");
  const body = await response.json() as { course?: { id?: string } };
  redirect(`/courses/${body.course?.id ?? ""}`);
}

export async function retryGenerationJobAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const jobId = String(formData.get("jobId") ?? "");
  const response = await apiFetch(`/generation-jobs/${jobId}/retry`, { method: "POST" });
  if (courseId) revalidatePath(`/courses/${courseId}`);
  if (!response.ok) redirect(`/courses/${courseId}?error=${encodeURIComponent("Could not retry that generation step.")}`);
  redirect(`/courses/${courseId}?success=${encodeURIComponent("Generation retry queued.")}`);
}

export async function cancelGenerationAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const response = await apiFetch(`/courses/${courseId}/cancel-generation`, { method: "POST" });
  if (courseId) revalidatePath(`/courses/${courseId}`);
  if (!response.ok) redirect(`/courses/${courseId}?error=${encodeURIComponent("Could not cancel generation.")}`);
  redirect(`/courses/${courseId}?success=${encodeURIComponent("Generation cancelled.")}`);
}
