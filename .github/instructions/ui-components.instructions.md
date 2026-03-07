---
applyTo: "app/src/client/components/ui/**/*.{ts,tsx},app/src/client/**/*.{ts,tsx}"
---

# UI components (ShadCN)

- Tailwind v4 is not supported in this Wasp setup; stay on current compatible Tailwind version.
- ShadCN is already initialized for this project.
- Existing components live under `src/client/components/ui`.
- When adding a new ShadCN component, ensure utility import paths match local project layout.
- For generated UI files, prefer existing local utility import style (e.g., local `utils`/`cn`).
