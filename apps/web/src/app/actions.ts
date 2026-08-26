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

export type HintRevealResult = {
  revealedHints?: number;
  hintCount?: number;
  hint?: { level: string; text: string } | null;
  noMoreHints?: boolean;
};

export async function revealProjectHintAction(courseId: string, projectId: string): Promise<HintRevealResult | null> {
  const response = await apiFetch(`/projects/${projectId}/hints/reveal`, { method: "POST" });
  if (!response.ok) return null;
  revalidatePath(`/courses/${courseId}/project/${projectId}`);
  return await response.json() as HintRevealResult;
}

export async function revealProjectHintFormAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  await revealProjectHintAction(courseId, projectId);
}

export async function completeMilestoneAction(formData: FormData) {
  const courseId = String(formData.get("courseId") ?? "");
  const projectId = String(formData.get("projectId") ?? "");
  const milestoneId = String(formData.get("milestoneId") ?? "");
  const response = await apiFetch(`/projects/${projectId}/milestones/${milestoneId}/complete`, { method: "POST" });
  if (!response.ok) redirect(`/courses/${courseId}/project/${projectId}?error=${encodeURIComponent("Complete the current milestone first.")}`);
  revalidatePath(`/courses/${courseId}/project/${projectId}`);
}

export async function scoreObjectiveAnswer(
  assessmentId: string,
  questionId: string,
  response: string,
): Promise<{ correct: boolean } | null> {
  const apiResponse = await apiFetch(`/assessments/${assessmentId}/objective-score`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ questionId, response }),
  });
  if (!apiResponse.ok) return null;
  return await apiResponse.json() as { correct: boolean };
}

export type SubmittedResult = {
  questionId: string;
  kind: string;
  correct: boolean | null;
  earnedPoints: number;
  possiblePoints: number;
  weakPoints: string[];
  feedback: string;
};

export async function submitAssessmentAnswers(
  assessmentId: string,
  answers: { questionId: string; response: unknown }[],
): Promise<{ attempt: { id: string | null; score: number }; results: SubmittedResult[] } | null> {
  const response = await apiFetch(`/assessments/${assessmentId}/submissions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) return null;
  return await response.json() as { attempt: { id: string | null; score: number }; results: SubmittedResult[] };
}
