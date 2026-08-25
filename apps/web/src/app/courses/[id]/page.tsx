import { apiFetch } from "../../../lib/api";
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
type JobRow = { type: string; status: string; progress: number };

export default async function CourseOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detailResponse, curriculumResponse] = await Promise.all([
    apiFetch(`/courses/${id}?include=jobs`),
    apiFetch(`/courses/${id}/curriculum`),
  ]);

  if (!detailResponse.ok) return <CourseMissing />;

  const detail = await detailResponse.json() as { course: Course; jobs?: JobRow[] };
  const roadmap = curriculumResponse.ok
    ? await curriculumResponse.json() as { modules: ModuleRow[]; lessons: LessonRow[]; projects: ProjectRow[] }
    : { modules: [], lessons: [], projects: [] };
  const course = detail.course;
  const jobs = detail.jobs ?? [];
  const active = course.status === "generating" || jobs.some((job) => job.status === "queued" || job.status === "running");
  const doneLessons = roadmap.lessons.filter((lesson) => lesson.status === "ready").length;
  const progress = roadmap.lessons.length ? `${Math.round((doneLessons / roadmap.lessons.length) * 100)}%` : `${Math.max(...jobs.map((job) => job.progress), 0)}%`;

  return (
    <AppShell active="Courses">
      <AutoRefresh active={active} />
      <div className="topline">
        <div>
          <a className="back-link" href="/courses">Back</a>
          <h1>{course.title}</h1>
          <p className="lead">{course.description ?? course.topic}</p>
        </div>
      </div>
      <section className="hero-card">
        <div className="left">
          <CourseIcon>{course.topic.slice(0, 2).toUpperCase()}</CourseIcon>
          <div>
            <h2>About this course</h2>
            <p>{course.description ?? `A generated learning path for ${course.topic}.`}</p>
            <div className="meta-row">
              <span className="chip active">{course.status.replaceAll("_", " ")}</span>
              {course.difficulty_level ? <span>{course.difficulty_level}</span> : null}
              {course.estimated_duration_minutes ? <span>{Math.round(course.estimated_duration_minutes / 60)}h</span> : null}
            </div>
          </div>
        </div>
        <div className="right">
          <h3>Generation</h3>
          <strong className="progress-value">{progress}</strong>
          <p>{roadmap.lessons.length ? `${doneLessons} / ${roadmap.lessons.length} lessons ready` : generationStage(jobs)}</p>
          <ProgressBar value={progress} />
          <a className="button wide-button" href={`/courses/${id}/lessons`}>
            View roadmap
          </a>
        </div>
      </section>
      <CourseTabs active="Overview" courseId={id} />
      <h2 className="section-title">Learning Path</h2>
      <p>Follow the generated modules as each lesson becomes available.</p>
      <section className="course-list">
        {roadmap.modules.length === 0 ? (
          <div className="panel module-box">
            <h2>{generationStage(jobs)}</h2>
            <p>Lumi is preparing the curriculum. This page refreshes while generation is active.</p>
          </div>
        ) : roadmap.modules.map((module, index) => {
          const moduleLessons = roadmap.lessons.filter((lesson) => lesson.module_id === module.id);
          const moduleDone = moduleLessons.filter((lesson) => lesson.status === "ready").length;
          const moduleProgress = moduleLessons.length ? `${Math.round((moduleDone / moduleLessons.length) * 100)}%` : "0%";
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
                <Status label={moduleDone === moduleLessons.length ? "Complete" : moduleDone > 0 ? "In Progress" : "Not Started"} />
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
                <Status label={project.status === "ready" ? "Complete" : "Not Started"} />
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
  return running ? `${running.type} ${running.status}` : "Waiting for generation";
};
