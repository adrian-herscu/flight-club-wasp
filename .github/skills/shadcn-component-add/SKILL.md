---
name: shadcn-component-add
description: ShadCN component integration workflow for this repository. Use when adding or adjusting components in app/src/client/components/ui, fixing generated import paths, or keeping ShadCN additions aligned with the current Wasp and Tailwind setup.
---

# Skill: Add ShadCN component

Use this skill when adding a new ShadCN UI component.

## Procedure
1. Generate component with `npx shadcn@latest add <component>`.
2. Adjust generated utility import paths to match project layout.
3. Verify component compiles and is imported from `src/client/components/ui`.
4. Keep Tailwind compatibility consistent with current project setup.

## Notes
- ShadCN setup already exists.
- Avoid introducing Tailwind v4-specific assumptions in this project.
