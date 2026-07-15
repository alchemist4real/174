# Original User Request

## Initial Request — 2026-07-14T18:39:55+07:00

<USER_REQUEST>
An aesthetic audit and correction of the admin panel (`admin.html`), live view (`live.html`), and associated utility pages to ensure complete visual alignment with the main page (`index.html`) styling conventions, while updating our learned design rules.

Working directory: d:/DOWNLOAD/MR-CAPSULES-main
Integrity mode: demo

## Requirements

### R1. Inline Style Elimination
Remove all styling override declarations from `style="..."` attributes inside `admin.html` and `live.html`. Consolidate layout, padding, width, height, and color rules into clean CSS class selectors defined in `global-styles.css`.

### R2. Landing Effect Exclusion
Explicitly remove the floating animation (`authLogoFloat`) and the unique landing-page auth overlay styling from `admin.html` and `live.html`. Simplify the auth validation screen to be static, fast-loading, and visually clean, aligning with utility page aesthetics.

### R3. Structural and Typographic Alignment
Ensure all cards, sidebars, toolbars, buttons, and tables align with the core aesthetic tokens in `global-styles.css`:
- Border: `1.5px solid var(--c3)`
- Borders/Separators: `var(--border-main)` or `var(--border-medium)`
- Cards/Container borders: `border-radius: var(--radius-card)` (8px)
- Buttons/Filters: `border-radius: var(--radius-pill)` (99px)
- Typography: Headers (`h1`, `h2`, `h3`, etc.) must use `Times New Roman` (`var(--font-sans)`), and data (tables, lists, input values) must use `Courier New` (`var(--font-mono)`).

### R4. Persisted Learning
Update the design rules in `.agents/AGENTS.md` to document the specific learned aesthetic preferences, forbidden utility-page effects, and best practices for future component development.

## Acceptance Criteria

### HTML Code Cleanliness
- [ ] Zero inline `style` attributes in `admin.html` and `live.html` containing layout/color properties (inline `display: none` or dynamic toggles allowed only if absolutely necessary).
- [ ] No loading of additional stylesheets other than `global-styles.css` (and third-party libraries like CodeMirror in `admin.html`).

### Animation & Visual FX
- [ ] Floating animations (`authLogoFloat`) and landing-modal flow effects are completely removed from utility pages.
- [ ] The loading/verifying screen matches the stark, performant styling of utility pages.

### Design System and Typography
- [ ] All buttons, input bars, cards, and sidebars utilize established CSS variables for borders, backgrounds, and text colors.
- [ ] Headers use `Times New Roman` and monospace fonts are applied strictly to data elements.
- [ ] Contrast is maintained across Light, Dark, and MRS themes.

### Persisted Guidelines
- [ ] `.agents/AGENTS.md` includes clear rules detailing these visual constraints to prevent future drift.
</USER_REQUEST>

## Follow-up — 2026-07-14T18:47:57+07:00

<USER_REQUEST>
An aesthetic audit and correction of the documentation page (`docs.html`) to ensure complete visual alignment with the main page (`index.html`) styling conventions, while updating our learned design rules.

Working directory: d:/DOWNLOAD/MR-CAPSULES-main
Integrity mode: demo

## Requirements

### R1. Inline Style Elimination
Remove all styling override declarations from `style="..."` attributes inside `docs.html`. Consolidate layout, padding, width, height, and color rules into clean CSS class selectors defined in `global-styles.css`.

### R2. Structural and Typographic Alignment
Ensure all panels, borders, sections, buttons, and alert boxes inside `docs.html` align with the core aesthetic tokens in `global-styles.css`:
- Border: `1.5px solid var(--c3)`
- Borders/Separators: `var(--border-main)` or `var(--border-medium)`
- Rounded Corners: `border-radius: var(--radius-card)` (8px) for containers/sections, `border-radius: var(--radius-pill)` (99px) for buttons/pills.
- Typography: Headers (`h1`, `h2`, `h3`, etc.) must use `Times New Roman` (`var(--font-sans)`), and body text/data/lists must use `Courier New` (`var(--font-mono)`).

### R3. Persisted Learning
Update the design rules in `.agents/AGENTS.md` to document any specific learned aesthetic preferences and best practices for documentation components.

## Acceptance Criteria

### HTML Code Cleanliness
- [ ] Zero inline `style` attributes in `docs.html` containing layout/color properties (inline `display: none` or dynamic toggles allowed only if absolutely necessary).
- [ ] No loading of additional stylesheets other than `global-styles.css`.

### Design System and Typography
- [ ] All buttons, input bars, cards, and sections utilize established CSS variables for borders, backgrounds, and text colors.
- [ ] Headers use `Times New Roman` and monospace fonts are applied strictly to data and list elements.
- [ ] Contrast is maintained across Light, Dark, and MRS themes.

### Persisted Guidelines
- [ ] `.agents/AGENTS.md` includes clear rules detailing these visual constraints to prevent future drift.
</USER_REQUEST>

