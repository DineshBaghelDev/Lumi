# Project Overview

## What we are building

A polished technical learning app that generates full-depth, source-grounded courses from a topic. It should teach enough depth for a learner to reason, implement, debug, make engineering decisions, and teach others.

## Core product flow

`topic + goal → secure bounded research → fixed curriculum → background lessons/projects → each ready lesson gets its assessment → progress + RAG chat`

## Learning principles

- Full depth: what, why, where, when, how, implementation, tradeoffs, failure modes, decisions.
- Minimal redundancy and AI filler.
- Prefer causal storylines: prior approach → problem → solution → new limitation → improvement.
- Theory should lead into implementation.
- Known topics remain in the curriculum; users may skim or skip them.
- Projects are guided learning experiences. Users code locally.
- Assessments test taught material with cleanly gradable question types.

## V1 includes

Source-grounded research with security/budget bounds, fixed curriculum, all lessons generated in background, per-ready-lesson assessments, structured lesson renderer, guided projects, progress, notes/bookmarks, RAG chat, retries, cancellation, partial-course usability, Google OAuth.

## Explicit V1 exclusions

Pre-course diagnostic, email auth, in-app IDE, code/repo review, shared course caching, LLM reranking, advanced mastery models, mobile app, formal eval frameworks, production deployment optimization.

## Current state

Planning complete. Implementation has not started. Begin with `specs/001-monorepo-skeleton.md`.
