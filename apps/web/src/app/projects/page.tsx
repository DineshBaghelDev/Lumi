import { AppShell, CourseTabs, DisabledPill, Status } from "../ui";

const projects = [
  ["House Price Predictor", "Build a regression model to predict house prices.", "Regression", "Done"],
  ["Customer Churn Prediction", "Predict whether a customer will churn or not.", "Classification", "In Progress"],
  ["Spam Email Detector", "Build a model to detect spam emails.", "NLP", "Not Started"],
  ["Movie Recommendation System", "Recommend movies using collaborative filtering.", "Recommender", "Locked"],
] as const;

export default function ProjectsPage() {
  return (
    <AppShell active="Projects">
      <div className="topline">
        <div>
          <h1>Projects</h1>
          <p>Project workspaces appear as course milestones become ready.</p>
        </div>
      </div>
      <CourseTabs active="Projects" />
      <section className="project-list">
        {projects.map(([title, subtitle, tag, state], index) => (
          <div className="project-row" key={title}>
            <span className="path-number">{index + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{subtitle}</p>
            </div>
            <span className="status gray">{tag}</span>
            {state === "In Progress" ? <DisabledPill>Workspace preparing</DisabledPill> : <Status label={state} />}
          </div>
        ))}
      </section>
    </AppShell>
  );
}
