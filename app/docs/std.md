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

|---|---|---|---|---|---|
| STD-PUB-001 | FC-001 | Anonymous visitor sees landing page schools section and at least one school card when seeded data exists. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `anonymous users can see schools and courses on landing` |
| STD-PUB-002 | FC-001 | Anonymous visitor sees visible course items under schools on landing page. | P0 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `anonymous users can see schools and courses on landing` |
| STD-PUB-003 | FC-001 | Authenticated user also sees schools and courses on landing page. | P1 | Covered | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) — `logged in users can see schools and courses on landing` |
| STD-PUB-004 | FC-001 | School card renders school identity including name and location. | P0 | Partial | [04-01-public-discovery.spec.ts](../../e2e-tests/tests/04-01-public-discovery.spec.ts) proves cards render, but does not explicitly assert school name and location text on the card. |
| STD-PUB-005 | FC-001 | Missing optional school data such as website URL or phone does not break landing rendering. | P1 | Gap | No active test exercises missing optional school website/phone data on landing cards. |
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
| STD-AUTH-007 | FC-015 | Non-admin user cannot access admin-only pages. | P0 | Covered | [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts) — `[STD-AUTH-007]` |
| STD-AUTH-008 | FC-015 | Non-manager user cannot access manager-only pages. | P0 | Covered | [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts) — `[STD-AUTH-008]` |
 | STD-AUTH-009 | FC-015 | Sensitive actions validate authorization on the server side, not only by hidden UI links. | P0 | Covered (API) | [api-tests/tests/01-role-gates.spec.ts](../../api-tests/tests/01-role-gates.spec.ts) — 10 tests validate 401/403 for approveSchoolManagerRequest and approveSchoolMemberRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |

## 4.3 Registration and role requests

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-REG-001 | FC-004 | Signed-in user can open school-manager registration flow from the real role-selection path. | P0 | Partial | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) opens `/registration?role=SCHOOL_MANAGER` directly; it does not validate the role-selection journey. |
| STD-REG-002 | FC-004 | School-manager registration collects required school details and submits a pending request. | P0 | Covered | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) — `instructor can submit a school registration request` |
| STD-REG-003 | FC-004 | Submitted school-manager request is visible later with status. | P0 | Partial | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) accepts either pending or duplicate; it does not prove durable request-history visibility. |
| STD-REG-004 | FC-005 | Signed-in user can open instructor registration flow from the real role-selection path. | P0 | Partial | Current tests deep-link with `?role=INSTRUCTOR`; selection UI is not verified. |
| STD-REG-005 | FC-005 | Signed-in user can open student registration flow from the real role-selection path. | P0 | Partial | Current tests deep-link with `?role=STUDENT`; selection UI is not verified. |
| STD-REG-006 | FC-005 | Instructor registration requires choosing an existing school. | P0 | Partial | [04-03-registration-school-listing.spec.ts](../../e2e-tests/tests/04-03-registration-school-listing.spec.ts) proves school listing renders, but does not prove selection is required for submission. |
| STD-REG-007 | FC-005 | Student registration requires choosing an existing school. | P0 | Gap | No active test specifically proves school selection is required for the student flow. |
| STD-REG-008 | FC-005 | School options show recognizable identity including logo and website where available. | P1 | Partial | [04-03-registration-school-listing.spec.ts](../../e2e-tests/tests/04-03-registration-school-listing.spec.ts) checks school websites label and logos; it does not assert fallback behavior for missing optional identity fields. |
| STD-REG-009 | FC-005 | Instructor request submission creates a pending request tied to selected school. | P0 | Covered | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) — `student can submit an instructor request for a school` |
| STD-REG-010 | FC-005 | Student request submission creates a pending request tied to selected school. | P0 | Covered | [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts) — `school manager can submit a student request for a school` |
 | STD-REG-011 | FC-006 | Duplicate pending request for same user, role, and school context is blocked with a clear message. | P0 | Covered (API) | [api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts](../../api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts) — 3 tests validate duplicate SCHOOL_MANAGER, INSTRUCTOR, STUDENT with 409 error. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
 | STD-REG-012 | FC-006 | Existing approved role cannot be re-requested. | P0 | Covered (API) | [api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts](../../api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts) — test validates 409 error for existing approved role. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
 | STD-REG-013 | FC-006 | Conflicting pending requests are blocked consistently across manager, instructor, and student flows. | P0 | Covered (API) | [api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts](../../api-tests/tests/02-registration-duplicate-and-role-hold.spec.ts) — 5 tests: 3 duplicate tests, 1 approved-role hold test, 1 concurrent race-condition test. E2E: [04-03-registration-role-requests.spec.ts](../../e2e-tests/tests/04-03-registration-role-requests.spec.ts). |
