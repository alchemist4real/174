# Context - Styling Refactoring of MR CAPSULES Frontend

## Codebase Map
- Main Page: `index.html` (owns the design system structure and landing flow effects)
- Utility Subpages:
  - `admin.html`
  - `live.html`
  - `docs.html`
- Stylesheets:
  - `global-styles.css` (primary styles)
  - `admin.css` (legacy styles for admin.html, to be cleaned up)
  - `new_styles.css` (legacy styles, to be cleaned up)

## Target Rules & Constraints
- Adopt core structural match from `index.html` (1.5px border, 8px card border-radius, 99px primary button border-radius, Times New Roman/Courier New font hierarchy).
- Exclude main page landing effects (noise, scanlines, glitch, flicker).
- Managing all styling via single unified CSS file (`global-styles.css`).
- Audit fixes:
  1. Circular player button class `.btn` collision must be avoided or resolved.
  2. Subpage cards must use `border: 1.5px solid var(--text-main)` and `border-radius: 8px`.
  3. Header fonts: `Times New Roman` for headers, `Courier New` for data.
  4. Modals: refactor `.custom-modal-overlay` to use `.settings-overlay` and `.settings-box` layout.
  5. Accessibility: `aria-label` or `aria-hidden="true"` on all `<svg>`, and `role="status"` or `aria-live="polite"` on status rows.
  6. Remove `🗑️` emoji from `admin.html` (line 120).
