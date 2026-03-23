---
agent: "agent"
description: "Fetch and reference external LLM-optimized documentation for this Wasp app."
---

Fetch documentation from: ${input:url}

Search for: ${input:topic}

Steps:
1. Use fetch_webpage to retrieve the documentation.
2. Search the content for relevant sections matching the topic.
3. Extract and summarize the applicable guidance.
4. Apply it to the current implementation context.

Default URLs if not specified:
- Wasp quick reference: https://wasp.sh/llms.txt
- Wasp comprehensive: https://wasp.sh/llms-full.txt
- OpenSaaS template: https://docs.opensaas.sh/llms-full.txt
