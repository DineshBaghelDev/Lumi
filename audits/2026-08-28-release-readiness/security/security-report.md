# Security Review: Lumi

## Scope

The scan reviewed the canonical include paths and exclusions listed below.

- Scan mode: repository
- Target kind: git_worktree
- Target ID: lumi-cc4ba18
- Revision: cc4ba18532bc9653f182d502a0217a260d58c5b0
- Snapshot digest: codex-security-snapshot/v1:sha256:d86928477681a786f7c2751e605ab9aaaa5423b84fc710d25da8386aa9d4a728
- Inventory strategy: repository
- Included paths: .
- Excluded paths: none
- Runtime or test status: not recorded

### Scan Summary

| Field | Value |
| --- | --- |
| Scan outcome | completed |
| Reportable findings | 5 |
| Severity mix | high: 3, medium: 2 |
| Confidence mix | high: 4, medium: 1 |
| Coverage | partial |
| Validation mode | not recorded |

Canonical artifacts: `scan-manifest.json`, `findings.json`, and `coverage.json`. This report is a deterministic projection of those files.

## Threat Model

No explicit canonical threat-model summary was recorded.

## Findings

| Finding | Severity | Confidence | Detailed write-up |
| --- | --- | --- | --- |
| [Catch-all web proxy permits external requests and bearer-token disclosure](#finding-1) | high | high | inline below |
| [Configured cost and user limits are not enforced](#finding-2) | high | high | inline below |
| [Research URL validation is not bound to the crawler request](#finding-3) | high | medium | inline below |
| [Chat endpoint accepts a thread ID without ownership validation](#finding-4) | medium | high | inline below |
| [Detected prompt injection content is still elevated into the system prompt](#finding-5) | medium | high | inline below |

### Confidence Scale

| Label | Meaning |
| --- | --- |
| high | Direct evidence supports the finding with no material unresolved blocker. |
| medium | Evidence supports a plausible issue, but material runtime or reachability proof remains. |
| low | Evidence is incomplete and the item is retained only for explicit follow-up. |

<a id="finding-1"></a>

### [1] Catch-all web proxy permits external requests and bearer-token disclosure

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Source trace was confirmed with the Node URL implementation used by the runtime. |
| Category | ssrf |
| CWE | CWE-918, CWE-200 |
| Affected lines | apps/web/src/app/api/proxy/\[...path\]/route.ts:11-58 |

#### Summary

An unauthenticated path controls the URL passed to fetch; a URL such as https:/attacker overrides the configured API origin, and an available session token is forwarded as Authorization.

#### Validation

Source trace was confirmed with the Node URL implementation used by the runtime. Validation details were not recorded separately.

#### Dataflow

The canonical finding records the affected path at apps/web/src/app/api/proxy/\[...path\]/route.ts:11-58, but no expanded source-to-sink narrative was recorded.

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

#### Severity

**High** — Remote attackers can make the server fetch arbitrary origins; authenticated requests can disclose bearer tokens.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Require an authenticated request where needed, reject absolute and scheme-relative inputs, construct only a leading-slash path under the configured API origin, and enforce timeout and response-size limits.

<a id="finding-2"></a>

### [2] Configured cost and user limits are not enforced

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | high |
| Confidence rationale | Repository-wide call-site search found configuration declarations but no production enforcement; live usage counters remained zero despite recorded LLM calls. |
| Category | resource-consumption |
| CWE | CWE-770, CWE-799 |
| Affected lines | packages/config/src/index.ts:26-34, apps/api/src/app.ts:143-205 |

#### Summary

Maximum LLM calls, LLM cost, active courses, and creation-rate settings are parsed but are not checked on course creation or LLM invocation paths.

#### Validation

Repository-wide call-site search found configuration declarations but no production enforcement; live usage counters remained zero despite recorded LLM calls. Validation details were not recorded separately.

#### Dataflow

The canonical finding records the affected path at packages/config/src/index.ts:26-34, apps/api/src/app.ts:143-205, but no expanded source-to-sink narrative was recorded.

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

#### Severity

**High** — Any authenticated account can repeatedly create work and invoke paid generation or grading paths, creating denial-of-wallet risk.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Enforce the existing limits transactionally at course creation and before every paid provider call; atomically update usage in the same operation.

<a id="finding-3"></a>

### [3] Research URL validation is not bound to the crawler request

| Field | Value |
| --- | --- |
| Severity | high |
| Confidence | medium |
| Confidence rationale | The source gap is direct; practical impact depends on Crawl4AI redirect and network-isolation settings not present in this repository. |
| Category | ssrf |
| CWE | CWE-918 |
| Affected lines | apps/worker/src/research.ts:98-125 |

#### Summary

The worker validates DNS for the initial search URL and then asks a separate crawler service to fetch it; redirect targets and the crawler's resolved address are not revalidated.

#### Validation

The source gap is direct; practical impact depends on Crawl4AI redirect and network-isolation settings not present in this repository. Validation details were not recorded separately.

#### Dataflow

The canonical finding records the affected path at apps/worker/src/research.ts:98-125, but no expanded source-to-sink narrative was recorded.

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

#### Severity

**High** — Attacker-controlled search results or redirects can target internal services reachable from the crawler network.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Perform the allowlist and IP checks in the component that opens the socket, revalidate every redirect/final URL, pin the resolved address, and cap redirects and discovered resources.

<a id="finding-4"></a>

### [4] Chat endpoint accepts a thread ID without ownership validation

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | The adjacent read route validates thread ownership, while the write route directly inserts the supplied UUID. |
| Category | broken-access-control |
| CWE | CWE-639 |
| Affected lines | apps/api/src/app.ts:788-815 |

#### Summary

A user authorized for one course can supply any UUID as threadId and insert messages into that thread because the POST route does not bind it to the requesting user and course.

#### Validation

The adjacent read route validates thread ownership, while the write route directly inserts the supplied UUID. Validation details were not recorded separately.

#### Dataflow

The canonical finding records the affected path at apps/api/src/app.ts:788-815, but no expanded source-to-sink narrative was recorded.

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

#### Severity

**Medium** — Exploitation requires a thread UUID but crosses tenant ownership and corrupts another conversation.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Before using a supplied threadId, require a matching chat_threads row for the authenticated user, route course, and optional lesson.

<a id="finding-5"></a>

### [5] Detected prompt injection content is still elevated into the system prompt

| Field | Value |
| --- | --- |
| Severity | medium |
| Confidence | high |
| Confidence rationale | Both the unused detection flag and raw system-prompt concatenation are directly visible in source. |
| Category | prompt-injection |
| CWE | CWE-74 |
| Affected lines | apps/worker/src/research.ts:491-498, apps/api/src/app.ts:817-845 |

#### Summary

Research persistence records whether crawled text contains injection-like content but does not quarantine it; retrieved chunks are concatenated directly into the chat system message.

#### Validation

Both the unused detection flag and raw system-prompt concatenation are directly visible in source. Validation details were not recorded separately.

#### Dataflow

The canonical finding records the affected path at apps/worker/src/research.ts:491-498, apps/api/src/app.ts:817-845, but no expanded source-to-sink narrative was recorded.

#### Reachability

Reachability was not recorded beyond the canonical finding summary and affected locations.

#### Severity

**Medium** — A malicious or compromised source can manipulate assistant behavior and source attribution for users of the affected course.

Additional runtime or deployment evidence could raise or lower this severity.

#### Remediation

Exclude or quarantine flagged chunks, keep retrieved text in a clearly delimited untrusted-data channel, and require citations to resolve only to retrieved source identifiers.

## Reviewed Surfaces

| Surface | Risk Area | Outcome | Notes |
| --- | --- | --- | --- |
| Authentication and API authorization | not recorded | Reported | No additional canonical notes were recorded. |
| Web API proxy | not recorded | Reported | No additional canonical notes were recorded. |
| Research URL ingestion and prompt trust | not recorded | Reported | No additional canonical notes were recorded. |
| Generation and user quotas | not recorded | Reported | No additional canonical notes were recorded. |
| Database access controls | not recorded | Needs follow-up | No additional canonical notes were recorded. |

## Open Questions And Follow Up

- Non-security business logic and generated output directories were not exhaustively line-reviewed.
  - Follow-up prompt: Review deferred unit deferred_non_security_files and close its stated proof gap. Paths: ..
