# Software Test Design (STD): Flight Club Platform

## 1. Purpose

This Software Test Design (STD) translates the product requirements in [prd.md](./prd.md) into required end-to-end test scenarios and maps each scenario to the current Playwright suite under `e2e-tests/tests`.

The goal is to answer two questions for every required behavior:

1. What test must exist?
2. Is that behavior already covered by an active E2E test, only partially covered, or missing?

## 2. Scope

This STD covers PRD user stories FC-001 through FC-016 and focuses on browser-level E2E validation for:

- Public discovery
- Authentication and protected-route access
- Registration and role-request flows
- Admin approval workflows
- School-manager approval workflows
- School profile, syllabus, course, enrollment, and assignment workflows
- Role-aware navigation
- Internationalization and RTL behavior
- User-visible integrity and authorization outcomes

## 3. Status Legend

| Status | Meaning |
|---|---|
| Covered | Active tests directly verify the required behavior. |
| Partial | Active tests verify part of the behavior, but one or more required assertions or paths remain unproven. |
| Gap | No active test currently verifies the required behavior. |
| Inactive | Coverage exists only in skipped or otherwise inactive tests and does not count as active validation. |

## 4.1 Public discovery

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-PUB-001 | FC-001 | Anonymous visitor sees landing page schools section and at least one school card when seeded data exists. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `anonymous users can see schools and courses on landing` |
| STD-PUB-002 | FC-001 | Anonymous visitor sees visible course items under schools on landing page. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `anonymous users can see schools and courses on landing` |
| STD-PUB-003A | FC-001 | Anonymous visitor does not see school-manager or instructor contact details on landing cards. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `anonymous users can see schools and courses on landing` |
| STD-PUB-003B | FC-001 | Authenticated user sees schools and courses, including school-manager and assigned-instructor contact details, on landing cards. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `logged in users can see schools and courses on landing` |
| STD-PUB-004 | FC-001 | School card renders school identity including name and location. | P0 | Partial | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) proves cards render, but does not explicitly assert school name and location text on the card. |
| STD-PUB-005 | FC-001 | Missing optional school metadata such as website URL does not break landing rendering. | P1 | Gap | No active test exercises missing optional school website data on landing cards. |
| STD-PUB-006 | FC-001 | Missing optional school logo does not break landing rendering. | P1 | Partial | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) asserts logo count, but not graceful rendering when a logo is absent. |
| STD-PUB-007 | FC-002 | Course-name filter narrows visible courses by text. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `course name filter shows only matching courses` |
| STD-PUB-008 | FC-002 | Location filter narrows visible schools by text. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `location filter shows only matching schools` |
| STD-PUB-009 | FC-002 | Country filter narrows visible schools by selected country. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `country dropdown filters schools by country` |
| STD-PUB-010 | FC-002 | Applying public filters works without authentication. | P0 | Covered | Current landing filter tests operate anonymously in [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts). |
| STD-PUB-011 | FC-002 | Empty-result states render correctly when filters yield no schools or courses. | P1 | Partial | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) checks zero-count behavior, but does not assert user-facing empty-state messaging or layout integrity. |

## 4.2 Authentication and access control

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-AUTH-001 | FC-003 | User can log in with email/password and reach the authenticated entry point. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `existing seeded user can log in through translated login form` |
| STD-AUTH-002 | FC-003 | Login form remains usable in translated locales. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-AUTH-003 | FC-003 | Unauthenticated access to a protected route redirects to `/login`. | P0 | Covered | [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts) — `[STD-AUTH-003]` |
| STD-AUTH-004 | FC-003 | Authenticated user can open account page. | P1 | Partial | [04-02-account-menu-access.spec.ts](../../e2e-tests/tests/04-02-account-menu-access.spec.ts) visits `/account`, but this is used as setup rather than asserted as a protected workflow outcome. |
| STD-AUTH-005 | FC-003 | Request Roles entry point is reachable from the account menu. | P1 | Covered | [04-02-account-menu-access.spec.ts](../../e2e-tests/tests/04-02-account-menu-access.spec.ts) — `registered users can open Request Roles from user menu` |
| STD-AUTH-006 | FC-003 | Google sign-in option is visible when provider configuration is enabled. | P1 | Partial | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) checks button visibility and translation only; it does not prove OAuth flow initiation or success. |
| STD-AUTH-010 | FC-003 | Logging out from desktop and mobile account navigation redirects to the anonymous landing page (`/`). | P0 | Covered | [04-02-account-menu-access.spec.ts](../../e2e-tests/tests/04-02-account-menu-access.spec.ts) — `[STD-AUTH-010]` logout redirect coverage for desktop and mobile navigation. |
| STD-AUTH-007 | FC-015 | Non-admin user cannot access admin-only pages. | P0 | Covered | [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts) — `[STD-AUTH-007]` |
| STD-AUTH-008 | FC-015 | Non-manager user cannot access manager-only pages. | P0 | Covered | [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts) — `[STD-AUTH-008]` |
 | STD-AUTH-009 | FC-015 | Sensitive actions validate authorization on the server side, not only by hidden UI links. | P0 | Covered (API) | [tests/api/01-role-gates.spec.ts](../../tests/api/01-role-gates.spec.ts) — 10 tests validate 401/403 for approveSchoolManagerRequest and approveSchoolMemberRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |

