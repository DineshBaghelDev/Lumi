export type ResumePoint =
  | { type: "lesson"; lessonId: string; blockIndex?: number }
  | { type: "course_complete" }
  | { type: string; lessonId?: string; blockIndex?: number }
  | null;

type LessonLike = {
  id: string;
  status: string;
  is_required?: boolean;
  assessment_id?: string | null;
  assessment_status?: string | null;
};

type ProjectLike = {
  status: string;
};

type CourseProgressOptions = {
  courseStatus: string;
  resumePoint: ResumePoint;
  lessons?: readonly LessonLike[];
  projects?: readonly ProjectLike[];
};

export const resolveResumeHref = (courseId: string, resumePoint: ResumePoint) =>
  resumePoint?.type === "lesson" && resumePoint.lessonId
    ? `/courses/${courseId}/lesson/${resumePoint.lessonId}`
    : `/courses/${courseId}/lessons`;

export const deriveCourseProgress = ({
  courseStatus,
  resumePoint,
  lessons = [],
  projects = [],
}: CourseProgressOptions) => {
  const readyLessons = lessons.filter((lesson) => lesson.status === "ready");
  const requiredLessons = readyLessons.filter((lesson) => lesson.is_required !== false);
  const readyProjects = projects.filter((project) => project.status === "ready").length;
  const readyAssessments = readyLessons.filter((lesson) => lesson.assessment_id && lesson.assessment_status === "ready").length;
  const hasReadyCoursework = readyLessons.length > 0 || readyProjects > 0;
  const hasExtraCoursework = readyProjects > 0 || readyAssessments > 0;

  if (courseStatus === "generating") {
    return {
      progressLabel: "0%",
      stateLabel: "In Progress",
      lessonSummary: "Generating",
      projectSummary: "Projects pending",
      summary: "Lumi is still building your course.",
    };
  }

  if (courseStatus === "failed") {
    return {
      progressLabel: "0%",
      stateLabel: "Failed",
      lessonSummary: readyLessons.length ? `${readyLessons.length} lessons available` : "Lessons unavailable",
      projectSummary: readyProjects ? `${readyProjects} projects available` : "Projects unavailable",
      summary: "Generation needs attention before the full course is available.",
    };
  }

  if (courseStatus === "cancelled") {
    return {
      progressLabel: "0%",
      stateLabel: "Cancelled",
      lessonSummary: readyLessons.length ? `${readyLessons.length} lessons available` : "No lessons available",
      projectSummary: readyProjects ? `${readyProjects} projects available` : "No projects available",
      summary: "Generation was cancelled. Any finished content still remains available.",
    };
  }

  if (resumePoint?.type === "course_complete" && !hasExtraCoursework) {
    return {
      progressLabel: "100%",
      stateLabel: "Complete",
      lessonSummary: `${requiredLessons.length} required lessons complete`,
      projectSummary: readyProjects ? `${readyProjects} projects available` : "No projects",
      summary: "All required lessons are complete.",
    };
  }

  const resumeLessonId = resumePoint?.type === "lesson" ? resumePoint.lessonId : null;
  const resumeLessonIndex = requiredLessons.findIndex((lesson) => lesson.id === resumeLessonId);
  // Count skipped lessons as completed for progress calculation
  const skippedLessons = lessons.filter((lesson) => lesson.status === "skipped" && lesson.is_required !== false);
  const completedRequiredLessons = (resumeLessonIndex > 0 ? resumeLessonIndex : 0) + skippedLessons.length;
  const progressPercent = requiredLessons.length
    ? Math.round((completedRequiredLessons / requiredLessons.length) * 100)
    : 0;

  return {
    progressLabel: `${progressPercent}%`,
    stateLabel: hasReadyCoursework ? "Continue" : "Ready",
    lessonSummary: readyLessons.length ? `${readyLessons.length} lessons available` : "Lessons preparing",
    projectSummary: readyProjects ? `${readyProjects} projects available` : "Projects preparing",
    summary: resumePoint?.type === "course_complete" && hasExtraCoursework
      ? "Required lessons are done. Use the roadmap to finish assessments and projects."
      : hasReadyCoursework
        ? "Resume from your roadmap and continue where you left off."
        : "This course is generated, but lesson content is still unlocking.",
  };
};
