# Detailed Styling, Layout, Typography, and Accessibility Analysis

This report documents the styling, layout, typography, accessibility, and emoji-free compliance analysis of the MR CAPSULES utility subpages: `live.html`/`live.js`, `docs.html`, and `admin.html`/`admin.js`/`admin-workflow.js`.

---

## 1. Document-by-Document Findings

### A. `live.html` and `live.js` (Milestone 3)
* **CSS Files Loaded**: Loads `/global-styles.css`. Compliant.
* **Noise/Scanlines FX**: Completely excluded (no `<div class="noise"></div>` or `<div class="scanlines"></div>`). Compliant.
* **Cards & Containers**:
  * Dashboard cards (Total Users, Uptime, Online Count, Hybrid Activity Log) are styled via inline CSS with `border: var(--border-main)` and `border-radius: var(--radius-card)`. Compliant.
  * Kanban column wrappers use `border: var(--border-main)` and `border-radius: var(--radius-card)`. Compliant.
  * Syllabus table wrapper uses `border: var(--border-main)` and `border-radius: var(--radius-card)`. Compliant.
* **Kanban Card Styling**:
  * In `live.js` (lines 144-145), the Kanban card is styled via inline style attributes:
    ```javascript
    el.className = 'kanban-card';
    el.style.cssText = 'background:var(--bg-main); border:var(--border-main); padding:12px; border-radius:var(--radius-card); font-size:12px; cursor:pointer;';
    ```
    *Issue*: Setting inline styles here violates the **Single Source of Truth** styling architecture since the style definitions for `.kanban-card` should be managed entirely in `global-styles.css`. In fact, `global-styles.css` has `!important` overrides for `.kanban-card` which conflict with the inline style declaration.
* **Pill Buttons**: Uses `.btn-unified.primary` for primary/pills which inherits `border-radius: var(--radius-pill)` (99px). Compliant.
* **Modals**:
  * Modals (`createTaskModal`, `promptModal`, `editorModal`, `contextModal`, and `divisionPickerModal`) use the settings overlay and box styles (`.settings-overlay` and `.settings-box`). Compliant.
* **Typography**:
  * Page title/auth title uses `var(--font-mono)`.
  * Section titles (`h2` for Task Board, Divisions, Leaderboard, CBT Scrapper) and modal titles correctly use `var(--font-sans)` (Times New Roman).
  * Column headers (`h3` inside Kanban columns) correctly use `var(--font-sans)`.
  * Body text and data correctly use `var(--font-mono)`. Compliant.
* **Accessibility**:
  * All SVGs have `aria-hidden="true"`. Compliant.
  * Status elements `#authMessage` and `#statusText` have `role="status"` and `aria-live="polite"`. Compliant.
  * **VIOLATION**: `#contributionStatus` (line 236 in `live.html`) is updated dynamically but does **not** have `role="status"` or `aria-live="polite"`:
    ```html
    <div id="contributionStatus" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
    ```
* **Zero Emojis**: No emojis are used in `live.html` or `live.js`. Compliant.

---

### B. `docs.html` (Milestone 4)
* **CSS Files Loaded**: Loads `/global-styles.css`. Compliant.
* **Noise/Scanlines FX**: Completely excluded. Compliant.
* **Cards & Containers**:
  * Layout container `.docs-container` and `.alert-box` are styled inline. The `.alert-box` uses a custom `border-left: 3px solid var(--accent)` and `border-radius: 0 4px 4px 0`. This is compliant as it is a documentation callout box rather than a card.
* **Pill Buttons**: None used.
* **Modals**: None used.
* **Typography**:
  * **VIOLATION**: In `docs.html` style block (lines 83, 97, 108):
    ```css
    .docs-title {
      font-family: var(--font-mono);
      ...
    }
    .docs-section h2 {
      font-family: var(--font-mono);
      ...
    }
    .docs-section h3 {
      font-family: var(--font-mono);
      ...
    }
    ```
    This causes the main title `.docs-title` and section headings `h3` (e.g., *A. Division Management*, *B. Division Development*, *C. Division Review*) to render in Courier New (`var(--font-mono)`) instead of Times New Roman (`var(--font-sans)`). Although some `h2` tags have inline style adjustments, their base stylesheet classes specify Courier New.
