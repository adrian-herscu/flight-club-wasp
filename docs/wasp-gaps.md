# Wasp Framework Gaps & Workarounds

Analysis of where Wasp's constraints clash with Flight Club's requirements, with current workarounds and risk assessments.

---

## 1. Multi-Role Auth — HIGH severity

**Requirement:** A 4-level role hierarchy (System Admin → School Manager → Instructor → Student) that is also *school-scoped* — a user can be an instructor at one school and a student at another.

**Wasp constraint:** Single `User` model with one binary flag (`isSystemAdmin`). No concept of scoped roles.

**Current workaround:**
- Custom `UserSchoolRole` model in Prisma enforces school-scoped roles
- Guard helpers `ensureSystemAdmin()` and `ensureSchoolManager()` hand-written and called at every operation entry point
- `src/shared/roles.ts` bridges Wasp's auth context to the custom role model

**Risk:** Auth logic is duplicated across 100+ operation call sites in `src/registration/operations.ts` and `src/school-manager/operations.ts`. One missed check silently breaks access control. No compile-time safety.

---

## 2. Multi-Tenancy — HIGH severity

**Requirement:** Each school manager accesses only their own school(s). Data isolation must be enforced at every query.

**Wasp constraint:** No tenant context concept. No declarative data scoping.

**Current workaround:**
- Every Prisma query manually adds `where: { schoolId: managedSchool.id }`
- `getManagedSchoolForUserId()` helper must be called before every school-manager operation
- Active school is stored in `localStorage` and broadcast via `CustomEvent` in `src/school-manager/useManagedSchoolSelection.ts`

**Risk:** One missed `where` clause = data leak across tenants. The localStorage + CustomEvent pattern for school selection is fragile and not type-safe.

---

## 3. Static Routing Only — HIGH severity

**Requirement:** School managers may manage multiple schools; routes should reflect the active school context (e.g., `/school-manager/:schoolId/courses`).

**Wasp constraint:** All routes must be declared statically in `main.wasp`. No dynamic route segments.

**Current workaround:**
- Routes are flat: `/school-manager/courses`, `/school-manager/syllabuses`, etc.
- `schoolId` is passed as a query parameter or read from `localStorage`
- React Router's `useSearchParams()` used to manually forward `schoolId` into every server operation call

**Risk:** No bookmarkable per-school URLs. No URL-driven context. Sharing or deep-linking to a school-specific view is not possible.

---

## 4. No Authorization Framework — HIGH severity

**Requirement:** Hundreds of fine-grained authorization decisions:
- Can this user approve school manager requests? (system admin only)
- Can this user approve member requests for this school? (school manager of that school only)
- Can this user view/edit a syllabus? (school manager of the owning school, or system admin)

**Wasp constraint:** Wasp provides `context.user` and nothing else. No RBAC, no policy layer, no middleware hooks.

**Current workaround:**
- `ensureSystemAdmin()` and `ensureSchoolManager()` re-implemented in at least two separate files (`src/registration/operations.ts`, `src/school-manager/operations.ts`) with slight variations
- No centralized policy object or authorization service

**Risk:** Auth logic diverges over time between files. No way to declare "this action requires `SCHOOL_MANAGER` role for the school in `args.schoolId`" — every operation must implement this manually.

---

## 5. Approval Workflows — MEDIUM severity

**Requirement:** Multi-stage role approval: user signs up → requests role → admin/manager reviews → role is granted, with full audit trail.

**Wasp constraint:** Auth is signup-only. No hook for post-signup role assignment workflows.

**Current workaround:**
- Full `RegistrationRequest` model with state machine (`PENDING → APPROVED / REJECTED`) built entirely in user-land
- `approveSchoolManagerRequest` action manually orchestrates 7 DB operations inside a Prisma transaction: validate reviewer, check request state, create `School`, create `Account`, upsert `UserSchoolRole`, create `RegistrationRequestDecision`, update `RegistrationRequest` status

**Risk:** All state transitions and side effects are hand-coded with no framework support. Any missed step or transaction error must be caught and mapped to user-friendly messages manually.

---

## 6. Append-Only DB Design — MEDIUM severity

**Requirement:** 13 core tables are append-only — rows cannot be updated or deleted once created (audit integrity requirement).

**Wasp constraint:** Prisma has no immutability concept. Wasp has no DB trigger support.

**Current workaround:**
- PostgreSQL `BEFORE UPDATE` and `BEFORE DELETE` triggers on 13 tables unconditionally raise exceptions
- `AFTER INSERT` triggers write to `AuditLog`
- Operations must `try/catch` every Prisma write and map generic DB errors to `HttpError` responses

