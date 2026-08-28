import { apiFetch } from "../../../../../lib/api";
import { AppShell, CourseTabs, EmptyNotice } from "../../../../ui";
import { AutoRefresh } from "../../auto-refresh";
import { AssessmentRunner, type ClientQuestion } from "./assessment-runner";

type AssessmentPayload = {
  assessment: {
    id: string;
    title: string;
    status: string;
    lessonId: string;
    courseId: string;
  };
  questions: ClientQuestion[];
  latestAttempt: { id: string; score: number | null } | null;
};

export default async function AssessmentPage({ params }: { params: Promise<{ id: string; assessmentId: string }> }) {
  const { id, assessmentId } = await params;
  const response = await apiFetch(`/assessments/${assessmentId}`);
  if (!response.ok) {
    return (
      <AppShell active="Courses">
        <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
        <EmptyNotice
          title="Assessment unavailable"
          body="This assessment does not exist or you do not have access to it."
          action={<a className="button" href={`/courses/${id}/lessons`}>Return to lessons</a>}
        />
      </AppShell>
    );
  }

  const { assessment, questions } = await response.json() as AssessmentPayload;

  if (assessment.status !== "ready") {
    const failed = assessment.status === "failed";
    return (
      <AppShell active="Courses">
        <AutoRefresh active={!failed} />
        <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
        <div className="page-title">
          <h1>{assessment.title}</h1>
        </div>
        <CourseTabs active="Assessments" courseId={id} />
        <EmptyNotice
          title={failed ? "Assessment failed" : "Assessment preparing"}
          body={failed
            ? "Question generation failed for this lesson. The lesson itself remains available."
            : "Lumi is still shaping the questions for this lesson. You can keep reading while practice is prepared."}
          action={
            <a className="button" href={`/courses/${id}/lesson/${assessment.lessonId}`}>Return to lesson</a>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell active="Courses">
      <div className="topline compact">
        <div className="back-link" style={{ display: "flex", gap: "var(--space-4)" }}>
          <a href={`/courses/${id}/lesson/${assessment.lessonId}`}>Back to lesson</a>
          <span style={{ color: "var(--slate-300)" }}>|</span>
          <a href={`/courses/${id}`}>Roadmap</a>
        </div>
      </div>
      <div className="page-title">
        <h1>{assessment.title}</h1>
        <p>{questions.length} questions. Multiple choice checks are instant; everything else is graded at the end.</p>
      </div>
      <CourseTabs active="Assessments" courseId={id} />
      <AssessmentRunner
        assessmentId={assessment.id}
        courseId={id}
        lessonId={assessment.lessonId}
        questions={questions}
      />
    </AppShell>
  );
}
