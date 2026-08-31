"use client";

import { useEffect, useState } from "react";

type SourceRef = { sourceId: string; chunkId?: string; label?: string };
type Citation = {
  chunkId: string;
  sourceId: string;
  sourceTitle: string | null;
  sourceUrl: string;
  heading: string | null;
  excerpt: string;
};

export function SourcesPanel({
  courseId,
  sourceRefs,
}: {
  courseId: string;
  sourceRefs: SourceRef[];
}) {
  const [sources, setSources] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(true);

  // Deduplicate by sourceId to get unique sources
  const uniqueSourceIds = [
    ...new Set(sourceRefs.map((ref) => ref.sourceId)),
  ];

  useEffect(() => {
    if (uniqueSourceIds.length === 0) {
      setLoading(false);
      return;
    }

    // Collect all unique chunkIds
    const chunkIds = [
      ...new Set(
        sourceRefs
          .flatMap((ref) => (ref.chunkId ? [ref.chunkId] : []))
          .filter((id): id is string => typeof id === "string"),
      ),
    ];

    if (chunkIds.length === 0) {
      setLoading(false);
      return;
    }

    void fetch(`/api/proxy/courses/${courseId}/citations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chunkIds }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { citations?: Citation[] } | null) => {
        // Deduplicate by sourceId
        const seen = new Set<string>();
        const unique = (body?.citations ?? []).filter((cit) => {
          if (seen.has(cit.sourceId)) return false;
          seen.add(cit.sourceId);
          return true;
        });
        setSources(unique);
      })
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, [courseId, uniqueSourceIds.join(",")]);

  if (loading) {
    return <p className="helper-text">Loading sources…</p>;
  }

  if (sources.length === 0) {
    return (
      <p className="helper-text">
        {sourceRefs.length > 0
          ? `${sourceRefs.length} source references in this lesson.`
          : "No sources cited in this lesson."}
      </p>
    );
  }

  return (
    <ul className="sources-list">
      {sources.map((source) => (
        <li key={source.sourceId} className="source-item">
          <a
            className="source-item-link"
            href={source.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="source-item-title">
              {source.sourceTitle ?? source.heading ?? "Untitled Source"}
            </span>
            {source.heading ? (
              <span className="source-item-heading">{source.heading}</span>
            ) : null}
            {source.excerpt ? (
              <span className="source-item-excerpt">
                {source.excerpt.slice(0, 120)}
                {source.excerpt.length > 120 ? "…" : ""}
              </span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
