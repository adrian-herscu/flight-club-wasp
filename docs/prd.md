# PRD: Flight Club Platform

## 1. Product overview

### 1.1 Document title and version

- PRD: Flight Club Platform
- Version: 1.0

### 1.2 Product summary

The project is a multi-role flight school management platform built on the existing Wasp and Prisma architecture. It supports public discovery of schools and courses, authenticated role requests, admin-led school onboarding, and school-manager workflows for syllabuses, course creation, member approvals, instructor assignment, student enrollment, and course execution including lesson scheduling, student evaluations, instructor-absence handling, and financial settlements.

The current product direction prioritizes two outcomes: faster user registrations and better course management. Faster registrations means reducing friction for prospective school managers, instructors, and students to find the right school, request access, and receive approvals quickly. Better course management means helping school managers move from syllabus setup to live courses, roster management, and instructor coordination with fewer manual steps and fewer operational errors.

The project should continue to evolve within the existing Wasp application structure, Prisma schema, PostgreSQL-backed data model, and Playwright E2E workflow. Product decisions should respect the current role model, operation-based server architecture, and DB-enforced invariants already present in the system.

## 2. Goals

### 2.1 Business goals

- Increase conversion from anonymous visitor to authenticated registrant.
- Reduce time required to approve and activate school and member registrations.
- Improve course setup efficiency for school managers.
- Create a reliable foundation for school operations without replacing the existing Wasp/Prisma stack.
- Support incremental delivery of additional school workflows without large architectural rewrites.

### 2.2 User goals

- Let visitors quickly discover schools and visible courses.
- Let users request the correct role for the correct school with minimal friction.
- Let admins approve new school manager requests safely and consistently.
- Let school managers review instructor and student requests in separate, easy-to-process queues.
- Let school managers create, publish, and reuse syllabuses to open courses faster.
- Let school managers enroll students and assign instructors with clear guardrails.
- Let school managers start a course once minimum readiness conditions are met and track it through to completion.
- Let lead instructors schedule lessons, manage co-instructor availability, and submit student evaluations.
- Let managers and lead instructors resolve below-capacity and instructor-unavailability situations with clear escalation paths.
- Let students and non-lead instructors provide advisory attendance hints that help the lead instructor plan lesson execution.

### 2.3 Non-goals

- Replacing Wasp, Prisma, or PostgreSQL with a new architecture.
- Building a native mobile app in this phase.
- Implementing a full billing and subscription operations suite beyond the current account and transaction foundation.
- Delivering every planned workflow in the tracker, such as waitlists, full student progress dashboards, or auto-promotion logic, in the initial scope.
- Supporting offline operations.

## 3. User personas

### 3.1 Key user types

- Anonymous visitor
- Registered user without school role
- System admin
- School manager
- Instructor
- Student

### 3.2 Basic persona details

- **Anonymous visitor**: Browses the landing page to discover schools, locations, and available courses before deciding whether to register.
- **Registered user**: Has an authenticated account and wants to request one or more school-related roles.
- **System admin**: Reviews and approves school manager requests, manages platform-level users, and oversees system-wide operations.
- **School manager**: Operates one or more schools, manages school details, reviews member requests, maintains syllabuses, opens courses, assigns instructors, and enrolls students.
- **Instructor**: Requests instructor membership in a school and later participates in course delivery and student evaluations.
- **Student**: Requests student membership in a school and later participates in courses and evaluations.

### 3.3 Role-based access

- **Anonymous visitor**: Can view the public landing page, school listings, course listings, and public filters.
- **Registered user**: Can authenticate, manage account details, and submit role registration requests.
- **System admin**: Can access admin dashboard routes, user management, school manager approval flows, and platform settings.
- **School manager**: Can access manager dashboards, school profile management, instructor and student approval queues, syllabus catalog/details, course creation, instructor assignment, and student enrollment.
- **Instructor**: Can view assigned courses per school via the instructor portal; the lead instructor for a course can additionally schedule and reschedule lessons, mark non-lead co-instructors absent, and submit student evaluations; non-lead instructors can report their availability as an advisory hint; all instructors must not access manager-only or admin-only workflows.
- **Student**: Can view enrolled courses per school via the student portal, provide advisory attendance hints for scheduled lessons, view their own lesson evaluations and enrollment status, and submit refund requests; must not access manager-only or admin-only workflows.

