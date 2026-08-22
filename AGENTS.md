# Agent Rules

## Source of truth

1. Active spec in `specs/`
2. `docs/`
3. `context/`
4. Existing code

If approved sources materially conflict, stop and ask.

Generated mockups define visual direction only, never product scope.

## Before coding

* Read the active spec.
* Read only the relevant docs/context.
* Inspect existing code before changing it.
* Make a short plan.
* Implement only the current task.

## Golden rules

* Follow the approved architecture, UX, design system, security rules, budgets, and contracts.
* Make the smallest coherent change.
* Reuse existing code before adding abstractions.
* Do not build future-spec functionality.
* Do not invent missing product behavior.
* Do not silently replace approved technology.
* Never hardcode or commit secrets.
* Keep TypeScript strict and validate external inputs at boundaries.
* Preserve database constraints and idempotency.

## Verification

Never claim completion without verification.

Run only checks relevant to the change, after you are completely done. Don't test after every small change.

Do not weaken or delete failing tests just to pass.

## Failure

If blocked:

1. diagnose;
2. make one focused fix attempt;
3. if still unresolved, stop and ask.

Do not loop, guess, hide failures, or invent workarounds.

Stop immediately if the task requires:

* changing approved architecture/product behavior;
* resolving conflicting specs;
* missing credentials/permissions;
* destructive data changes;
* bypassing security or generation limits.

