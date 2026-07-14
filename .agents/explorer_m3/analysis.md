# Refactoring Blueprint: live.html, live.js, and Accessibility Refactor

This analysis presents a comprehensive refactoring blueprint for `live.html` and its associated JavaScript files (`live.js` and `admin.js`). It aligns the live content manager styling with the core MR CAPSULES design system defined in `global-styles.css`, cleans up legacy styles, and fixes accessibility gaps.

---

## 1. Summary of Findings
- **Script Route Realignment**: `live.html` currently loads `/admin-workflow.js` instead of the dedicated `/live.js`. They must be split to prevent cross-page pollution.
- **Styling Token Violations**: There are numerous hardcoded borders (`border: 1px solid var(--border-medium)`) and radii (`border-radius: 4px` and `border-radius: 12px`) in both `live.html` and `live.js` that violate design system tokens.
- **Header Duplicate Style Attributes**: The `h2` elements in `live.html` contain duplicate inline style declarations (e.g., `style="..." style="..."`), preventing proper parsing of font families.
- **Modal Structural Conformance**: The 5 modals in `live.html` (`createTaskModal`, `promptModal`, `editorModal`, `contextModal`, `divisionPickerModal`) use legacy markup and class toggles (`hidden`) instead of the transitioned `.settings-overlay.active` layout.
- **Accessibility Gaps**: Several gaps exist including duplicate `role="status"` tags, lack of screen reader announcements for toast notifications and authentication status, and missing `aria-hidden="true"` tags on dynamic SVGs.

---

## 2. Refactoring Blueprint

### Step 1: Script Realignment (`live.html`)
To isolate the logic of the live manager from the admin manager, `live.html` must load `live.js` instead of `admin-workflow.js`.
- **Target**: `live.html` (Line 503)
- **Before**:
  ```html
  <script src="/admin-workflow.js?v=1.2"></script>
  ```
- **After**:
  ```html
  <script src="/live.js?v=1.2"></script>
  ```

### Step 2: Remove Visual FX (`live.html`)
Verify and guarantee that no elements with class `.noise` or `.scanlines` are present in `live.html` (currently verified as clean, but must be maintained).

### Step 3: Card and Container Styling Refactor
All cards and containers must use `border: var(--border-main)` (`1.5px solid var(--text-main)`) and `border-radius: var(--radius-card)` (`8px`). All buttons must use `border-radius: var(--radius-pill)` (`99px`) or `class="btn-unified"`.

#### Changes in `live.html`:
- **Kanban Columns** (Lines 174, 178, 182, 186, 190): Change inline `border-radius:4px;` to `border-radius:var(--radius-card);`.
- **Review Editor Header** (Line 260): Change inline `border-radius:4px;` to `border-radius:var(--radius-card);`.
- **Tasks View Toggle Select** (Line 164): Change inline `border-radius:4px;` to `border-radius:4px; border: var(--border-main);`.

#### Changes in `live.js`:
- **Kanban Cards** (Line 145):
  - **Before**: `el.style.cssText = 'background:var(--bg-main); border:1px solid var(--border-medium); border-left:4px solid var(--accent); padding:12px; border-radius:4px; font-size:12px; cursor:pointer;';`
  - **After**: `el.style.cssText = 'background:var(--bg-main); border:var(--border-main); padding:12px; border-radius:var(--radius-card); font-size:12px; cursor:pointer;';` *(Note: Removes the color-coded left border override to enforce uniformity)*
- **WhatsApp Settings Container** (Line 491):
  - **Before**: `waContainer.style.cssText = 'grid-column: 1 / -1; background:var(--bg-card); padding:20px 24px; border:1px solid var(--border-light); border-radius:12px; margin-bottom:24px; ...';`
  - **After**: `waContainer.style.cssText = 'grid-column: 1 / -1; background:var(--bg-card); padding:20px 24px; border:var(--border-main); border-radius:var(--radius-card); margin-bottom:24px; ...';`
- **WhatsApp Button (`#btnSaveWa`)** (Line 500):
  - **Before**: `border-radius:6px;`
  - **After**: Use class `btn-unified primary` which assigns `border-radius: var(--radius-pill)`.
- **Division Cards** (Line 525):
  - **Before**: `card.style.cssText = 'background:var(--bg-card); display:flex; flex-direction:column; padding:24px; border:1px solid var(--border-light); border-radius:12px; ...';`
  - **After**: `card.style.cssText = 'background:var(--bg-card); display:flex; flex-direction:column; padding:24px; border:var(--border-main); border-radius:var(--radius-card); ...';`