## 4. Functional requirements

- **Public school and course discovery** (Priority: High)

  - The platform must display a public landing page with schools and visible courses.
  - Users must be able to filter schools by country and location and filter courses by name.
  - Landing-page course items must display the total course price.
  - School cards should support logos and school website visibility when available.
  - For authenticated users, landing school cards must show contact details for school managers (email and phone when available).
  - For authenticated users, landing course items must show contact details for assigned instructors (email and phone when available).
  - The landing page must work for both anonymous and authenticated users.

- **Authentication and account access** (Priority: High)

  - The platform must support email/password authentication and Google sign-in through the existing auth configuration.
  - Logging out from account navigation must redirect users to the anonymous landing page (`/`).
  - Authenticated users must be redirected to appropriate entry points and prevented from opening protected routes without authentication.
  - Users must be able to access account settings and role request entry points from the account menu.

- **Role request and registration workflow** (Priority: High)

  - Registered users must be able to request school manager, instructor, or student roles.
  - School manager requests must support new school registration details.
  - Instructor and student requests must support selection of an existing school.
  - Users must be able to review their submitted registration requests and statuses.
  - The system must prevent duplicate or conflicting pending requests for the same user, role, and school context.

- **Admin approval workflow** (Priority: High)

  - System admins must be able to review pending school manager registration requests.
  - Admin approval must create the necessary school and role associations when approved.
  - Admin rejection must record decision state and optional rejection reason.
  - Admin workflows must be auditable and constrained by existing role and entity rules.

- **School member approval workflow** (Priority: High)

  - School managers must be able to review instructor and student requests in distinct flows.
  - The manager students route must present student-course pairs sourced from course interests and support enrollment approval from that queue.
  - Manager-visible approved student entries must be backed by `CourseInterest.status = ENROLLED` for the same course and user.
  - Managers must be able to filter request views by status, including pending and approved.
  - Approval must grant the correct school role and create required supporting records.
  - Rejection must update request state and preserve decision history.

- **School profile management** (Priority: Medium)

  - School managers must be able to view and maintain school profile details, including contact details, website, logo, address, country, and currency.
  - School managers with access to more than one school must be able to switch the active school context before viewing or updating school data.
  - School updates must stay scoped to the manager’s authorized school.

- **Syllabus management** (Priority: High)

  - School managers must be able to browse a syllabus catalog containing system-visible and school-specific syllabuses.
  - Managers must be able to create draft syllabuses from scratch or from templates.
  - Managers must be able to revise draft syllabus versions and publish them to final status.
  - The system must clearly distinguish draft, final, and obsolete versions.

- **Course creation and management** (Priority: High)

  - School managers must be able to create courses only from final syllabus versions.
  - Course setup must support capacity bounds and default lesson pricing (hourly rate).
  - A course progresses through four lifecycle states: `OPEN`, `STARTED`, `COMPLETED`, and `CLOSED`.
  - Managers must be able to start a course; the system must enforce hard pre-start conditions (at least one assigned instructor designated as lead, all instructors have an agreed wage, hourly rate is set, and all enrolled student accounts have sufficient balance). Minimum enrolled student capacity is a soft condition the manager may override.
  - Manager course lists must display the total course price per student.
  - Managers must be able to view course enrollment details and course-level metadata.
  - Managers must be able to close a course and reopen it later from a dedicated closed-courses panel.
  - Closed courses must be hidden from public landing-page discovery and must reject new enrollments and instructor assignments until reopened.