## 4.3 Registration and role requests

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-REG-001 | FC-004 | Signed-in user can open school-manager registration flow from the real role-selection path. | P0 | Covered | [tests/e2e/04-03-registration-role-requests.spec.ts](../tests/e2e/04-03-registration-role-requests.spec.ts) selects SCHOOL_MANAGER in the registration form before submission. |
| STD-REG-002 | FC-004 | School-manager registration collects required school details and submits a pending request. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../../tests/api/02-registration-duplicate-and-role-hold.spec.ts) validates successful submission before duplicate blocking. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
| STD-REG-003 | FC-004 | Submitted school-manager request is visible later with status. | P0 | Partial | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) accepts either pending or duplicate; it does not prove durable request-history visibility. |
| STD-REG-004 | FC-005 | Signed-in user can open instructor registration flow from the real role-selection path. | P0 | Covered | [tests/e2e/04-03-registration-role-requests.spec.ts](../tests/e2e/04-03-registration-role-requests.spec.ts) selects INSTRUCTOR in-form and submits against a selected school. |
| STD-REG-005 | FC-005 | Student registration via form is rejected by the server — students join via course-interest flow. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — `[STD-REG-005][STD-REG-010] student registration via form is rejected`. |
| STD-REG-006 | FC-005 | Instructor registration requires choosing an existing school. | P0 | Partial | [04-03-registration-school-listing.spec.ts](../../e2e-tests/tests/04-03-registration-school-listing.spec.ts) proves school listing renders, but does not prove selection is required for submission. |
| STD-REG-007 | FC-005 | Student role option is not offered in the registration form UI. | P0 | Covered | [tests/e2e/04-03-registration-school-listing.spec.ts](../tests/e2e/04-03-registration-school-listing.spec.ts) — `[STD-REG-007] registration role selector does not offer the student role`. |
| STD-REG-008 | FC-005 | School options show recognizable identity including logo and website where available. | P1 | Partial | [04-03-registration-school-listing.spec.ts](../../e2e-tests/tests/04-03-registration-school-listing.spec.ts) checks school websites label and logos; it does not assert fallback behavior for missing optional identity fields. |
| STD-REG-009 | FC-005 | Instructor request submission creates a pending request tied to selected school. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../../tests/api/02-registration-duplicate-and-role-hold.spec.ts) validates successful instructor request submission before duplicate blocking. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
| STD-REG-010 | FC-005 | Student registration via the form API returns 400 — students must use the course-interest flow. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — `[STD-REG-010] student registration via form is rejected`. |
 | STD-REG-011 | FC-006 | Duplicate pending request for same user, role, and school context is blocked with a clear message. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — 2 tests validate duplicate SCHOOL_MANAGER and INSTRUCTOR with 409 error. E2E: [tests/e2e/04-03-registration-role-requests.spec.ts](../tests/e2e/04-03-registration-role-requests.spec.ts). |
 | STD-REG-012 | FC-006 | Existing approved role cannot be re-requested. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — test validates 409 error for existing approved role. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
 | STD-REG-013 | FC-006 | Conflicting pending requests are blocked consistently across manager and instructor flows. | P0 | Covered (API) | [tests/api/02-registration-duplicate-and-role-hold.spec.ts](../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — 4 tests: 2 duplicate tests, 1 approved-role hold test, 1 concurrent race-condition test. E2E: [tests/e2e/04-03-registration-role-requests.spec.ts](../tests/e2e/04-03-registration-role-requests.spec.ts). |
| STD-REG-014 | FC-006 | Validation errors are shown inline or clearly when required inputs are missing. | P1 | Gap | No active negative-form-validation tests for registration submission. |
| STD-REG-015 | FC-004 / FC-005 | User can review submitted registration requests and statuses in a dedicated history view. | P0 | Gap | No active test covers request-history page or post-submission status review UX. |

## 4.4 Admin approval workflow

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ADM-001 | FC-007 | Admin can open pending school-manager request list. | P0 | Covered (API+E2E) | API: [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts) validates pending/approved listing scope; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) validates panel rendering. |
| STD-ADM-002 | FC-007 | Approving school-manager request moves it from pending to approved state in UI. | P0 | Covered (API+E2E) | API: [04-approvals-side-effects.spec.ts](../../tests/api/04-approvals-side-effects.spec.ts) validates approval state transition and invariants; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) keeps UI smoke movement check. |
| STD-ADM-003 | FC-007 | Approving school-manager request provisions school and role relationships needed for downstream use. | P0 | Covered (API) | [04-approvals-side-effects.spec.ts](../../tests/api/04-approvals-side-effects.spec.ts) validates school/account/userSchoolRole/user-role/decision side effects. |
| STD-ADM-004 | FC-007 | Admin can reject school-manager request with optional reason. | P0 | Covered (API) | [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts) validates rejection path and reason persistence. |
| STD-ADM-005 | FC-007 | Rejected request persists rejection state and reason after refresh/filter changes. | P1 | Partial | API persistence covered in [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts), but no explicit E2E refresh/filter persistence assertion yet. |
 | STD-ADM-006 | FC-007 / FC-015 | Non-admin user cannot access or operate school-manager approval workflow. | P0 | Covered (API) | [tests/api/01-role-gates.spec.ts](../../tests/api/01-role-gates.spec.ts) — 5 tests validate 401 unauthenticated + 403 for USER/SCHOOL_MANAGER/INSTRUCTOR/STUDENT on approveSchoolManagerRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |
| STD-ADM-007 | FC-007 | Admin request filters correctly separate pending and approved school requests. | P1 | Covered (API+E2E) | API: [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts) validates status inclusion/exclusion; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) validates filter UI behavior. |

## 4.5 School-manager member approval workflow

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-MGR-001 | FC-008 | Manager can open separate instructor and student member-request routes. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) — `manager member requests panel is split by instructors/students and supports pending/approved filtering` |
| STD-MGR-002 | FC-008 | Instructor route shows only instructor requests. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) |
| STD-MGR-003 | FC-008 / FC-017 | Student route shows student-course pairs sourced from course interests in manager school scope; approved entries correspond to `CourseInterest.status = ENROLLED`. | P0 | Covered (API+E2E) | API: [tests/api/09-student-course-enrollment-approval.spec.ts](../tests/api/09-student-course-enrollment-approval.spec.ts); E2E: [tests/e2e/04-17-students-course-pairs-approval.spec.ts](../tests/e2e/04-17-students-course-pairs-approval.spec.ts). |
| STD-MGR-004 | FC-008 | Manager can filter student-course pairs by pending status. | P0 | Covered (E2E) | [tests/e2e/04-05-school-manager-member-approval.spec.ts](../tests/e2e/04-05-school-manager-member-approval.spec.ts) — `[STD-MGR-004][STD-MGR-005] manager can view and filter student-course pairs from course-interest flow`. |
| STD-MGR-005 | FC-008 | Manager can filter student-course pairs by approved status. | P0 | Covered (E2E) | [tests/e2e/04-05-school-manager-member-approval.spec.ts](../tests/e2e/04-05-school-manager-member-approval.spec.ts) — `[STD-MGR-004][STD-MGR-005] manager can view and filter student-course pairs from course-interest flow`. |
| STD-MGR-006 | FC-008 | Manager can approve an instructor request and see it move to approved view. | P0 | Covered (API+E2E) | API: [04-approvals-side-effects.spec.ts](../../tests/api/04-approvals-side-effects.spec.ts) validates transition/side effects; E2E: [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) keeps route+approve smoke. |
| STD-MGR-007 | FC-008 / FC-012 / FC-017 | Manager can approve enrollment from a student course-interest pair, creating required membership/profile/enrollment side effects and setting interest to ENROLLED. | P0 | Covered (API+E2E) | API: [tests/api/09-student-course-enrollment-approval.spec.ts](../tests/api/09-student-course-enrollment-approval.spec.ts); E2E: [tests/e2e/04-17-students-course-pairs-approval.spec.ts](../tests/e2e/04-17-students-course-pairs-approval.spec.ts). |
| STD-MGR-008 | FC-008 | Manager can reject instructor request and see updated state/history. | P0 | Partial | API rejection covered in [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts), but E2E history visibility remains unproven. |
| STD-MGR-009 | FC-008 | Manager can reject student request and see updated state/history. | P0 | Partial | API rejection covered in [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts), but E2E history visibility remains unproven. |
| STD-MGR-010 | FC-008 | Manager only sees requests for their authorized school. | P0 | Covered (API) | [03-rejections-and-listing.spec.ts](../../tests/api/03-rejections-and-listing.spec.ts) validates cross-school request exclusion in list operation. |
 | STD-MGR-011 | FC-015 | Unauthorized user cannot operate manager approval actions. | P0 | Covered (API) | [tests/api/01-role-gates.spec.ts](../../tests/api/01-role-gates.spec.ts) — 5 tests validate 401 unauthenticated + 403 for USER/SCHOOL_MANAGER/INSTRUCTOR/STUDENT on approveSchoolMemberRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |

