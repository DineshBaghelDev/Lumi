import { apiFetch } from "../../lib/api";
import { AppShell, ProgressBar } from "../ui";

type Course = { id: string; title: string; topic: string; status: string; description: string | null };

type ResumePoint = { type: string; lessonId?: string; blockIndex?: number };

export default async function DashboardPage() {
  let courses: Course[] = [];
  let resumeCourse: Course | null = null;
  let resumePoint: ResumePoint | null = null;

  try {
    const res = await apiFetch("/courses");
    if (res.ok) {
      const data = await res.json() as { courses: Course[] };
      courses = data.courses ?? [];
    }
  } catch { /* ignore */ }

  // Find the most recent active/generating course for resume
  const activeCourse = courses.find((c) => c.status === "generating" || c.status === "ready" || c.status === "ready_with_gaps");
  if (activeCourse) {
    resumeCourse = activeCourse;
    try {
      const res = await apiFetch(`/courses/${activeCourse.id}/progress/resume`);
      if (res.ok) {
        resumePoint = await res.json() as ResumePoint;
      }
    } catch { /* ignore */ }
  }

  const resumeHref = resumeCourse
    ? resumePoint?.type === "lesson" && resumePoint.lessonId
      ? `/courses/${resumeCourse.id}/lesson/${resumePoint.lessonId}`
      : `/courses/${resumeCourse.id}/lessons`
    : "/courses/new";

  return (
    <AppShell active="Home">
      <div className="topline">
        <div>
          <h1>Welcome back</h1>
          <p className="lead">Ready to continue learning?</p>
        </div>
      </div>
      {resumeCourse ? (
        <section className="panel focus-panel">
          <div>
            <p className="eyebrow">Continue learning</p>
            <h2>{resumeCourse.title}</h2>
            <p>{resumeCourse.description ?? resumeCourse.topic}</p>
          </div>
          <a className="button" href={resumeHref}>Continue</a>
        </section>
      ) : (
        <section className="panel focus-panel">
          <div>
            <p className="eyebrow">Get started</p>
            <h2>Create your first course</h2>
            <p>Tell Lumi what you want to learn.</p>
          </div>
          <a className="button" href="/courses/new">Create course</a>
        </section>
      )}
      {courses.length > 0 ? (
        <>
          <div className="topline section-gap-lg">
            <h2>My Courses</h2>
            <a href="/courses">View all</a>
          </div>
          <section className="card-grid">
            {courses.slice(0, 6).map((course) => (
              <a className="panel course-card" href={`/courses/${course.id}`} key={course.id}>
                <h3>{course.title}</h3>
                <p className="small" style={{ color: "var(--muted)" }}>{course.topic}</p>
                <span className="status purple" style={{ marginTop: "8px" }}>{course.status}</span>
              </a>
            ))}
          </section>
        </>
      ) : (
        <section className="notice section-gap">
          <h2>No courses yet</h2>
          <p>Create your first course and Lumi will research and structure a learning path for you.</p>
          <div className="notice-action">
            <a className="button" href="/courses/new">Create course</a>
          </div>
        </section>
      )}
    </AppShell>
  );
}