- **Instructor assignment and student enrollment** (Priority: High)

  - School managers must be able to assign instructors to courses; exactly one assigned instructor must be designated as the lead instructor.
  - Each assigned instructor must have an agreed wage per hour set at assignment time; the system must reject course start if any agreed wage is missing.
  - School managers must be able to enroll students in courses. Late enrollment (after course start, before the first lesson begins) must also be supported.
  - Enrollment writes must keep course-interest lifecycle state synchronized (`ENROLLED`) so Courses and Students manager views remain consistent.
  - Student enrollment is locked once the first lesson reaches `LESSON_UNDERWAY`.
  - The system must block invalid or duplicate assignments and enrollments.
  - The system should surface understandable errors when database-level constraints reject an action, such as schedule conflicts or invalid syllabus usage.

- **Course execution and lesson delivery** (Priority: High)

  - Once a course is started, the lead instructor must be able to schedule each lesson by proposing a date and location; the system must reject proposals that conflict with the lead instructor's other `CONFIRMED` or in-progress lessons across all courses.
  - Students and non-lead instructors may provide advisory attendance hints (accept, decline, or re-accept freely) for any scheduled lesson before the lesson date is reached; these hints do not change lesson status and do not constitute binding commitments.
  - The system must automatically evaluate hint counts at the lesson date: if accepted student count meets minimum capacity the lesson is confirmed; if not, the lesson enters a below-capacity state requiring lead instructor action.
  - When a lesson is below capacity, the lead instructor must be able to reschedule it, or escalate to the manager with a suggestion to proceed with partial attendance or close the course.
  - The lead instructor must be able to reschedule a confirmed lesson before its date if they become unavailable.
  - When a non-lead instructor reports unavailability, the lead instructor must be able to either reschedule the lesson or mark the co-instructor absent and proceed; an absent co-instructor receives no pay for that lesson.
  - Once a lesson is underway, the lead instructor must be able to submit a pass/fail evaluation with optional notes for each active enrolled student; marking a student absent automatically results in a fail.
  - A student who fails a lesson is immediately removed from all future lesson requirements and the course counts toward completion once all students are either certified or failed.
  - The system must charge each enrolled student the full course fee when the course is started (and immediately on late enrollment), and must pay each attending instructor their agreed wage when each lesson concludes.
  - Students must be able to submit refund requests for started, completed, or closed courses; managers must be able to approve (with a specified amount up to the amount paid) or decline requests.
  - All financial operations are append-only; corrections are made via compensating transactions only.

- **Internationalization and responsive admin navigation** (Priority: Medium)

  - Core manager and admin routes must remain usable in localized and RTL contexts.
  - Sidebar navigation must expose only role-appropriate links.

- **Auditability and data integrity** (Priority: High)

  - Core operational data must preserve DB-enforced integrity rules and append-only audit patterns already present in the schema and migrations.
  - Product requirements must not rely on mutable behavior where database triggers intentionally enforce immutability.

## 5. User experience

### 5.1 Entry points & first-time user flow

- Anonymous users land on the public home page and browse schools and courses.
- A user signs in or creates an account via email or Google.
- After authentication, the user either continues a pending course-interest action from landing or reaches the registration flow to request school manager, instructor, or student access.
- System admins enter through the admin dashboard and review school manager onboarding requests.
- School managers enter through the admin area and use dedicated sidebar routes for school setup, member approvals, and syllabus/course operations.

### 5.2 Core experience

- **Discover schools and courses**: Visitors can quickly see which schools exist, where they are located, and which courses are visible.

  - This ensures the platform is useful before sign-up and supports faster conversion into registrations.

- **Request the right role**: Authenticated users choose a role and provide only the information relevant to that role.

  - This reduces registration friction and lowers review overhead for admins and managers.

- **Approve requests efficiently**: Admins and managers process queues that are separated by decision-maker and member type.

  - This shortens approval cycles and reduces routing mistakes.

- **Turn syllabuses into live courses**: Managers move from draft syllabus content to final syllabus versions and then open a course from the approved version.

  - This creates a clear operational path from curriculum design to execution.

- **Populate a course safely**: Managers assign instructors and enroll students using guarded workflows.

  - This reduces manual coordination errors and respects existing data integrity rules.

