# Active Context

## Current focus
Align pricing model with school/course hourly-rate baselines and remove fixed default-lesson-price UX from manager workflows.

## Recent changes
- Added `School.defaultHourlyRate` and `Course.hourlyRate` fields, and removed legacy `Course.defaultLessonPrice` from active schema.
- Updated manager course creation flow to use hourly rate (explicit override) with fallback to managed school default hourly rate.
- Added manager school UI + action support to set school default hourly rate.
- Added API coverage for hourly-rate fallback and validation (`api-tests/tests/05-course-hourly-rate.spec.ts`).

## Next steps
1. Add explicit lesson/course pricing derivation helper usage in lesson scheduling flows when those write paths are implemented.
2. Expand E2E coverage for manager school hourly-rate editing and course creation override behavior.
3. Keep Memory Bank synchronized as pricing model implementation expands.

## Active considerations
- Keep pricing values as whole-number currency units across UI/API/DB semantics.
