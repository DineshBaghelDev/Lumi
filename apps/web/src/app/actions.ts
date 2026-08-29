"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getLumiAuth } from "../lib/auth";
import { apiFetch } from "../lib/api";
import { passwordOperation } from "../lib/password-policy";

export type FormState = { ok: boolean; message: string };

const fail = (message: string): FormState => ({ ok: false, message });

export async function updatePasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 12) return fail("New password must contain at least 12 characters.");
  const auth = getLumiAuth();
  const requestHeaders = await headers();
  try {
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const operation = passwordOperation(accounts.some((account) => account.providerId === "credential"), currentPassword, newPassword);
    if ("error" in operation) return fail(operation.error);
    if (operation.kind === "change") {
      await auth.api.changePassword({ headers: requestHeaders, body: { currentPassword, newPassword } });
    } else {
      await auth.api.setPassword({ headers: requestHeaders, body: { newPassword } });
    }
    return { ok: true, message: "Password updated." };
  } catch {
    return fail("Password could not be updated.");
  }
}

export async function createCourseAction(_state: FormState, formData: FormData): Promise<FormState> {
  const topic = String(formData.get("topic") ?? "").trim();
  const goal = String(formData.get("goal") ?? "").trim();
  const difficultyLevel = String(formData.get("difficultyLevel") ?? "").trim() || undefined;
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  if (!topic || !goal) return fail("Add a topic and learning goal to create a course.");

  let response: Response;
  try {
    response = await apiFetch("/courses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({ topic, goal, difficultyLevel }),
    });
  } catch {
    return fail("The API server is not reachable. Please ensure the API is running and try again.");
  }
  if (!response.ok) {
    let detail = "";
    try {
      const errBody = await response.json() as { error?: { code?: string; message?: string } };
      detail = errBody?.error?.message ?? "";
    } catch { /* ignore parse error */ }
    if (response.status === 401) return fail("You are not signed in. Please refresh and sign in again.");
    if (response.status === 429) return fail(detail || "Too many courses are generating. Please wait a moment and try again.");
    return fail(detail || `Course creation failed (HTTP ${response.status}). Check the fields and try again.`);
  }
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
    headers: {
      "content-type": "application/json",
      "idempotency-key": randomUUID(),
    },
    body: JSON.stringify({ answers }),
  });
  if (!response.ok) return null;
  return await response.json() as { attempt: { id: string | null; score: number }; results: SubmittedResult[] };
}