- **Deliver a lesson safely**: The lead instructor schedules each lesson, monitors attendance hints from students and co-instructors, and decides whether to proceed, reschedule, or escalate to the manager.

  - This gives the lead instructor full situational control while providing a clear escalation path to the manager when capacity or co-instructor issues arise.

### 5.3 Advanced features & edge cases

- Duplicate pending role requests must be prevented or explained clearly.
- Requests for school manager role must support school creation details when no target school exists yet.
- Instructor and student role requests must support school selection and visibility of school logos and website data.
- Course creation must fail clearly when attempted from a non-final syllabus version.
- Instructor assignment must enforce exactly one lead instructor per course and must reject proposals that overlap the lead instructor's other confirmed or in-progress lessons across all courses.
- A course start must be blocked with a clear error if any hard pre-start guard fails (missing lead, missing agreed wage, missing hourly rate, or any student account has insufficient balance).
- When a lesson reaches its date with insufficient accepted student hints, the below-capacity state must be visible to the lead instructor with clear action options: reschedule, proceed with partial, or suggest closing the course.
- When a non-lead instructor reports unavailability, the lead instructor must see this prominently and be offered the choice to reschedule or confirm absence and proceed without that instructor.
- Student and non-lead instructor attendance hints are advisory only: the system must make clear that hints do not commit the responder to attendance and that no-response is a valid state.
- A student who is marked absent at a lesson is immediately failed; the system must notify the manager and instructor that a resolution decision (re-enroll in a new course or refund) is needed.
- Manager-only routes must not appear for unauthorized roles.
- RTL layout and translated labels must remain usable for navigation-heavy manager pages.
- Optional school metadata, such as website URL and logo, must not break the public or registration experience when absent.

### 5.4 UI/UX highlights

- Public landing page with searchable school and course discovery.
- Separate manager request views for instructors and students, with the students route focused on course-interest enrollment pairs.
- Sidebar navigation that adapts by role.
- Manager syllabus views that communicate visibility and usage policy.
- Account menu shortcuts for dashboard and role requests.
- Responsive layout with RTL support for core manager workflows.
- Lead instructor lesson view showing current lesson status, per-student and per-co-instructor hint counts, and available actions (reschedule, evaluate, escalate).
- Student and non-lead instructor lesson view showing the proposed date and location with simple accept/decline toggle before the lesson date.

## 6. Narrative

The project helps a prospective school community move from discovery to participation with less friction. A visitor finds a school and course, creates an account, requests the appropriate role, and receives approval through a clearly owned workflow. Once the school is operational, the manager uses syllabuses to open courses, assign instructors, and enroll students within a controlled system that favors clear permissions, predictable workflows, and strong data integrity. When the manager starts a course, financial charges are recorded and the lead instructor takes over lesson coordination: proposing dates, monitoring advisory attendance hints, submitting evaluations, and settling instructor payments lesson by lesson until every student reaches a certified or failed outcome and the course completes.

## 7. Success metrics

### 7.1 User-centric metrics

- Median time from user signup to submitted role request.
- Median time from submitted request to approval decision.
- Percentage of users who complete a role request after viewing the registration page.
- Percentage of managers who create a course after viewing syllabus details.
- Reduction in user-reported confusion around role routing and approval status.

### 7.2 Business metrics

- Number of active schools onboarded.
- Number of approved school managers, instructors, and students per month.
- Number of courses opened per school.
- Growth in public visitor-to-registered-user conversion.

### 7.3 Technical metrics

- E2E pass rate for landing, auth, registration, role navigation, and manager workflows.
- Error rate for registration submission, approval actions, course creation, enrollment, and assignment actions.
- Error rate for course start, lesson scheduling, evaluation submission, and refund actions.
- P95 response time for key Wasp queries and actions used by registration and manager workflows.
- P95 response time for lesson scheduling, evaluation, and financial settlement actions.
- Frequency of DB constraint violations surfaced to users, categorized by workflow.
- Cron job reliability: percentage of `SCHEDULED` and `CONFIRMED` lessons that transition on time within one cron interval of the lesson date.

## 8. Technical considerations

### 8.1 Integration points

