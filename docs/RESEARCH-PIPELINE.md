# Research Pipeline

## Goal

Create a trustworthy, concept-complete source base before curriculum/lesson generation while controlling crawl volume, LLM cost, and hostile internet input.

## Pipeline

```text
topic + goal
→ expected concept map
→ prerequisite expansion
→ search query generation
→ SearXNG
→ deterministic filtering + official-source protection
→ URL/security/budget gate
→ cheap relevance ranking
→ Crawl4AI selected URLs
→ sanitize + clean/chunk/tag
→ TEI embeddings
→ source-derived concept map
→ compare expected vs observed coverage
→ targeted gap searches within budget
→ edge-case review
→ concept-specific source packs
```

## Expected concept map first

The source corpus alone cannot define completeness because docs may omit prerequisites, trivial foundational concepts, or implementation context. The LLM first proposes the expected knowledge structure and required prerequisites for the user's topic/goal.

Prerequisite expansion stops at the minimum depth needed to reason about the target topic.

## Source discovery

SearXNG receives query families covering official docs, internals, implementation, failure modes, architecture, and production engineering.

Official/primary sources are protected from early ranking cutoffs after deterministic verification through project/company domains, official repository links, package registries, and reciprocal linking.

## Security boundary before crawling

Every discovered URL/resource is hostile until validated.

- only configured HTTP(S) schemes/ports
- resolve hostname and reject private, loopback, link-local, metadata, multicast/reserved/other forbidden IPv4/IPv6 destinations
- revalidate redirect destinations; cap redirects
- reject URL credentials and unsafe resource types
- enforce per-resource/course byte limits and bounded page/resource counts
- validate discovered images through the same outbound guard

Crawled content is never allowed to instruct the agent. LLM prompts treat source text as quoted/untrusted data and explicitly ignore source-provided instructions/tool requests/role changes/secret requests.

Retained content is sanitized; raw active HTML/scripts/forms/event handlers are not rendered. Approved images are downloaded through the guard, stored in InsForge Storage, and referenced as assets. V1 may reject SVG research assets rather than attempt active-content sanitization.

## Ranking funnel

1. Search metadata/title/snippet rules and dedupe.
2. Authority/source-type scoring.
3. BM25/embedding relevance over metadata.
4. Security/budget check.
5. Crawl only the selected set.
6. Re-evaluate relevance/depth from extracted content.
7. Build 2–5 best sources per concept.

Avoid expensive full-page LLM reads unless required by an edge case.

## Crawling/storage

Crawl4AI produces Markdown, metadata, links, and discovered images. Sanitized retained Markdown and approved images go to InsForge Storage. Postgres stores source/asset records and storage paths.

Before retrying/re-crawling, check normalized `sources.url` to preserve idempotency.

## Chunking/indexing

Chunks preserve heading/section context and are tagged by concept and content role such as explanation, internals, implementation, tradeoff, failure mode, example, API, or prerequisite.

Embeddings use BAAI/bge-small-en-v1.5 through TEI, stored as `vector(384)` with HNSW cosine index.

## Coverage loop

Compare expected concepts against source-derived coverage. Every required concept ends as:
- `covered`
- `weakly_covered`
- `explicitly_unresolved`

Weak/missing concepts trigger targeted search. Stop on sufficient coverage, no meaningful new coverage, explicit cancellation, or configured research/course budget.

## Edge cases

The research LLM detects:
- incomplete official docs
- hidden prerequisites
- conflicting sources
- major version differences
- very broad/narrow topics
- shallow repeated sources
- undocumented but important concepts
- ambiguous terminology
- unrealistic requested time constraints
- suspicious source/prompt-injection patterns

If strong sources remain insufficient, model knowledge may supplement content with internal metadata marking it model-supplemented/inferred. Source-backed claims remain preferred.

## Generation budget interaction

Research must not expand indefinitely. Configurable per-course limits include research iterations, search queries, source count, downloaded bytes, concepts, LLM calls/cost, and eventual lessons. Usage is atomically tracked so concurrent downstream jobs share one course budget.

Budget exhaustion records the violated invariant, stops scheduling new research/generation work, and preserves already-completed content.

## Research outputs

- `sources`
- `source_chunks`
- `concepts`
- `concept_dependencies`
- `concept_sources`
- research `assets`
- per-source `research_metadata` including coverage/security metadata
- concept coverage status/source packs
