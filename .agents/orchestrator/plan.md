# Plan - Styling Refactoring of MR CAPSULES Frontend

This plan outlines the steps to refactor the MR CAPSULES frontend to use a single unified CSS file, aligning utility subpages (`admin.html`, `live.html`, `docs.html`) with the structural aesthetic of `index.html` while excluding landing-page visual effects (glitches, scanlines, flickering). It also incorporates specific fixes for previous audit issues.

## Milestones

### Milestone 1: Design Extraction & Core Token Definition
- **Objective**: Identify and extract design tokens (fonts, borders, colors, spacing) and core styles from `index.html` into a unified `global-styles.css`. Ensure no collision with the circular player buttons `.btn` on `index.html`. Add SVGs accessibility elements to `index.html`.
- **Status**: PLANNED
- **Deliverables**: Updated `global-styles.css` with core token layer, `index.html` with accessible SVGs.

### Milestone 2: Refactor admin.html
- **Objective**: Refactor `admin.html` to consume the unified styling.
- **Specific requirements**:
  - Update cards and containers to use `border: 1.5px solid var(--text-main)` and `border-radius: 8px`.
  - Use `Times New Roman` for headers (e.g. h2 in toolbars) and `Courier New` for data.
  - Refactor `.custom-modal-overlay` to use `.settings-overlay` and `.settings-box` layout.
  - Apply SVG accessibility (`aria-label` or `aria-hidden="true"`) and status row accessibility (`role="status"` or `aria-live="polite"`).
  - Remove the 🗑️ emoji from line 120.
- **Status**: PLANNED
- **Deliverables**: Refactored `admin.html`.

### Milestone 3: Refactor live.html
- **Objective**: Refactor `live.html` to consume the unified styling.
- **Specific requirements**:
  - Update cards and containers to use `border: 1.5px solid var(--text-main)` and `border-radius: 8px`.
  - Use `Times New Roman` for headers and `Courier New` for data.
  - Refactor modals to follow the settings overlay/box style.
  - Apply SVG accessibility and status row accessibility.
- **Status**: PLANNED
- **Deliverables**: Refactored `live.html`.

### Milestone 4: Refactor docs.html
- **Objective**: Refactor `docs.html` to consume the unified styling.
- **Specific requirements**:
  - Update containers to use standard border and 8px border-radius.
  - Inject `Times New Roman` for `.docs-title` and prominent headers, keeping `Courier New` for code/data.
  - Apply SVG accessibility.
- **Status**: PLANNED
- **Deliverables**: Refactored `docs.html`.

### Milestone 5: Legacy CSS Cleanup
- **Objective**: Clean up legacy stylesheets to ensure architectural cleanliness.
- **Specific requirements**:
  - Safely remove or empty `admin.css` and `new_styles.css`.
  - Ensure all subpages load styling from exactly one global CSS file.
- **Status**: PLANNED
- **Deliverables**: Empty or deleted legacy css files.

### Milestone 6: Final Verification & Audit
- **Objective**: Run E2E verification, review, and forensic audit to ensure full compliance with requirements.
- **Status**: PLANNED
- **Deliverables**: Audit validation reports, clean audit status.