| STD-REG-014 | FC-006 | Validation errors are shown inline or clearly when required inputs are missing. | P1 | Gap | No active negative-form-validation tests for registration submission. |
| STD-REG-015 | FC-004 / FC-005 | User can review submitted registration requests and statuses in a dedicated history view. | P0 | Gap | No active test covers request-history page or post-submission status review UX. |

## 4.4 Admin approval workflow

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ADM-001 | FC-007 | Admin can open pending school-manager request list. | P0 | Covered (API+E2E) | API: [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts) validates pending/approved listing scope; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) validates panel rendering. |
| STD-ADM-002 | FC-007 | Approving school-manager request moves it from pending to approved state in UI. | P0 | Covered (API+E2E) | API: [04-approvals-side-effects.spec.ts](../../api-tests/tests/04-approvals-side-effects.spec.ts) validates approval state transition and invariants; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) keeps UI smoke movement check. |
| STD-ADM-003 | FC-007 | Approving school-manager request provisions school and role relationships needed for downstream use. | P0 | Covered (API) | [04-approvals-side-effects.spec.ts](../../api-tests/tests/04-approvals-side-effects.spec.ts) validates school/account/userSchoolRole/user-role/decision side effects. |
| STD-ADM-004 | FC-007 | Admin can reject school-manager request with optional reason. | P0 | Covered (API) | [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts) validates rejection path and reason persistence. |
| STD-ADM-005 | FC-007 | Rejected request persists rejection state and reason after refresh/filter changes. | P1 | Partial | API persistence covered in [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts), but no explicit E2E refresh/filter persistence assertion yet. |
 | STD-ADM-006 | FC-007 / FC-015 | Non-admin user cannot access or operate school-manager approval workflow. | P0 | Covered (API) | [api-tests/tests/01-role-gates.spec.ts](../../api-tests/tests/01-role-gates.spec.ts) — 5 tests validate 401 unauthenticated + 403 for USER/SCHOOL_MANAGER/INSTRUCTOR/STUDENT on approveSchoolManagerRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |
| STD-ADM-007 | FC-007 | Admin request filters correctly separate pending and approved school requests. | P1 | Covered (API+E2E) | API: [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts) validates status inclusion/exclusion; E2E: [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) validates filter UI behavior. |

## 4.5 School-manager member approval workflow

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-MGR-001 | FC-008 | Manager can open separate instructor and student member-request routes. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) — `manager member requests panel is split by instructors/students and supports pending/approved filtering` |
| STD-MGR-002 | FC-008 | Instructor route shows only instructor requests. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) |
| STD-MGR-003 | FC-008 | Student route shows only student requests. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) |
| STD-MGR-004 | FC-008 | Manager can filter member requests by pending status. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) |
| STD-MGR-005 | FC-008 | Manager can filter member requests by approved status. | P0 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) |
| STD-MGR-006 | FC-008 | Manager can approve an instructor request and see it move to approved view. | P0 | Covered (API+E2E) | API: [04-approvals-side-effects.spec.ts](../../api-tests/tests/04-approvals-side-effects.spec.ts) validates transition/side effects; E2E: [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) keeps route+approve smoke. |
| STD-MGR-007 | FC-008 | Manager can approve a student request and see it move to approved view. | P0 | Covered (API) | [04-approvals-side-effects.spec.ts](../../api-tests/tests/04-approvals-side-effects.spec.ts) validates student approval and profile/role side effects. |
| STD-MGR-008 | FC-008 | Manager can reject instructor request and see updated state/history. | P0 | Partial | API rejection covered in [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts), but E2E history visibility remains unproven. |
| STD-MGR-009 | FC-008 | Manager can reject student request and see updated state/history. | P0 | Partial | API rejection covered in [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts), but E2E history visibility remains unproven. |
| STD-MGR-010 | FC-008 | Manager only sees requests for their authorized school. | P0 | Covered (API) | [03-rejections-and-listing.spec.ts](../../api-tests/tests/03-rejections-and-listing.spec.ts) validates cross-school request exclusion in list operation. |
 | STD-MGR-011 | FC-015 | Unauthorized user cannot operate manager approval actions. | P0 | Covered (API) | [api-tests/tests/01-role-gates.spec.ts](../../api-tests/tests/01-role-gates.spec.ts) — 5 tests validate 401 unauthenticated + 403 for USER/SCHOOL_MANAGER/INSTRUCTOR/STUDENT on approveSchoolMemberRequest. E2E: [04-02-auth-access-control.spec.ts](../../e2e-tests/tests/04-02-auth-access-control.spec.ts). |

