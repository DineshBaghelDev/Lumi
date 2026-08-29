import { AppShell } from "../../../../ui";

export default function LessonLoading() {
  return (
    <AppShell active="Courses">
      <div className="topline">
        <a className="back-link" href="#">Back to lessons</a>
      </div>
      <section className="lesson-page">
        {/* Left column: outline */}
        <details className="lesson-nav lesson-outline" open>
          <summary>On this lesson</summary>
          <div className="outline-links">
            {Array.from({ length: 5 }).map((_, i) => (
              <div className={`skeleton skeleton-line skeleton-w-${[90, 80, 70, 60, 50][i]}`} key={i} />
            ))}
          </div>
        </details>

        {/* Center column: content */}
        <article className="lesson-content">
          <div className="skeleton skeleton-line title skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-60" />

          <div className="skeleton skeleton-line skeleton-w-40 lesson-block" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-70" />

          <div className="skeleton skeleton-code lesson-block" />

          <div className="skeleton skeleton-line skeleton-w-40 lesson-block" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-90" />
          <div className="skeleton skeleton-line skeleton-w-60" />
        </article>

        {/* Right column: tools */}
        <aside className="lesson-tools">
          <div className="side-card">
            <div className="skeleton skeleton-line skeleton-w-40" />
            <div className="skeleton skeleton-badge" />
            <div className="skeleton skeleton-line skeleton-w-90 mt-2" />
            <div className="skeleton skeleton-line skeleton-w-70" />
          </div>
          <div className="side-card section-gap">
            <div className="skeleton skeleton-line skeleton-w-50" />
          </div>
          <div className="side-card section-gap">
            <div className="skeleton skeleton-line skeleton-w-40" />
            <div className="skeleton skeleton-line skeleton-w-90 mt-2" />
          </div>
        </aside>
      </section>
    </AppShell>
  );
}
