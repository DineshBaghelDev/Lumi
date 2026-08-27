import { apiFetch } from "../../lib/api";
import { AppShell, CourseIcon, EmptyNotice, ProgressBar, Status } from "../ui";

type Course = {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  status: string;
};

export default async function CoursesPage() {
  const response = await apiFetch("/courses");
  const liveCourses = response.ok ? (await response.json() as { courses: Course[] }).courses : [];
  const rows = liveCourses.map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: course.description ?? course.topic,
      lessons: course.status === "generating" ? "Generating" : "Lessons ready",
      projects: course.status === "generating" ? "Projects pending" : "Projects ready",
      progress: course.status === "generating" ? "0%" : "100%",
      state: courseStateLabel(course.status),
      mark: course.topic.slice(0, 2).toUpperCase(),
      tone: "accent",
    }));

  return (
    <AppShell active="Courses">
      <div className="topline">
        <div>
          <h1>My courses</h1>
          <p>Pick up where you left off or start a new learning path.</p>
        </div>
        <a className="button" href="/courses/new">
          Create course
        </a>
      </div>
      {!response.ok ? (
        <EmptyNotice
          title="Courses could not load"
          body="Refresh the page or try again after the API is available."
        />
      ) : liveCourses.length === 0 ? (
        <EmptyNotice
          title="No generated courses yet"
          body="Create your first course to start a new learning path."
          action={<a className="button" href="/courses/new">Create course</a>}
        />
      ) : null}
      <section className="course-list">
        {rows.map(({ id, title, subtitle, lessons, projects, progress, state, mark, tone }) => (
          <a className="course-row" href={`/courses/${id}`} key={id}>
            <CourseIcon tone={tone}>{mark}</CourseIcon>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
              <div className="meta-row">
                <span>{lessons}</span>
                <span>-</span>
                <span>{projects}</span>
              </div>
            </div>
            <div>
              <strong>{progress}</strong>
              <ProgressBar value={progress} />
            </div>
            <Status label={state} />
          </a>
        ))}
      </section>
    </AppShell>
  );
}

const courseStateLabel = (status: string) =>
  ({
    ready: "Complete",
    ready_with_gaps: "Needs attention",
    failed: "Failed",
    cancelled: "Cancelled",
    archived: "Archived",
  })[status] ?? "In Progress";
