# PRD: Flight Club Platform

## 1. Product overview

### 1.1 Document title and version

- PRD: Flight Club Platform
- Version: 1.0

### 1.2 Product summary

The project is a multi-role flight school management platform built on the existing Wasp and Prisma architecture. It supports public discovery of schools and courses, authenticated role requests, admin-led school onboarding, and school-manager workflows for syllabuses, course creation, member approvals, instructor assignment, and student enrollment.

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
- **Instructor**: Can access instructor-specific capabilities when implemented and must not access manager-only or admin-only workflows.
- **Instructor**: Can view their assigned courses per school via the instructor portal (Dashboard placeholder + Courses page with school-context selector) and must not access manager-only or admin-only workflows.
- **Student**: Can access student-specific capabilities when implemented and must not access manager-only or admin-only workflows.

## 4. Functional requirements

- **Public school and course discovery** (Priority: High)

  - The platform must display a public landing page with schools and visible courses.
  - Users must be able to filter schools by country and location and filter courses by name.
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
  - Course setup must support start date, capacity bounds, and default lesson pricing.
  - Managers must be able to view course enrollment details and course-level metadata.
  - Managers must be able to close a course and reopen it later from a dedicated closed-courses panel.
  - Closed courses must be hidden from public landing-page discovery and must reject new enrollments and instructor assignments until reopened.

- **Instructor assignment and student enrollment** (Priority: High)

  - School managers must be able to assign instructors to courses.
  - School managers must be able to enroll students in courses.
  - Enrollment writes must keep course-interest lifecycle state synchronized (`ENROLLED`) so Courses and Students manager views remain consistent.
  - The system must block invalid or duplicate assignments and enrollments.
  - The system should surface understandable errors when database-level constraints reject an action, such as schedule conflicts or invalid syllabus usage.

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

### 5.3 Advanced features & edge cases

- Duplicate pending role requests must be prevented or explained clearly.
- Requests for school manager role must support school creation details when no target school exists yet.
- Instructor and student role requests must support school selection and visibility of school logos and website data.
- Course creation must fail clearly when attempted from a non-final syllabus version.
- Instructor assignment must handle schedule conflict rejections gracefully.
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

## 6. Narrative

The project helps a prospective school community move from discovery to participation with less friction. A visitor finds a school and course, creates an account, requests the appropriate role, and receives approval through a clearly owned workflow. Once the school is operational, the manager uses syllabuses to open courses, assign instructors, and enroll students within a controlled system that favors clear permissions, predictable workflows, and strong data integrity.

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
- P95 response time for key Wasp queries and actions used by registration and manager workflows.
- Frequency of DB constraint violations surfaced to users, categorized by workflow.

## 8. Technical considerations

### 8.1 Integration points

- Wasp routes, pages, queries, and actions defined in the application configuration.
- Prisma schema and PostgreSQL models for users, schools, registration requests, roles, syllabuses, courses, enrollments, assignments, accounts, and transactions.
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
- Extending future workflows, such as evaluations or waitlists, without undermining current invariants.

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
