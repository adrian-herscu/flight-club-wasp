# ADR-001: Authorized Context Wrappers for Server Operations

**Status:** Accepted  
**Date:** 2026-04-08

---

## Context

Wasp provides a minimal `context.user` object derived from the session token at request time. It contains only `id` and `isSystemAdmin` — no role information, and no school association.

Flight Club requires per-school role enforcement across every server operation:
- A user can be `INSTRUCTOR` at School A and `STUDENT` at School B simultaneously
- Roles can be revoked at any time (`revokedAt` column)
- The currently active school must be resolved from the request arguments

Before this change, each operation independently called guard functions and resolved the school:

```typescript
// Repeated boilerplate in every operation (20+ locations):
export const someOperation = async (rawArgs, context) => {
  const user = await ensureSchoolManager(context);       // forgettable
  const schoolId = getOptionalSchoolIdFromArgs(rawArgs); // forgettable
  const school = await getManagedSchoolForUserId(user.id, schoolId); // forgettable
  // ...business logic
};
```

This pattern had three failure modes:
1. A developer could forget to call a guard and ship an unauthorized operation
2. The guard implementations diverged between `registration/operations.ts` and `school-manager/operations.ts` (duplicate code, slightly different error messages)
3. There was no structural enforcement — the type system could not help

---

## Decision

We introduced **authorized context wrappers** in `src/server/guards.ts`. Each wrapper is a higher-order function that:

1. Receives the raw `RequestContext` from Wasp
2. Performs the authorization check and school resolution
3. Passes a pre-authorized, typed context to the inner handler

The inner handler never receives a `RequestContext` — only a sealed context type. This makes it structurally impossible to write an operation without going through authorization.

### Context types

| Type | Fields | Guarantee |
|------|--------|-----------|
| `AuthenticatedContext` | `user` | Session is valid |
| `SystemAdminContext` | `user` | `isSystemAdmin === true` |
| `SchoolManagerContext` | `user`, `school` | Active `SCHOOL_MANAGER` role + school resolved from args |
| `SyllabusOperatorContext` | `user`, `school\|null` | Manager or sysadmin; `school` is `null` for sysadmins |

### Wrapper API

```typescript
export const myOperation = withSchoolManager(async (rawArgs, ctx) => {
  // ctx.user  — guaranteed AuthenticatedUser
  // ctx.school — guaranteed SchoolWithAccounts, scoped to the active school
  // rawArgs   — still available for parsing operation-specific arguments
});
```

### Why roles must never enter the token or `RequestContext`

`context.user` is decoded from a session token — it reflects state at login time, not current state. `UserSchoolRole` rows have a `revokedAt` timestamp and are per-school, meaning a single user can have different roles at different schools. There is no correct way to encode this in a flat token field. Every authorization decision must be a live DB query against `UserSchoolRole`.

---

## Consequences

### Benefits

- **Structural enforcement**: the inner handler receives `SchoolManagerContext`, not `RequestContext`. You cannot accidentally call business logic without the guard having run.
- **Single definition**: all authorization logic lives in `src/server/guards.ts`. There is one place to fix, one place to audit.
- **School scope is resolved once**: the wrapper calls `getManagedSchoolForUserId` before handing control to the handler. The handler always has a concrete, validated school — no extra DB call needed inside the operation.
- **Readable intent**: `export const closeCourse = withSchoolManager(...)` declares access requirements at the definition site, not buried inside the function body.

### Trade-offs

- **`getMyManagedSchool` is an exception**: this operation needs role verification but intentionally returns *all* managed schools, not one. It uses `ensureSchoolManager` directly and is typed with `RequestContext`. This is documented by convention — operations using direct guards are the exception, not the rule.
- **`getRegistrationSchoolOptions` has no auth**: this operation returns the public school list for the registration form. It intentionally has no guard.
- **Wrapper adds two DB calls** for `withSchoolManager`/`withSyllabusOperator` operations: one for the role check (`userSchoolRole.findFirst`) and one for the school fetch (`school.findFirst`). These were already present — the wrapper just consolidates them.

---

## Implementation

- `src/server/guards.ts` — context types, low-level guards, and wrapper functions
- `src/registration/operations.ts` — 8 operations converted to wrappers
- `src/school-manager/operations.ts` — 17 operations converted to wrappers

### Adding a new operation (after this ADR)

```typescript
// 1. Pick the wrapper that matches the required access level
export const myNewOp = withSchoolManager(async (rawArgs, ctx) => {
  // 2. Parse args
  const { someId } = ensureArgsSchemaOrThrowHttpError(mySchema, rawArgs);

  // 3. Use ctx.user.id and ctx.school.id — already authorized
  const result = await prisma.something.findFirst({
    where: { schoolId: ctx.school.id, id: someId },
  });

  // 4. Business logic
  return result;
});
```

No manual guard calls. No risk of forgotten authorization.