## 4.6 School profile management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-SCH-001 | FC-009 | Manager can open school profile page for their authorized school. | P1 | Covered | [tests/e2e/04-14-school-profile-edit.spec.ts](../tests/e2e/04-14-school-profile-edit.spec.ts) — `[STD-SCH-001][STD-SCH-003] school manager can edit school details and see persisted values`, including route access and page visibility setup. |
| STD-SCH-002 | FC-009 | School profile shows contact details, address, currency, and optional branding fields. | P1 | Inactive | PRD-relevant skipped test exists in [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) (`manager can view school profile`). |
| STD-SCH-003 | FC-009 | Manager can update school profile fields and see saved values persist after reload. | P0 | Covered | [04-14-school-profile-edit.spec.ts](../../e2e-tests/tests/04-14-school-profile-edit.spec.ts) — `[STD-SCH-003] school manager can edit school details and see persisted values`. |
| STD-SCH-004 | FC-009 | Unauthorized user cannot update another school's profile. | P0 | Gap | No active authz/scoping test for school-profile edits. |
| STD-SCH-010 | FC-009 | Manager with access to multiple schools can switch the current school context before managing school data. | P1 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) — `manager with two schools can switch the current school to manage`. |

## 4.7 Syllabus management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-SYL-001 | FC-010 | Manager can browse syllabus catalog including relevant system and school syllabuses. | P0 | Partial | [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) covers admin visibility; [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) has only skipped manager catalog coverage. |
| STD-SYL-002 | FC-010 | Catalog communicates visibility and usage policy. | P1 | Partial | Admin catalog policy is checked in [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts); manager-specific active validation is missing. |
| STD-SYL-003 | FC-010 | Manager can create draft syllabus from scratch. | P0 | Gap | No active creation-flow test. |
| STD-SYL-004 | FC-010 | Manager can create draft syllabus from template. | P1 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) creates drafts from a template and verifies navigation to syllabus details with a DRAFT badge. |
| STD-SYL-005 | FC-010 | Manager can save revisions to draft syllabus content. | P0 | Covered (API+E2E) | API: [06-syllabus-draft-revision-regression.spec.ts](../../tests/api/06-syllabus-draft-revision-regression.spec.ts) validates saving a new DRAFT revision after editing a manager-owned FINAL version; E2E: [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) edits lessons, adds/removes lessons, and saves a new draft revision. |
| STD-SYL-006 | FC-010 | Manager can publish draft syllabus into final version. | P0 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) publishes a manager-owned draft and verifies the FINAL state before continuing with draft-revision workflow. |
| STD-SYL-007 | FC-010 | UI clearly distinguishes draft, final, and obsolete versions. | P1 | Partial | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) asserts visible DRAFT and FINAL states; obsolete-state distinction remains unproven. |
| STD-SYL-008 | FC-016 | Manager syllabus page remains usable in RTL layout. | P1 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) — `rtl layout: sidebar stays anchored to right on syllabuses page` |
| STD-SYL-009 | FC-016 | Manager syllabus page labels translate correctly in Hebrew. | P1 | Partial | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) checks that English policy text is absent, but does not assert concrete translated labels/actions. |
| STD-SYL-010 | FC-010 | Manager can edit a syllabus in the editor and save a new draft revision from manager-owned content. | P0 | Covered (API+E2E) | API: [06-syllabus-draft-revision-regression.spec.ts](../../tests/api/06-syllabus-draft-revision-regression.spec.ts); E2E: [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) — edit lesson names, add/remove lessons, and save a new draft revision. |
| STD-SYL-011 | FC-010 | Manager can delete a single editable draft syllabus after explicit confirmation. | P0 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) — `manager can delete a single draft from catalog after confirmation` |
| STD-SYL-012 | FC-010 | Manager can delete all editable drafts in scope after explicit confirmation. | P1 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) — `manager can delete all editable drafts from catalog after confirmation` |
| STD-SYL-013 | FC-010 | Publishing to FINAL is rejected when the source draft has no lessons. | P0 | Covered (API) | [06-syllabus-draft-revision-regression.spec.ts](../../tests/api/06-syllabus-draft-revision-regression.spec.ts) — `[STD-SYL-013] rejects publishing a draft syllabus version without lessons`. |