- Wasp routes, pages, queries, and actions defined in the application configuration.
- Prisma schema and PostgreSQL models for users, schools, registration requests, roles, syllabuses, courses, enrollments, assignments, accounts, transactions, meeting attendance, instructor suggestions, instructor lesson presence, and refund requests.
- PgBoss recurring job (`lessonStatusJob`) for automatic lesson status transitions at lesson date boundaries.
- Existing email and Google authentication flows.
- SendGrid-based email sender configuration.
- Playwright E2E suite for validating landing, auth, navigation, registration, and manager workflows.

### 8.2 Data storage & privacy

- Use the existing PostgreSQL and Prisma data model as the source of truth for operational data.
- Store only necessary registration and school profile information needed for approvals and school operations.
- Protect protected routes with authentication and role-aware authorization.
- Preserve auditability for key operational events and decision history.
- Treat identity-linked fields and personal data, such as email, full name, and phone, as protected user information.

### 8.3 Scalability & performance

- Prefer focused Wasp queries with explicit entity declarations.
- Support pagination for larger admin and manager lists as usage grows.
- Promote repeated high-value read patterns to DB views when reuse justifies it.
- Preserve server-side validation while keeping client-side flows responsive.
- Monitor manager workflows that aggregate courses, enrollments, or requests for query growth.

### 8.4 Potential challenges

- Coordinating a multi-role approval system across admin and manager responsibilities.
- Translating DB-level trigger failures into friendly application errors.
- Working within append-only or immutable domain patterns already enforced in the database.
- Preventing duplicate requests, enrollments, and assignments under concurrent usage.
- Balancing system-level syllabus visibility with school-specific drafts and final versions.
- Cron job timing: lesson status transitions depend on a recurring PgBoss job; clock skew or job backlog can delay `CONFIRMED` or `LESSON_UNDERWAY` transitions and must be handled gracefully.
- Cross-course schedule overlap checks for instructor assignment and lesson scheduling require efficient queries across all courses an instructor is assigned to.
- Extending future workflows, such as weather-triggered rescheduling notifications, waitlists, or evaluations, without undermining current invariants.

## 9. Milestones & sequencing

### 9.1 Project estimate

- Medium-Large: 12-16 weeks for a focused production-ready release across registration and manager operations.

### 9.2 Team size & composition

- 4-6 people: product manager, full-stack Wasp engineer, frontend engineer, backend/data engineer, QA automation engineer, and part-time designer.

### 9.3 Suggested phases

- **Phase 1**: Registration foundation and public discovery (2-3 weeks)

  - Key deliverables: landing discovery, authentication, role request flows, request history, baseline E2E coverage.

- **Phase 2**: Admin and manager approvals (2-3 weeks)

  - Key deliverables: school manager approval flow, instructor/student approval queues, status filtering, audit-friendly decision capture.

- **Phase 3**: Syllabus and course operations (3-4 weeks)

  - Key deliverables: syllabus catalog, draft creation, publishing, course creation from final versions, course overview improvements.

- **Phase 4**: Enrollment and instructor assignment hardening (2-3 weeks)

  - Key deliverables: instructor assignment UX, student enrollment UX, clearer constraint-driven error handling, role-aware navigation validation.

- **Phase 5**: Operational polish and readiness (2-3 weeks)

  - Key deliverables: localization and RTL hardening, responsive UX polish, observability metrics, broader E2E coverage, documentation updates.

## 10. User stories

### 10.1 Browse public schools and courses

- **ID**: FC-001
- **Description**: As an anonymous visitor, I want to browse schools and visible courses so that I can decide whether the platform is relevant to me.
- **Acceptance criteria**:

  - The landing page displays at least one school card when seeded or published school data exists.
  - Each school card shows the school name and location.
  - Visible course items appear under the appropriate school when course data exists.
  - Missing optional school data, such as logo or website URL, does not break rendering.

### 10.2 Filter public discovery results

- **ID**: FC-002
- **Description**: As an anonymous or authenticated visitor, I want to filter schools and courses so that I can find relevant options faster.
- **Acceptance criteria**:

  - Users can filter courses by course name text.
  - Users can filter schools by location text.
  - Users can filter schools by country.
  - Applying a filter updates the visible result set without requiring authentication.

