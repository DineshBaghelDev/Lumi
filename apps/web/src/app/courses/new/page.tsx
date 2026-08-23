import { AppShell } from "../../ui";

export default function NewCoursePage() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="page-title">
        <h1>Create a new course</h1>
        <p>Tell Lumi what you want to learn.</p>
      </div>
      <form className="form-box" aria-describedby="course-creation-note">
        <label htmlFor="topic">What do you want to learn?</label>
        <textarea id="topic" className="textarea" placeholder="e.g., Quantum Computing, Basic Financial Modeling..." />
        <label>Depth</label>
        <div className="choice-grid">
          <label className="choice selected">
            <input type="radio" name="depth" defaultChecked />
            <span className="iconbox">1</span>
            <div>
              <strong>Beginner</strong>
              <p>New to the topic</p>
            </div>
          </label>
          <label className="choice">
            <input type="radio" name="depth" />
            <span className="iconbox">2</span>
            <div>
              <strong>Intermediate</strong>
              <p>Know the basics</p>
            </div>
          </label>
          <label className="choice">
            <input type="radio" name="depth" />
            <span className="iconbox">3</span>
            <div>
              <strong>Advanced</strong>
              <p>Want depth</p>
            </div>
          </label>
        </div>
        <label htmlFor="goal">Learning goal</label>
        <select id="goal" className="select" defaultValue="">
          <option value="" disabled>
            Select your goal
          </option>
          <option>Build projects</option>
          <option>Prepare for interviews</option>
        </select>
        <button className="button wide-button" type="button" disabled>
          Saving new courses soon
        </button>
        <p id="course-creation-note" className="center-note">
          We are finishing the save step that keeps each new course tied to your account.
        </p>
        <a className="preview-link" href="/courses/1">
          Preview a generated course
        </a>
      </form>
    </AppShell>
  );
}
