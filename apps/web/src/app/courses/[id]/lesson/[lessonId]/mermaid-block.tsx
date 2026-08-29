"use client";

import { useCallback, useEffect, useRef, useState } from "react";

let mermaidInitialized = false;

export function MermaidBlock({ diagram }: { diagram: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [rendering, setRendering] = useState(true);
  const renderId = useRef(0);

  const renderDiagram = useCallback(async () => {
    const container = containerRef.current;
    if (!container || !diagram) return;

    const thisRender = ++renderId.current;
    setRendering(true);
    setError(false);
    container.innerHTML = "";

    try {
      const { default: mermaid } = await import("mermaid");

      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "var(--font-inter), Inter, sans-serif",
        });
        mermaidInitialized = true;
      }

      const graphId = `mermaid-graph-${thisRender}`;

      // Create a hidden container for mermaid's render target
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "absolute";
      tempDiv.style.visibility = "hidden";
      tempDiv.style.height = "0";
      tempDiv.style.overflow = "hidden";
      document.body.appendChild(tempDiv);

      try {
        const { svg } = await mermaid.render(graphId, diagram);

        if (thisRender !== renderId.current) return;

        container.innerHTML = svg;

        const svgEl = container.querySelector("svg");
        if (svgEl) {
          svgEl.removeAttribute("height");
          svgEl.style.maxWidth = "100%";
          svgEl.style.height = "auto";
        }
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (err) {
      if (thisRender !== renderId.current) return;
      console.warn("Mermaid render failed:", err);
      setError(true);
    } finally {
      if (thisRender === renderId.current) {
        setRendering(false);
      }
    }
  }, [diagram]);

  useEffect(() => {
    void renderDiagram();
  }, [renderDiagram]);

  useEffect(() => {
    return () => {
      renderId.current++;
    };
  }, []);

  if (error) {
    return (
      <pre className="lesson-code">
        <code>{diagram}</code>
      </pre>
    );
  }

  return (
    <>
      {rendering && (
        <div className="diagram-placeholder">Rendering diagram…</div>
      )}
      <div
        ref={containerRef}
        className="mermaid-output"
        style={rendering ? { display: "none" } : undefined}
      />
    </>
  );
}
