import { AppShell, CourseTabs, EmptyNotice } from "../../../../ui";

export default function AssessmentPage() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses/1/lessons">Back to lessons</a>
      <div className="page-title">
        <h1>Machine Learning assessment</h1>
        <p>Practice appears here when the lesson assessment is ready.</p>
      </div>
      <CourseTabs active="Assessments" />
      <EmptyNotice
        title="Assessment preparing"
        body="Lumi is still shaping the questions for this lesson. You can keep reading while practice is prepared."
        action={
          <a className="button" href="/courses/1/lesson/5">
            Return to lesson
          </a>
        }
      />
    </AppShell>
  );
}
