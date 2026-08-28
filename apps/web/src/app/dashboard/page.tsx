import { apiFetch } from "../../lib/api";
import { deriveCourseProgress, resolveResumeHref, type ResumePoint } from "../../lib/course-progress";
import { AppShell } from "../ui";

type Course = { id: string; title: string; topic: string; status: string; description: string | null };

export default async function DashboardPage() {
  let courses: Course[] = [];
  let resumeCourse: Course | null = null;
  let resumePoint: ResumePoint = null;

  try {
    const res = await apiFetch("/courses");
    if (res.ok) {
      const data = await res.json() as { courses: Course[] };
      courses = data.courses ?? [];
    }
  } catch { /* ignore */ }

  const resumeStates = await Promise.all(
    courses.map(async (course) => {
      let point: ResumePoint = null;

      if (course.status !== "generating") {
        try {
          const res = await apiFetch(`/courses/${course.id}/progress/resume`);
          if (res.ok) {
            point = await res.json() as ResumePoint;
          }
        } catch { /* ignore */ }
      }

      return {
        course,
        resumePoint: point,
        state: deriveCourseProgress({ courseStatus: course.status, resumePoint: point }),
      };
    }),
  );

  const activeCourseState = resumeStates.find((entry) => entry.state.stateLabel !== "Complete") ?? resumeStates[0];
  if (activeCourseState) {
    resumeCourse = activeCourseState.course;
    resumePoint = activeCourseState.resumePoint;
  }

  const resumeHref = resumeCourse ? resolveResumeHref(resumeCourse.id, resumePoint) : "/courses/new";

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
            {courses.slice(0, 6).map((course) => {
              const entry = resumeStates.find((state) => state.course.id === course.id);

              return (
              <a className="panel course-card" href={`/courses/${course.id}`} key={course.id}>
                <h3>{course.title}</h3>
                <p className="small" style={{ color: "var(--muted)" }}>{course.topic}</p>
                <span className="status purple" style={{ marginTop: "8px" }}>
                  {entry?.state.stateLabel ?? course.status}
                </span>
              </a>
              );
            })}
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
