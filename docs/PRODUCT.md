# Product Specification

## Problem

Current self-learning choices usually trade off structure, depth, adaptability, and reliability. Fixed video/tutorial courses cannot react to the learner and often stay shallow. General-purpose LLM chat adapts well but lacks a durable curriculum, reliable source grounding, consistent depth, structured projects, and persistent course state.

## Product goal

Generate a polished technical course from a user-entered topic and goal. The course should cover the subject deeply enough that a motivated learner can reason from first principles, understand implementation details, make engineering tradeoffs, debug failures, and explain the topic to others.

## Product principles

### Full depth
Every important concept should answer, where relevant:
- what it is;
- why it exists;
- what preceded it;
- where/when it is useful;
- how it works internally;
- how to implement/use it;
- tradeoffs and alternatives;
- failure modes;
- engineering decisions.

### Causal learning
Prefer a storyline such as:
`existing approach → problem → proposed solution → implementation → new limitation → next improvement`.

### Fixed curriculum
Once generated, the curriculum does not dynamically mutate based on test results. Known topics remain available for skim/skip. Assessment results flag exact weak areas and recommend guidance/review.

### Source grounding
Research is a first-class generation stage. Lessons use concept-specific source packs rather than relying solely on model memory. Arbitrary internet content is treated as untrusted input and must pass outbound security, sanitization, and prompt-injection boundaries.

### Bounded generation
Course generation has hard configurable limits for research/crawl volume, concepts/lessons, LLM calls/cost, and concurrent course creation. Users can cancel generation; completed content remains usable.

### Projects teach
Guided mini-projects reveal requirements progressively. The learner decides, implements locally, asks for hints, marks milestones done, and sees the next constraint. Projects are teaching scaffolds rather than competence tests.

## V1 user journey

1. Sign in with Google.
2. Create a course by entering topic + learning goal/depth preferences.
3. See research/generation progress while background jobs run.
4. Once curriculum exists, see full roadmap immediately.
5. Open lessons as each becomes ready while remaining lessons continue generating.
6. Read structured lessons with code, diagrams, images, source references, and implementation guidance.
7. Take a post-lesson assessment as soon as that lesson's independent question job finishes; later lessons may still be generating.
8. See weak concepts/review guidance based on exact answers.
9. Work through optional guided projects in a local development environment.
10. Ask course/lesson questions through source-grounded chat.
11. Resume via persistent lesson/project/progress state, notes, and bookmarks.

## V1 scope

Included:
- Google OAuth
- course creation
- background research
- fixed curriculum generation
- upfront/background lesson generation
- structured lesson renderer
- assets/images/Mermaid/code
- post-lesson assessments
- guided projects
- progress/skip/resume
- notes/bookmarks
- RAG chat
- job retries, explicit generation cancellation, and partial-course usability
- research security boundaries and course-generation budgets

Excluded:
- pre-course diagnostic
- email/password auth
- in-app coding environment
- automatic repository/code review
- shared source/course caching across users
- LLM reranking
- advanced mastery/adaptive-curriculum engine
- mobile app
- formal Promptfoo/Ragas evaluation stack
- production deployment optimization

## Success criteria for V1

- A user can create a Redis course and begin the first ready lesson before all remaining lessons finish.
- Course research identifies prerequisites and important concepts beyond what initial docs happen to contain.
- Every generated lesson passes schema validation and source-grounding checks.
- Each ready lesson can receive its assessment without waiting for the rest of the course; assessments cover only taught material.
- Guided projects teach through progressive constraints without requiring an in-app IDE.
- RAG chat cites stored course sources.
- Failed individual lessons/projects can be retried without destroying the course.
