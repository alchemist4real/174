## 2026-07-13T13:28:50Z

You are teamwork_preview_explorer. Your working directory is: d:\DOWNLOAD\MR-CAPSULES-main\.agents\explorer_m2_1
Please analyze `admin.html`, `global-styles.css`, and `PROJECT.md`.
We need to refactor `admin.html` to address the following feedback:
1. Load `global-styles.css` and NOT `admin.css` or `new_styles.css`.
2. Remove `<div class="noise"></div>` and `<div class="scanlines"></div>`.
3. Use `1.5px solid var(--text-main)` for contrast and `8px` (cards/containers) and `99px` (pill buttons) for border-radii.
4. `.kanban-card` border must be `1.5px solid var(--text-main)`.
5. Inject the `Times New Roman` font for prominent headers (e.g. h2 in toolbars) while keeping `Courier New` for data.
6. Subpage modals (`.custom-modal-overlay`) must be refactored to use the main page's `.settings-overlay` and `.settings-box` architecture (dark translucent backdrop, 8px radius).
7. All `<svg>` elements must have `aria-label` or `aria-hidden="true"`. Status rows must have `role="status"` or `aria-live="polite"`.
8. Remove the 🗑️ emoji from line 120.

Analyze the current structure of `admin.html` and write a detailed refactoring analysis/strategy to `analysis.md` in your directory. Document all instances of inline styles, legacy css classes, layout structures, and how they map to our new unified design tokens. Do NOT write or modify any source code files. Write your handoff and return.
