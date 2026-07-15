# Aesthetic Audit and Correction Plan

## Objective
Perform an aesthetic audit and correction of the admin panel (`admin.html`), live view (`live.html`), and associated utility pages to ensure complete visual alignment with `index.html` conventions, remove landing effects, eliminate inline visual styles, and update design system guidelines.

## Milestones
| Milestone | Name | Objective | Status |
|-----------|------|-----------|--------|
| M1 | Aesthetic Audit & Analysis | Scan `admin.html`, `live.html`, `global-styles.css`, and `.agents/AGENTS.md` to identify inline styles, floating animations, landing effects, card/typography alignment gaps, and rules to update. | DONE |
| M2 | UI Refactoring & Correction | Eliminate inline visual styles in `admin.html` and `live.html`. Simplify authentication screens, remove `authLogoFloat` animations, and align styling components (cards, sidebars, buttons, typography) with global tokens. | IN_PROGRESS |
| M3 | Guidelines & Documentation | Update design system rules in `.agents/AGENTS.md` with explicit learned constraints. | PLANNED |
| M4 | Final Review & Integrity Audit | Run reviewer, challenger, and forensic auditor agents to verify compliance with styling conventions, functional correctness, and integrity constraints. | PLANNED |

## Verification Criteria
- Zero inline style attributes for visual layout, color, and size in `admin.html` and `live.html`.
- No floating animations or landing flow effects on utility subpages.
- Headers styled with `Times New Roman` and data/logs/lists with `Courier New`.
- Strict adherence to CSS variables and tokens from `global-styles.css`.
- Auditor reports a CLEAN status with zero violations.
