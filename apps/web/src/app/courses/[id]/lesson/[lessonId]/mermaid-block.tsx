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

      try {
        const { svg } = await mermaid.render(graphId, diagram);

        if (thisRender !== renderId.current) return;

        // Parse the SVG and remove fixed dimensions for responsive scaling
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = svg;
        const svgEl = tempDiv.querySelector("svg");
        if (svgEl) {
          // Remove fixed width/height attributes that prevent responsive scaling
          svgEl.removeAttribute("width");
          svgEl.removeAttribute("height");
          svgEl.removeAttribute("style");
          // Set responsive SVG styles
          svgEl.style.width = "100%";
          svgEl.style.height = "auto";
          svgEl.style.maxWidth = "100%";
          svgEl.style.display = "block";
        }

        container.innerHTML = tempDiv.innerHTML;
      } catch (err) {
        if (thisRender !== renderId.current) return;
        console.warn("Mermaid render failed:", err);
        setError(true);
      }
    } catch (err) {
      if (thisRender !== renderId.current) return;
      console.warn("Mermaid load failed:", err);
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
