import { AppShell, CourseIcon, EmptyNotice, ProgressBar, Status, courses } from "../ui";

export default function CoursesPage() {
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
      <EmptyNotice
        title="One course is ready to preview"
        body="More ways to organize courses will appear when you have a larger learning library."
      />
      <section className="course-list">
        {courses.map(({ id, title, subtitle, lessons, projects, progress, state, mark, tone }) => (
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
