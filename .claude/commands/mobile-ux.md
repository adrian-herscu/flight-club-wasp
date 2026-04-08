# Mobile UX — Flight Club

Apply mobile-first UX guidance for Flight Club UI flows.

$ARGUMENTS

## Decision matrix

| Pattern | When to use |
|---|---|
| `Tabs` | 2–5 peer sections; users frequently switch between them |
| `Submenu` | >5 child screens or deeper IA; desktop/tablet usage significant |
| `Sheet`/`Drawer` | Secondary/temporary tasks (filters, quick edit, contextual details) |

## Navigation rules
1. Primary app navigation stays visible and stable.
2. Inside feature pages, prefer `Tabs` first.
3. Use `Sheet` for filters and quick actions.
4. Always provide explicit in-UI back/close affordances on deep views.

## URL state policy
Persist in URL for data-heavy screens: active section, search query, filters, sort, pagination.
- Prefer **path-based URLs** for major sections: `/admin/syllabuses/catalog`
- Use query params for secondary UI state only.

## Toolbar styling
- `rounded-none` borders with `border-r` dividers between buttons (flat toolbar).
- No gaps between buttons; full-width coverage.
- CSS `mask-image` gradient fade for scroll indicators at edges.
- Minimize vertical margins (`mb-2` instead of `mb-6`).

## Mobile patterns for large datasets
- Show key columns by default; move secondary fields into expandable row details.
- Sticky action bar for bulk actions.
- Chip-based filter summaries with one-tap clear.
- Server-side pagination/infinite loading with explicit loading/empty states.
- Top 1–2 primary row actions; move extras to overflow menu.

## Complex forms
- Split into 3–6 short steps.
- One primary CTA per screen.
- Validate on blur/submit (not per-keystroke).
- Draft save/autosave for long forms.

## Back behavior
- Do not rely on hardware back buttons.
- Preserve list/query state when returning from details/edit.
- Do not hijack native swipe-back behavior.

## Accessibility baseline
- Touch targets: 48×48px ideal (min 44×44px).
- Visible focus styles and keyboard support.
- Semantic labels for all fields and icon-only actions.
- Error text tied to corresponding inputs.

## Implementation checklist
- [ ] Mobile wireframe first (375–430px width).
- [ ] Pattern decided with decision matrix above.
- [ ] URL state contract defined.
- [ ] Loading, empty, and error states added.
- [ ] Back behavior validated on iPhone Safari + Chrome Android.
- [ ] Keyboard/accessibility basics verified.
- [ ] Tablet and desktop not regressed.