## 4.6 School profile management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-SCH-001 | FC-009 | Manager can open school profile page for their authorized school. | P1 | Covered | [04-14-school-profile-edit.spec.ts](../../e2e-tests/tests/04-14-school-profile-edit.spec.ts) — `[STD-SCH-003]` includes route access and page visibility setup; school selection context is managed from the shared sidebar selector. |
| STD-SCH-002 | FC-009 | School profile shows contact details, address, currency, and optional branding fields. | P1 | Inactive | PRD-relevant skipped test exists in [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) (`manager can view school profile`). |
| STD-SCH-003 | FC-009 | Manager can update school profile fields and see saved values persist after reload. | P0 | Covered | [04-14-school-profile-edit.spec.ts](../../e2e-tests/tests/04-14-school-profile-edit.spec.ts) — `[STD-SCH-003] school manager can edit school details and see persisted values`. |
| STD-SCH-004 | FC-009 | Unauthorized user cannot update another school's profile. | P0 | Gap | No active authz/scoping test for school-profile edits. |

## 4.7 Syllabus management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-SYL-001 | FC-010 | Manager can browse syllabus catalog including relevant system and school syllabuses. | P0 | Partial | [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts) covers admin visibility; [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) has only skipped manager catalog coverage. |
| STD-SYL-002 | FC-010 | Catalog communicates visibility and usage policy. | P1 | Partial | Admin catalog policy is checked in [04-04-admin-approval-workflow.spec.ts](../../e2e-tests/tests/04-04-admin-approval-workflow.spec.ts); manager-specific active validation is missing. |
| STD-SYL-003 | FC-010 | Manager can create draft syllabus from scratch. | P0 | Gap | No active creation-flow test. |
| STD-SYL-004 | FC-010 | Manager can create draft syllabus from template. | P1 | Gap | No active template-based creation test. |
| STD-SYL-005 | FC-010 | Manager can save revisions to draft syllabus content. | P0 | Gap | No active draft revision test. |
| STD-SYL-006 | FC-010 | Manager can publish draft syllabus into final version. | P0 | Gap | No active publish-flow test. |
| STD-SYL-007 | FC-010 | UI clearly distinguishes draft, final, and obsolete versions. | P1 | Gap | No active status-distinction test. |
| STD-SYL-008 | FC-016 | Manager syllabus page remains usable in RTL layout. | P1 | Covered | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) — `rtl layout: sidebar stays anchored to right on syllabuses page` |
| STD-SYL-009 | FC-016 | Manager syllabus page labels translate correctly in Hebrew. | P1 | Partial | [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts) checks that English policy text is absent, but does not assert concrete translated labels/actions. |
| STD-SYL-011 | FC-010 | Manager can delete a single editable draft syllabus after explicit confirmation. | P0 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) — `manager can delete a single draft from catalog after confirmation` |
| STD-SYL-012 | FC-010 | Manager can delete all editable drafts in scope after explicit confirmation. | P1 | Covered | [04-13-syllabus-editor-save-draft.spec.ts](../../e2e-tests/tests/04-13-syllabus-editor-save-draft.spec.ts) — `manager can delete all editable drafts from catalog after confirmation` |

## 4.8 Course creation and management

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-CRS-001 | FC-011 | Manager can create a course from a final syllabus version. | P0 | Gap | No active course-creation test. |
| STD-CRS-002 | FC-011 | Course creation captures start date and capacity settings. | P0 | Gap | No active form-field validation for course creation. |
| STD-CRS-003 | FC-011 | Course creation supports default lesson pricing. | P1 | Gap | No active pricing-field test. |
| STD-CRS-004 | FC-011 | Attempting to create a course from non-final syllabus fails with clear message. | P0 | Gap | No active negative-path test for syllabus-state enforcement. |
| STD-CRS-005 | FC-011 | Manager can view course metadata and enrollment details after creation. | P1 | Gap | No active course-details test. |
| STD-CRS-006 | FC-011 | Manager can close an open course and later reopen it from a collapsed closed-courses panel. | P0 | Covered | [04-15-course-close-reopen.spec.ts](../../e2e-tests/tests/04-15-course-close-reopen.spec.ts) — `[STD-CRS-006] manager can close and reopen a course from closed panel`. |
| STD-CRS-007 | FC-011 / FC-012 / FC-013 | Closed courses reject new enrollments and instructor assignments with clear messages. | P0 | Covered (API) | [07-course-close-reopen.spec.ts](../../api-tests/tests/07-course-close-reopen.spec.ts) — `[STD-CRS-007] enrollment and assignment are blocked for closed courses`. |

