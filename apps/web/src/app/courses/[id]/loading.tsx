import { AppShell } from "../../ui";

export default function CourseLoading() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="topline">
        <div>
          <div className="skeleton skeleton-line skeleton-w-300" />
          <div className="skeleton skeleton-line skeleton-w-200" />
        </div>
      </div>
      <section className="hero-card">
        <div className="left">
          <div className="skeleton skeleton-avatar" />
          <div>
            <div className="skeleton skeleton-line title" />
            <div className="skeleton skeleton-line skeleton-w-70" />
          </div>
        </div>
        <div className="right">
          <div className="skeleton skeleton-line skeleton-w-120" />
          <div className="skeleton skeleton-line title skeleton-w-80" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-progress mt-3" />
        </div>
      </section>
    </AppShell>
  );
}
