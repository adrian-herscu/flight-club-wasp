# Active Context

## Current focus
Maintain test reliability and developer workflow for E2E runs while preserving fast local iteration.

## Recent changes
- Added Playwright global setup to reset DB once per test invocation (`e2e-tests/global-setup.ts`).
- Wired `globalSetup` in Playwright config.
- Removed duplicate DB reset from `e2e:playwright` and `e2e:smoke` npm scripts to avoid double reset.

## Next steps
1. Validate local IDE single-test invocation behavior with global setup reset.
2. Continue replacing fixed E2E waits (`waitForTimeout`/overuse of `networkidle`) to improve runtime.
3. Keep activeContext and progress synchronized at meaningful milestones.

## Active considerations
- Maintain test isolation without per-test DB resets.
- Ensure reset mechanism runs exactly once per Playwright invocation.
