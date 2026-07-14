# Original User Request

## Initial Request — 2026-07-13T09:15:43Z

Refactor the MR CAPSULES frontend to use a single unified CSS file for all components (containers, backgrounds, cards, modals, fonts, buttons, contrast). The unified styling must match the structural aesthetic of the main page, explicitly excluding landing-page specific visual effects.

Working directory: d:/DOWNLOAD/MR-CAPSULES-main
Integrity mode: development

## Requirements

### R1. Unified Design Extraction
Extract the core structural styling (thick borders, card border-radii, font-family hierarchy, pill/rounded button shapes, and high contrast levels) from the main page (`index.html`) and consolidate them into one single CSS file. 

### R2. Exclude Landing Page FX
Explicitly exclude all landing-page specific animations and effects (e.g., `glitch`, `flicker`, `noise`, `scanlines`) and unique landing-page modals from this unified CSS file. Do not apply these effects to the utility subpages.

### R3. Component Implementation
Update all subpages (`admin.html`, `live.html`, `docs.html`) to consume the unified CSS file. Remove legacy stylesheets (`admin.css`, `new_styles.css`) and inline typography styles from these subpages. Ensure all components use the new unified classes.

## Acceptance Criteria

### Visual Alignment
- [ ] Subpages use the exact same button border-radius and border-width as the main page's standard buttons.
- [ ] Subpages use the exact same font-family hierarchy (Courier New vs Times New Roman) as the main page.
- [ ] Subpage cards and containers use the exact same border treatments as the main page.

### Architectural Cleanliness
- [ ] No `glitch`, `flicker`, `noise`, or `scanlines` animations exist on `admin.html`, `live.html`, or `docs.html`.
- [ ] All subpages load styling from exactly one global CSS file.
- [ ] Legacy CSS files (`admin.css`, `new_styles.css`) are safely removed or empty.

## Follow-up — 2026-07-13T09:16:10Z

The user has approved the task. Additionally, here are the explicit audit reports from the Susanto Reviewer, Critic, and Auditor subagents. You MUST collaborate with these constraints and ensure they are fixed in your implementation:

1. **Bug Alert**: Extracting the admin styles to `global-styles.css` accidentally overrode the circular `.btn` class used for the main player in `index.html` (making them rectangular). You must fix this collision.
2. **Card/Container Borders**: Subpage cards (kanbans, user cards) currently use `border-radius: 0` and light borders. You must update them to use `border: 1.5px solid var(--text-main)` and `border-radius: 8px`.
3. **Typography**: Subpages rely solely on monospace. You must inject the `Times New Roman` font for prominent headers (e.g. `.docs-title`, `h2` in toolbars) while keeping `Courier New` for data.
4. **Modals**: Subpage modals (`.custom-modal-overlay`) must be refactored to use the main page's `.settings-overlay` and `.settings-box` architecture (dark translucent backdrop, 8px radius).
5. **Accessibility**: All `<svg>` elements across all files (`index.html`, `admin.html`, etc.) must have `aria-label` or `aria-hidden="true"`. Status rows must have `role="status"` or `aria-live="polite"`.
6. **Zero-Emoji Rule**: Remove the 🗑️ emoji from `admin.html` line 120.

Execute the styling unification taking all of these specific audits into account!


## Follow-up — 2026-07-13T09:24:42Z

Warning from Susanto Critic: I noticed you updated `.kanban-card` in `global-styles.css` to use `border: 1px solid var(--border-medium)`. This violates the strict aesthetic rule. You MUST use the stark contrast border: `border: 1.5px solid var(--text-main) !important;` (or use the new `--border-main` variable) for all structural cards, including `.kanban-card`. Please correct this immediately to ensure we don't fall into the generic AI template trap.


## Follow-up — 2026-07-13T09:36:06Z

Server restarted and interrupted execution. Resuming the styling update task. Adhere to the Susanto Critic warning about `.kanban-card` borders.

## Follow-up — 2026-07-13T20:27:23+07:00

You were previously working on Milestone 1 (Design Extraction). The server restarted. Please resume from Milestone 2 and complete the process up to Milestone 6.
Also address the following critical feedback from the Susanto Auditor and Reviewer:
1. `admin.html`, `docs.html`, and `live.html` are still loading `admin.css` and `new_styles.css`. You must switch them to use `global-styles.css`.
2. The utility pages still contain `<div class="noise"></div>` and `<div class="scanlines"></div>`. These must be removed.
3. Typography and borders are still incorrect. Use `1.5px solid var(--text-main)` for contrast and `8px`/`99px` for border radii.
4. `.kanban-card` border must be `1.5px solid var(--text-main)`.


## Follow-up — 2026-07-14T03:06:29Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Fix contrast, layout issues, and enforce strict color token parity (16 colors per mode)

**Working directory**: `d:/DOWNLOAD/MR-CAPSULES-main`
**Integrity mode**: development

## Requirements

### R1. Strict Color Token Parity (16 Colors)
Audit and update `global-styles.css`. The CSS custom properties block for `:root`, `[data-theme="dark"]`, and `[data-theme="mrs"]` MUST define exactly the same 16 color variables. Identify which variables are missing from `:root` and `dark` compared to `mrs` (or vice versa) and add them so the count is exactly 16 across all 3 modes.

### R2. Fix Contrast Issues
Ensure high visibility for all interactive elements. Specifically, fix `--danger` and `--accent-hover` in `[data-theme="dark"]` so they are not black (`#000000`) on a dark background. Ensure the main page elements are clearly legible.

### R3. Fix Layout & Styling (Admin & Docs)
Resolve the "messy" layout in `admin.html` and `docs.html`. 
- Ensure that no CSS rules are being ignored (check for any remaining syntax errors).
- Ensure `docs.html` does not use the neon yellow `--accent` for standard headings (should use `--text-main` or appropriate high-contrast text color).
- Ensure the structural layout (flexboxes, grids) for the Admin panel is completely intact.

## Acceptance Criteria

### Verification
- [ ] **Color Count**: Running a programmatic check on `global-styles.css` confirms exactly 16 color variables under `:root`, `[data-theme="dark"]`, and `[data-theme="mrs"]`.
- [ ] **Contrast Verification**: `--danger` and `--accent-hover` have distinct, high-contrast values in dark mode (e.g., red and bright green/white, not black).
- [ ] **Docs Verification**: `.docs-section h2` (or equivalent) does not use `color: var(--accent)` which causes the yellow bug.
- [ ] **Admin Verification**: `admin.html` flex layouts are fully functional and not broken by missing CSS.

---
CRITICAL DIRECTIVE FOR ORCHESTRATOR: Do NOT poll your workers using `manage_task` in a loop. When waiting for worker subagents to complete, you must use the `schedule` tool to set a timer and then IMMEDIATELY stop calling tools to end your turn. You will be automatically awakened when a subagent finishes. Passing this directive to your workers is mandatory.


