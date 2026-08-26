import { apiFetch } from "../../../../../lib/api";
import { completeMilestoneAction, revealProjectHintFormAction } from "../../../../actions";
import { AppShell, CourseTabs, EmptyNotice } from "../../../../ui";
import { AutoRefresh } from "../../auto-refresh";
type Hint = { level: string; text: string };

type ProjectPayload = {
  project: {
    id: string;
    title: string;
    goal: string;
    storyline: string | null;
    status: string;
    courseId: string;
  };
  totalMilestones: number;
  completedMilestones: number;
  progressStatus: string;
  currentMilestone: {
    id: string;
    orderIndex: number;
    title: string;
    scenario: string;
    learnerDecisionPrompt: string | null;
    implementationGoal: string;
    constraints: string[];
    expectedOutcome: string;
    lessons: { id: string; title: string }[];
    hints: Hint[];
    revealedHints: number;
    hintCount: number;
  } | null;
};

export default async function ProjectPage({ params }: { params: Promise<{ id: string; projectId: string }> }) {
  const { id, projectId } = await params;
  const response = await apiFetch(`/projects/${projectId}`);
  if (!response.ok) {
    return (
      <AppShell active="Courses">
        <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
        <EmptyNotice
          title="Project unavailable"
          body="This project does not exist or you do not have access to it."
          action={<a className="button" href={`/courses/${id}/lessons`}>Return to lessons</a>}
        />
      </AppShell>
    );
  }

  const { project, totalMilestones, completedMilestones, progressStatus, currentMilestone } =
    await response.json() as ProjectPayload;

  if (project.status !== "ready") {
    return (
      <AppShell active="Courses">
        <AutoRefresh active={project.status !== "failed"} />
        <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
        <CourseTabs active="Lessons" courseId={id} />
        <EmptyNotice
          title={project.status === "failed" ? "Project generation failed" : "Project preparing"}
          body={project.status === "failed"
            ? "Lumi could not finish this guided project. The rest of your course remains usable."
            : "Lumi is still writing this guided project."}
        />
      </AppShell>
    );
  }

  return (
    <AppShell active="Courses">
      <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
      <div className="page-title">
        <h1>{project.title}</h1>
        <p>{project.goal}</p>
      </div>
      <CourseTabs active="Lessons" courseId={id} />
      {project.storyline ? (
        <section className="panel module-box">
          <p>{project.storyline}</p>
        </section>
      ) : null}
      <p className="helper-text section-gap">
        {completedMilestones} of {totalMilestones} milestones complete
      </p>

      {currentMilestone ? (
        <section className="panel module-box section-gap">
          <h2>Milestone {currentMilestone.orderIndex}: {currentMilestone.title}</h2>
          <p>{currentMilestone.scenario}</p>
          {currentMilestone.learnerDecisionPrompt ? (
            <aside className="lesson-callout tip">
              <h3>Your call</h3>
              <p>{currentMilestone.learnerDecisionPrompt}</p>
            </aside>
          ) : null}
          <h3>Build locally</h3>
          <p>{currentMilestone.implementationGoal}</p>
          {currentMilestone.constraints.length > 0 ? (
            <ul className="lesson-list-block">
              {currentMilestone.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}
            </ul>
          ) : null}
          <h3>Expected outcome</h3>
          <p>{currentMilestone.expectedOutcome}</p>

          {currentMilestone.lessons.length > 0 ? (
            <>
              <h3>Helpful lessons</h3>
              <ul className="lesson-list-block">
                {currentMilestone.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <a href={`/courses/${id}/lesson/${lesson.id}`}>{lesson.title}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {currentMilestone.revealedHints > 0 ? (
            <>
              <h3>Hints</h3>
              <ol className="lesson-list-block">
                {currentMilestone.hints.map((hint, hintIndex) => (
                  <li key={hintIndex}>
                    <span className="chip">{hint.level}</span> {hint.text}
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          <div className="topline section-gap">
            {currentMilestone.revealedHints < currentMilestone.hintCount ? (
              <form action={revealProjectHintFormAction}>
                <input name="courseId" type="hidden" value={id} />
                <input name="projectId" type="hidden" value={projectId} />
                <button className="button ghost-button" type="submit">
                  Reveal a hint ({currentMilestone.revealedHints}/{currentMilestone.hintCount})
                </button>
              </form>
            ) : null}
            <form action={completeMilestoneAction}>
              <input name="courseId" type="hidden" value={id} />
              <input name="projectId" type="hidden" value={projectId} />
              <input name="milestoneId" type="hidden" value={currentMilestone.id} />
              <button className="button" type="submit">I'm done with this milestone</button>
            </form>
          </div>
        </section>
      ) : (
        <section className="notice section-gap">
          <h2>{progressStatus === "completed" ? "Project complete" : "All milestones complete"}</h2>
          <p>You worked through every milestone in this guided project.</p>
          <div className="notice-action">
            <a className="button ghost-button" href={`/courses/${id}/lessons`}>Back to the roadmap</a>
          </div>
        </section>
      )}
    </AppShell>
  );
}

