import { AppShell, CourseIcon, CourseTabs, ProgressBar, Status, modules } from "../../ui";

export default function CourseOverviewPage() {
  return (
    <AppShell active="Courses">
      <div className="topline">
        <div>
          <a className="back-link" href="/courses">Back</a>
          <h1>Machine Learning</h1>
          <p className="lead">Understanding the core ideas and building real world intuition.</p>
        </div>
      </div>
      <section className="hero-card">
        <div className="left">
          <CourseIcon>AI</CourseIcon>
          <div>
            <h2>About this course</h2>
            <p>
              This course takes you from the fundamentals of machine learning to building and evaluating
              real-world models. You'll explore core concepts, algorithms, and best practices through hands-on projects.
            </p>
            <div className="meta-row">
              <span className="chip active">AI & Data</span>
              <span>Intermediate</span>
              <span>18h 30m</span>
            </div>
          </div>
        </div>
        <div className="right">
          <h3>Your Progress</h3>
          <strong className="progress-value">75%</strong>
          <p>12 / 16 lessons completed</p>
          <ProgressBar value="75%" />
          <a className="button wide-button" href="/courses/1/lesson/5">
            Continue Learning
          </a>
        </div>
      </section>
      <CourseTabs active="Overview" />
      <h2 className="section-title">Learning Path</h2>
      <p>Follow this structured path to master machine learning.</p>
      <section className="course-list">
        {modules.map(([title, count, summary, progress, state], index) => (
          <div className="path-row" key={title}>
            <span className="path-number">{index + 1}</span>
            <div className="course-row roadmap-row">
              <CourseIcon>{index + 1}</CourseIcon>
              <div>
                <h2>{title}</h2>
                <p>{count}</p>
                <p>{summary}</p>
                {state === "Locked" ? <p className="helper-text">Unlocks after the current module is complete.</p> : null}
              </div>
              <div>
                <strong>{progress}</strong>
                <ProgressBar value={progress} />
              </div>
              <Status label={state} />
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
