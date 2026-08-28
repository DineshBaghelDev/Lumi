# Lumi release-readiness audit — 2026-08-28

This folder preserves the complete project audit and the sealed security-scan artifacts.

## Files

- `audit-report.md` — consolidated product, engineering, user-flow, UI/UX, security, testing, and operational-readiness audit.
- `security/security-report.md` — generated human-readable security report.
- `security/scan-manifest.json` — sealed scan identity, scope, revision, and artifact hashes.
- `security/coverage.json` — reviewed security surfaces and explicit coverage limitations.
- `security/findings.json` — machine-readable security findings.

## Audit snapshot

- Repository revision: `cc4ba18532bc9653f182d502a0217a260d58c5b0`
- Branch at audit time: `main`, eight commits ahead of `origin/main`
- Release recommendation: **NO-GO**
- Audit changes: documentation/artifact preservation only; no application code or data was modified.

