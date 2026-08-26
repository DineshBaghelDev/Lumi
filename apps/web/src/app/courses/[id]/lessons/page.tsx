import { apiFetch } from "../../../../lib/api";
import { AppShell, CourseTabs, Status } from "../../../ui";
import { AutoRefresh } from "../auto-refresh";

type Course = { id: string; title: string; description: string | null; topic: string; status: string };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  objectives: string[];
  status: string;
  order_index: number;
  is_required: boolean;
  assessment_id: string | null;
  assessment_status: string | null;
};
type Module = { id: string; title: string };
type Project = { id: string; title: string; goal: string; status: string };

export default async function CourseLessonsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detailResponse, curriculumResponse] = await Promise.all([
    apiFetch(`/courses/${id}`),
    apiFetch(`/courses/${id}/curriculum`),
  ]);
  if (!detailResponse.ok) return null;
  const { course } = await detailResponse.json() as { course: Course };
  const roadmap = curriculumResponse.ok
    ? await curriculumResponse.json() as { modules: Module[]; lessons: Lesson[]; projects: Project[] }
    : { modules: [], lessons: [], projects: [] };

  return (
    <AppShell active="Courses">
      <AutoRefresh active={course.status === "generating"} />
      <a className="back-link" href={`/courses/${id}`}>Back</a>
      <div className="page-title">
        <h1>{course.title}</h1>
        <p>{course.description ?? course.topic}</p>
      </div>
      <CourseTabs active="Lessons" courseId={id} />
      {roadmap.modules.length === 0 ? (
        <section className="panel module-box">
          <h2>Curriculum pending</h2>
          <p>Lumi is still building the course roadmap.</p>
        </section>
      ) : roadmap.modules.map((module) => (
        <section className="panel module-box section-gap" key={module.id}>
          <h2>{module.title}</h2>
          <div className="lesson-list">
            {roadmap.lessons.filter((lesson) => lesson.module_id === module.id).map((lesson) => {
              const ready = lesson.status === "ready";
              const row = (
                <>
                  <span className="path-number">{lesson.order_index}</span>
                  <div>
                    <h3>{lesson.title}</h3>
                    <p>{lesson.objectives[0] ?? (lesson.is_required ? "Required lesson" : "Optional lesson")}</p>
                    {ready && lesson.assessment_id && lesson.assessment_status !== "ready" ? <p className="helper-text">Assessment preparing</p> : null}
                  </div>
                  <span>{lesson.is_required ? "Required" : "Optional"}</span>
                  <Status label={ready ? "Done" : lesson.status === "failed" ? "Failed" : "Not Started"} />
                </>
              );

              return ready ? (
                <a className="lesson-row" href={`/courses/${id}/lesson/${lesson.id}`} key={lesson.id}>
                  {row}
                </a>
              ) : (
                <div className="lesson-row muted-row" key={lesson.id} aria-disabled="true">
                  {row}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {roadmap.projects.length > 0 ? (
        <section className="panel module-box section-gap">
          <h2>Guided projects</h2>
          <div className="lesson-list">
            {roadmap.projects.map((project, index) => {
              const ready = project.status === "ready";
              const row = (
                <>
                  <span className="path-number">{index + 1}</span>
                  <div>
                    <h3>{project.title}</h3>
                    <p>{project.goal}</p>
                  </div>
                  <span>Project</span>
                  <Status label={ready ? "In Progress" : project.status === "failed" ? "Failed" : "Not Started"} />
                </>
              );
              return ready ? (
                <a className="lesson-row" href={`/courses/${id}/project/${project.id}`} key={project.id}>
                  {row}
                </a>
              ) : (
                <div className="lesson-row muted-row" key={project.id} aria-disabled="true">
                  {row}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
