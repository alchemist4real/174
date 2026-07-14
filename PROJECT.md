# Project: MR CAPSULES Frontend Styling Refactor

## Architecture
- **Single Global Style Sheet**: `global-styles.css` is the single source of truth for component styling.
- **Utility Subpages**: `admin.html`, `live.html`, and `docs.html` consume `global-styles.css` and use unified classes for containers, buttons, cards, modals, typography, and accessibility.
- **Component Contracts**:
  - Cards: `border: 1.5px solid var(--text-main); border-radius: 8px;`
  - Primary Buttons: `border-radius: 99px;`
  - Fonts: `Times New Roman` for headers, `Courier New` for data.
  - Modals: Dark translucent backdrop using `.settings-overlay` and `.settings-box` layout.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Design Extraction & Core Token Definition | Extract structural styles from index.html, update global-styles.css, fix player button collision, add SVG accessibility in index.html | none | DONE |
| 2 | Refactor admin.html | Update admin.html styling, fonts, modal structure, accessibility, remove 🗑️ emoji | M1 | DONE |
| 3 | Refactor live.html | Update live.html styling, fonts, modal structure, accessibility | M1 | DONE |
| 4 | Refactor docs.html | Update docs.html styling, fonts, accessibility | M1 | DONE |
| 5 | Legacy CSS Cleanup | Remove/empty admin.css and new_styles.css | M2, M3, M4 | DONE |
| 6 | Final Verification & Audit | E2E test verification and Forensic Audit | M5 | DONE |

## Interface Contracts
### global-styles.css ↔ Subpages (admin.html, live.html, docs.html)
- Fonts: `font-family: 'Times New Roman', Times, serif` is assigned to header classes/tags. `font-family: 'Courier New', Courier, monospace` is assigned to code, data tables, and data displays.
- Modal: Overlay backdrop class is `.settings-overlay` (with dark translucent overlay styles) and container is `.settings-box` (8px radius, solid border, background-color).
- Card/Container: Class `.card` or `.container-box` provides `border: 1.5px solid var(--text-main)` and `border-radius: 8px`.
- Button: Class `.btn-pill` (or similar) provides `border-radius: 99px`. `.btn` player styling in `index.html` must remain circular without affecting other buttons.
