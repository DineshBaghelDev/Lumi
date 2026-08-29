import { AppShell } from "../../ui";
import { randomUUID } from "node:crypto";
import { apiFetch } from "../../../lib/api";
import { CreateCourseForm } from "./create-course-form";

type ProviderModel = { id: string; name: string; provider: string };
type Provider = { id: string; name: string; models: ProviderModel[] };

export default async function NewCoursePage() {
  let providers: Provider[] = [];
  try {
    const response = await apiFetch("/providers");
    if (response.ok) {
      const body = await response.json() as { providers: Provider[] };
      providers = body.providers ?? [];
    }
  } catch {
    // Providers unavailable — form will use server default
  }

  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="page-title">
        <h1>Create a new course</h1>
        <p>Tell Lumi what you want to learn.</p>
      </div>
      <CreateCourseForm idempotencyKey={randomUUID()} providers={providers} />
    </AppShell>
  );
}
