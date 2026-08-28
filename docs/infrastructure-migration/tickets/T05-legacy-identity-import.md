# T05 — Legacy identity import

Dependencies: T04. Read: T01 export contract, auth schema, `users` mapping.

Write scope: `scripts/migration/**`, auth/import tests, this ticket, status
matrix.

Import stable legacy user and Google provider IDs without tokens/passwords;
emit exceptions for missing source identities. Add an explicit local admin
activation command. Never let an unverified signup claim an imported/Google
email.

Acceptance: fixtures prove stable mapping, token exclusion, duplicate rejection,
orphan reporting, and guarded activation. Commit:
`feat(migration): import legacy identities safely`.

Handoff: state=done; commit=this ticket commit; checks=identity import tests,
auth typecheck/build; risks=requires a fresh local target and a T01 archive.
