# T10 — Build a real hermetic authenticated release journey

## Problem
The published Playwright gate mostly visits routes and has weak assertions; it does not prove the V1 journey.

## Scope
Write only `apps/web/e2e/**`, Playwright fixture/config files, and test-only seed/mock helpers under the web E2E scope. Do not weaken production code or skip assertions.

## Acceptance
- Hermetic seeded/authenticated tests cover course creation, generation terminal state, lesson reading/resume, assessment, project, chat/thread/citation, notes/bookmarks, reload, and failure/retry.
- Assertions verify visible state and API effects, not just HTTP 200 or navigation.
- The suite is deterministic and does not require live paid providers.
- Document exact command and limitations.