- **Other inline card elements** (Lines 361, 515, 540, 660, 673, 677): Change hardcoded `border-radius` values to `var(--radius-card)` and use `var(--border-main)` for borders.

### Step 4: Font Families & Typography Refactor
Headers must be assigned `Times New Roman` (`var(--font-sans)`), and data displays must use `Courier New` (`var(--font-mono)`).
- **Merge Duplicate Styles in `live.html`** (Lines 90, 162, 219, 232, 252, 439):
  - **Before**: `<h2 style="..." style="font-family: var(--font-sans);">`
  - **After**: `<h2 style="font-size:18px; font-weight:600; margin:0; font-family:var(--font-sans);">`
- **Apply to Dynamic Headers in `live.js`**:
  - In `loadDivisions` (Line 532), dynamically generated `h3` division title headers must have `font-family: var(--font-sans);` added inline.

### Step 5: Modal Refactoring Blueprint
The 5 overlays must be refactored to wrap content in `.settings-header` + `.settings-body` and use `.settings-overlay` transitions in JS instead of the `.hidden` utility class.

#### 1. `#createTaskModal` (in `live.html`)
```html
<div id="createTaskModal" class="settings-overlay">
  <div class="settings-box" style="max-width: 550px;">
    <div class="settings-header">
      <span style="font-family: var(--font-sans); font-size: 16px; font-weight: 700;">CREATE NEW CONTENT TASK</span>
      <button class="btn-text" onclick="document.getElementById('createTaskModal').classList.remove('active')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        CLOSE
      </button>
    </div>
    <div class="settings-body" style="gap:16px;">
      <!-- Content form fields remain intact -->
      <div class="modal-actions" style="display:flex; gap:12px; justify-content:flex-end; margin-top:12px;">
        <button id="taskCancel" class="btn-unified" onclick="document.getElementById('createTaskModal').classList.remove('active')">Cancel</button>
        <button id="taskConfirm" class="btn-unified primary">Create Task</button>
      </div>
    </div>
  </div>
</div>
```

#### 2. `#promptModal` (in `live.html`)
```html
<div id="promptModal" class="settings-overlay">
  <div class="settings-box" style="max-width: 400px;">
    <div class="settings-header">
      <span id="promptTitle" style="font-family: var(--font-sans); font-size: 16px; font-weight: 700;">ENTER VALUE</span>
      <button class="btn-text" id="promptHeaderCancel">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        CLOSE
      </button>
    </div>
    <div class="settings-body" style="gap:16px;">
      <input type="text" id="promptInput" class="auth-input" style="width:100%; box-sizing:border-box;" />
      <div class="modal-actions" style="display:flex; gap:12px; justify-content:space-between; margin-top:12px;">
        <button id="promptCancel" class="btn-unified">Cancel</button>
        <button id="promptConfirm" class="btn-unified primary">Confirm</button>
      </div>
    </div>
  </div>
</div>
```

#### 3. `#editorModal` (in `live.html`)
```html
<div id="editorModal" class="settings-overlay">
  <div class="settings-box editor-modal" id="editorModalContainer" style="width: 95vw; height: 95vh; max-width: 100%; display: flex; flex-direction: column; padding: 0;">
    <div class="settings-header">
      <span id="editorTitle" style="font-family: var(--font-sans); font-size: 16px; font-weight: 700; color: var(--accent);">EDITING FILE</span>
      <div style="display:flex; align-items:center; gap:16px;">
        <button id="editorFullscreen" class="btn-unified" style="font-size: 14px; padding: 8px 12px; border-color: var(--border-medium);" title="Toggle Fullscreen">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
        </button>
        <button class="btn-text" id="editorClose">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          CLOSE
        </button>
      </div>
    </div>
    <div class="settings-body" style="flex:1; padding:20px; overflow:hidden; display:flex; flex-direction:column; gap:16px;">
      <div class="editor-container" id="editorSplitContainer" style="flex: 1; margin-top: 0;">
        <!-- CodeMirror fields -->
      </div>
      <div class="modal-actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:0;">
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.5px;">[Ctrl+F] Search &bull; [Esc] Close</div>
        <div style="display: flex; gap: 12px;">
          <button id="editorCancel" class="btn-unified" style="padding: 10px 20px;">Cancel</button>
          <button id="editorSave" class="btn-unified primary" style="padding: 10px 20px;">Save Changes</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 4. `#contextModal` (in `live.html`)
