# Add ShadCN Component

Add a new ShadCN UI component to the project.

Component: $ARGUMENTS

## Procedure

1. Generate the component: `npx shadcn@latest add <component>`
2. Adjust generated utility import paths to match project layout (local `cn` / `utils`).
3. Verify the component compiles and is importable from `src/client/components/ui`.
4. Keep Tailwind compatibility consistent with the current project setup (Tailwind v4 is NOT supported).
5. Run `npm run wasp:lint` to verify the UI boundary is not broken.

## Notes
- ShadCN setup already exists — do not re-initialize.
- Existing components live under `src/client/components/ui`.
- Page-level files must not use raw HTML elements directly — move structure into `src/client/components/patterns/`.