* **Accessibility**: All SVGs have `aria-hidden="true"`. Compliant.
* **Zero Emojis**: No emojis are used in `docs.html`. Compliant.
* **Single Source of Truth**:
  * **VIOLATION**: `docs.html` contains a very large inline `<style>` block (lines 9-173). This violates the Single Source of Truth architecture which states: "*All component styling (containers, backgrounds, cards, modals, fonts, buttons, contrast) must be managed from a single unified CSS file*".

---

### C. `admin.html` and `admin.js` (Milestone 2)
* **CSS Files Loaded**: Loads `/global-styles.css`. Compliant.
* **Noise/Scanlines FX**: Completely excluded. Compliant.
* **Cards & Containers**: All dashboard cards, user-grid containers, list columns, and syllabus tables use `border: var(--border-main)` and `border-radius: var(--radius-card)`. Compliant.
* **Pill Buttons**: Uses `.btn-unified.primary` which has `border-radius: var(--radius-pill)` (99px). Compliant.
* **Modals**: Modals use `.settings-overlay` and `.settings-box` layout. Compliant.
* **Typography**:
  * **VIOLATION**: In `admin.html` (lines 260, 264, 268, 272, 276), the Kanban column headers (`h3` tags inside `.kanban-col`) do **not** have the `font-family: var(--font-sans)` style declared inline, unlike in `live.html`. Consequently, they default to inheriting the body's font family, rendering in Courier New (`var(--font-mono)`) rather than Times New Roman (`var(--font-sans)`).
* **Accessibility**:
  * All SVGs (including dynamic ones created in `admin.js` lines 570-574) have `aria-hidden="true"`. Compliant.
  * Status fields `#authMessage`, `#statusText`, `#contributionStatus`, and `#guestCleanupResult` have `role="status"` and `aria-live="polite"`. Compliant.
* **Zero Emojis**:
  * **VIOLATION**: In `admin-workflow.js` (line 770), the leaderboard generator inserts emoji medal icons:
    ```javascript
    const medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : `${i+1}.`));
    ```
    This directly violates the zero emoji constraint.
  * **POTENTIAL REGRESSION**: In `admin.js` (lines 1322, 1325, 1329), Unicode checkmark and crossmark symbols (`✓`, `✗`) are inserted dynamically to display guest cleanup statuses. While technically not emojis, standardizing these to ASCII brackets or status texts (e.g. `[SUCCESS]` or `[ERROR]`) prevents any browser emoji rendering discrepancies.

---

## 2. Refactoring Plan

Here is the step-by-step action plan to address all identified styling, layout, typography, and accessibility issues.

### Phase 1: CSS Unified Styling Cleanup (Single Source of Truth)
1. **Move Documentation Styling**: Extract all styles defined inside the `<style>` block in `docs.html` and append them to `/global-styles.css`.
2. **Remove Inline Styles from `docs.html`**: Clean up `docs.html` to reference classes from `/global-styles.css` instead of using a local style block.
3. **Align Kanban Card Styling**: Remove the inline style attribute definition `el.style.cssText` on `.kanban-card` in `live.js` (line 145) to ensure it uses the central stylesheet styles exclusively.

### Phase 2: Typography Correction
1. **Fix Header Fonts in `docs.html`**:
   * Change `.docs-title` font-family to `var(--font-sans)`.
   * Change `.docs-section h2` font-family to `var(--font-sans)`.
   * Change `.docs-section h3` font-family to `var(--font-sans)`.
2. **Fix Kanban Header Fonts in `admin.html`**:
   * Add `font-family: var(--font-sans);` style declaration to all `h3` tags inside `.kanban-col` in `admin.html` (lines 260, 264, 268, 272, 276).

### Phase 3: Accessibility Improvements
1. **Add Live Region in `live.html`**:
   * Add `role="status" aria-live="polite"` to `#contributionStatus` in `live.html` (line 236) to ensure assistive technologies announce status changes.

### Phase 4: Zero-Emoji Compliance
1. **Remove Medal Emojis in `admin-workflow.js`**:
   * Replace `🥇`, `🥈`, `🥉` with `'1st'`, `'2nd'`, `'3rd'` at line 770 in `admin-workflow.js` to match the emoji-free logic in `live.js`.
2. **Clean Up Unicode Symbols in `admin.js`**:
   * Replace `✓` with `Success:` and `✗` with `Error:` in `admin.js` guest account cleanup results (lines 1322, 1325, 1329).
