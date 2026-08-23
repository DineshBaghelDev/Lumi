import { AppShell, CourseIcon, ProgressBar } from "../ui";

export default function DashboardPage() {
  return (
    <AppShell active="Home">
      <div className="topline">
        <div>
          <h1>Good morning, Ananya</h1>
          <p className="lead">Ready to learn something new?</p>
        </div>
      </div>
      <section className="panel focus-panel">
        <div>
          <p className="eyebrow">Next up</p>
          <h2>Model Evaluation</h2>
          <p>Pick up the Machine Learning course where you left off.</p>
        </div>
        <a className="button" href="/courses/1/lesson/5">
          Continue
        </a>
      </section>
      <section className="stat-grid">
        {([
          ["3", "In Progress"],
          ["12", "Lessons Done"],
          ["84%", "Overall Progress"],
          ["5h 24m", "Time Learned"],
        ] as const).map(([value, label]) => {
          return (
            <div className="tile" key={label}>
              <strong>{value}</strong>
              <p>{label}</p>
            </div>
          );
        })}
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <h2>Course snapshot</h2>
          <div className="hero-card resume-card">
            <CourseIcon>AI</CourseIcon>
            <div>
              <h2>Machine Learning</h2>
              <p>Understanding the core ideas and building real world models.</p>
              <ProgressBar value="78%" />
              <p className="section-gap">Lesson 5 - Model Evaluation</p>
            </div>
          </div>
        </div>
        <div className="panel">
          <h2>Recent Activity</h2>
          <div className="activity">
            {([
              ["Finished lesson", "Bias & Variance Tradeoff", "2h ago"],
              ["Marked complete", "Linear Algebra Essentials", "Yesterday"],
              ["New practice generated", "Sentiment Analyzer", "2 days ago"],
            ] as const).map(([label, title, time], index) => {
              return (
                <div className="activity-item" key={title}>
                  <span className={`dot ${index === 1 ? "green" : ""}`} />
                  <div>
                    <p className={index === 1 ? "activity-label good" : "activity-label"}>{label}</p>
                    <h3>{title}</h3>
                  </div>
                  <p>{time}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <div className="topline section-gap-lg">
        <h2>My Courses</h2>
        <a href="/courses">View all</a>
      </div>
      <section className="card-grid">
        {([
          ["Machine Learning", "78%"],
          ["Data Structures", "40%"],
          ["System Design", "20%"],
        ] as const).map(([title, value], index) => {
          return (
            <a className={`panel course-card ${index === 1 ? "green" : index === 2 ? "pink" : ""}`} href="/courses/1" key={title}>
              <h3>{title}</h3>
              <ProgressBar value={value} />
              <p>{value}</p>
            </a>
          );
        })}
      </section>
    </AppShell>
  );
}
