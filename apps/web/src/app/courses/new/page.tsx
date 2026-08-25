import { AppShell } from "../../ui";
import { createCourseAction } from "../../actions";
import { randomUUID } from "node:crypto";

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="page-title">
        <h1>Create a new course</h1>
        <p>Tell Lumi what you want to learn.</p>
      </div>
      <form className="form-box" action={createCourseAction}>
        <input type="hidden" name="idempotencyKey" value={randomUUID()} />
        <label htmlFor="topic">What do you want to learn?</label>
        <textarea id="topic" name="topic" className="textarea" placeholder="e.g., Quantum Computing, Basic Financial Modeling..." required />
        <label>Depth</label>
        <div className="choice-grid">
          <label className="choice selected">
            <input type="radio" name="difficultyLevel" value="beginner" defaultChecked />
            <span className="iconbox">1</span>
            <div>
              <strong>Beginner</strong>
              <p>New to the topic</p>
            </div>
          </label>
          <label className="choice">
            <input type="radio" name="difficultyLevel" value="intermediate" />
            <span className="iconbox">2</span>
            <div>
              <strong>Intermediate</strong>
              <p>Know the basics</p>
            </div>
          </label>
          <label className="choice">
            <input type="radio" name="difficultyLevel" value="advanced" />
            <span className="iconbox">3</span>
            <div>
              <strong>Advanced</strong>
              <p>Want depth</p>
            </div>
          </label>
        </div>
        <label htmlFor="goal">Learning goal</label>
        <select id="goal" name="goal" className="select" defaultValue="" required>
          <option value="" disabled>
            Select your goal
          </option>
          <option>Build projects</option>
          <option>Prepare for interviews</option>
        </select>
        <button className="button wide-button" type="submit">
          Create course
        </button>
        {error ? <p className="center-note">{error}</p> : null}
      </form>
    </AppShell>
  );
}
