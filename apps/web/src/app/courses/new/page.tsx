import { AppShell } from "../../ui";
import { randomUUID } from "node:crypto";
import { CreateCourseForm } from "./create-course-form";

export default async function NewCoursePage() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="page-title">
        <h1>Create a new course</h1>
        <p>Tell Lumi what you want to learn.</p>
      </div>
      <CreateCourseForm idempotencyKey={randomUUID()} />
    </AppShell>
  );
}