## 4.8 Course creation and management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-001 | FC-011 | Manager can create a course from a final syllabus version. | P0 | Covered (API) | [05-course-hourly-rate.spec.ts](../../tests/api/05-course-hourly-rate.spec.ts) and [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) create courses from FINAL syllabus versions. |
| STD-CRS-002 | FC-011 | Course creation captures start date and capacity settings. | P0 | Covered (API) | [05-course-hourly-rate.spec.ts](../../tests/api/05-course-hourly-rate.spec.ts) persists and asserts `startDate`, `minCapacity`, and `maxCapacity` on the created course. |
| STD-CRS-003 | FC-011 | Course creation supports default lesson pricing. | P1 | Covered (API) | [05-course-hourly-rate.spec.ts](../../tests/api/05-course-hourly-rate.spec.ts) validates default hourly-rate fallback, missing-rate rejection, and created-course listing under the manager school. |
| STD-CRS-004 | FC-011 | Attempting to create a course from non-final syllabus fails with clear message. | P0 | Covered (API) | [05-course-hourly-rate.spec.ts](../../tests/api/05-course-hourly-rate.spec.ts) — `[STD-CRS-004]` validates non-FINAL syllabus versions are rejected with a clear message. |
| STD-CRS-005 | FC-011 | Manager can view course metadata and enrollment details after creation. | P1 | Gap | No active course-details test. |
| STD-CRS-006 | FC-011 | Manager can close an open course and later reopen it from a collapsed closed-courses panel. | P0 | Covered (API+E2E) | E2E: [04-15-course-close-reopen.spec.ts](../../e2e-tests/tests/04-15-course-close-reopen.spec.ts) covers `OPEN → CLOSED → OPEN` via the closed-courses panel. API: [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) and [11-course-lifecycle.spec.ts](../../tests/api/11-course-lifecycle.spec.ts) cover lifecycle invariants including `STARTED → CLOSED` and the `COMPLETED` close guard. |
| STD-CRS-007 | FC-011 / FC-012 / FC-013 | Closed courses reject new enrollments and instructor assignments with clear messages. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-CRS-007] enrollment and assignment are blocked for closed courses`. |

## 4.9 Student enrollment

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ENR-001 | FC-012 | Manager can view eligible students within authorized school context. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) validates that manager-scope enrollment lists include seeded in-scope students and exclude outsider-school students. |
| STD-ENR-002 | FC-012 | Manager can enroll student into selected course and enrollment write keeps course-interest lifecycle synchronized for manager approved views. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ENR-002]` validates enrollment creation in manager scope. Late enrollment and enrollment-lock guard are covered by STD-EXEC-040 through STD-EXEC-044 in [15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts). |
| STD-ENR-003 | FC-012 | Duplicate enrollment is blocked with understandable error. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ENR-003]` validates duplicate enrollment returns 409 with user-facing message. |
| STD-ENR-004 | FC-012 | Course roster updates to show newly enrolled student. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ENR-004]` validates enrollment details include the newly enrolled student. |
| STD-ENR-005 | FC-015 | Manager cannot enroll student into a course outside authorized school context. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ENR-005]` validates out-of-scope student enrollment is rejected. |

## 4.10 Instructor assignment

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ASN-001 | FC-013 | Manager can view eligible instructors within authorized school context. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) validates that manager-scope assignment lists include seeded in-scope instructors and exclude outsider-school instructors. |
| STD-ASN-002 | FC-013 | Manager can assign instructor to selected course. | P0 | Partial | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) validates in-scope assignment creation plus persisted lead designation and agreed wage, but the assignment-time cross-course schedule-overlap guard remains unproven. |
| STD-ASN-003 | FC-013 | Duplicate assignment is blocked with understandable error. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ASN-003]` validates duplicate assignment returns 409 with user-facing message. |
| STD-ASN-004 | FC-013 | Schedule conflicts are surfaced as understandable errors. | P0 | Gap | No active conflict-handling test. |
| STD-ASN-005 | FC-013 | Qualification or business-rule conflicts are surfaced as understandable errors. | P1 | Gap | No active rule-conflict/error-message test. |
| STD-ASN-006 | FC-015 | Manager cannot assign instructor outside authorized school context. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../tests/api/07-course-close-reopen.spec.ts) — `[STD-ASN-006]` validates out-of-scope instructor assignment is rejected. |

## 4.11 Role-based navigation

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-NAV-001 | FC-014 | System admin sees only admin-appropriate sidebar links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-002 | FC-014 | School manager sees only manager-appropriate sidebar links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-003 | FC-014 | Each visible admin sidebar item loads the expected route. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-004 | FC-014 | Each visible manager sidebar item loads the expected route. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-005 | FC-014 | Instructor sees only instructor-appropriate navigation links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-005]` validates instructor sidebar scope. |
| STD-NAV-005 | FC-014 | Instructor sees Dashboard and Courses sidebar links; Dashboard shows "Under construction" placeholder; Courses navigates to `/instructor/courses` with the `instructor-courses-page` testId visible. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-005]` validates sidebar scope, dashboard placeholder, and courses page testId. |
| STD-NAV-005A | FC-014 | Instructor sidebar shows a school-context badge when the user has an active INSTRUCTOR role in at least one school. | P1 | Covered | `[STD-NAV-005]` — badge visible for seeded multi-school instructor accounts. Note: execution-phase instructor capabilities (lesson scheduling, co-instructor absence marking, student evaluation submission) are new PRD requirements not yet implemented; they will require new STD entries when built. |
| STD-NAV-006 | FC-014 | Student sees Dashboard and Courses sidebar links; Dashboard shows "Under construction" placeholder; Courses navigates to `/student/courses` with the `student-courses-page` testId visible. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-006]` validates student sidebar scope, dashboard placeholder, and courses page testId. |
| STD-NAV-006A | FC-014 | Student sidebar shows a school-context badge when the user has an active STUDENT role in at least one school. | P1 | Covered | `[STD-NAV-006]` — badge visible for deterministic multi-school student fixtures. Execution-phase student capabilities (attendance hints, lesson evaluation visibility, refund requests) are API-covered via STD-EXEC-001 through STD-EXEC-056; E2E coverage for those flows remains a gap. |
| STD-NAV-007 | FC-014 | Authenticated user without elevated role does not see admin/manager links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-007]` validates plain-user visibility boundaries. |
| STD-NAV-008 | FC-014 | Account menu shows dashboard link for dashboard roles (system admin → /system-admin, manager → /school-manager, instructor → /instructor, student → /student). | P1 | Covered | [04-02-account-menu-access.spec.ts](../../e2e-tests/tests/04-02-account-menu-access.spec.ts) — four `[STD-NAV-008]` cases cover each role. |
| STD-NAV-009 | FC-014 | On wide screens, sidebar is open by default and remains open after outside click or Escape. | P1 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-009]` validates persistent desktop sidebar behavior. |
| STD-NAV-010 | FC-014 | On wide screens, persistent sidebar does not cover the dashboard main content and the shared header does not expose a message shortcut. | P1 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-010]` validates desktop content offset beside the sidebar and absence of the header message icon. |
| STD-NAV-011 | FC-014 | On narrow dashboard screens, header controls stay usable with a standard 3-line menu button and no mobile message shortcut crowding the header. | P1 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) — `[STD-NAV-011]` validates mobile header affordances and control alignment. |

## 4.12 Internationalization and RTL

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-I18N-001 | FC-016 | Login page text matches selected language for English, Hebrew, Romanian, and Russian. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-002 | FC-016 | Language selector updates `lang` and `dir` correctly across switches. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-003 | FC-016 | Browser locale auto-detection defaults to supported language or English fallback. | P2 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-004 | FC-016 | Google sign-in affordance stays visible across supported languages. | P2 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-008 | FC-016 | Public landing discovery labels render in the selected locale. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) — `[STD-I18N-008]` validates Romanian landing labels. |
| STD-I18N-009 | FC-016 | School-manager dashboard header controls move to the physical-left (inline-end in RTL) and remain visible after switching to RTL, away from the right-side sidebar. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) — `[STD-I18N-009]` validates desktop RTL header alignment on the dashboard. |
| STD-NAV-012 | FC-016 | On narrow public landing screens, the main menu opens from the leading edge and keeps language/theme controls accessible. | P1 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `[STD-NAV-012]` validates LTR left-edge mobile menu placement and visible language/theme controls. |
| STD-I18N-005 | FC-016 | Core manager pages render without layout breakage in RTL mode. | P1 | Partial | Only syllabus catalog RTL layout is tested in [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts); other critical manager pages are unproven. |
| STD-I18N-006 | FC-016 | Sidebar positioning remains usable in RTL layouts across manager/admin pages. | P1 | Partial | Only one manager syllabus page is covered. |
| STD-I18N-007 | FC-016 | Localized rendering does not remove access to required actions on critical manager pages. | P1 | Gap | No active test asserts translated critical actions remain present and operable on manager approval or school pages. |

