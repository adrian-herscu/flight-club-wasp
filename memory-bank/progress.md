# Progress

## What works
- Memory Bank baseline structure exists.
- Required core files are initialized.
- Task index and first task file are in place.
- E2E DB reset is centralized in Playwright global setup and runs once per invocation.
- Pricing baseline now supports school default hourly rate and course hourly-rate fallback on creation.
- Manager school UI supports saving default hourly rate.
- API test coverage added for hourly-rate fallback/missing-baseline behavior.

## In progress
- Adopting the task workflow for all upcoming implementation requests.
- Reducing E2E runtime by removing unnecessary waits while keeping isolation.
- Expanding hourly-rate-only pricing coverage across manager and lesson flows.

## What remains
- Populate task files for existing active engineering efforts.
- Enrich system and product context with deeper domain details over time.
- Complete E2E wait-pattern optimization across affected specs.
- Add E2E coverage for manager hourly-rate settings and course-creation override cases.

## Known risks / gaps
- Historical task context before this bootstrap may not yet be backfilled.
- Context quality depends on consistent updates after each meaningful change.
