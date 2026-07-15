## MR CAPSULES Styling Architecture
When building or refactoring UI components for MR CAPSULES utility subpages (e.g., admin.html, live.html, docs.html):
1. **Core Structural Match**: Always adopt the core aesthetic of the main page (`index.html`). This means using stark contrast (e.g., `border: 1.5px solid var(--text-main)`), rounded corners (`border-radius: 8px` for cards, `99px` for primary buttons), and the established font hierarchy (`Times New Roman` for headers, `Courier New` for data).
2. **Exclude FX**: Explicitly EXCLUDE the main page's landing flow effects from utility pages. Do NOT implement SVG noise, scanlines, glitch animations, flickering, or the unique landing-page auth modal on subpages. Utility pages must remain performant and readable.
3. **Single Source of Truth**: All component styling (containers, backgrounds, cards, modals, fonts, buttons, contrast) must be managed from a single unified CSS file, ensuring all modes share the exact same structural foundation.

## MR CAPSULES UI Design System Rules
All design updates must conform to these strict architectural constraints:

1. **Color Tokens**:
   - Use only the derived color variables (`--bg-main`, `--bg-card`, `--text-main`, `--text-muted`, `--accent`, `--border-light`, `--border-medium`, `--border-heavy`).
   - Do NOT introduce hardcoded color codes (hex, rgb, hsl, or CSS color names) in any stylesheet or inline style.
2. **Typography**:
   - Headers, section titles, and dialog titles must have `font-family: var(--font-sans) !important`.
   - Code views, user lists, activity log list items, input boxes, status alerts, and table rows must have `font-family: var(--font-mono) !important`.
3. **Corner Radii**:
   - Apply `border-radius: var(--radius-card)` (8px) for card containers, kanban boards, and modals.
   - Apply `border-radius: var(--radius-pill)` (99px) for buttons, filter controls, inputs, and search bars.
4. **No Inline Overrides**:
   - All layout, sizing, padding, and borders must be styled via class rules inside `global-styles.css`. No inline `style="..."` visual configurations are allowed.
5. **No FX on Utility Pages**:
   - Do not add `.noise`, `.scanlines`, or `@keyframes flicker`/`glitchShift` style animations to utility page elements. Keep login and loading views completely static and lightweight.
