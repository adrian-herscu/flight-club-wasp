Deploy the app to Railway using Wasp CLI.

Inputs:
- Project name: ${input:projectName}
- Existing project ID: ${input:projectId}

Requirements:
1. Validate Railway prerequisites (`railway` CLI installed, `RAILWAY_API_TOKEN` set).
2. Run the deploy command from the `app` directory:
   `wasp deploy railway deploy ${input:projectName} --existing-project-id ${input:projectId}`
3. Confirm successful deployment and note the target project used.
4. If deployment fails, summarize root cause and minimal corrective action.