**Risk:** Trigger constraint violations surface as opaque `PrismaClientKnownRequestError` codes rather than structured application errors. Error messages must be generic because the trigger provides no structured context back through Prisma.

---

## 7. File Uploads — MEDIUM severity (unresolved)

**Requirement:** School logos, course materials, and potentially instructor credentials need file upload support.

**Wasp constraint:** File uploads are not a first-class feature. No built-in S3 integration or multipart handling.

**Current status:** AWS SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/s3-request-presigner`) is installed and a `File` model exists in `schema.prisma` — but **nothing is wired up**. Logo URLs are currently stored as plain strings.

**Required workaround (not yet implemented):**
1. Generate presigned URL in a Wasp action
2. Return URL to client
3. Client uploads directly to S3
4. Client posts the S3 key back in a second action to persist in DB

**Risk:** Deferred work. The 4-step presigned URL flow must be entirely hand-coded with no framework support for progress, validation, or cleanup of orphaned uploads.

---

## 8. Query Optimization / N+1 — MEDIUM severity

**Requirement:** Manager dashboards load large lists of syllabuses, courses, enrollments, instructors, and students — all in a single view.

**Wasp constraint:** Wasp's RPC model does no query optimization. No lazy loading, no batching, no query planning.

**Current workaround:**
- Every list operation manually constructs deep `include/select` Prisma calls to avoid N+1 (e.g., `getManagerSyllabusCatalog` in `src/school-manager/operations.ts`)
- Custom DTOs returned instead of raw entities
- Pagination hand-coded on every list operation

**Risk:** Developer discipline is the only guard against N+1 regressions. Complex cross-entity reports (e.g., "courses by instructor by school") require raw SQL via `prisma.$queryRaw`.

---

## 9. Background Jobs — LOW severity (deferred)

**Requirement:** Future needs include reminder emails before courses start, auto-progression of students, and cleanup of stale draft syllabuses.

**Wasp constraint:** Wasp's job support is experimental and not used in this project.

**Current status:** No background jobs. All async communication is email-only via SendGrid. A `// TODO implement` exists in `src/admin/elements/settings/SettingsPage.tsx`.

**Risk:** If jobs are needed, an external service (e.g., Bull + Redis, Trigger.dev) must be bolted on outside Wasp's model. This may require custom Express middleware, which Wasp does not support declaratively.

---

## 10. Real-Time / WebSockets — LOW severity (deferred)

**Requirement:** Real-time notifications would improve UX (e.g., "Your registration was approved", "A student enrolled in your course").

**Wasp constraint:** WebSocket support in Wasp is minimal.

**Current status:** No WebSocket usage. Email-only notification workflow.

**Risk:** Adding real-time would require either a third-party service (e.g., Ably, Pusher) or custom Express WebSocket middleware — both outside Wasp's declarative model.

---

## Summary Table

| Gap | Severity | Status | Key Files |
|-----|----------|--------|-----------|
| Multi-role auth | HIGH | Worked around | `src/registration/operations.ts`, `src/shared/roles.ts` |
| Multi-tenancy | HIGH | Worked around | `src/school-manager/operations.ts`, `src/school-manager/useManagedSchoolSelection.ts` |
| Static routing | HIGH | Worked around | `main.wasp`, `src/school-manager/*Page.tsx` |
| No auth framework | HIGH | Worked around | `src/registration/operations.ts`, `src/school-manager/operations.ts` |
| Approval workflows | MEDIUM | Worked around | `src/registration/operations.ts` |
| Append-only DB | MEDIUM | Worked around | `migrations/`, `src/school-manager/operations.ts` |
| File uploads | MEDIUM | **Unresolved** | `schema.prisma` (`File` model), `package.json` |
| Query optimization | MEDIUM | Worked around | `src/school-manager/operations.ts` |
| Background jobs | LOW | Deferred | `src/admin/elements/settings/SettingsPage.tsx` |
| Real-time / WebSockets | LOW | Deferred | — |

---

## Key Observation

The three HIGH severity gaps share the same root cause: **Wasp was designed for simple single-role SaaS apps with a single tenant.** This project effectively rebuilt a role/permission system and a multi-tenancy layer from scratch on top of Wasp.

The most fragile area is the **duplicated permission guards across 100+ operation call sites** — this is the most likely source of future security bugs. A centralized authorization service or policy object (even a simple one) would reduce that risk significantly.
