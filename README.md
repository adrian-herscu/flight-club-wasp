# Flight Club Platform

[![Deploy](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml)
[![Nightly Build](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/nightly.yml/badge.svg?branch=main)](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/nightly.yml)
[![Nightly Report](https://img.shields.io/badge/Nightly%20Report-GitHub%20Pages-2EAD33?logo=playwright&logoColor=white)](https://adrian-herscu.github.io/flight-club-wasp/)
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

| Directory     | Purpose                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `src/`        | Application code grouped by feature (TypeScript, React, Wasp operations) |
| `tests/api/`  | Vitest API and operation-level test suite                                |
| `tests/e2e/`  | Playwright end-to-end test suite                                         |
| `docs/`       | Product, data design, and software test documentation                    |
| `migrations/` | Prisma migration history                                                 |
| `queries/`    | SQL workflow reference queries                                           |
| `scripts/`    | Local development and automation helpers                                 |

## Quick start

### Prerequisites

- [Wasp CLI](https://wasp.sh/docs/quick-start) ≥ 0.21
- [Node.js](https://nodejs.org/en/download) 18+
- Docker/Podman (for the local PostgreSQL database)

### Running locally

If you don't already have a local PostgreSQL instance, create and start one with Docker:

```bash
# Create a PostgreSQL container (first time only)
docker run --name flight-club-postgres \
	-e POSTGRES_USER=postgres \
	-e POSTGRES_PASSWORD=postgres \
	-e POSTGRES_DB=flight_club_wasp \
	-p 5432:5432 \
	-d postgres:16

# On later runs, start the existing container
docker start flight-club-postgres
```

Create .env.server with local development defaults:

```bash
cat > .env.server << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/flight_club_wasp
GOOGLE_CLIENT_ID=local-dev-disabled-google-oauth.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=local-dev-disabled-google-oauth-secret
EOF
```

Start/restart the app, and keep it running:

```bash
npm run wasp:restart
```

The app will be available at `http://localhost:3000`.

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
