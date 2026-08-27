"use client";

import { useCallback, useEffect, useState } from "react";

type ProgressStatus = "not_started" | "in_progress" | "completed" | "skipped";

export function LessonProgressPanel({
  courseId,
  lessonId,
  contentBlockCount,
}: {
  courseId: string;
  lessonId: string;
  contentBlockCount: number;
}) {
  const [status, setStatus] = useState<ProgressStatus>("not_started");
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load current progress on mount
  useEffect(() => {
    void fetch(`/api/proxy/courses/${courseId}/progress/resume`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.type === "lesson" && data.lessonId === lessonId) {
          setStatus("in_progress");
          setCurrentBlockIndex(data.blockIndex ?? 0);
        }
      })
      .catch(() => {});
  }, [courseId, lessonId]);

  const markInProgress = useCallback(async (blockIndex: number) => {
    setSaving(true);
    try {
      await fetch(`/api/proxy/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress", currentBlockIndex: blockIndex }),
      });
      setStatus("in_progress");
      setCurrentBlockIndex(blockIndex);
    } finally {
      setSaving(false);
    }
  }, [lessonId]);

  const markComplete = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/proxy/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", currentBlockIndex: contentBlockCount }),
      });
      setStatus("completed");
    } finally {
      setSaving(false);
    }
  }, [lessonId, contentBlockCount]);

  const skip = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/proxy/lessons/${lessonId}/skip`, { method: "POST" });
      setStatus("skipped");
    } finally {
      setSaving(false);
    }
  }, [lessonId]);

  const statusLabel =
    status === "completed" ? "Completed" :
    status === "skipped" ? "Skipped" :
    status === "in_progress" ? "In Progress" :
    "Not Started";

  const statusClass =
    status === "completed" ? "good" :
    status === "skipped" ? "gray" :
    status === "in_progress" ? "purple" :
    "";

  return (
    <div className="lesson-progress-panel">
      <span className={`status ${statusClass}`}>{statusLabel}</span>

      {status === "not_started" ? (
        <button
          className="button wide-button"
          disabled={saving}
          onClick={() => void markInProgress(0)}
          type="button"
        >
          Start lesson
        </button>
      ) : status === "in_progress" ? (
        <div className="progress-actions">
          <button
            className="button"
            disabled={saving}
            onClick={() => void markComplete()}
            type="button"
          >
            Mark complete
          </button>
          <button
            className="button ghost"
            disabled={saving}
            onClick={() => void skip()}
            type="button"
          >
            Skip
          </button>
        </div>
      ) : (
        <p className="helper-text">
          {status === "completed"
            ? "You have completed this lesson."
            : "This lesson was skipped."}
        </p>
      )}

      {status === "in_progress" && contentBlockCount > 0 ? (
        <div className="progress-tracker">
          <div className="progressbar">
            <span style={{ width: `${Math.round((currentBlockIndex / contentBlockCount) * 100)}%` }} />
          </div>
          <p className="helper-text">
            Block {currentBlockIndex} of {contentBlockCount}
          </p>
        </div>
      ) : null}
    </div>
  );
}
