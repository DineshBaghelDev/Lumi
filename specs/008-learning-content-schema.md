# 008 — Curriculum, lesson, assessment, project schema

## Goal

Implement one bounded V1 slice: **curriculum, lesson, assessment, project schema**.

## Depends on

- `006-drizzle-foundation.md`
- `007-core-course-schema.md`

## Requirements

- Add `curricula`, `modules`, `lessons`, `assessments`, `questions`, `question_concepts`, `assessment_questions`, `assessment_attempts`, `projects`, `project_milestones`.
- Include `modules.order_index`, `lessons.order_index`, `lessons.is_required`, `lessons.schema_version`, status/content fields.
- Questions use `primary_concept_id`; additional concepts use junction table.
- `assessment_attempts` stores answers/results JSONB, score, status, and grading timestamps; no separate attempt-item table in V1.
- Project milestones have fields for scenario, prompt, implementation goal, constraints, hints, expected outcome, and ordering.

## Acceptance criteria

- [ ] Migration applies cleanly.
- [ ] Module/lesson ordering is deterministic.
- [ ] Assessment-question and question-concept relations support multi-concept questions without arrays.
- [ ] Project milestone rows can store full generated guidance content.

## Required tests

- Insertion/query tests for lesson ordering, assessment mapping, question concept mapping, milestone content.

## Out of scope

- Zod content contract implementation is separate.
- Generation logic.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
