# Handoff Report — Milestone 3 Refactoring Blueprint

This report details the read-only investigation and blueprint for the refactoring of `live.html`, its associated JavaScript file `live.js`, and general accessibility changes.

## 1. Observation

### Script Loading & Stylesheet Links
- `live.html` loads the global stylesheet on line 8:
  ```html
  <link rel="stylesheet" href="/global-styles.css">
  ```
  It does not load `admin.css` or `new_styles.css` directly, but it loads the admin page's workflow script on line 503 instead of the dedicated `live.js` file:
  ```html
  <script src="/admin-workflow.js?v=1.2"></script>
  ```
  A dedicated `live.js` script exists in the root directory: `d:\DOWNLOAD\MR-CAPSULES-main\live.js`.

### Visual FX
- No elements with classes `.noise` or `.scanlines` were found in `live.html`.

### Styling Violations (Borders and Radii)
- In `live.html`, inline style definitions contain legacy `border-radius:4px;` in several card/container elements:
  - Lines 174, 178, 182, 186, 190 (Kanban columns):
    ```html
    <div class="kanban-col" id="col-open" style="flex:1; min-width:300px; background:var(--bg-card); padding:16px; border-radius:4px; border:var(--border-main);">
    ```
  - Line 260 (Review Editor header):
    ```html
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); padding:16px; border-radius:4px; border:var(--border-main);">
    ```
- In `live.js`, there are hardcoded border and border-radius rules that bypass variables:
  - Line 145 (Kanban Card): `border:1px solid var(--border-medium); border-left:4px solid var(--accent); padding:12px; border-radius:4px;`
  - Line 361 (Task details): `border-radius:4px;`
  - Line 411 (Rejection note): `border-radius:0 4px 4px 0;`
  - Line 491 (WhatsApp box): `border:1px solid var(--border-light); border-radius:12px;`
  - Line 500 (WhatsApp save button): `border-radius:6px;`
  - Line 525 (Division Card): `border:1px solid var(--border-light); border-radius:12px;`
  - Line 673 (Question block editor): `border:1px solid var(--border-medium); border-radius:4px;`
  - Line 677 (Question block textarea): `border:1px solid #333; border-radius:4px;`

### Font Hierarchy
- In `live.html`, header tags contain invalid, duplicate style attributes:
  - Line 90, 162, 219, 232, 252, 439:
    ```html
    <h2 style="font-size:18px; font-weight:600; margin:0;" style="font-family: var(--font-sans);">
    ```
- In `live.js`, dynamically generated headers (like the `h3` division name header on line 532) lack font assignments:
  ```javascript
  <h3 style="margin:0; font-size:18px; color:var(--accent); font-weight:700; letter-spacing:-0.3px;">${div.name}</h3>
  ```

### Modal Structure & Toggle Transitions
- The 5 modals in `live.html` (`createTaskModal`, `promptModal`, `editorModal`, `contextModal`, `divisionPickerModal`) are declared with the legacy class `hidden` on their overlays and do not structure content inside `.settings-header` and `.settings-body` wrappers:
  - Line 297: `<div id="createTaskModal" class="settings-overlay hidden">`
- In `live.js`, these modals are opened/closed in JS using the `.hidden` class:
  - Line 53: `document.getElementById('divisionPickerModal').classList.remove('hidden');`
  - Line 89: `document.getElementById('divisionPickerModal').classList.add('hidden');`
  - Line 238: `modal.classList.remove('hidden');`
  - Line 242: `modal.classList.add('hidden');`
  - Line 392: `modal.classList.remove('hidden');`
  - Lines 446 & 458: `document.getElementById('contextModal').classList.add('hidden');`

### Accessibility Gaps
- `live.html` (Line 270): `#statusText` contains duplicate aria tags:
  ```html
  <span id="statusText" role="status" aria-live="polite" role="status" aria-live="polite">Ready</span>
  ```
- `live.html` (Line 35): `#authMessage` lacks role or live-region tags:
  ```html
  <div id="authMessage" style="font-family:var(--font-mono)...">Verifying Identity...</div>
  ```
- `live.js` (Line 496): Injected WhatsApp SVG lacks `aria-hidden="true"`.
- `admin.js` (Line 1528): Toast builder `showToast` does not add role or live attributes to dynamic toast elements.

---

## 2. Logic Chain
- **Script Route Alignment**: Changing the script tag in `live.html` to point to `/live.js` instead of `/admin-workflow.js` correctly isolates live management logic from admin page updates.
- **Card/Border/Radii Consistency**: Updating inline and dynamically set border-radii to `var(--radius-card)` (8px) and borders to `var(--border-main)` (1.5px solid var(--text-main)) enforces compliance with layout contracts. Removing color-coded left borders on Kanban cards maintains contrast uniformity.
- **Pill Buttons**: Toggling `class="btn-unified primary"` on buttons (like `#btnSaveWa` and others) assigns the standard `var(--radius-pill)` (99px).
- **Fonts**: Merging the duplicate `style` attributes on `h2` elements resolves parsing issues and correctly applies `var(--font-sans)` (Times New Roman). Dynamically injecting `font-family: var(--font-sans)` into division titles ensures layout tokens are applied correctly.
- **Modal Transitions**: Restructuring modals to include `.settings-header` (with CLOSE buttons) and `.settings-body`, and changing `classList` calls in `live.js` to toggle `active` instead of `hidden` allows the CSS transitions defined in `global-styles.css` to render properly.
- **Accessibility**: Merging duplicate attributes in `live.html`, adding `role="status"` and `aria-live="polite"` to `#authMessage` and toast generators, and adding `aria-hidden="true"` to dynamic SVGs resolves screen-reader announcement failures.

---

## 3. Caveats
- No caveats. The codebase was investigated under read-only mode, and the modifications proposed are safe, backwards-compatible, and align with prior Milestone 2 changes.

---

## 4. Conclusion
- The investigation is complete. Implementing the steps outlined in `analysis.md` will satisfy the requirements for Milestone 3.

---

## 5. Verification Method
- **Command**: Run `node build.js` to confirm code compilations.
- **Inspection**:
  - Open `live.html` and verify it loads `/live.js` instead of `/admin-workflow.js`.
  - Inspect the 5 modals on the live page to verify they transition using the `.active` class (check the developer console to confirm `hidden` class toggles are replaced with `active`).
  - Verify that headers render in Times New Roman and data tables/logs render in Courier New.
  - Verify all SVGs have `aria-hidden="true"` and the status panel and toasts declare `role="status"` and `aria-live="polite"`.