## 4.13 Auditability, integrity, and user-visible error handling

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-INT-001 | FC-006 / FC-008 | Decision status changes remain visible after refresh/navigation. | P1 | Partial | Approval-state visibility is checked within-session, but persistence after full refresh is not explicitly validated. |
| STD-INT-002 | FC-007 / FC-008 | Rejection reason and decision history remain visible to appropriate reviewer. | P1 | Gap | No active rejection-history test. |
| STD-INT-003 | FC-011 / FC-012 / FC-013 | DB constraint failures are translated into understandable user-facing errors. | P0 | Gap | No active E2E tests for friendly error messaging on invalid syllabus use, duplicate enrollment, duplicate assignment, or conflict failures. |
| STD-INT-004 | FC-006 | Concurrent duplicate submissions do not create duplicate requests. | P1 | Covered (API) | [02-registration-duplicate-and-role-hold.spec.ts](../../tests/api/02-registration-duplicate-and-role-hold.spec.ts) — `[STD-INT-004] concurrent duplicate submissions produce exactly one pending request`. |
| STD-INT-005 | FC-012 / FC-013 | Concurrent enrollment/assignment attempts preserve integrity and show deterministic outcomes. | P1 | Gap | No active concurrency/integrity E2E coverage. |

## 4.14 Course interest (course-first student flow)

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CIN-001 | FC-017 | Logged-in student can express interest in a course and a CourseInterest(INTERESTED) record is created. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `creates a CourseInterest(INTERESTED) record for a logged-in user`. E2E: [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts). |
| STD-CIN-002 | FC-017 | Re-expressing interest on an already-INTERESTED course is idempotent and produces exactly one record. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `is idempotent`. |
| STD-CIN-003 | FC-017 | Unauthenticated user is redirected to login when clicking I'm Interested. | P0 | Covered (E2E) | [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts) — `[STD-CIN-003] first anonymous click redirects to login and resumes as interested after login`. |
| STD-CIN-004 | FC-017 | Student dashboard lists the student's CourseInterest records with status. | P1 | Gap | No active test asserts the My Interests list in the student dashboard. |
| STD-CIN-005 | FC-017 | Manager can view pending course-interest records per course. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `returns INTERESTED records for the managed school`. E2E: [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts). |
| STD-CIN-006 | FC-017 | Manager actionable course-interest query excludes cancelled interests. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `[STD-CIN-006] excludes cancelled interests from the manager actionable interests list`. |
| STD-CIN-007 | FC-017 | Manager actionable course-interest query excludes enrolled interests. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `[STD-CIN-007] excludes enrolled interests from the manager actionable interests list`. |
| STD-CIN-008 | FC-017 / FC-015 | Unauthenticated calls to interest operations return 401. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — auth gate tests for all operations. |
| STD-CIN-009 | FC-017 / FC-015 | Non-manager cannot call manager interest operations. | P0 | Covered (API) | [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — role gate tests. |
| STD-CIN-010 | FC-017 | Landing shows enrolled label for approved student-course interests. | P1 | Covered (E2E) | [tests/e2e/04-17-students-course-pairs-approval.spec.ts](../../tests/e2e/04-17-students-course-pairs-approval.spec.ts) — `[STD-CIN-010]` assertion for landing enrolled label after manager approval. |
| STD-CIN-011 | FC-017 | Landing keeps pre-enrollment `INTERESTED` state actionable: clicking the interested state again cancels interest. | P1 | Covered (E2E) | [tests/e2e/04-16-course-interest.spec.ts](../tests/e2e/04-16-course-interest.spec.ts) — `[STD-CIN-003][STD-CIN-011][STD-CIN-012] first anonymous click redirects to login and resumes as interested after login`. |
| STD-CIN-012 | FC-017 | Anonymous pending interest is consumed once after login and cleared from local storage. | P1 | Covered (E2E) | [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts) — pending anonymous intent is created, auto-applied post-login, and cleared. |
| STD-CIN-013 | FC-017 | Student can cancel a pre-enrollment interest. | P0 | Covered (API+E2E) | API: [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `[STD-CIN-013] student can cancel a pre-enrollment interest`. E2E: [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts) — `[STD-CIN-013][STD-CIN-014] student can cancel interest and later re-express it`. |
| STD-CIN-014 | FC-017 | Cancelled interest can be re-opened by clicking “I'm Interested” again. | P0 | Covered (API+E2E) | API: [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `[STD-CIN-014] cancelled interest can be re-opened by expressing interest again`. E2E: [tests/e2e/04-16-course-interest.spec.ts](../../tests/e2e/04-16-course-interest.spec.ts) — `[STD-CIN-013][STD-CIN-014] student can cancel interest and later re-express it`. |
| STD-CIN-015 | FC-017 | Manager can cancel a pending interest before enrollment from the students queue. | P0 | Covered (API+E2E) | API: [tests/api/08-course-interest.spec.ts](../../tests/api/08-course-interest.spec.ts) — `[STD-CIN-015] manager can cancel pending interest before enrollment`. E2E: [tests/e2e/04-17-students-course-pairs-approval.spec.ts](../../tests/e2e/04-17-students-course-pairs-approval.spec.ts) — `[STD-CIN-015][STD-CIN-016] manager can cancel a pending interest before enrollment`. |
| STD-CIN-016 | FC-017 | Manager-cancelled interest disappears from pending student-course pairs. | P0 | Covered (API+E2E) | API: [tests/api/09-student-course-enrollment-approval.spec.ts](../../tests/api/09-student-course-enrollment-approval.spec.ts) — `[STD-CIN-016] manager-cancelled interest no longer appears in pending student-course pairs`. E2E: [tests/e2e/04-17-students-course-pairs-approval.spec.ts](../../tests/e2e/04-17-students-course-pairs-approval.spec.ts) — `[STD-CIN-015][STD-CIN-016] ...`. |
| STD-CIN-017 | FC-017 | Manager cannot cancel an enrolled interest. | P0 | Covered (API) | [tests/api/09-student-course-enrollment-approval.spec.ts](../../tests/api/09-student-course-enrollment-approval.spec.ts) — `[STD-CIN-017] manager cannot cancel an enrolled interest`. |

## 4.15 Course execution — Slices 4–7

### Attendance hints (FC-020)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-001 | FC-020 | Student can accept a scheduled lesson ahead of the lesson date. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `student can accept a SCHEDULED lesson`. |
| STD-EXEC-002 | FC-020 | Student attendance hint is locked once the lesson date is reached (INV-09). | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `rejects attendance update when lesson date has passed`. |
| STD-EXEC-003 | FC-020 | Non-lead instructor can confirm or report unavailability before the lesson date. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `non-lead can accept/decline presence before lesson date`. |
| STD-EXEC-004 | FC-020 | Lead instructor cannot update their own presence hint via the non-lead presence action. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `lead instructor cannot update own presence`. |
| STD-EXEC-005 | FC-020 | Attendance hint state does not change lesson status. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — lesson status unchanged after hint updates. |

### Below-capacity resolution (FC-021)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-010 | FC-021 | Lead instructor can submit a PROCEED_WITH_PARTIAL suggestion when lesson is BELOW_CAPACITY (requires ≥1 ACCEPTED student). | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `submit PROCEED_WITH_PARTIAL suggestion`. |
| STD-EXEC-011 | FC-021 | Lead instructor can submit a CLOSE_COURSE suggestion when lesson is BELOW_CAPACITY. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `submit CLOSE_COURSE suggestion`. |
| STD-EXEC-012 | FC-021 | Duplicate PENDING suggestion is rejected (INV-06). | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `blocks a second PENDING suggestion (INV-06)`. |
| STD-EXEC-013 | FC-021 | Manager approves PROCEED_WITH_PARTIAL → lesson advances to CONFIRMED. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `approves PROCEED_WITH_PARTIAL → lesson becomes CONFIRMED`. |
| STD-EXEC-014 | FC-021 | Manager approves CLOSE_COURSE → lesson CANCELLED and course CLOSED. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `approves CLOSE_COURSE → lesson CANCELLED and course CLOSED`. |
| STD-EXEC-015 | FC-021 | Rescheduling a BELOW_CAPACITY lesson supersedes any pending suggestion. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `rescheduling a BELOW_CAPACITY lesson supersedes PENDING suggestion`. |

### Mark co-instructor absent (FC-023)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-020 | FC-023 | Lead instructor can mark a DECLINED co-instructor ABSENT while lesson is LESSON_UNDERWAY. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `lead can mark DECLINED non-lead ABSENT during LESSON_UNDERWAY`. |
| STD-EXEC-021 | FC-023 | Lead instructor cannot mark absent an instructor who has not DECLINED. | P0 | Covered (API) | [tests/api/13-lesson-interaction.spec.ts](../../tests/api/13-lesson-interaction.spec.ts) — `rejects absent mark when instructor has not DECLINED`. |

### Student evaluation and lesson conclusion (FC-022, FC-025)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-030 | FC-022 | Lead instructor can submit PASS/FAIL evaluation per ACTIVE student during LESSON_UNDERWAY. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — PASS/FAIL submission tests. |
| STD-EXEC-031 | FC-022 | Marking a student absent (attended=false) requires FAIL outcome (INV-15). | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `rejects attended=false with status=PASS (INV-15)`. |
| STD-EXEC-032 | FC-022 | FAIL evaluation immediately sets EnrolledStudent status to FAILED. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `FAIL assessment → EnrolledStudent.status = FAILED`. |
| STD-EXEC-033 | FC-022 | PASS on a non-final lesson keeps student ACTIVE. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `PASS on lesson 1 (non-final) → student stays ACTIVE`. |
| STD-EXEC-034 | FC-022/FC-025 | PASS on the final lesson transitions student to CERTIFIED and, when all students resolved, course to COMPLETED. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `PASS on final lesson → student CERTIFIED and course COMPLETED`; `2 students: both resolved → course COMPLETED`. |
| STD-EXEC-035 | FC-022 | When all ACTIVE students are assessed, lesson transitions to LESSON_CONCLUDED and instructors are paid. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `creates pay transaction for lead instructor when lesson concludes`. |
| STD-EXEC-036 | FC-023 | ABSENT co-instructor receives no pay at LESSON_CONCLUDED (INV-20). | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `does not pay ABSENT non-lead instructor (INV-20)`. |
| STD-EXEC-037 | FC-022 | Duplicate student assessment is rejected. | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `rejects duplicate assessment (409)`. |
| STD-EXEC-038 | FC-022 | Non-lead instructor cannot submit student evaluations (INV-03). | P0 | Covered (API) | [tests/api/14-lesson-conclusion.spec.ts](../../tests/api/14-lesson-conclusion.spec.ts) — `rejects submission by non-lead instructor (403)`. |

### Late enrollment (FC-012 extension)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-040 | FC-012 | Manager can enroll a student in a STARTED course before the first lesson reaches LESSON_UNDERWAY. | P0 | Covered (API) | [tests/api/15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts) — `creates EnrolledStudent with ACTIVE status`. |
| STD-EXEC-041 | FC-012 | Late enrollment is blocked once the first lesson has reached LESSON_UNDERWAY (INV-19). | P0 | Covered (API) | [tests/api/15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts) — `rejects enrollment once first lesson has reached LESSON_UNDERWAY (INV-19)`. |
| STD-EXEC-042 | FC-012 | Late enrollment charges the student's account the full course fee. | P0 | Covered (API) | [tests/api/15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts) — `charges student account and credits school account (§8)`. |
| STD-EXEC-043 | FC-012 | Late enrollment creates an ACCEPTED attendance hint when an active lesson exists. | P1 | Covered (API) | [tests/api/15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts) — `creates ACCEPTED MeetingAttendance hint when active lesson exists`. |
| STD-EXEC-044 | FC-012 | Late enrollment is rejected when student account has insufficient balance. | P0 | Covered (API) | [tests/api/15-late-enrollment.spec.ts](../../tests/api/15-late-enrollment.spec.ts) — `rejects enrollment when student account has insufficient balance (400)`. |

### Refund requests (FC-024)

| STD ID | PRD Ref | Required test | Priority | Status | Existing API link or gap note |
|---|---|---|---|---|---|
| STD-EXEC-050 | FC-024 | Student can submit a refund request for a STARTED course. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `creates a RefundRequest with PENDING status`. |
| STD-EXEC-051 | FC-024 | Duplicate PENDING refund request per student per course is rejected (INV-13). | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `rejects duplicate PENDING request (INV-13, 409)`. |
| STD-EXEC-052 | FC-024 | Refund request is rejected for a course that is not STARTED/COMPLETED/CLOSED. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `rejects request for a course not in STARTED/COMPLETED/CLOSED state (409)`. |
| STD-EXEC-053 | FC-024 | Manager can approve a refund with a specified amount; status → APPROVED and student account credited. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `transitions request status to APPROVED`; `deposits approved amount to student account`. |
| STD-EXEC-054 | FC-024 | Manager can decline a refund; status → DECLINED with optional reason. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `transitions request status to DECLINED with optional reason`. |
| STD-EXEC-055 | FC-024 | Approving an already-processed refund request is rejected. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `rejects approval of an already-processed request (409, DECLINED)`. |
| STD-EXEC-056 | FC-024 | Declining an already-approved refund request is rejected. | P0 | Covered (API) | [tests/api/16-refund-lifecycle.spec.ts](../../tests/api/16-refund-lifecycle.spec.ts) — `rejects declining an already-APPROVED request (409)`. |

## 4.16 Course execution lifecycle — E2E UI

### FC-020 Attendance hints — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-010 | FC-020 | Student sees attendance hint (Accept / Decline buttons) on a SCHEDULED future lesson. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-010]` |
| STD-CRS-010b | FC-020 | Lead instructor sees a reschedule/schedule button but no attendance hint on a SCHEDULED lesson. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-010b]` |
| STD-CRS-011 | FC-020 | Student can accept attendance on a future SCHEDULED lesson → UI shows "✓ Accepted". | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-011]` |
| STD-CRS-011b | FC-020 | Student can decline attendance on a future SCHEDULED lesson → UI shows "✗ Declined". | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-011b]` |

### FC-022 Student assessments — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-012 | FC-022 | Lead instructor sees student assessments form on a LESSON_UNDERWAY lesson. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-012]` |
| STD-CRS-013 | FC-022 | Lead instructor can submit a PASS assessment for an enrolled student. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-013]` |
| STD-CRS-034 | FC-022 | Lead instructor can submit a FAIL assessment with attended=false for an enrolled student. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-034]` |
| STD-CRS-035 | FC-023 | Lead instructor can mark a DECLINED co-instructor as ABSENT during LESSON_UNDERWAY. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-035]` |

### FC-024 Refund requests — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-014 | FC-024 | Student can open refund request modal on a STARTED course. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-014]` |
| STD-CRS-015 | FC-024 | Student can submit a refund request → dialog closes and PENDING label appears. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-015]` |
| STD-CRS-016 | FC-024 | Manager sees pending refund requests panel with Approve / Decline buttons after student submits request. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-016]` |
| STD-CRS-017 | FC-024 | Manager can approve a pending refund request → panel disappears and no PENDING items remain. | P0 | Covered | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-017]` |

### FC-018 Start course guards and lifecycle — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-018 | FC-012 | Manager sees late enrollment panel on a STARTED course detail page. | P1 | Partial | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — `[STD-CRS-018]` (page-load assertion only; no enrollment action verified). |
| STD-CRS-019 | FC-018 | Manager is blocked from starting a course that has no lead instructor (INV-18). | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-019]` |
| STD-CRS-020 | FC-018 | Manager is blocked from starting a course where an instructor has no agreed wage (INV-18). | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-020]` |
| STD-CRS-021 | FC-018 | Manager can start an OPEN course that passes all guards → course moves to STARTED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-021]` |
| STD-CRS-022 | FC-018 | Manager can close an OPEN course from the course detail page. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-022]` |
| STD-CRS-023 | FC-018 | Manager can close a STARTED course from the course detail page. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-023]` |
| STD-CRS-024 | FC-018 | Manager can reopen a CLOSED course from the course detail page. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-024]` |

### FC-019 Lesson scheduling — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-025 | FC-019 | Lead instructor can schedule a CANCELLED lesson by providing a date and location. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-025]` |
| STD-CRS-026 | FC-019 | Lead instructor can reschedule a SCHEDULED lesson → status resets to SCHEDULED with new date. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-026]` |
| STD-CRS-027 | FC-019 | Lead instructor sees a reschedule action available on a BELOW_CAPACITY lesson. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-027]` |
| STD-CRS-028 | FC-019 | Lead instructor can reschedule a BELOW_CAPACITY lesson → lesson moves back to SCHEDULED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-028]` |
| STD-CRS-029 | FC-019 / FC-021 | Rescheduling a BELOW_CAPACITY lesson that has a PENDING suggestion supersedes that suggestion. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-029]` |
| STD-CRS-030 | FC-019 | Lead instructor can reschedule a CONFIRMED lesson before its date → lesson returns to SCHEDULED. | P1 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-030]` |

### FC-020 Non-lead presence hints — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-031 | FC-020 | Non-lead instructor sees presence hint controls on a SCHEDULED future lesson. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-031]` |
| STD-CRS-032 | FC-020 | Non-lead instructor can confirm availability before the lesson date → presence shows CONFIRMED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-032]` |
| STD-CRS-033 | FC-020 | Non-lead instructor can report unavailability before the lesson date → presence shows DECLINED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-033]` |

