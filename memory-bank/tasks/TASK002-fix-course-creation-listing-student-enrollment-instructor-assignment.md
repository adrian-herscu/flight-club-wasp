# [TASK002] - Fix course creation, listing, student enrollment, and instructor assignment

**Status:** In Progress  
**Added:** 2026-03-20  
**Updated:** 2026-03-20

## Original Request
create task: fix course creation, listing, student enrollment, and instructor assignment

## Thought Process
The current platform has course-related workflows that likely have inconsistencies between schema, Wasp operations, and the UI, especially around course creation, listing, student enrollment, and instructor assignment. These flows are central to the core product, so fixes must be coordinated across server logic, UI, and tests (API + E2E).

This task will track a focused effort to:
- Ensure course creation uses the correct data model (including hourly-rate conventions and relationships to schools, instructors, and students).
- Ensure course listing behaves correctly for each role (public, student, instructor, manager, admin) and respects role gates.
- Ensure student enrollment flows are correct, permissioned, and reflected in course membership state.
- Ensure instructor assignment is consistent, permissioned, and reflected in course membership/teaching relationships.

## Implementation Plan
- [ ] Baseline current behavior and identify failing/buggy flows for course creation, listing, enrollment, and instructor assignment.
- [ ] Align schema and Wasp operations with intended domain model for courses, enrollments, and teaching roles.
- [ ] Fix server-side operations for course creation, listing, student enrollment, and instructor assignment.
- [ ] Update client UI flows to match fixed operations and role expectations.
- [ ] Add or update API tests in api-tests/ to cover these behaviors.
- [ ] Add or update Playwright E2E tests in e2e-tests/ to cover end-to-end flows.
- [ ] Update Memory Bank (activeContext and progress) once fixes are in place.

## Progress Tracking

**Overall Status:** In Progress - 25%

### Subtasks
| ID | Description | Status | Updated | Notes |
|----|-------------|--------|---------|-------|
| 1.1 | Audit existing course creation, listing, enrollment, and instructor assignment behaviors (app + tests) | Complete | 2026-03-20 | Identified inconsistency: courses from system FINAL syllabuses not listed for manager despite successful creation |
| 1.2 | Document desired domain behavior and role-specific access rules for these flows | In Progress | 2026-03-20 | Decided that Course should be explicitly owned by a School; system syllabuses act purely as templates |
| 1.3 | Implement backend fixes for operations and schema alignment | In Progress | 2026-03-20 | Added Course.schoolId relation and updated manager operations to use school ownership with legacy fallback |
| 1.4 | Implement frontend fixes for UI flows and state handling | Not Started | 2026-03-20 | |
| 1.5 | Extend/adjust API tests in api-tests/ to cover fixed behaviors | Not Started | 2026-03-20 | |
| 1.6 | Extend/adjust E2E tests in e2e-tests/ to cover the user flows | Not Started | 2026-03-20 | |
| 1.7 | Update Memory Bank activeContext and progress to reflect completed work | Not Started | 2026-03-20 | |

## Progress Log
### 2026-03-20
- Task created to track fixing course creation, listing, student enrollment, and instructor assignment flows across backend, frontend, and tests.
- Audited current manager course flows and confirmed that courses opened from system FINAL syllabuses were created but not listed due to ownership inference via syllabus.schoolId.
- Updated Prisma schema to attach Course directly to School via nullable schoolId relation and School.courses back-reference; attempted migration but Prisma requires DATABASE_URL to be set in the environment.
- Updated school-manager operations so new courses created by managers store schoolId, and all manager course lookups use Course.schoolId with a legacy fallback to syllabus-based ownership.
- Extended API test 05-course-hourly-rate.spec.ts to assert that a course opened from a system FINAL syllabus appears in the manager course listing.
