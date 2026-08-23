import { AppShell } from "../../../../ui";

export default function LessonPage() {
  return (
    <AppShell active="Courses">
      <div className="topline">
        <a className="back-link" href="/courses/1/lessons">Back to lessons</a>
      </div>
      <section className="lesson-page">
        <details className="lesson-nav lesson-outline">
          <summary>On this lesson</summary>
          <div className="outline-links">
            {["Introduction", "Why Evaluation Matters", "Common Metrics", "Confusion Matrix", "Other Metrics", "Important Notes", "Summary"].map((item, index) => (
              <a className={index === 2 ? "active" : ""} href="#metrics" key={item}>{item}</a>
            ))}
          </div>
        </details>
        <article className="lesson-content">
          <h1>Common Evaluation Metrics</h1>
          <p>Different metrics help us evaluate different aspects of a model.</p>
          <div className="card-grid">
            {["Accuracy|Overall correctness of predictions.|(TP + TN) / (TP + TN + FP + FN)", "Precision|Of predicted positives, how many are actually positive?|TP / (TP + FP)", "Recall|Of all actual positives, how many did we capture?|TP / (TP + FN)"].map((item) => {
              const [title, body, formula] = item.split("|");
              return (
                <section className="panel formula-card" key={item}>
                  <h2>{title}</h2>
                  <p>{body}</p>
                  <div className="formula">{formula}</div>
                </section>
              );
            })}
          </div>
          <section className="panel formula-card section-gap">
            <h2>F1 Score</h2>
            <p>Harmonic mean of Precision and Recall. Balances both.</p>
            <div className="formula">2 x Precision x Recall / (Precision + Recall)</div>
          </section>
          <section className="panel section-gap">
            <h2>Example</h2>
            <p>For a model with: TP = 90, TN = 60, FP = 10, FN = 20</p>
            <div className="metric-row">
              {["Accuracy|85%", "Precision|89%", "Recall|80%", "F1 Score|84.2%"].map((item) => {
                const [label, value] = item.split("|");
                return (
                  <div className="tile" key={item}>
                    <p>{label}</p>
                    <strong>{value}</strong>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="topline section-gap">
            <button className="button ghost-button" type="button" disabled>Previous</button>
            <a className="button" href="/courses/1/assessment/1">Next: Confusion Matrix</a>
          </div>
        </article>
        <aside className="lesson-tools">
          <details className="side-card lesson-tool">
            <summary>Notes</summary>
            <p>Notes will be available after the reading tools are connected.</p>
          </details>
          <details className="side-card lesson-tool section-gap">
            <summary>Key Takeaway</summary>
            <p>Choose the right metric based on the problem you're trying to solve.</p>
            <img className="support-mascot" src="/mascot-waving.png" alt="" />
          </details>
        </aside>
      </section>
    </AppShell>
  );
}
