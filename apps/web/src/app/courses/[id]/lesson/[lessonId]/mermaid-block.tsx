"use client";

import { useEffect, useId, useState } from "react";

export function MermaidBlock({ diagram }: { diagram: string }) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base" });
        const rendered = await mermaid.render(id, diagram);
        if (alive) setSvg(rendered.svg);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [diagram, id]);

  if (error) return <pre className="lesson-code">{diagram}</pre>;
  if (!svg) return <div className="diagram-placeholder">Rendering diagram...</div>;
  return <div className="mermaid-output" dangerouslySetInnerHTML={{ __html: svg }} />;
}
