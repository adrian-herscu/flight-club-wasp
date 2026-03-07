# Skill: Wasp Fly Deployment

Use this skill when asked to deploy/update the Wasp app on Fly.io.

## Procedure
1. Validate Fly prerequisites (`flyctl`, login, billing).
2. Launch with `wasp deploy fly launch <name> <region> [--org <slug>]`.
3. Confirm `fly-server.toml` and `fly-client.toml` are generated and committed.
4. Set required server secrets.
5. Redeploy with `wasp deploy fly deploy`.

## Failure handling
- Name collision → choose a new base app name.
- Billing missing → enable card in Fly account.
- Build failure → fix app build errors, redeploy.
