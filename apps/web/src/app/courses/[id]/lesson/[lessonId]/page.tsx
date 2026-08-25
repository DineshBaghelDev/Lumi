import { apiFetch } from "../../../../../lib/api";
import { AppShell } from "../../../../ui";
import { MermaidBlock } from "./mermaid-block";

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
            {content.blocks.map((block) => renderBlock(block, assetMap))}
            <div className="topline section-gap">
              <a className="button ghost-button" href={`/courses/${id}/lessons`}>Roadmap</a>
              {lesson.assessment_id ? <a className="button" href={`/courses/${id}/assessment/${lesson.assessment_id}`}>Assessment</a> : null}
            </div>
          </article>
          <aside className="lesson-tools">
            <details className="side-card lesson-tool" open>
              <summary>Notes</summary>
              <p>Notes will unlock in the learning tools milestone.</p>
            </details>
            <details className="side-card lesson-tool section-gap" open>
              <summary>Sources</summary>
              <p>{sourceCount(content)} cited source references in this lesson.</p>
            </details>
          </aside>
        </section>
      )}
    </AppShell>
  );
}

function renderBlock(block: LessonBlock, assets: ReadonlyMap<string, Asset>) {
  if (block.type === "heading") {
    const Tag = `h${block.level}` as "h2" | "h3" | "h4";
    return <Tag className="lesson-block" id={block.id} key={block.id}>{block.text}</Tag>;
  }
  if (block.type === "paragraph") return <p className="lesson-block" key={block.id}>{block.text}</p>;
  if (block.type === "list") {
    const Tag = block.style === "ordered" ? "ol" : "ul";
    return <Tag className="lesson-list-block lesson-block" key={block.id}>{block.items.map((item) => <li key={item}>{item}</li>)}</Tag>;
  }
  if (block.type === "code") {
    return (
      <figure className="lesson-block" key={block.id}>
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
        <pre className="lesson-code"><code>{block.code}</code></pre>
      </figure>
    );
  }
  if (block.type === "callout") {
    return (
      <aside className={`lesson-callout ${block.tone}`} key={block.id}>
        {block.title ? <h3>{block.title}</h3> : null}
        <p>{block.text}</p>
      </aside>
    );
  }
  if (block.type === "mermaid") {
    return (
      <figure className="lesson-diagram lesson-block" key={block.id}>
        <MermaidBlock diagram={block.diagram} />
        {block.caption ? <figcaption>{block.caption}</figcaption> : null}
      </figure>
    );
  }
  const asset = assets.get(block.assetId);
  return (
    <figure className="lesson-image lesson-block" key={block.id}>
      {asset ? <img src={asset.storage_path} alt={asset.alt_text ?? asset.title} /> : <div className="diagram-placeholder">Image unavailable</div>}
      <figcaption>{block.caption ?? asset?.title ?? "Lesson image"}</figcaption>
    </figure>
  );
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
