# Content Contracts

All AI-generated application content must be structured, versioned, and validated server-side before persistence.

## Lesson contract

Lesson row stores `schema_version`. V1 content is an ordered block list.

Illustrative TypeScript shape:

```ts
type LessonContent = {
  schemaVersion: 1;
  title: string;
  blocks: ContentBlock[];
};

type ContentBlock =
  | { id: string; type: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; type: "paragraph"; markdown: string; sourceRefs?: SourceRef[] }
  | { id: string; type: "list"; style: "bullet" | "ordered"; items: string[]; sourceRefs?: SourceRef[] }
  | { id: string; type: "code"; language: string; code: string; caption?: string; sourceRefs?: SourceRef[] }
  | { id: string; type: "callout"; style: "info" | "warning" | "decision" | "tip"; title?: string; markdown: string; sourceRefs?: SourceRef[] }
  | { id: string; type: "mermaid"; code: string; caption?: string; sourceRefs?: SourceRef[] }
  | { id: string; type: "image"; assetId: string; caption?: string };

type SourceRef = {
  sourceId: string;
  chunkIds?: string[];
};
```

Do not store permanent asset URLs inside lesson JSON.

## Lesson skeleton contract

Before generation, each lesson must provide:
- title
- module/order
- explicit objectives
- concept/source-pack references
- `required_prerequisites: concept_id[]`
- required/optional flag

Lesson QC verifies every required prerequisite is taught, referenced as previously covered, or explicitly stated as an assumption.

## Curriculum contract

Curriculum structured output contains:
- ordered modules
- ordered lesson skeletons
- concept/objective mappings
- required prerequisite references
- assessment skeleton metadata
- project skeleton/milestone outline metadata
- generation/coverage summary

Curriculum content is fixed after successful creation.

## Question contract

Every question includes:
- primary concept
- additional concept IDs via relational mapping
- assessment/lesson relation
- question type
- difficulty
- prompt/content payload
- expected answer or answer key
- rubric where required
- source references
- generation metadata

Supported V1 types:
`mcq | fill_blank | matching | short_answer | scenario | identify_issue | predict_behavior | pseudocode`.

## Scoring contracts

Deterministic types define canonical/normalized answer rules.

Free-response types define rubric criteria with explicit points/weights and expected reasoning elements. The grading LLM receives the rubric, learner answer, and only necessary lesson/source context.

## Project contract

Project generation produces:
- title
- concise goal
- storyline premise
- concepts/lessons reinforced
- ordered milestones

Each milestone supports:
- scenario/context
- learner decision/prompt where useful
- local implementation goal
- constraints
- relevant lesson links
- progressive hints
- expected outcome

Projects contain no in-app code-editor state.

## Validation policy

- Zod is authoritative at runtime.
- JSON Schema may be generated from the Zod contract for model structured-output integration/documentation.
- Invalid generated output is never persisted as ready content.
- Contract changes require `schema_version` change and migration/rendering compatibility plan.
