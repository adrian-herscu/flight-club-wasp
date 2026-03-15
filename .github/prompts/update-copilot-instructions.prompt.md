---
agent: "agent"
description: "Update Copilot instruction files from user-provided policy changes."
---

You are updating repository instruction docs based on my requested changes.

## Inputs
- Requested change(s): ${input:changes}
- Current instruction file content (optional override): ${input:currentInstructions}

## Scope
- Primary target: `.github/copilot-instructions.md`
- Keep related files in sync when needed:
  - `.github/instructions/*.instructions.md`
  - `.github/prompts/*.prompt.md` (only if my request explicitly changes prompt behavior)

## Requirements
- Apply the smallest set of edits needed.
- Preserve current structure, section order, and tone unless I explicitly request restructuring.
- Keep rules precise, actionable, and non-duplicative.
- If a requested rule conflicts with an existing one, prefer the new rule and adjust/remove the old rule.
- Do not invent policies that were not requested.
- If any request is ambiguous, choose the safest reasonable interpretation and note it briefly.

## Process
1. Summarize intended changes in 3-7 bullets.
2. Produce exact revised text.
3. Return:
   - `Updated content` (full revised file text for each changed file), and
   - `Change log` (short bullets mapping each edit to a requested change).

## Output format
- Start with: `Planned edits`
- Then: `Updated content`
- End with: `Change log`
