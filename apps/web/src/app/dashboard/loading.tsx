import { AppShell } from "../ui";

export default function DashboardLoading() {
  return (
    <AppShell active="Home">
      <div className="topline">
        <div>
          <h1>Welcome back</h1>
          <p className="lead">Loading your courses…</p>
        </div>
      </div>
      <section className="panel focus-panel">
        <div>
          <div className="skeleton skeleton-line title" />
          <div className="skeleton skeleton-line skeleton-w-60" />
        </div>
      </section>
      <div className="topline section-gap-lg">
        <h2>My Courses</h2>
      </div>
      <section className="card-grid">
        {Array.from({ length: 3 }).map((_, i) => (
          <div className="panel course-card" key={i}>
            <div className="skeleton skeleton-line title" />
            <div className="skeleton skeleton-line skeleton-w-50" />
            <div className="skeleton skeleton-badge sm mt-2" />
          </div>
        ))}
      </section>
    </AppShell>
  );
}
