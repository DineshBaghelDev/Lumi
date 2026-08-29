import { AppShell } from "../ui";

export default function CoursesLoading() {
  return (
    <AppShell active="Courses">
      <div className="topline">
        <div>
          <h1>My courses</h1>
          <p>Loading courses…</p>
        </div>
      </div>
      <section className="course-list">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="course-row" key={i}>
            <div className="skeleton skeleton-avatar" />
            <div>
              <div className="skeleton skeleton-line title" />
              <div className="skeleton skeleton-line skeleton-w-40" />
            </div>
            <div>
              <div className="skeleton skeleton-line skeleton-w-80" />
              <div className="skeleton skeleton-progress" />
            </div>
            <div className="skeleton skeleton-badge" />
          </div>
        ))}
      </section>
    </AppShell>
  );
}
