# Learning System

## Curriculum philosophy

The curriculum is comprehensive and fixed after generation. Learner familiarity may influence UI emphasis such as skim/review guidance in later versions, but important concepts are not removed from the course.

Concept ordering follows actual prerequisites and a coherent teaching storyline. Preferred teaching order must not be confused with hard conceptual dependency.

## Lesson model

A lesson may vary in size according to the engineering idea it teaches. Do not force arbitrary chapter lengths.

Preferred narrative when natural:

`previous approach → limitation → idea → mechanism → implementation → new limitation → tradeoff/decision`

Each lesson should cover the relevant subset of:
- problem/context
- intuition
- terminology
- mechanism/internals
- implementation/setup
- commands and project structure when first relevant
- examples/code
- architecture/data flow
- tradeoffs/alternatives
- failure modes/debugging
- engineering decisions
- concise recap

## Tooling/setup teaching

Commands, folder structures, important files, and what each file does belong in the lesson implementation section when they first become necessary. Projects then make the learner use those conventions repeatedly.

## Assessments

V1 uses post-lesson tests only. No pre-course diagnostic. Each successful lesson independently triggers generation of its own assessment so a learner does not wait for later lessons.

Supported question types:
- MCQ
- fill in the blank
- match-up
- short answer
- scenario/decision
- identify the issue
- predict behavior/output
- pseudocode

Implementation tasks and mini-projects are learning exercises, not scored assessment items.

### Scoring

MCQ: immediate feedback.  
All other question types: graded after test submission.

Objective questions use deterministic scoring when possible. Free responses use an LLM against a predefined rubric. Results update concept guidance flags such as `strong`, `review`, and `needs_guidance` and record exact weak points.

## Guided projects

Projects are progressive teaching stories. Example pattern:

1. Present a concrete system problem.
2. Ask what the learner would do.
3. Let the learner choose an approach.
4. Ask them to implement it locally.
5. Offer escalating hints only when requested.
6. Learner marks the milestone done.
7. Reveal the next limitation/constraint.
8. Repeat until the system has evolved into the target architecture.

Use realistic mission/story framing rather than heavy fantasy by default. The storyline can be playful without distracting from engineering.

## Project guidance

The product does not host or review the user's repository in V1. It provides:
- milestone goals;
- constraints;
- relevant lesson links;
- conceptual/structural hints;
- expected outcomes;
- optional questions/answers through course chat.

## Progress

Lesson status:
`not_started | in_progress | completed | skipped`.

Projects:
`not_started | in_progress | completed`.

Concept guidance:
`unknown | strong | review | needs_guidance`.

Curriculum never changes based on these states.

## Chat

Course chat is a support layer for explanations, prerequisite clarification, and project hints. It retrieves from stored course sources/lessons and should clearly disclose insufficient evidence rather than fabricate certainty. Retrieved web/source text remains untrusted data inside the prompt and cannot alter tutor/system instructions.
