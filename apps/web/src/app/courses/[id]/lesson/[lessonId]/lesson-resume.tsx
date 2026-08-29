"use client";

import { useEffect } from "react";
import { resolveResumeBlockId } from "../../../../../lib/lesson-resume";

type ResumePoint = { type: string; lessonId?: string; blockIndex?: number };

export function LessonResume({
  blockIds,
  courseId,
  lessonId,
}: {
  blockIds: string[];
  courseId: string;
  lessonId: string;
}) {
  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/proxy/courses/${courseId}/progress/resume`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ResumePoint | null) => {
        if (cancelled || !data || data.type !== "lesson" || data.lessonId !== lessonId) {
          return;
        }

        const targetId = resolveResumeBlockId(blockIds, data.blockIndex);
        if (!targetId) {
          return;
        }

        document.getElementById(targetId)?.scrollIntoView({ behavior: "auto", block: "start" });
      })
      .catch(() => {
        // Resume scroll is best-effort; failure is non-critical
      });

    return () => {
      cancelled = true;
    };
  }, [blockIds, courseId, lessonId]);

  return null;
}
