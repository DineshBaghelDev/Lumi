# T15 — Remove InsForge

Dependencies: T14. Read: repository-wide InsForge inventory.

Write scope: active runtime/config/tests/manifests/lockfile, `insforge.toml`, this
ticket, status matrix. Historical audit text may remain clearly historical.

Remove SDK dependencies, factories, environment variables, routes, cookie
names, tests, and active documentation claims. Preserve migration source access
only in the isolated read-only exporter contract.

Acceptance: dependency and active-path searches are empty; all package checks
pass. Commit: `refactor(infra): retire insforge runtime`.

Handoff: state=ready; commit=—; checks=—; risks=—.
