---
name: wasp-deployment
description: Railway deployment workflow for this Wasp app. Use when preparing, validating, or troubleshooting deployments from , checking Railway environment variables, auth callbacks, CI token health, or production smoke checks.
---

# Skill: Wasp Railway Deployment

Use this skill when asked to deploy/update the Wasp app on Railway.

## Scope
- App path: ``
- Deploy target: Railway project `flight-club-wasp` (project ID `d5b510d7-cad3-4b81-b785-f5ec6f8b3ddb`)
- Preferred deployment path: CI (`.github/workflows/deploy.yml`)
- Live client URL: `https://flight-club-wasp-client-production.up.railway.app`
- Live server URL: `https://flight-club-wasp-server-production.up.railway.app`

## Procedure
1. Validate prerequisites:
	 - Wasp project builds: run `wasp build` from ``.
	 - Railway auth is available (local `railway login`) or `RAILWAY_API_TOKEN` secret is valid (CI).
	 - Prefer native Railway binary (`/home/linuxbrew/.linuxbrew/bin/railway`) over npm wrapper (`~/.npm-global/bin/railway`) for non-TTY automation.
	 - Preflight token check: `env RAILWAY_API_TOKEN=... /home/linuxbrew/.linuxbrew/bin/railway whoami`.
	 - All required Railway server env vars are set (see **Required Railway server env vars** below).
	 - Google OAuth env vars are set (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
2. Validate auth callback configuration in Google Cloud OAuth client:
	 - Local callback: `http://localhost:3001/auth/google/callback`
	 - Production callback: `https://flight-club-wasp-server-production.up.railway.auth/google/callback`
3. Deploy:
	 - CI: push to `main` and let workflow deploy.
	 - Local fallback: from ``, run:
		 - `wasp deploy railway deploy flight-club-wasp --railway-exe /home/linuxbrew/.linuxbrew/bin/railway`
4. Verify service health:
	 - Check server logs: `railway logs --service flight-club-wasp-server` — should end with `🚀 "Email and password" auth initialized` and `🚀 "Google" auth initialized`.
	 - Client route loads.
	 - Email login and Google login work.
	 - Smoke-test login with seeded role user (from SQL migration), e.g. `seed+school_manager.01@example.test`.

## Required Railway server env vars
These must be set on the `flight-club-wasp-server` service in Railway. Wasp auto-sets `DATABASE_URL`, `JWT_SECRET`, `WASP_SERVER_URL`, `WASP_WEB_CLIENT_URL` on first `launch`. The rest must be added manually (Railway dashboard → service → Variables, or `railway variables --set KEY=VALUE --service flight-club-wasp-server`):

| Variable | Source |
|---|---|
| `SENDGRID_API_KEY` | `.env.server` — **required on startup**; missing this crashes the server |
| `GOOGLE_CLIENT_ID` | `.env.server` |
| `GOOGLE_CLIENT_SECRET` | `.env.server` |
| `OPENAI_API_KEY` | `.env.server` |
| `STRIPE_API_KEY` | `.env.server` (if Stripe is enabled) |
| `STRIPE_WEBHOOK_SECRET` | `.env.server` (if Stripe webhook is enabled) |
| `ADMIN_EMAILS` | `.env.server` |

## CI token
- `RAILWAY_API_TOKEN` must be a Railway **account-level token** (generate at [railway.com/account/tokens](https://railway.com/account/tokens) — **do not select a workspace**).
- Set it in GitHub: **Settings → Secrets and variables → Actions → RAILWAY_API_TOKEN**.
- If deploy fails with `Unauthorized`, the token is invalid/expired or lacks access to the target project (`d5b510d7-cad3-4b81-b785-f5ec6f8b3ddb`) — generate a new account-level token and verify access.

## Failure handling
- **CI: `Unauthorized` on `railway whoami`**:
	- `RAILWAY_API_TOKEN` secret is invalid or expired. Generate a new account-level token and update the secret.
- **Local/CI: `Unauthorized. ... token is valid and has access to the resource`**:
	- Token is valid format but lacks access to `flight-club-wasp` project/workspace. Use a token from an account that can open that project.
- **Server crash-loops on startup (`Error parsing environment variables`)**:
	- A required env var is missing. Check `railway logs --service flight-club-wasp-server` for the specific variable name, then set it with `railway variables --set KEY=VALUE --service flight-club-wasp-server`.
- **SendGrid `403` (`from address does not match a verified Sender Identity`)**:
	- Deployment can still succeed; this breaks outbound email flows (signup verification, resend verification, password reset) only.
	- Existing migration-seeded users that are already verified can still log in.
- **`invalid_client` (Google login)**:
	- Client ID/secret mismatch between local/prod, or production callback URI missing from Google Cloud OAuth client.
- **Build fails after feature removal**:
	- Leftover files under `src/` still typechecked; remove or fix orphan imports/usages.
- **Config declaration drift (`main.wasp`)**:
	- This repo uses `main.wasp` as source of truth.
	- If deployment/dev behavior is inconsistent after config changes, verify `main.wasp` declarations and restart using `npm run wasp:restart` in `e2e-tests` (ensuring previous instances are killed) before re-checking. Logs are written to `wasp-dev.log`.
- **Railway upload timeout / connection reset**:
	- Usually platform/network-side. Retry deployment later or use CI redeploy.

## Notes
- Treat `main.wasp` as source of truth for enabled routes/queries/actions/APIs/jobs.
- After auth/schema/config changes, restart dev server to refresh Wasp-generated types.
- Setting a variable in Railway auto-triggers a redeploy of that service.
- The workflow file (`.github/workflows/deploy.yml`) is taken verbatim from the Wasp 0.21 docs and is correct — do not change action versions or the Wasp install method.
