import { apiFetch } from "../../../lib/api";
import { deriveCourseProgress, type ResumePoint } from "../../../lib/course-progress";
import { cancelGenerationAction, retryGenerationJobAction } from "../../actions";
import { AppShell, CourseIcon, CourseTabs, ProgressBar, Status } from "../../ui";
import { AutoRefresh } from "./auto-refresh";

type Course = {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  difficulty_level: string | null;
  estimated_duration_minutes: number | null;
  status: string;
};
type ModuleRow = { id: string; title: string; description: string | null; order_index: number };
type LessonRow = { id: string; module_id: string; title: string; status: string };
type ProjectRow = { id: string; title: string; status: string };
type JobRow = { id: string; type: string; status: string; progress: number; stage: string; canRetry: boolean; message: string | null };
type Usage = { cancelled?: boolean; budget_exhausted?: boolean } | null;

export default async function CourseOverviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { id } = await params;
  const notice = await searchParams;
  const [detailResponse, curriculumResponse, resumeResponse] = await Promise.all([
    apiFetch(`/courses/${id}?include=jobs`),
    apiFetch(`/courses/${id}/curriculum`),
    apiFetch(`/courses/${id}/progress/resume`),
  ]);

  if (!detailResponse.ok) return <CourseMissing />;

  const detail = await detailResponse.json() as { course: Course; jobs?: JobRow[]; usage?: Usage };
  const roadmap = curriculumResponse.ok
    ? await curriculumResponse.json() as { modules: ModuleRow[]; lessons: LessonRow[]; projects: ProjectRow[] }
    : { modules: [], lessons: [], projects: [] };
  const course = detail.course;
  const jobs = detail.jobs ?? [];
  const active = course.status === "generating" || jobs.some((job) => job.status === "queued" || job.status === "running");
  const failedJobs = jobs.filter((job) => job.status === "failed");
  const doneLessons = roadmap.lessons.filter((lesson) => lesson.status === "ready").length;
  const resumePoint = resumeResponse.ok ? await resumeResponse.json() as ResumePoint : null;
  const learningState = deriveCourseProgress({
    courseStatus: course.status,
    resumePoint,
    lessons: roadmap.lessons,
    projects: roadmap.projects,
  });
  const progress = active ? `${Math.max(...jobs.map((job) => job.progress), 0)}%` : learningState.progressLabel;

  return (
    <AppShell active="Courses">
      <AutoRefresh active={active} />
      <div className="topline">
        <div>
          <a className="back-link" href="/courses">Back</a>
          <h1>{course.title}</h1>
          <p className="lead">{course.description ?? course.topic}</p>
        </div>
        {active ? (
          <form action={cancelGenerationAction}>
            <input type="hidden" name="courseId" value={id} />
            <button className="button ghost" type="submit">Cancel generation</button>
          </form>
        ) : null}
      </div>
      {notice.error ? <p className="form-message error" role="alert">{notice.error}</p> : null}
      {notice.success ? <p className="form-message success">{notice.success}</p> : null}
      <section className="hero-card">
        <div className="left">
          <CourseIcon>{course.topic.slice(0, 2).toUpperCase()}</CourseIcon>
          <div>
            <h2>About this course</h2>
            <p>{course.description ?? `A generated learning path for ${course.topic}.`}</p>
            <div className="meta-row">
              <span className="chip active">{active ? course.status.replaceAll("_", " ") : learningState.stateLabel.toLowerCase()}</span>
              {course.difficulty_level ? <span>{course.difficulty_level}</span> : null}
              {course.estimated_duration_minutes ? <span>{Math.round(course.estimated_duration_minutes / 60)}h</span> : null}
            </div>
          </div>
        </div>
        <div className="right">
          <h3>{active ? "Generation" : "Learning progress"}</h3>
          <strong className="progress-value">{progress}</strong>
          <p>{active ? generationSummary(jobs, roadmap.lessons.length, doneLessons, detail.usage ?? null) : learningState.summary}</p>
          <ProgressBar value={progress} />
          <a className={`button wide-button ${roadmap.lessons.length ? "" : "disabled-link"}`} href={roadmap.lessons.length ? `/courses/${id}/lessons` : "#"}>
            View roadmap
          </a>
        </div>
      </section>
      {failedJobs.length ? (
        <section className="notice danger-notice">
          <h2>Generation needs attention</h2>
          <p>{failedJobs[0]?.message ?? "A generation step failed."}</p>
          {failedJobs.filter((job) => job.canRetry).map((job) => (
            <form action={retryGenerationJobAction} key={job.id}>
              <input type="hidden" name="courseId" value={id} />
              <input type="hidden" name="jobId" value={job.id} />
              <button className="button" type="submit">Retry {job.stage.toLowerCase()}</button>
            </form>
          ))}
        </section>
      ) : null}
      <CourseTabs active="Overview" courseId={id} />
      <h2 className="section-title">Learning Path</h2>
      <p>Follow the generated modules as each lesson becomes available.</p>
      <section className="course-list">
        {roadmap.modules.length === 0 ? (
          <div className="panel module-box">
            <h2>{generationStage(jobs)}</h2>
            <p>{active ? "Lumi is preparing the curriculum. This page refreshes while generation is active." : "No roadmap is available yet."}</p>
          </div>
        ) : roadmap.modules.map((module, index) => {
          const moduleLessons = roadmap.lessons.filter((lesson) => lesson.module_id === module.id);
          const moduleReady = moduleLessons.filter((lesson) => lesson.status === "ready").length;
          const moduleProgress = moduleLessons.length ? `${Math.round((moduleReady / moduleLessons.length) * 100)}%` : "0%";
          return (
            <div className="path-row" key={module.id}>
              <span className="path-number">{index + 1}</span>
              <div className="course-row roadmap-row">
                <CourseIcon>{module.order_index}</CourseIcon>
                <div>
                  <h2>{module.title}</h2>
                  <p>{moduleLessons.length} lessons</p>
                  {module.description ? <p>{module.description}</p> : null}
                </div>
                <div>
                  <strong>{moduleProgress}</strong>
                  <ProgressBar value={moduleProgress} />
                </div>
                <Status label={moduleReady === moduleLessons.length ? "Ready" : moduleReady > 0 ? "In Progress" : "Not Started"} />
              </div>
            </div>
          );
        })}
      </section>
      {roadmap.projects.length ? (
        <>
          <h2 className="section-title">Projects</h2>
          <section className="course-list">
            {roadmap.projects.map((project) => (
              <div className="course-row" key={project.id}>
                <CourseIcon>PR</CourseIcon>
                <div>
                  <h2>{project.title}</h2>
                  <p>Project content will unlock from its generation job.</p>
                </div>
                <Status label={project.status === "ready" ? "Available" : "Not Started"} />
              </div>
            ))}
          </section>
        </>
      ) : null}
    </AppShell>
  );
}

function CourseMissing() {
  return (
    <AppShell active="Courses">
      <a className="back-link" href="/courses">Back</a>
      <div className="page-title">
        <h1>Course not found</h1>
        <p>This course is unavailable or you do not have access.</p>
      </div>
    </AppShell>
  );
}

const generationStage = (jobs: JobRow[]) => {
  const running = jobs.find((job) => job.status === "running") ?? jobs.find((job) => job.status === "queued");
  const failed = jobs.find((job) => job.status === "failed");
  return running ? `${running.stage} ${running.status}` : failed ? `${failed.stage} failed` : "Waiting for generation";
};

const generationSummary = (jobs: JobRow[], lessonCount: number, doneLessons: number, usage: Usage) => {
  if (usage?.cancelled) return "Generation was cancelled. Completed content is still available.";
  if (usage?.budget_exhausted) return "Generation stopped because the course budget was exhausted.";
  const failed = jobs.find((job) => job.status === "failed");
  if (failed) return failed.message ?? `${failed.stage} failed.`;
  if (lessonCount) return `${doneLessons} / ${lessonCount} lessons ready`;
  return generationStage(jobs);
};
