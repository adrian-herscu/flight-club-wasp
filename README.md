# Flight Club Platform

[![Deploy](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/adrian-herscu/flight-club-wasp/actions/workflows/deploy.yml)
[![Wasp](https://img.shields.io/badge/Wasp-0.21-7857FF?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA4LTggOHoiLz48L3N2Zz4=&logoColor=white)](https://wasp.sh)
[![Railway](https://img.shields.io/badge/Deployed%20on-Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app)

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
| `app/` | Wasp web application (TypeScript, React, Prisma, PostgreSQL) |
| `e2e-tests/` | Playwright end-to-end test suite |
| `blog/` | Documentation site built with Astro Starlight |

## Quick start

### Prerequisites

- [Wasp CLI](https://wasp.sh/docs/quick-start) ≥ 0.21
- Node.js 18+
- Docker (for the local PostgreSQL database)

### Running locally

```bash
# 1. Start the database (keep it running)
cd app && wasp start db

# 2. Apply migrations (first run, or after schema changes)
wasp db migrate-dev

# 3. Start the app (keep it running)
wasp start
```

The app will be available at `http://localhost:3000`.

### Environment files

Copy and fill in the required values before starting:

```bash
cp app/.env.server.example app/.env.server
cp app/.env.client.example app/.env.client
```

### Running E2E tests

```bash
# Start the app first (see above), then in a separate terminal:
cd e2e-tests && npm install
npm run e2e:playwright
```

See [e2e-tests/README.md](e2e-tests/README.md) for full details, including interactive UI mode.

## Documentation

- [Product Requirements](app/docs/prd.md)
- [Data Design](app/docs/data-design.md)
- [Software Test Design](app/docs/std.md)
- [E2E Testing Guide](e2e-tests/E2E_TESTING_GUIDE.md)
