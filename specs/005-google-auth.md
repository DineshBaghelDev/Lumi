# 005 — Google OAuth V1

## Goal

Implement one bounded V1 slice: **google oauth v1**.

## Depends on

- `004-insforge-client.md`

## Requirements

- Configure Google OAuth through InsForge auth.
- Implement web sign-in/sign-out flow and authenticated session restoration.
- Protect authenticated product routes at the UI level while treating API authorization as authoritative.
- Create/sync minimal application `users` profile on first authenticated API interaction if required by schema.

## Acceptance criteria

- [ ] Unauthenticated user can sign in with Google and reach authenticated app shell.
- [ ] Sign-out removes access to protected UI.
- [ ] No email/password signup, verification, or reset flow exists.

## Required tests

- Auth session smoke test; API auth behavior covered later.

## Out of scope

- Email auth.
- Role/admin UI.

## Completion

Update `context/progress-tracker.md` after this spec is complete. Do not start unrelated specs in the same change.
