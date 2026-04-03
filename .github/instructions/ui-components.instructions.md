---
applyTo: "src/client/components/ui/**/*.{ts,tsx},src/client/**/*.{ts,tsx}"
---

# UI components (ShadCN)

- Tailwind v4 is not supported in this Wasp setup; stay on current compatible Tailwind version.
- ShadCN is already initialized for this project.
- Existing components live under `src/client/components/ui`.
- When adding a new ShadCN component, ensure utility import paths match local project layout.
- For generated UI files, prefer existing local utility import style (e.g., local `utils`/`cn`).
- Page-level `.tsx` files outside `src/client/components/patterns/` and `src/client/components/ui/` must not contain raw HTML intrinsic elements (`div`, `span`, `p`, `ul`, `li`, `h1`–`h6`, etc.) or `className` props directly. Move all HTML structure and Tailwind classes into named primitive components under `src/client/components/patterns/`.
- After any UI change, run `npm run wasp:lint` to verify the boundary has not been broken (`scripts/enforce-ui-boundary.mjs` enforces this).