```html
<div id="contextModal" class="settings-overlay">
  <div class="settings-box" style="max-width: 400px;">
    <div class="settings-header">
      <span id="contextTitle" style="font-family: var(--font-sans); font-size: 16px; font-weight: 700;">FILE ACTIONS</span>
      <button class="btn-text" onclick="document.getElementById('contextModal').classList.remove('active')">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        CLOSE
      </button>
    </div>
    <div class="settings-body" style="gap:16px;">
      <div id="contextActions" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button class="btn-unified" id="contextCancel" style="justify-content:center; width:100%;" onclick="document.getElementById('contextModal').classList.remove('active')">Cancel</button>
    </div>
  </div>
</div>
```

#### 5. `#divisionPickerModal` (in `live.html`)
```html
<div id="divisionPickerModal" class="settings-overlay" style="z-index:99999;">
  <div class="settings-box" style="max-width: 480px;">
    <div class="settings-header" style="justify-content:center;">
      <span style="font-family: var(--font-sans); font-size: 16px; font-weight: 700; letter-spacing: 0.1em;">PILIH DIVISI KAMU</span>
    </div>
    <div class="settings-body" style="text-align:center; gap:16px;">
      <p style="font-size:14px; color:var(--text-muted); margin-bottom:12px; font-family: var(--font-mono);">Kamu wajib bergabung dengan salah satu divisi untuk bisa berkontribusi.</p>
      <div style="display:flex; flex-direction:column; gap:12px;">
         <button class="btn-unified primary" onclick="joinDivision('development')" style="justify-content:center;">Development (Pembuat Konten)</button>
         <button class="btn-unified primary" onclick="joinDivision('review')" style="justify-content:center;">Database Review (Quality Assurance)</button>
         <button class="btn-unified primary" onclick="joinDivision('management')" style="justify-content:center;">Management (Pengurus & Inovasi)</button>
      </div>
    </div>
  </div>
</div>
```

#### JavaScript Modal Toggle Refactoring (`live.js`)
Replace `.classList.remove('hidden')` and `.classList.add('hidden')` with `.classList.add('active')` and `.classList.remove('active')` respectively:
- **Line 53**: Change `document.getElementById('divisionPickerModal').classList.remove('hidden')` to `classList.add('active')`.
- **Line 89**: Change `document.getElementById('divisionPickerModal').classList.add('hidden')` to `classList.remove('active')`.
- **Line 238**: Change `modal.classList.remove('hidden')` to `modal.classList.add('active')` (for `createTaskModal`).
- **Line 242**: Change `modal.classList.add('hidden')` to `modal.classList.remove('active')` (for `createTaskModal`).
- **Line 392**: Change `modal.classList.remove('hidden')` to `modal.classList.add('active')` (for `contextModal`).
- **Lines 446 & 458**: Change `document.getElementById('contextModal').classList.add('hidden')` to `classList.remove('active')`.

---

## 3. Accessibility Analysis & Remediation

| Issue Location | Element | Observed Gap | Remediation Action |
| :--- | :--- | :--- | :--- |
| `live.html` (Line 270) | `#statusText` | Duplicate attributes: `role="status" aria-live="polite" role="status" aria-live="polite"`. | Clean up to a single instance of `role="status" aria-live="polite"`. |
| `live.html` (Line 35) | `#authMessage` | Lacks `role` or `aria-live` attributes to notify screen readers of authentication state updates. | Add `role="status" aria-live="polite"` to the element. |
| `live.js` (Line 496) | Injected WhatsApp SVG | Missing accessibility tags (no `aria-hidden="true"` or `aria-label`). | Add `aria-hidden="true"` to the SVG wrapper. |
| `admin.js` (Line 1528) | Dynamically built Toast notification | Dynamic toast containers lack `role="status"` and `aria-live="polite"`. | Add `toast.setAttribute('role', 'status')` and `toast.setAttribute('aria-live', 'polite')` in the generator loop. |

---

## 4. Verification Methods
1. **Compilation**: Run `node build.js` to ensure the project packages and compiles the catalog cleanly without issues.
2. **Layout Inspection**: Check `live.html` in the browser and verify all modals fade/transition smoothly when toggled (verifies the `.active` transition works).
3. **Typography & Styling Audit**: Inspect the `h2` and `h3` elements to verify that `Times New Roman` is applied correctly. Ensure table items and code editor frames use `Courier New`.
4. **Accessibility Check**: Use browser developer tools or a screen reader to verify that `#authMessage`, `#statusText`, and toast notifications are correctly announced and SVGs are ignored by assistive tech.