### 10.3 Authenticate and reach protected areas

- **ID**: FC-003
- **Description**: As a user, I want to sign in and access protected workflows so that I can manage my account and requests securely.
- **Acceptance criteria**:

  - Users can authenticate with the configured email/password method.
  - Users can authenticate with Google when provider configuration is enabled.
  - Unauthenticated access to protected routes redirects to the login page.
  - Authenticated users can open the account page and protected routes allowed by their role.

### 10.4 Submit a school manager registration request

- **ID**: FC-004
- **Description**: As a registered user, I want to request school manager access and provide school details so that I can onboard a new school.
- **Acceptance criteria**:

  - A signed-in user can select the school manager role in the registration flow.
  - The form collects school-specific details required to create a new school request.
  - Submitting the form creates a pending registration request.
  - The user can later see the submitted request and its status.

### 10.5 Submit an instructor registration request

- **ID**: FC-005
- **Description**: As a registered user, I want to request instructor access for a selected school so that I can join that school in the right capacity.
- **Acceptance criteria**:

  - A signed-in user can select the instructor role in the registration flow.
  - The form requires selection of an existing school.
  - School options include recognizable school identity, including website and logo where available.
  - Submission creates a pending request tied to the selected school.
  - Student membership is not available through the registration form; students join by expressing interest in a course and receiving manager approval.

### 10.6 Prevent invalid or duplicate role requests

- **ID**: FC-006
- **Description**: As a registered user, I want clear protection against duplicate or conflicting requests so that I do not create unnecessary review work.
- **Acceptance criteria**:

  - The system prevents duplicate pending requests for the same user, role, and school context.
  - The system returns a clear error or inline message when a request cannot be submitted.
  - Existing approved roles cannot be re-requested without a defined escalation path.
  - Request prevention logic applies consistently across school manager and instructor request types.

### 10.7 Review and decide school manager requests

- **ID**: FC-007
- **Description**: As a system admin, I want to review pending school manager requests so that I can approve valid schools and reject invalid ones.
- **Acceptance criteria**:

  - Admins can open a dedicated list of pending school manager requests.
  - Approving a request records a decision and provisions the required school and role relationships.
  - Rejecting a request records a rejection decision and optional reason.
  - Non-admin users cannot access or operate this approval workflow.

### 10.8 Review instructor and student requests separately

- **ID**: FC-008
- **Description**: As a school manager, I want distinct instructor and student approval queues so that I can process school membership faster and with less confusion.
- **Acceptance criteria**:

  - Managers can open separate instructor and student member-request routes.
  - Each route displays only requests relevant to the selected member type.
  - Managers can filter visible requests by status, including pending and approved.
  - Approval and rejection actions update the request state and remain visible in the appropriate filtered view.

### 10.9 Manage school profile data

- **ID**: FC-009
- **Description**: As a school manager, I want to view and update my school profile so that public and operational information stays accurate.
- **Acceptance criteria**:

  - Managers can access a school profile page for their authorized school.
  - The page shows contact and address fields, currency, and optional branding fields.
  - Managers with access to multiple schools can switch the active school context before viewing or editing school data.
  - Saved changes persist to the school record for the authorized school only.
  - Unauthorized users cannot update another school’s profile.

### 10.10 Manage syllabus lifecycle

- **ID**: FC-010
- **Description**: As a school manager, I want to create, revise, and publish syllabuses so that I can standardize course content before opening courses.
- **Acceptance criteria**:

  - Managers can browse a syllabus catalog that includes relevant system and school syllabuses.
  - Managers can create a draft syllabus from scratch or from a template.
  - Managers can save revisions to draft syllabus content.
  - Managers can publish a draft and produce a final syllabus version.

### 10.11 Open a course from a final syllabus version

