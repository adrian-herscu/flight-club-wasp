# Wasp Deployment (Railway)

Deploy or troubleshoot the Wasp app on Railway.

$ARGUMENTS

## Scope
- Deploy target: Railway project `flight-club-wasp` (ID: `d5b510d7-cad3-4b81-b785-f5ec6f8b3ddb`)
- Preferred path: CI (`.github/workflows/deploy.yml`) — push to `main`
- Live client: `https://flight-club-wasp-client-production.up.railway.app`
- Live server: `https://flight-club-wasp-server-production.up.railway.app`

## Procedure

1. **Validate prerequisites**:
   - Wasp project builds: `wasp build`
   - Railway auth: `RAILWAY_API_TOKEN` secret is valid (CI) or `railway login` (local)
   - Preflight token check: `env RAILWAY_API_TOKEN=... railway whoami`
   - All required Railway server env vars are set (see table below)
2. **Validate auth callbacks** in Google Cloud OAuth client:
   - Production callback: `https://flight-club-wasp-server-production.up.railway.app/auth/google/callback`
3. **Deploy**: push to `main` and let CI deploy, or locally: `wasp deploy railway deploy flight-club-wasp`
4. **Verify service health**:
   - `railway logs --service flight-club-wasp-server` — expect `🚀 "Email and password" auth initialized` and `🚀 "Google" auth initialized`
   - Smoke-test login with `seed+school_manager.01@example.test`

## Required Railway server env vars

| Variable | Source |
|---|---|
| `SENDGRID_API_KEY` | `.env.server` — **required on startup** |
| `GOOGLE_CLIENT_ID` | `.env.server` |
| `GOOGLE_CLIENT_SECRET` | `.env.server` |
| `OPENAI_API_KEY` | `.env.server` |
| `ADMIN_EMAILS` | `.env.server` |

## CI token
- Must be a Railway **account-level token** (generate at railway.com/account/tokens — do not select a workspace).
- Set in GitHub: Settings → Secrets → Actions → `RAILWAY_API_TOKEN`.

## Common failures
- **`Unauthorized` on `railway whoami`**: token invalid/expired — generate a new account-level token.
- **Server crash-loops (`Error parsing environment variables`)**: a required env var is missing — check logs for the variable name.
- **`invalid_client` (Google login)**: client ID/secret mismatch or missing production callback URI.
- **Build fails after feature removal**: orphan imports/usages still in `src/` — remove them.
- **Railway upload timeout**: platform-side — retry later or use CI redeploy.