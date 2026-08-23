import { AppShell, CourseTabs, Status, lessons } from "../../../ui";

export default function CourseLessonsPage() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses/1">Back</a>
      <div className="page-title">
        <h1>Machine Learning</h1>
        <p>Understanding the core ideas and building real world intuition.</p>
      </div>
      <CourseTabs active="Lessons" />
      <section className="panel module-box">
        <h2>Foundations</h2>
        <div className="lesson-list">
          {lessons.map(([id, title, subtitle, time, state], index) => {
            const row = (
              <>
                <span className="path-number">{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </div>
                <span>{time}</span>
                <Status label={state} />
              </>
            );

            return state === "Locked" ? (
              <div className="lesson-row muted-row" key={id} aria-disabled="true">
                {row}
              </div>
            ) : (
              <a className="lesson-row" href={`/courses/1/lesson/${id}`} key={id}>
                {row}
              </a>
            );
          })}
        </div>
      </section>
      {["Core Concepts", "Advanced Topics", "Real World"].map((module, index) => (
        <section className="panel module-box section-gap" key={module}>
          <h2>{module}</h2>
          <p>{index === 0 ? "Lessons appear here as Lumi finishes the next section." : "This section unlocks later in the course."}</p>
        </section>
      ))}
    </AppShell>
  );
}
