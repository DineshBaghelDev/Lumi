import { AppShell, ProgressBar } from "../ui";

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
      <details className="mobile-details stats-details">
        <summary>Progress snapshot</summary>
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
      </details>
      <section className="dashboard-grid compact-grid">
        <details className="panel activity-panel">
          <summary>Recent Activity</summary>
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
        </details>
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
