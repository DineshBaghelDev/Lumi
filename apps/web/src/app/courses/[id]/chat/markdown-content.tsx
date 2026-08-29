"use client";

import Markdown from "react-markdown";

export function MarkdownContent({ content }: { content: string }) {
  return (
    <Markdown
      components={{
        a: ({ href, children }) => <a href={href} rel="noopener noreferrer" target="_blank">{children}</a>,
        strong: ({ children }) => <strong>{children}</strong>,
        em: ({ children }) => <em>{children}</em>,
        h1: ({ children }) => <h3>{children}</h3>,
        h2: ({ children }) => <h3>{children}</h3>,
        h3: ({ children }) => <h4>{children}</h4>,
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return <code>{children}</code>;
          }
          return <pre className="lesson-code"><code>{children}</code></pre>;
        },
      }}
    >
      {content}
    </Markdown>
  );
}