## 4.9 Student enrollment

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ENR-001 | FC-012 | Manager can view eligible students within authorized school context. | P0 | Gap | No active enrollment-flow coverage. |
| STD-ENR-002 | FC-012 | Manager can enroll student into selected course. | P0 | Gap | No active enrollment creation test. |
| STD-ENR-003 | FC-012 | Duplicate enrollment is blocked with understandable error. | P0 | Gap | No active duplicate-enrollment test. |
| STD-ENR-004 | FC-012 | Course roster updates to show newly enrolled student. | P0 | Gap | No active roster verification test. |
| STD-ENR-005 | FC-015 | Manager cannot enroll student into a course outside authorized school context. | P0 | Gap | No active cross-school authorization test. |

## 4.10 Instructor assignment

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-ASN-001 | FC-013 | Manager can view eligible instructors within authorized school context. | P0 | Gap | No active assignment-flow coverage. |
| STD-ASN-002 | FC-013 | Manager can assign instructor to selected course. | P0 | Gap | No active instructor-assignment test. |
| STD-ASN-003 | FC-013 | Duplicate assignment is blocked with understandable error. | P0 | Gap | No active duplicate-assignment test. |
| STD-ASN-004 | FC-013 | Schedule conflicts are surfaced as understandable errors. | P0 | Gap | No active conflict-handling test. |
| STD-ASN-005 | FC-013 | Qualification or business-rule conflicts are surfaced as understandable errors. | P1 | Gap | No active rule-conflict/error-message test. |
| STD-ASN-006 | FC-015 | Manager cannot assign instructor outside authorized school context. | P0 | Gap | No active cross-school authorization test. |

## 4.11 Role-based navigation

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-NAV-001 | FC-014 | System admin sees only admin-appropriate sidebar links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-002 | FC-014 | School manager sees only manager-appropriate sidebar links. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-003 | FC-014 | Each visible admin sidebar item loads the expected route. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-004 | FC-014 | Each visible manager sidebar item loads the expected route. | P0 | Covered | [04-11-role-based-navigation.spec.ts](../../e2e-tests/tests/04-11-role-based-navigation.spec.ts) |
| STD-NAV-005 | FC-014 | Instructor sees only instructor-appropriate navigation links. | P0 | Gap | No active instructor-role navigation test. |
| STD-NAV-006 | FC-014 | Student sees only student-appropriate navigation links. | P0 | Gap | No active student-role navigation test. |
| STD-NAV-007 | FC-014 | Authenticated user without elevated role does not see admin/manager links. | P0 | Gap | No active plain-user navigation visibility test. |
| STD-NAV-008 | FC-014 | Account menu shows dashboard link for elevated roles. | P1 | Covered | [04-02-account-menu-access.spec.ts](../../e2e-tests/tests/04-02-account-menu-access.spec.ts) |

## 4.12 Internationalization and RTL

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-I18N-001 | FC-016 | Login page text matches selected language for English, Hebrew, and Romanian. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-002 | FC-016 | Language selector updates `lang` and `dir` correctly across switches. | P1 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-003 | FC-016 | Browser locale auto-detection defaults to supported language or English fallback. | P2 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-004 | FC-016 | Google sign-in affordance stays visible across supported languages. | P2 | Covered | [04-12-i18n-rtl.spec.ts](../../e2e-tests/tests/04-12-i18n-rtl.spec.ts) |
| STD-I18N-005 | FC-016 | Core manager pages render without layout breakage in RTL mode. | P1 | Partial | Only syllabus catalog RTL layout is tested in [04-05-school-manager-member-approval.spec.ts](../../e2e-tests/tests/04-05-school-manager-member-approval.spec.ts); other critical manager pages are unproven. |
| STD-I18N-006 | FC-016 | Sidebar positioning remains usable in RTL layouts across manager/admin pages. | P1 | Partial | Only one manager syllabus page is covered. |
| STD-I18N-007 | FC-016 | Localized rendering does not remove access to required actions on critical manager pages. | P1 | Gap | No active test asserts translated critical actions remain present and operable on manager approval or school pages. |

