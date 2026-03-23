---
name: fetch-wasp-docs
description: Wasp documentation lookup workflow for this repository. Use when implementing or troubleshooting Wasp features, checking main.wasp syntax, auth setup, operations, jobs, middleware, or generated type/import behavior against authoritative docs.
---

# Skill: Fetch Wasp LLM Documentation

Use this skill when you need authoritative Wasp framework documentation for implementation details, troubleshooting, or feature exploration.

## Procedure
1. Determine which documentation level is needed:
   - Quick reference: https://wasp.sh/llms.txt
   - Comprehensive: https://wasp.sh/llms-full.txt
2. Fetch the documentation using the webpage fetch tool.
3. Search the fetched content for the specific topic/feature.
4. Apply the documented pattern to the implementation.

## When to use
- Implementing advanced Wasp features (jobs, middleware, custom APIs)
- Verifying correct configuration syntax
- Resolving type/import issues
- Understanding auth provider setup
- Database/Prisma integration questions

## Notes
- Full docs are large; prefer targeted searches after fetching
- Cache results mentally to avoid re-fetching during same conversation
