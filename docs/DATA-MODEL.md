# Data Model

This is the logical V1 model. Exact SQL/types belong in Drizzle migrations.

## Identity / ownership

### `users`
Application profile linked to InsForge auth identity.

### `courses`
- `id`
- `title`
- `description`
- `topic`
- `target_audience`
- `difficulty_level`
- `estimated_duration_minutes`
- `status`: `generating | ready | ready_with_gaps | failed | cancelled | archived`
- `generation_metadata jsonb`
- timestamps

### `enrollments`
- `user_id`
- `course_id`
- `role`
- `status`
- `started_at`
- `completed_at`

`POST /courses` creates the owner's enrollment in the same transaction.

## Generation budgets

### `course_generation_usage`
One row per course. Stores the budget snapshot plus atomically updated usage/cancellation state.

- `course_id` unique
- `limits jsonb` — snapshotted configurable limits
- `llm_calls_count`
- `llm_cost_usd`
- `research_iterations_count`
- `search_queries_count`
- `sources_crawled_count`
- `crawl_bytes`
- `concepts_count`
- `lessons_count`
- `cancel_requested_at nullable`
- `budget_exhausted_at nullable`
- `budget_exhausted_reason nullable`
- `updated_at`

Counters are updated atomically. Detailed call history still lives in `llm_calls`.

## Concepts / dependencies

### `concepts`
Canonical concept records used by generated courses. V1 may create duplicate semantic concepts across independent courses; no cross-course reuse/cache is required.

- `id`
- `name`
- `description`
- `created_at`

### `concept_dependencies`
- `concept_id`
- `dependency_id`
- `relationship_type`: `hard_prerequisite | recommended_before | related`
- `created_at`

Composite uniqueness prevents duplicate typed edges.

### `course_concepts`
- `course_id`
- `concept_id`
- `importance`
- `depth_required`
- `coverage_status`: `covered | weakly_covered | explicitly_unresolved`
- `coverage_confidence`
- `source_pack_metadata jsonb`
- timestamps

Unique `(course_id, concept_id)`.

## Research

### `sources`
- `id`
- `course_id`
- normalized `url`
- `title`
- `type`
- `authority_score`
- `version`
- `storage_path`
- `research_metadata jsonb` — coverage/depth/authority/gap/security flags
- `retrieved_at`

Unique `(course_id, normalized_url)` for retry idempotency.

### `source_chunks`
- `id`
- `source_id`
- `course_id`
- `heading`
- `content`
- `metadata jsonb`
- `embedding vector(384)`
- `embedding_model`
- `embedding_version`

HNSW cosine index on embedding; indexes on course/source filters.

### `concept_sources`
- `course_id`
- `concept_id`
- `source_id`
- `relevance_score`
- `role`
- `metadata jsonb`

### `assets`
- `id`
- `course_id`
- `lesson_id nullable`
- `type`: `image | diagram | generated_image | source_image`
- `title`
- `description`
- `alt_text`
- `storage_path`
- `source_url nullable`
- `source_id nullable`
- `mime_type`
- `file_size`
- `metadata jsonb`
- `created_at`

Research/source assets must pass security validation before Storage. Lesson JSON references `asset_id`, never fixed arbitrary remote URLs.

## Curriculum/content

### `curricula`
- `id`
- `course_id`
- `generation_metadata jsonb`
- timestamps

### `modules`
- `id`
- `curriculum_id`
- `title`
- `description`
- `order_index`

### `lessons`
- `id`
- `module_id`
- `title`
- `objectives jsonb`
- `required_prerequisites jsonb` containing ordered concept IDs
- `order_index`
- `is_required boolean default true`
- `status`: `pending | generating | ready | failed`
- `content_json jsonb`
- `schema_version`
- source-pack/generation metadata

## Assessments/questions

### `assessments`
Curriculum creates exactly one assessment skeleton per lesson.

Recommended status: `pending | generating | ready | failed`.

A successful lesson enqueues the unique question job for this assessment immediately.

### `questions`
- `id`
- `primary_concept_id`
- `type`
- `difficulty`
- `prompt/content jsonb`
- `answer_key jsonb`
- `rubric jsonb`
- `generation_metadata jsonb`

### `question_concepts`
Junction of all concepts tested by a question.

### `assessment_questions`
Ordered mapping between assessment and question.

### `assessment_attempts`
- `id`
- `assessment_id`
- `user_id`
- `status`: `in_progress | submitted | graded`
- `answers jsonb` keyed by question ID
- `results jsonb` containing per-question correctness/rubric feedback and weak points
- `score`
- `started_at`
- `submitted_at`
- `graded_at`

V1 keeps per-question responses/results inside attempt JSONB rather than another item table.

## Progress

### `lesson_progress`
- `user_id`
- `lesson_id`
- `status`: `not_started | in_progress | completed | skipped`
- `current_block_index`
- timestamps

### `concept_progress`
- `user_id`
- `concept_id`
- `status`: `unknown | strong | review | needs_guidance`
- `last_issue`
- timestamps

### `project_progress`
- `user_id`
- `project_id`
- `current_milestone_id`
- `status`: `not_started | in_progress | completed`
- timestamps

### `user_notes`
- `id`
- `user_id`
- `course_id`
- `lesson_id`
- `block_id nullable`
- `type`: `note | bookmark`
- `content nullable`
- timestamps

## Projects

### `projects`
- `id`
- `course_id`
- `curriculum_id`
- `title`
- `goal`
- `storyline`
- `status`: `pending | generating | ready | failed`
- `generation_metadata jsonb`
- timestamps

### `project_milestones`
- project relation
- order
- title
- scenario/context
- learner prompt/decision prompt
- implementation goal
- constraints
- hints
- expected outcome
- relevant lesson/concept references
- generated content metadata

## Jobs / LLM observability

### `generation_jobs`
- `id`
- `course_id`
- `type`: `research | curriculum | lesson | project | question`
- `lesson_id nullable`
- `project_id nullable`
- `assessment_id nullable`
- `status`: `queued | running | succeeded | failed | cancelled`
- `progress`
- `attempts`
- `available_at`
- `error`
- `locked_at`
- `locked_by`
- timestamps
- `metadata jsonb`

Target/type checks enforce valid logical identity.

DB uniqueness/idempotency invariants:
- unique research job per course
- unique curriculum job per course
- unique lesson job per lesson
- unique project job per project
- unique question job per assessment

### `llm_calls`
- `id`
- `job_id nullable`
- `model`
- `prompt_version`
- `input_tokens`
- `output_tokens`
- `latency_ms`
- `cost_usd`
- `raw_request_id`
- timestamps/metadata

## Chat

### `chat_threads`
- `id`
- `user_id`
- `course_id`
- `lesson_id nullable`
- timestamps

### `chat_messages`
- `id`
- `thread_id`
- `role`
- `content`
- `citations jsonb` containing retrieved chunk IDs/source references
- `model`
- `llm_call_id` → `llm_calls.id`
- `created_at`