### FC-012 Late enrollment — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-036 | FC-012 | Manager can enroll a new student in a STARTED course before the first lesson reaches LESSON_UNDERWAY. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-036]` |

### FC-021 Below-capacity resolution — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-037 | FC-021 | Lead instructor can submit a PROCEED_WITH_PARTIAL suggestion on a BELOW_CAPACITY lesson via UI. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-037]` |
| STD-CRS-038 | FC-021 | Manager can approve a PROCEED_WITH_PARTIAL suggestion → lesson advances to CONFIRMED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-038]` |
| STD-CRS-039 | FC-021 | Lead instructor can submit a CLOSE_COURSE suggestion on a BELOW_CAPACITY lesson via UI. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-039]` |
| STD-CRS-040 | FC-021 | Manager can approve a CLOSE_COURSE suggestion → lesson CANCELLED and course CLOSED. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-040]` |

### FC-025 Course completion — E2E

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-041 | FC-025 | Course auto-transitions to COMPLETED when all enrolled students receive PASS on the final lesson. | P0 | Gap | [tests/e2e/04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts) — empty skeleton `[STD-CRS-041]` |

## 5. Coverage Summary by PRD Story

| PRD Story | Coverage summary |
|---|---|
| FC-001 Browse public schools and courses | Mostly covered; optional-data tolerance still incomplete. |
| FC-002 Filter public discovery results | Mostly covered; empty-state UX messaging still incomplete. |
| FC-003 Authenticate and reach protected areas | Partial; login, i18n, protected-route redirect, and logout-to-landing behavior are covered; account-route assertion depth and Google OAuth execution remain incomplete. |
| FC-004 Submit school-manager registration request | Partial; role-selection-path submission is covered, but request-history coverage is still missing. |
| FC-005 Submit instructor or student requests | Partial; submission exists, but school-selection validation and history coverage are incomplete. |
 | FC-006 Prevent invalid or duplicate role requests | **Covered (API)**; 5 API tests validate duplicate pending requests, approved-role hold, and concurrent race conditions. E2E smoke test also covers basic blocking. |
| FC-007 Review and decide school-manager requests | **Covered (API+E2E)**; approval/rejection/authz invariants are API-covered with E2E UI smoke retained for panel flow. Remaining gap is explicit UI refresh/filter persistence of rejected state. |
| FC-008 Review instructor and student requests separately | **Covered (API+E2E)**; instructor/student approval and rejection invariants are API-covered, with E2E route/filter/approve smoke retained. Remaining gap is dedicated E2E rejection-history visibility. |
| FC-009 Manage school profile data | Partial; profile edit persistence and multi-school context switching are covered, while explicit unauthorized cross-school profile-edit denial remains a gap. |
| FC-010 Manage syllabus lifecycle | Partial; template-based draft creation, draft revision, publish-to-final, and draft deletion flows are covered, while from-scratch creation, broader manager catalog coverage, and obsolete-state distinction remain incomplete. |
| FC-011 Open a course from a final syllabus version | Partial; API coverage exists for creation from FINAL syllabus versions, persisted start-date/capacity fields, hourly-rate rules, non-FINAL rejection messaging, `OPEN → CLOSED → OPEN` close/reopen lifecycle, `STARTED → CLOSED` direct close, course-start hard/soft guards, and `STARTED → COMPLETED` auto-transition. Remaining gap: course-details UX. |
| FC-012 Enroll students in courses | **Covered (API)** for manager-scope lookup, enrollment happy path, duplicate blocking, roster update, cross-school denial, closed-course rejection, late enrollment (after course start, before first lesson LESSON_UNDERWAY), enrollment-lock timing guard (INV-19), financial charge on late enrollment, and insufficient-balance rejection. Remaining gaps: E2E user-flow and concurrency coverage. |
| FC-013 Assign instructors to courses | Partial; manager-scope lookup, basic assignment creation, duplicate blocking, cross-school denial, closed-course rejection, and persisted lead instructor/agreed-wage assignment data are API-covered. Remaining gaps: assignment-time cross-course schedule-overlap coverage, qualification/business-rule conflict coverage, and broader E2E user-flow/error-message coverage. |
| FC-014 Navigate admin features by role | Covered for admin, school manager, instructor, student, and plain authenticated users in active E2E navigation tests. |
| FC-015 Preserve security and authorization boundaries | **Covered (API+E2E)**; approval-action 401/403 role gates remain covered, E2E route denial remains covered, and manager school-scope denial is now API-covered for enrollment/assignment actions. |
| FC-016 Support localized and RTL manager experiences | Partial; login and one manager page are covered, broader manager workflows are not. |
| FC-017 Express course interest (course-first student flow) | Covered (API+E2E) for logged-in interest creation, anonymous redirect/continuation, student cancel/reopen toggle behavior, manager pending-interest cancel flow, and enrollment label feedback. Remaining gap: dedicated student dashboard My Interests assertions. |
| FC-018 Start a course | **Covered (API)**; hard-guard rejections (no lead, no wage, insufficient balance, duplicate STARTED), soft minimum-capacity override, STARTED lifecycle event, and enrolled-student financial charge are all API-covered. E2E: STD-CRS-019 to STD-CRS-024 are skeleton gaps in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |
| FC-019 Schedule and reschedule a lesson | **Covered (API)**; scheduling, rescheduling, schedule-overlap guard, hint reset on reschedule, and CONFIRMED-state guard are API-covered. E2E: STD-CRS-025 to STD-CRS-030 are skeleton gaps in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |
| FC-020 Provide advisory attendance hints | **Covered (API+E2E)**; student accept/decline and lead-restricted presence are fully E2E-covered (STD-CRS-010, 010b, 011, 011b). Non-lead presence E2E coverage is skeleton gaps STD-CRS-031 to STD-CRS-033 in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |
| FC-021 Resolve below-capacity lessons | **Covered (API)**; PROCEED_WITH_PARTIAL and CLOSE_COURSE suggestions, duplicate-pending guard (INV-06), manager approval advancing to CONFIRMED or CLOSED, and reschedule-supersedes are all API-covered. E2E: STD-CRS-037 to STD-CRS-040 are skeleton gaps in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |
| FC-022 Submit student evaluations | **Covered (API+E2E)**; PASS evaluation is E2E-covered (STD-CRS-012, 013). FAIL (STD-CRS-034) is a skeleton gap. API covers all invariants. |
| FC-023 Mark co-instructor absent | **Covered (API)**; ABSENT assignment, DECLINED-only guard, and no-pay-for-ABSENT invariant (INV-20) are API-covered. E2E: STD-CRS-035 is a skeleton gap in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |
| FC-024 Submit and manage refund requests | **Covered (API+E2E)**; student submission (STD-CRS-014, 015), manager approval panel (STD-CRS-016), and manager approval action (STD-CRS-017) are fully E2E-covered. All invariants are API-covered. |
| FC-025 Complete a course | **Covered (API)**; automatic COMPLETED transition when all students resolved and course lifecycle event creation are API-covered. E2E: STD-CRS-041 is a skeleton gap in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts). |

## 6. Highest-Priority Gaps to Implement Next

1. School profile view/edit authorization tests.
2. Syllabus from-scratch creation, manager catalog breadth, and obsolete-state coverage.
3. Course-details UX assertions after creation (metadata and enrollment details).
4. Instructor assignment overlap/business-rule API coverage.
5. Instructor assignment conflict/error-message E2E coverage (schedule and qualification paths).
6. Broader RTL/localization coverage for manager-critical pages beyond syllabus catalog.
7. E2E refresh/filter persistence assertions for rejection history visibility (ADM/MGR flows).
8. E2E coverage for course execution user flows: lesson scheduling (STD-CRS-025–030), non-lead presence hints (STD-CRS-031–033), FAIL assessment (STD-CRS-034), absent co-instructor (STD-CRS-035), late enrollment action (STD-CRS-036), below-capacity resolution (STD-CRS-037–040), start/close/reopen guards (STD-CRS-019–024), and course completion (STD-CRS-041). Skeleton tests exist in [04-18-course-execution-lifecycle.spec.ts](../../tests/e2e/04-18-course-execution-lifecycle.spec.ts).
9. Registration request-history visibility and status persistence tests.
10. E2E smoke for course-interest flow: student dashboard list and manager pending-interest approval/cancellation handling.

## 7. Notes

 - As of April 2026, **269 tests** (170 API + 99 unit) are passing. API tests under [tests/api](../../tests/api/) provide deterministic, database-backed validation for authorization gates, duplicate/role-hold guardrails, approval/rejection paths, listing scoping, enrollment/assignment integrity, approval side effects, course-first interest pipeline, course execution (lesson scheduling, attendance hints, below-capacity resolution, student evaluation, lesson conclusion, instructor pay, late enrollment, and refund lifecycle). Unit tests under [tests/unit](../../tests/unit/) validate all XState state machines for course execution. API tests validate operation-layer behavior without browser overhead; E2E suite keeps route/filter/layout and end-user smoke flows.
 