"use client";

import { useEffect, useState } from "react";

type SourceRef = { sourceId: string; chunkId?: string; label?: string };
type Citation = { chunkId: string; sourceTitle?: string | null; sourceUrl?: string | null; heading?: string | null };

export function SourceLinks({ courseId, refs }: { courseId: string; refs: SourceRef[] }) {
  const chunkIds = refs.flatMap((ref) => ref.chunkId ? [ref.chunkId] : []);
  const [citations, setCitations] = useState<Citation[]>([]);

  useEffect(() => {
    if (chunkIds.length === 0) return;
    void fetch(`/api/proxy/courses/${courseId}/citations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chunkIds }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((body: { citations?: Citation[] } | null) => setCitations(body?.citations ?? []))
      .catch(() => {
        // Citation resolution is best-effort; fallback labels remain visible
        setCitations([]);
      });
  }, [chunkIds.join("|")]);

  if (refs.length === 0) return null;
  const byChunk = new Map(citations.map((citation) => [citation.chunkId, citation]));

  return (
    <span className="source-links">
      {refs.map((ref, index) => {
        const citation = ref.chunkId ? byChunk.get(ref.chunkId) : undefined;
        const label = citation?.sourceTitle ?? ref.label ?? `Source ${index + 1}`;
        return citation?.sourceUrl ? (
          <a href={citation.sourceUrl} key={`${ref.sourceId}-${ref.chunkId ?? index}`} rel="noreferrer" target="_blank">{label}</a>
        ) : (
          <span key={`${ref.sourceId}-${ref.chunkId ?? index}`}>{label}</span>
        );
      })}
    </span>
  );
}
