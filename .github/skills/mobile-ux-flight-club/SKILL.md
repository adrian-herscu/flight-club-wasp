---
name: mobile-ux-flight-club
description: Mobile-first UX guidance for Flight Club (Wasp + React + ShadCN) with practical patterns for navigation, large datasets, complex forms, and predictable back behavior across devices.
---

# Skill: Mobile UX for Flight Club

Use this skill when designing or refactoring UI flows in `app/src/client` or feature pages consumed by mobile users.

## Goals
- Make every critical flow usable on phones first.
- Reduce scroll-heavy pages via progressive disclosure.
- Keep behavior predictable across iPhone, Android, tablet, and desktop.
- Preserve user context (filters, active section, pagination) when navigating.

## Decision matrix: tabs vs submenu vs drawer

### Use `Tabs` when
- There are 2-5 peer sections.
- Users frequently switch between sections.
- Sections are tightly related (e.g., `Overview`, `Lessons`, `Instructors`, `Students`).

### Use `Submenu` when
- A feature has many child screens (>5) or deeper information architecture.
- Child screens are full tasks, not just data slices.
- Desktop and tablet usage is significant.

### Use `Drawer` / `Sheet` when
- Task is secondary or temporary (filters, quick edit, contextual details).
- User should stay on the current screen.

### Avoid
- Using drawer as primary app navigation.
- More than 5 visible tabs on mobile without an overflow strategy.
- Nesting submenu + tabs + modal in one flow unless strictly necessary.

## Default navigation rules for this app
1. Primary app navigation stays visible and stable.
2. Inside feature pages, prefer `Tabs` first.
3. Use submenu for larger admin/manager sections.
4. Use `Sheet` for filters and quick actions.
5. Always provide explicit in-UI back/close affordances on deep views.

## Session-tested heuristics (Flight Club)
- Keep section switcher as a **sticky top toolbar** for long mobile screens.
- Make section switching feel immediate:
	- highlighted active button,
	- auto-scroll to section content on section change,
	- ~~explicit active section label~~ (redundant if button states are clear).
- Avoid placing non-interactive policy/info blocks above section switcher on mobile.
- Place policy/help text **inside the relevant section** (e.g., catalog policy under `Catalog`).
- If section buttons exist, each should navigate to **distinct URLs** (not only local state).
- **Toolbar styling**: Maximize horizontal real estate on mobile:
	- Use `rounded-none` borders with subtle `border-r` dividers between buttons (flat toolbar look).
	- No gaps between buttons; full-width coverage.
	- Apply CSS `mask-image` gradient fade for scroll indicators at edges when buttons overflow.
	- Remove redundant headings if already in breadcrumb.
	- Reusable pattern: make breadcrumb title optional (e.g., `showTitle={false}`) so pages can keep breadcrumb context without the large duplicate header.
	- Minimize vertical margins (e.g., `mb-2` instead of `mb-6`) to conserve scarce mobile screen space.

## URL state and deep-linking policy

Persist these in the URL for data-heavy screens:
- Active section/tab
- Search query
- Filters
- Sort field/order
- Pagination cursor or page

Why this matters:
- Shareable/supportable links
- Predictable back behavior
- Better recovery after refresh/crash

### Preferred modeling for this app
- Prefer **path-based submenu URLs** for major sections, e.g.:
	- `/admin/syllabuses/catalog`
	- `/admin/syllabuses/create`
	- `/admin/syllabuses/details`
	- `/admin/syllabuses/editor`
- Use query params for secondary UI state (filters/sort/page), not for primary section identity.

### Compatibility fallback (important)
- If introducing new path routes risks temporary route mismatch during development,
	keep the existing page route and encode section in query params:
	- `/admin/syllabuses?section=catalog`
	- `/admin/syllabuses?section=create`
	- `/admin/syllabuses?section=details`
	- `/admin/syllabuses?section=editor`
- This still gives predictable browser back/forward behavior while avoiding blank pages from unmatched paths.

## Mobile patterns for large datasets
- Show key columns by default; move secondary fields into expandable row details.
- Use sticky action bar for bulk actions when rows are selected.
- Provide role-based saved views/presets.
- Prefer chip-based filter summaries with one-tap clear.
- Support server-side pagination/infinite loading with explicit loading/empty states.
- Keep row actions to top 1-2 primary actions; move extras to overflow menu.

## Complex forms on mobile
- Split into 3-6 short steps by user mental model.
- One primary CTA per screen (`Continue`, `Save`, `Submit`).
- Provide draft save/autosave for long forms.
- Use mobile input types (`email`, `tel`, numeric keypad, date picker).
- Validate on blur/submit (avoid noisy per-keystroke errors).
- Add final review step for high-impact submissions.

## Back behavior (including iPhone)
- Do not rely on hardware back buttons.
- Preserve list/query state when returning from details/edit.
- For modal/sheet routes: first back closes modal, next back leaves page.
- Do not hijack native swipe-back behavior.

## Scroll-reduction guideline
If a page has >4 major vertical sections on mobile, refactor into tabs/submenu or step flow.

If users click a section button and do not see a viewport change immediately, treat it as a UX bug.

### Example: Syllabuses page target structure
- `List`
- `Details`
- `Create/Edit`
- `Versions`

Provide these via tabs or a lightweight submenu so users avoid excessive vertical scrolling.

## Accessibility baseline (must meet)
- Touch targets: ideal 48x48px (minimum 44x44px in constrained groups).
- Visible focus styles and keyboard support.
- Semantic labels for all fields and icon-only actions.
- Color contrast suitable for light and dark themes.
- Error text tied to corresponding inputs.

## Implementation checklist
1. Mobile wireframe first (375-430px width).
2. Decide pattern with decision matrix.
3. Define URL state contract.
4. Add loading, empty, and error states.
5. Validate back behavior on iPhone Safari + Chrome Android.
6. Verify keyboard/accessibility basics.
7. Verify tablet and desktop do not regress.

## Tech notes for this repository
- Use existing ShadCN components in `src/client/components/ui`.
- Follow project conventions in `.github/copilot-instructions.md`.
- Prefer feature-scoped code in `src/{featureName}`.
- Keep server communication through Wasp queries/actions in `operations.ts`.
