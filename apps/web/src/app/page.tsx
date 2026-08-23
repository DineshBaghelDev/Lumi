import { Logo, ProgressBar } from "./ui";

const benefits = [
  ["B", "Understand", "complex topics"],
  ["Z", "Stay motivated", "and make progress"],
  ["C", "Build confidence", "that lasts"],
] as const;

export default function HomePage() {
  return (
    <main className="home-hero">
      <section className="home-copy">
        <Logo />
        <h1>
          Learn anything.
          <br />
          Understood deeply.
        </h1>
        <p>AI-powered learning that adapts to you, so you can master what matters.</p>
        <div className="hero-actions">
          <a className="button" href="/sign-in">
            Start learning
          </a>
          <a className="button quiet-button" href="/courses">
            View courses
          </a>
        </div>
        <div className="hero-badges">
          {benefits.map(([mark, title, body], index) => (
            <div className="hero-badge" key={title}>
              <span className={`iconbox ${index === 1 ? "green" : index === 2 ? "orange" : ""}`}>{mark}</span>
              <span>
                <strong>{title}</strong>
                <span>{body}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="mascot-stage" aria-label="Learning preview">
        <div className="hero-card float-card course">
          <div>
            <h3>Machine Learning</h3>
            <p>Understand the core ideas and build real world projects.</p>
            <ProgressBar value="78%" />
            <p className="section-gap">Lesson 5 - Model Evaluation</p>
          </div>
        </div>
        <div className="hero-card float-card quiz">
          <div>
            <h3>What is overfitting?</h3>
            <p className="status good">High variance</p>
            <p>Low bias</p>
            <p>High bias</p>
          </div>
        </div>
        <img className="mascot" src="/mascot-waving.png" alt="" />
      </section>
    </main>
  );
}