- **ID**: FC-011
- **Description**: As a school manager, I want to open a course from a final syllabus version so that course delivery starts from approved curriculum.
- **Acceptance criteria**:

  - Managers can open a course using a final syllabus version.
  - Course creation captures start date and capacity settings.
  - The workflow supports default lesson pricing.
  - Attempting to create a course from a non-final syllabus version fails with a clear message.

### 10.12 Enroll students in courses

- **ID**: FC-012
- **Description**: As a school manager, I want to enroll students in courses so that the course roster is accurate and actionable.
- **Acceptance criteria**:

  - Managers can view eligible students for enrollment in their school context.
  - Managers can enroll a student into a selected course.
  - Duplicate enrollment is blocked.
  - The course roster updates to show the enrolled student.

### 10.13 Assign instructors to courses

- **ID**: FC-013
- **Description**: As a school manager, I want to assign instructors to courses so that delivery staffing is tracked and validated.
- **Acceptance criteria**:

  - Managers can view eligible instructors for assignment in their school context.
  - Managers can assign an instructor to a selected course.
  - Duplicate assignment is blocked.
  - Schedule or qualification conflicts are surfaced as understandable errors.

### 10.14 Navigate admin features by role

- **ID**: FC-014
- **Description**: As an authenticated user with elevated permissions, I want to see only the navigation options relevant to my role so that I can reach my workflows without confusion or unauthorized access.
- **Acceptance criteria**:

  - System admins see admin-appropriate navigation links.
  - School managers see manager-appropriate navigation links.
  - Unauthorized links are hidden from users without the required role.
  - Clicking each visible navigation item loads the expected route.

### 10.15 Preserve security and authorization boundaries

- **ID**: FC-015
- **Description**: As the platform owner, I want secure authentication and authorization boundaries so that only permitted users can access sensitive data and actions.
- **Acceptance criteria**:

  - Protected routes require authentication.
  - Sensitive admin actions are restricted to admin users.
  - Sensitive manager actions are restricted to authorized school managers.
  - Registration, approval, and course-management actions validate user authorization on the server side.

### 10.16 Support localized and RTL manager experiences

- **ID**: FC-016
- **Description**: As a manager using a non-default locale, I want key admin pages to remain usable in translated and RTL contexts so that I can complete my work reliably.
- **Acceptance criteria**:

  - Core manager pages render without layout breakage in RTL mode.
  - Sidebar positioning remains usable in RTL layouts.
  - Key labels on critical manager pages can be translated.
  - Localized rendering does not remove access to required actions or route navigation.

### 10.17 Express course interest (course-first student flow)

- **ID**: FC-017
- **Description**: As a prospective student, I want to express interest in a specific course from the landing page so that I can start my enrollment journey from a course, not a school.
- **Acceptance criteria**:

  - A logged-in user can click "I'm Interested" on any course item on the landing page and have a `CourseInterest(INTERESTED)` record created.
  - On the first unauthenticated click of "I'm Interested", the app persists a single pending course intent on the client and redirects to the login page.
  - While that pending unauthenticated intent exists, additional anonymous "I'm Interested" clicks are ignored and do not replace the first selected course.
  - After login/signup, the pending course intent is consumed at most once, converted into `CourseInterest(INTERESTED)` if needed, and then cleared.
  - Expressing interest on an already-INTERESTED course is idempotent.
  - On landing, pre-enrollment courses marked `INTERESTED` stay visibly interested, and clicking "Interested" again cancels that interest.
  - A cancelled pre-enrollment interest can later be re-opened from landing by clicking "I'm Interested" again.
  - On landing, courses approved to `ENROLLED` for the signed-in user show an "Enrolled" label.
  - The student dashboard shows a "My Interests" list with course title, school name, and current status.
  - A school manager can view pending course-interest records for their school's courses in the Courses page.
  - A school manager can cancel a pending interest before enrollment from the students queue.
  - All interest operations enforce authentication and role authorization on the server side.

### 10.18 Start a course