## 4.13 Auditability, integrity, and user-visible error handling

| STD ID | PRD Ref | Required test | Priority | Status | Existing E2E link or gap note |
|---|---|---|---|---|---|
| STD-INT-001 | FC-006 / FC-008 | Decision status changes remain visible after refresh/navigation. | P1 | Partial | Approval-state visibility is checked within-session, but persistence after full refresh is not explicitly validated. |
| STD-INT-002 | FC-007 / FC-008 | Rejection reason and decision history remain visible to appropriate reviewer. | P1 | Gap | No active rejection-history test. |
| STD-INT-003 | FC-011 / FC-012 / FC-013 | DB constraint failures are translated into understandable user-facing errors. | P0 | Gap | No active E2E tests for friendly error messaging on invalid syllabus use, duplicate enrollment, duplicate assignment, or conflict failures. |
| STD-INT-004 | FC-006 | Concurrent duplicate submissions do not create duplicate requests. | P1 | Gap | No active race/idempotency test using parallel submission attempts. |
| STD-INT-005 | FC-012 / FC-013 | Concurrent enrollment/assignment attempts preserve integrity and show deterministic outcomes. | P1 | Gap | No active concurrency/integrity E2E coverage. |

## 5. Coverage Summary by PRD Story

| PRD Story | Coverage summary |
|---|---|
| FC-001 Browse public schools and courses | Mostly covered; optional-data tolerance still incomplete. |
| FC-002 Filter public discovery results | Mostly covered; empty-state UX messaging still incomplete. |
| FC-003 Authenticate and reach protected areas | Partial; login, i18n, and protected-route redirect are covered; account-route assertion depth and Google OAuth execution remain incomplete. |
| FC-004 Submit school-manager registration request | Partial; deep-link submission works, but real entry path and request-history coverage are missing. |
| FC-005 Submit instructor or student requests | Partial; submission exists, but school-selection validation and history coverage are incomplete. |
 | FC-006 Prevent invalid or duplicate role requests | **Covered (API)**; 5 API tests validate duplicate pending requests, approved-role hold, and concurrent race conditions. E2E smoke test also covers basic blocking. |
| FC-007 Review and decide school-manager requests | **Covered (API+E2E)**; approval/rejection/authz invariants are API-covered with E2E UI smoke retained for panel flow. Remaining gap is explicit UI refresh/filter persistence of rejected state. |
| FC-008 Review instructor and student requests separately | **Covered (API+E2E)**; instructor/student approval and rejection invariants are API-covered, with E2E route/filter/approve smoke retained. Remaining gap is dedicated E2E rejection-history visibility. |
| FC-009 Manage school profile data | Partial; profile edit persistence is covered, while explicit unauthorized cross-school profile-edit denial remains a gap. |
| FC-010 Manage syllabus lifecycle | Largely missing in active suite. |
| FC-011 Open a course from a final syllabus version | Missing in active suite. |
| FC-012 Enroll students in courses | Missing in active suite. |
| FC-013 Assign instructors to courses | Missing in active suite. |
| FC-014 Navigate admin features by role | Good for admin and manager; missing for instructor, student, and plain authenticated users. |
 | FC-015 Preserve security and authorization boundaries | **Covered (API+E2E)**; 10 API tests validate operation-level 401/403 authorization gates for approveSchoolManagerRequest and approveSchoolMemberRequest across 5 roles; E2E covers route-level denial. School-scope enforcement still needs testing. |
| FC-016 Support localized and RTL manager experiences | Partial; login and one manager page are covered, broader manager workflows are not. |

## 6. Highest-Priority Gaps to Implement Next

1. School profile view/edit authorization tests.
2. Syllabus draft-create / revise / publish workflow tests.
3. Course creation from final syllabus, including non-final rejection messaging.
4. Student enrollment happy path and duplicate/cross-school denial tests.
5. Instructor assignment happy path and conflict/duplicate/cross-school denial tests.
6. Instructor, student, and plain-user role-based navigation tests.
7. Broader RTL/localization coverage for manager-critical pages beyond syllabus catalog.
8. E2E refresh/filter persistence assertions for rejection history visibility (ADM/MGR flows).

## 7. Notes

 - As of March 2026, **43 API operation tests** under [api-tests/tests](../../api-tests/tests/) provide deterministic, database-backed validation for authorization gates, duplicate/role-hold guardrails, approval/rejection paths, listing scoping, and approval side effects. API tests validate operation-layer behavior without browser overhead; E2E suite keeps route/filter/layout and end-user smoke flows.
