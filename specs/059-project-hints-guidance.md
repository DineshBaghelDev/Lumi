# 059 — Progressive project hints and help content

## Goal

Implement one bounded V1 slice: **progressive project hints and help content**.

## Depends on

- `057-project-generation.md`
- `058-project-milestones.md`

## Requirements

- Generate/store escalating hints for each milestone: conceptual → structural → implementation-level.
- Hints must not immediately reveal the whole implementation.
- Provide concise relevant lesson/resource links.
- Define response behavior for learner asking a project question through chat using milestone context.

## Acceptance criteria

- [ ] Each milestone has bounded ordered hints.
- [ ] First hint preserves meaningful learner work.
- [ ] Final hint may be more concrete but still avoids generating an entire project solution by default.

## Required tests

- Hint ordering/content contract tests with mocked fixture.

## Out of scope

- Automated code review.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