- **ID**: FC-018
- **Description**: As a school manager, I want to start a course so that scheduled lesson delivery can begin.
- **Acceptance criteria**:

  - Starting a course is blocked when any hard guard fails: no assigned instructor, no lead instructor, missing hourly rate, missing agreed wage for any instructor, prior STARTED event already exists, or any enrolled student's account has insufficient balance.
  - Minimum capacity is a soft condition the manager may override with explicit confirmation.
  - Successful start appends a STARTED CourseLifecycleEvent and charges each enrolled student the full course fee.

### 10.19 Schedule and reschedule a lesson

- **ID**: FC-019
- **Description**: As a lead instructor, I want to schedule and reschedule lessons so that students and co-instructors know when and where to meet.
- **Acceptance criteria**:

  - Lead instructor can propose a date and location for the current syllabus lesson.
  - Proposals that overlap the lead instructor's other CONFIRMED or LESSON_UNDERWAY lessons across all courses are rejected.
  - Rescheduling resets all student attendance hints and co-instructor presence records.
  - A CONFIRMED lesson can be rescheduled before its date.

### 10.20 Provide advisory attendance hints

- **ID**: FC-020
- **Description**: As a student or non-lead instructor, I want to signal whether I can attend a scheduled lesson so that the lead instructor has planning information.
- **Acceptance criteria**:

  - Students can accept, decline, or re-accept any number of times before the lesson date.
  - Non-lead instructors can confirm or report unavailability any number of times before the lesson date.
  - Hints are locked once the lesson date is reached.
  - Hints do not change lesson status.

### 10.21 Resolve below-capacity lessons

- **ID**: FC-021
- **Description**: As a lead instructor or manager, I want to resolve a lesson that reached its date with insufficient accepted students so that the course can continue or be closed appropriately.
- **Acceptance criteria**:

  - Lead instructor can reschedule the lesson, submit a proceed-with-partial suggestion, or submit a close-course suggestion.
  - Manager can approve a proceed-with-partial suggestion (advances lesson to CONFIRMED) or a close-course suggestion (closes the course).
  - At most one pending suggestion can exist per lesson at a time.

### 10.22 Submit student evaluations

- **ID**: FC-022
- **Description**: As a lead instructor, I want to submit pass/fail evaluations for each active enrolled student after a lesson so that enrollment outcomes are recorded.
- **Acceptance criteria**:

  - Lead instructor can submit a PASS or FAIL evaluation with optional notes for each ACTIVE student once the lesson is LESSON_UNDERWAY.
  - Marking a student absent (attended=false) automatically results in FAIL.
  - A failed student is immediately removed from all future lesson requirements.
  - When all active students have evaluations, the lesson transitions to LESSON_CONCLUDED and instructors are paid.

### 10.23 Mark co-instructor absent

- **ID**: FC-023
- **Description**: As a lead instructor, I want to mark a co-instructor absent so that they are excluded from lesson pay.
- **Acceptance criteria**:

  - Lead instructor can mark a DECLINED co-instructor as ABSENT before the lesson date or during LESSON_UNDERWAY before all assessments are submitted.
  - An ABSENT co-instructor receives no pay transaction at LESSON_CONCLUDED.
  - A co-instructor can still toggle their own availability hint independently of the lead instructor's ABSENT decision.

### 10.24 Submit and manage refund requests

- **ID**: FC-024
- **Description**: As a student, I want to submit a refund request, and as a manager, I want to approve or decline it, so that financial resolutions are handled within the platform.
- **Acceptance criteria**:

  - Students can submit a refund request for a STARTED, COMPLETED, or CLOSED course.
  - At most one PENDING refund request per student per course at a time.
  - Managers can approve with a specified amount up to the total amount paid, or decline.
  - Approval triggers a refund transaction pair; the student is notified either way.

### 10.25 Complete a course

- **ID**: FC-025
- **Description**: As the system, I want to automatically complete a course when all students are resolved so that the course lifecycle closes cleanly.
- **Acceptance criteria**:

  - Course transitions to COMPLETED automatically when every EnrolledStudent has status CERTIFIED or FAILED.
  - Any remaining SCHEDULED, BELOW_CAPACITY, or CONFIRMED lessons are cancelled on completion.
  - COMPLETED is a terminal state; no further transitions are possible.
