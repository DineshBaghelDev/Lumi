import { apiFetch } from "../../../../../lib/api";
import { AppShell } from "../../../../ui";
import { MermaidBlock } from "./mermaid-block";
import { LessonNotesPanel } from "./lesson-notes-panel";
import { LessonChatPanel } from "./lesson-chat-panel";
import { LessonProgressPanel } from "./lesson-progress-panel";
import { LessonResume } from "./lesson-resume";
import { assetImageSrc, inlineMarkdown } from "./lesson-rendering";
import { SourceLinks } from "./source-links";

type SourceRef = { sourceId: string; chunkId?: string; label?: string };
type LessonBlock =
  | { id: string; type: "heading"; level: 2 | 3 | 4; text: string }
  | { id: string; type: "paragraph"; text: string; sourceRefs: SourceRef[] }
  | { id: string; type: "list"; style: "ordered" | "unordered"; items: string[]; sourceRefs: SourceRef[] }
  | { id: string; type: "code"; language: string; code: string; caption?: string; sourceRefs: SourceRef[] }
  | { id: string; type: "callout"; tone: "note" | "warning" | "tip"; title?: string; text: string; sourceRefs: SourceRef[] }
  | { id: string; type: "mermaid"; diagram: string; caption?: string; sourceRefs: SourceRef[] }
  | { id: string; type: "image"; assetId: string; caption?: string };
type LessonContent = { schemaVersion: 1; title: string; summary: string; blocks: LessonBlock[] };
type Lesson = {
  id: string;
  course_id: string;
  title: string;
  status: string;
  content_json: LessonContent | null;
  assessment_id: string | null;
};
type Asset = { id: string; title: string; description: string | null; alt_text: string | null; storage_path: string; mime_type: string };

export default async function LessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const response = await apiFetch(`/lessons/${lessonId}`);
  if (!response.ok) return <LessonMissing courseId={id} />;

  const { lesson, assets } = await response.json() as { lesson: Lesson; assets: Asset[] };
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const content = lesson.content_json;

  return (
    <AppShell active="Courses">
      <div className="topline">
        <a className="back-link" href={`/courses/${id}/lessons`}>Back to lessons</a>
      </div>
      {!content ? (
        <section className="panel module-box">
          <h1>{lesson.title}</h1>
          <p>This lesson is {lesson.status.replaceAll("_", " ")}.</p>
        </section>
      ) : (
        <section className="lesson-page">
          <LessonResume
            blockIds={content.blocks.map((block) => block.id)}
            courseId={id}
            lessonId={lessonId}
          />
          <details className="lesson-nav lesson-outline" open>
            <summary>On this lesson</summary>
            <div className="outline-links">
              {content.blocks.filter((block) => block.type === "heading").map((block) => (
                <a href={`#${block.id}`} key={block.id}>{block.text}</a>
              ))}
            </div>
          </details>
          <article className="lesson-content">
            <h1>{content.title}</h1>
            <p>{content.summary}</p>
            {content.blocks.map((block) => renderBlock(block, assetMap, id))}
            <div className="topline section-gap">
              <a className="button ghost-button" href={`/courses/${id}/lessons`}>Roadmap</a>
              {lesson.assessment_id ? <a className="button" href={`/courses/${id}/assessment/${lesson.assessment_id}`}>Assessment</a> : null}
            </div>
          </article>
          <aside className="lesson-tools">
            <details className="side-card lesson-tool" open>
              <summary>Progress</summary>
              <LessonProgressPanel courseId={id} lessonId={lessonId} contentBlockCount={content.blocks.length} />
            </details>
            <details className="side-card lesson-tool section-gap">
              <summary>Notes & Bookmarks</summary>
              <LessonNotesPanel courseId={id} lessonId={lessonId} blocks={content.blocks} />
            </details>
            <details className="side-card lesson-tool section-gap">
              <summary>Sources</summary>
              <p>{sourceCount(content)} cited source references in this lesson.</p>
            </details>
            <details className="side-card lesson-tool section-gap">
              <summary>Ask Lumi</summary>
              <LessonChatPanel courseId={id} lessonId={lessonId} />
            </details>
          </aside>
        </section>
      )}
    </AppShell>
  );
}

function renderBlock(block: LessonBlock, assets: ReadonlyMap<string, Asset>, courseId: string) {
  if (block.type === "heading") {
    const Tag = `h${block.level}` as "h2" | "h3" | "h4";
    return <Tag className="lesson-block" id={block.id} key={block.id}>{block.text}</Tag>;
  }
  if (block.type === "paragraph") return <p className="lesson-block" key={block.id}>{renderInline(block.text)}<SourceLinks courseId={courseId} refs={block.sourceRefs} /></p>;
  if (block.type === "list") {
    const Tag = block.style === "ordered" ? "ol" : "ul";
    return (
      <div className="lesson-block" key={block.id}>
        <Tag className="lesson-list-block">{block.items.map((item) => <li key={item}>{renderInline(item)}</li>)}</Tag>
        <SourceLinks courseId={courseId} refs={block.sourceRefs} />
      </div>
    );
  }
  if (block.type === "code") {
    return (
      <figure className="lesson-block" key={block.id}>
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        <pre className="lesson-code"><code>{block.code}</code></pre>
        <SourceLinks courseId={courseId} refs={block.sourceRefs} />
      </figure>
    );
  }
  if (block.type === "callout") {
    return (
      <aside className={`lesson-callout ${block.tone}`} key={block.id}>
        {block.title ? <h3>{block.title}</h3> : null}
        <p>{renderInline(block.text)}<SourceLinks courseId={courseId} refs={block.sourceRefs} /></p>
      </aside>
    );
  }
  if (block.type === "mermaid") {
    return (
      <figure className="lesson-diagram lesson-block" key={block.id}>
        <MermaidBlock diagram={block.diagram} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        <SourceLinks courseId={courseId} refs={block.sourceRefs} />
      </figure>
    );
  }
  const asset = assets.get(block.assetId);
  const src = asset ? assetImageSrc(asset.storage_path, block.assetId) : null;
  return (
    <figure className="lesson-image lesson-block" key={block.id}>
      {src ? <img src={src} alt={asset?.alt_text ?? asset?.title ?? "Lesson image"} /> : <div className="diagram-placeholder">Image unavailable until this asset is uploaded.</div>}
      <figcaption>{block.caption ?? asset?.title ?? "Lesson image"}</figcaption>
    </figure>
  );
}

function renderInline(text: string) {
  return inlineMarkdown(text).map((part, index) => {
    if (part.type === "code") return <code key={index}>{part.text}</code>;
    if (part.type === "strong") return <strong key={index}>{part.text}</strong>;
    if (part.type === "link") return <a href={part.href} key={index} rel="noreferrer" target="_blank">{part.text}</a>;
    return part.text;
  });
}

function sourceCount(content: LessonContent) {
  return content.blocks.reduce((count, block) => "sourceRefs" in block ? count + block.sourceRefs.length : count, 0);
}

function LessonMissing({ courseId }: { courseId: string }) {
  return (
    <AppShell active="Courses">
      <a className="back-link" href={`/courses/${courseId}/lessons`}>Back to lessons</a>
      <section className="panel module-box">
        <h1>Lesson not found</h1>
        <p>This lesson is unavailable or you do not have access.</p>
      </section>
    </AppShell>
  );
}
