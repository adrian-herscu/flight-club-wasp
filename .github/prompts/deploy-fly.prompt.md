---
mode: "agent"
description: "Deploy this Wasp app to Fly.io using Wasp CLI."
---

Deploy the app to Fly.io using Wasp CLI.

Inputs:
- Base app name: ${input:appName}
- Fly region: ${input:region}
- Optional org slug: ${input:orgSlug}

Requirements:
1. Validate Fly prerequisites (`flyctl` installed, logged in, billing enabled).
2. Run deploy launch command.
3. If org slug is provided, include `--org`.
4. Confirm generated files (`fly-server.toml`, `fly-client.toml`) exist and should be committed.
5. Provide next-step commands for setting secrets and redeploying.
6. If deployment fails, summarize root cause and minimal corrective action.
