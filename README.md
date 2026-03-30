# Flight Club Platform

[![Deploy](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml)
[![Nightly Report](https://img.shields.io/badge/E2E%20Report-GitHub%20Pages-2EAD33?logo=playwright&logoColor=white)](https://adrian-herscu.github.io/flight-club-wasp/)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-0B0D0E?logo=railway&logoColor=white)](https://flight-club-wasp-client-production.up.railway.app/)

A multi-role flight school management platform. Built with [Wasp](https://wasp.sh) on top of the [Open SaaS](https://opensaas.sh) template, backed by PostgreSQL via Prisma.

## What it does

Flight Club lets flight schools, instructors, and students find each other and manage the full lifecycle of a course — from public discovery through syllabus setup, enrollment, and instructor assignment.

**Roles supported:** Anonymous visitor · Registered user · System admin · School manager · Instructor · Student

**Key capabilities:**

- Public landing page with school and course discovery (filter by country, location, course name)
- Authenticated role-request and approval workflows (admin approves managers; managers approve instructors and students)
- School profile management (logo, website, contact details)
- Syllabus catalog — create, publish, and reuse syllabuses
- Course creation, instructor assignment, and student enrollment

## Repository layout

| Directory | Purpose |
|-----------|---------|
| `src/` | Application code grouped by feature (TypeScript, React, Wasp operations) |
| `tests/api/` | Vitest API and operation-level test suite |
| `tests/e2e/` | Playwright end-to-end test suite |
| `docs/` | Product, data design, and software test documentation |
| `migrations/` | Prisma migration history |
| `queries/` | SQL workflow reference queries |
| `scripts/` | Local development and automation helpers |

## Quick start

### Prerequisites

- [Wasp CLI](https://wasp.sh/docs/quick-start) ≥ 0.21
- Node.js 18+
- Docker/Podman (for the local PostgreSQL database)

### Running locally

```bash
# 1. Copy environment files
cp .env.server.example .env.server

# 2. Configure DATABASE_URL in .env.server
#    Example:
#    DATABASE_URL=postgres://postgres:postgres@localhost:5432/flight_club_wasp

# 3. Apply migrations (first run, or after schema changes)
wasp db migrate-dev

# 4. Start the app (keep it running)
wasp start
```

The app will be available at `http://localhost:3000`.

If you prefer using a Wasp-managed local database, start it separately with `wasp start db`
before running migrations.

### Environment files

Copy and fill in the required values before starting:

```bash
cp .env.server.example .env.server
cp .env.client.example .env.client
```

### Running tests

- Run all unit and API tests with `npm test`
- Run coverage with `npm run test:coverage`
- Run Playwright regression tests with `npm run e2e:regression`
- Run the smoke suite with `npm run e2e:smoke`
- Open the Playwright UI with `npm run e2e:regression:ui`

## Documentation

- [Product Requirements Document](docs/prd.md)
- [Data Design](docs/data-design.md)
- [Software Test Design](docs/std.md)
