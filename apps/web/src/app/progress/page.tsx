import { AppShell, ProgressBar } from "../ui";

const focusAreas = [
  ["Lessons completed", "12 of 16", "75%"],
  ["Assessment average", "88%", "88%"],
  ["Project readiness", "2 of 4", "50%"],
] as const;

export default function ProgressPage() {
  return (
    <AppShell active="Progress">
      <div className="page-title">
        <h1>Your Learning Progress</h1>
        <p>Use this as a quiet check-in, not a scoreboard.</p>
      </div>
      <section className="stat-grid">
        {["Total time|5h 24m|You studied across three sessions.", "Current streak|7 days|Small daily returns are compounding.", "Next lesson|Model Evaluation|One focused lesson is ready now.", "Best score|90%|Your strongest work is in assignments."].map((item) => {
          const [label, value, note] = item.split("|");
          return (
            <div className="tile" key={label}>
              <p>{label}</p>
              <strong>{value}</strong>
              <p>{note}</p>
            </div>
          );
        })}
      </section>
      <section className="panel progress-summary">
        <div>
          <p className="eyebrow">This week</p>
          <h2>Keep the next step small</h2>
          <p>Finish Model Evaluation, then take the short practice check when it appears.</p>
        </div>
        <a className="button" href="/courses/1/lesson/5">
          Continue lesson
        </a>
      </section>
      <section className="progress-grid">
        {focusAreas.map(([label, value, progress]) => (
          <div className="panel metric-panel" key={label}>
            <div className="topline compact">
              <h2>{label}</h2>
              <strong>{value}</strong>
            </div>
            <ProgressBar value={progress} />
          </div>
        ))}
      </section>
    </AppShell>
  );
}
