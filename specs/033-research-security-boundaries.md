# 033 — Research security boundaries

## Goal

Implement one bounded V1 slice: **treat every crawled page and discovered resource as hostile input before it reaches storage, the LLM, or the frontend**.

## Depends on

- `002-env-config.md`
- `019-generation-budget-invariants.md`
- `026-crawl4ai-client.md`
- `031-source-filtering.md`
- `032-official-source-protection.md`

## Requirements

### URL and SSRF protection

- Accept only `http` and `https` source URLs.
- Reject URLs containing credentials and unsupported/nonstandard destination schemes.
- Resolve the hostname before crawling and reject loopback, private, link-local, multicast, reserved, carrier-grade NAT, and cloud metadata address ranges for IPv4 and IPv6.
- Re-resolve and revalidate every redirect destination; cap redirects at a small configurable maximum.
- Prevent DNS-rebinding bypasses by validating the resolved destination used for each outbound request/hop where the integration permits it.
- V1 crawling should allow only configured outbound ports, defaulting to normal HTTP/HTTPS ports.

### Prompt-injection isolation

- Source content is untrusted data. Prompts that include crawled text must explicitly state that instructions, tool requests, policies, credentials requests, or role changes inside source content are data and must never be followed.
- Crawled content cannot select tools, alter prompts, request secrets, modify system behavior, or create arbitrary outbound requests.
- Store security flags when content contains common prompt-injection/tool-manipulation patterns; flags inform review but do not become instructions.
- Never concatenate source content into system/developer instruction fields.

### Content/resource limits

- Enforce per-resource and per-course byte limits from the generation-budget service before/while downloading.
- Restrict accepted source MIME types to configured document types needed by V1; reject executables, archives, and unknown binary payloads.
- Bound page/document count, crawl depth, redirect count, and discovered-resource processing.
- Do not recursively fetch arbitrary embedded resources from documents unless they pass the same URL/security checks.

### Sanitization and rendering

- Strip scripts, styles, forms, event handlers, embedded active content, and unsafe raw HTML before retained Markdown is used by the app.
- Frontend lesson/source rendering must never execute HTML/JavaScript originating from crawled content.
- Discovered images must pass URL/SSRF/size/MIME checks before download.
- Do not render arbitrary remote image URLs directly; retain approved images in InsForge Storage and render the stored asset.
- Reject or sanitize active image formats such as SVG before display; V1 may simply disallow SVG research assets.
- Never log full hostile source bodies, secrets, authorization headers, or signed storage URLs.

## Acceptance criteria

- [ ] localhost/private/metadata URLs are rejected before Crawl4AI receives them.
- [ ] A redirect from a public URL to a private/metadata destination is rejected.
- [ ] Oversized or disallowed MIME payloads terminate safely and consume bounded resources.
- [ ] Prompt-injection text is stored/processed only as untrusted source data and cannot alter orchestration instructions.
- [ ] Malicious discovered image/resource URLs cannot bypass the outbound URL guard.
- [ ] Crawled content displayed by the frontend cannot execute source-provided scripts/HTML handlers.

## Required tests

- URL-guard unit tests covering IPv4/IPv6 loopback/private/link-local/metadata/reserved ranges and URL credentials.
- Redirect-to-private integration test with mocked Crawl4AI/network boundary.
- Oversized payload and bad-MIME tests.
- Prompt-injection fixture proving source instructions remain quoted/untrusted context.
- Malicious image URL and unsafe HTML sanitization tests.

## Out of scope

- General-purpose malware scanning.
- Crawling authenticated/private intranet content.
- Browser execution of arbitrary third-party scripts.

## Completion

Update `context/progress-tracker.md` after this spec or milestone slice is complete. Related specs in the same milestone may land in one coherent change per `specs/README.md`.
