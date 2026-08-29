"use client";

import { useEffect, useMemo, useState } from "react";
import { detectLanguage } from "./detect-language";

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [html, setHtml] = useState<string | null>(null);

  const resolvedLang = useMemo(() => {
    if (language && language !== "text" && language !== "plain") return language;
    return detectLanguage(code);
  }, [code, language]);

  useEffect(() => {
    let alive = true;
    void import("shiki")
      .then(async (shiki) => {
        const highlighter = await shiki.createHighlighter({
          themes: ["github-light"],
          langs: [resolvedLang],
        });
        const result = highlighter.codeToHtml(code, {
          lang: resolvedLang,
          theme: "github-light",
        });
        if (alive) setHtml(result);
        void highlighter.dispose();
      })
      .catch(() => {
        if (alive) setHtml(null);
      });
    return () => {
      alive = false;
    };
  }, [code, resolvedLang]);

  if (html) {
    return (
      <div
        className="shiki-output"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <pre className="lesson-code">
      <code>{code}</code>
    </pre>
  );
}
