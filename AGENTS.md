# Agent Execution Contract

## Purpose

This repository uses spec-driven autonomous development.

Agents execute approved specs. They do not redesign the product, architecture, UX, or infrastructure.

If something cannot be completed correctly under the existing rules, stop and report the blocker. Do not invent workarounds.

---

## Source of truth

Priority:

1. active spec in `specs/`
2. `docs/`
3. `context/`
4. existing implementation

If approved sources materially conflict, stop.

Generated mockups are visual references only and never define product scope.

---

## Orchestrator

The orchestrator:

* reads `AGENTS.md`, `context/`, relevant `docs/`, build plan, and progress tracker;
* knows spec names and dependencies, but does **not** load all specs at once;
* selects the next eligible spec;
* loads only that spec and relevant dependencies/context;
* prepares a precise task packet;
* chooses an appropriate model based on difficulty and cost;
* dispatches the implementation agent;
* verifies, reviews, commits, and updates progress;
* continues until completion or a stop condition.

The orchestrator should coordinate rather than write substantial product code itself.

---

## Concurrency

Do not use worktrees.

Only **one implementation agent may write to the repository at a time**.

A second agent may be used for read-only work such as:

* review;
* test analysis;
* repository inspection;
* automated-review findings when available;
* documentation lookup.

No concurrent writers.

---

## Subagent context

Do not rely on agent memory.

Each implementation agent receives only what it needs:

* active spec;
* acceptance criteria;
* relevant `context/` files;
* referenced `docs/`;
* relevant design guidance/assets;
* dependency handoffs;
* current progress state;
* relevant implementation files;
* explicit out-of-scope boundaries.

Do not dump unrelated specs into its context.

---

## Implementation rules

Before coding:

* confirm dependencies are complete;
* read the active spec and relevant handoffs;
* identify the smallest coherent change;
* check architecture, schema, API, security, and shared-contract implications.

While coding:

* implement only the active spec;
* follow existing architecture and patterns;
* make the smallest coherent change;
* avoid speculative abstractions;
* reuse existing components/services;
* do not silently change approved behavior;
* do not build future-spec functionality.

Project-specific architecture, security, budgets, job contracts, design, and testing rules remain authoritative in their existing `context/`, `docs/`, and spec files.

---

## Model routing

Use cheaper models for low-risk mechanical work such as:

* repository search;
* summaries;
* acceptance-criteria extraction;
* simple edits;
* test-output analysis;
* progress updates.

Use stronger models for:

* architecture-sensitive code;
* database/migrations;
* concurrency;
* security;
* worker/job behavior;
* difficult debugging;
* complex integrations;
* substantial UI state.

Cost optimization must never override correctness.

---

## No fake completion

Never claim:

* a test passed if it was not run;
* a feature works if it was not verified;
* scaffolding is a finished integration;
* a UI matches the design if it was not inspected;
* a bug is fixed without verifying the failing path;
* a spec is complete with unresolved acceptance criteria.

Report actual state only.

Failure is an acceptable result. Fake success is not.

---

## Failure policy

Do not loop indefinitely.

For the same unresolved issue:

1. diagnose once;
2. attempt one focused repair;
3. if still unresolved, stop and report the blocker.

Do not repeatedly try speculative alternatives.

---

## Stop and ask for human help

Stop if:

* approved specs materially conflict;
* architecture or product behavior must change;
* required behavior is materially ambiguous;
* credentials, permissions, or external actions are unavailable;
* destructive data changes require approval;
* security or budget invariants cannot be satisfied;
* an approved dependency is unavailable with no documented alternative;
* correctness cannot be established;
* a milestone gate still fails after the allowed repair attempt.

Do not bypass the problem with an undocumented workaround.

When stopping, report:

* active spec;
* exact blocker;
* evidence;
* what was attempted;
* last successful commit;
* what remains incomplete;
* exact human action/decision required.

---

## Commits

Commit coherent implementation units frequently.

Prefer:

```text
feat(worker): add atomic job claim
test(worker): cover stale lease recovery
fix(worker): handle retry race
```

Avoid meaningless checkpoint commits.

Record the final relevant commit in the progress tracker/handoff.

---

## Review and verification

Meaningful changes require independent review.

CodeRabbit is intentionally skipped for this MVP environment. Do not block work because CodeRabbit is unavailable. Use independent reviewer subagents for meaningful changes.

A reviewer checks:

* acceptance criteria;
* architecture compliance;
* scope;
* tests;
* security;
* regression risk;
* data contracts;
* design-system compliance where relevant.

Valid findings must be fixed before completion.

Verification should use the narrowest useful checks:

1. targeted tests;
2. integration tests;
3. typecheck/lint;
4. runtime verification;
5. browser/visual verification where relevant;
6. milestone integration gate.

---

## Definition of done

A spec is complete only when:

* acceptance criteria pass;
* required tests pass;
* relevant typecheck/lint passes;
* runtime behavior is verified where practical;
* independent review is complete;
* valid findings are resolved;
* progress tracker is updated;
* commit hash is recorded;
* required handoff information is recorded;
* no known blocker is hidden.

---

## Progress and handoffs

`context/progress-tracker.md` is canonical.

Use states such as:

* `pending`
* `blocked_dependency`
* `in_progress`
* `complete`
* `failed`
* `blocked_human`

After a spec, record:

* status;
* commit;
* verification;
* review result;
* material implementation decisions;
* anything dependent specs need to know.

Later agents should use these handoffs rather than reconstructing previous work from memory.

---

## Mandatory restrictions

Never:

* weaken acceptance criteria;
* remove failing tests to get green;
* hide failures;
* mock missing behavior and call it complete;
* silently replace approved technology;
* change specs to match broken implementation;
* bypass security or generation limits;
* introduce unsupported product features;
* merge known-broken code;
* continue after a failed mandatory integration gate;
* let an implementation agent approve its own work.

<!-- INSFORGE:START -->
## InsForge backend

This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **Lumi** (API base `https://44defjje.ap-southeast.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from local env files; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->
