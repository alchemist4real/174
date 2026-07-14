# MR CAPSULES Admin Page Refactoring Analysis & Strategy

This document provides a detailed analysis of the current structure of `admin.html`, its styling relationships with `global-styles.css`, and a complete strategy for refactoring it to align with the design guidelines and resolve accessibility/style feedback.

---

## 1. Executive Summary

A comprehensive audit of `admin.html`, `global-styles.css`, `admin.js`, and `admin-workflow.js` reveals styling inconsistencies, accessibility gaps, and invalid HTML structures (such as duplicate style attributes) introduced by previous automated scripts. 

To achieve alignment with the unified design token contract, we will:
1. Standardize borders and border-radii mapping using native CSS variables (`--border-main`, `--radius-card`, `--radius-pill`).
2. Restructure all 5 modals to use the `.settings-overlay` + `.settings-box` + `.settings-header` + `.settings-body` nested DOM architecture.
3. Switch modal toggle logic in JavaScript from `.hidden` (`display: none`) to `.active` (opacity/visibility transition) for smooth, premium transitions.
4. Clean up invalid duplicate style/role attributes in the HTML.
5. Remap broken JavaScript query selectors (e.g. theme buttons) and remove dynamic emoji injections.
6. Enhance SVG and status indicator accessibility.

---

## 2. Token & Styling Mapping Table

The following table documents how the legacy CSS classes and inline style definitions in the current admin page map to the new unified design tokens defined in `global-styles.css`:

| Element/Feature | Current Class/Inline Style | Target Token/Unified Class | Rationale |
| :--- | :--- | :--- | :--- |
| **Borders (Contrast)** | `border: var(--border-main)` | `border: var(--border-main)` | Already mapped; resolves to `1.5px solid var(--text-main)`. |
| **Card Radii** | `border-radius: 0` or missing (e.g., stats cards) | `border-radius: var(--radius-card)` | Maps to `8px` rounded corners for cards/containers. |
| **Pill Button Radii** | `border-radius: var(--radius-card)` (primary button) | `border-radius: var(--radius-pill)` | Maps to `99px` rounded corners for primary buttons. |
| **Text Fonts (Data)** | Default body font / `Courier New` | `font-family: var(--font-mono)` | Preserves `Courier New` terminal aesthetic for data. |
| **Text Fonts (Header)** | Missing / invalid style attributes | `font-family: var(--font-sans)` | Standardizes `Times New Roman` for prominent titles. |
| **Modal Backdrop** | `custom-modal-overlay` / `.hidden` | `.settings-overlay` / `.active` | Uses the dark translucent backdrop with transition. |
| **Modal Container** | `custom-modal` | `.settings-box` | Standardized width limits, border, and 8px border-radius. |

---

## 3. Structural Audit & Issues Identified

### A. Invalid HTML Attributes (Duplicate Style/Aria tags)
Previous refactoring scripts used blind regex replacements, resulting in duplicate attributes:
- **Duplicate Style tags on `<h2>` elements (Lines 90, 168, 222, 474)**:
  *Example (Line 90):*
  ```html
  <h2 style="font-size:22px; font-weight:700; margin:0;" style="font-family: var(--font-sans);">
  ```
  Browsers ignore the second `style` attribute, so the header font is not correctly rendered in `Times New Roman`.
- **Duplicate Role/Aria tags on status text (Line 304)**:
  ```html
  <span id="statusText" role="status" aria-live="polite" role="status" aria-live="polite">Ready</span>
  ```

### B. Broken Theme Selector in `admin.js`
In M1, theme buttons in `admin.html` were renamed from `admin-theme-btn` to `admin-theme-btn-unified`. However, `admin.js` (Line 1443) still queries the old class:
```javascript
const adminThemeBtns = document.querySelectorAll('.admin-theme-btn');
```
This causes an empty NodeList, breaking the theme toggle selection indicators in the UI.

### C. Modal Padding and Transition Incompatibility
- Modals in `admin.html` (such as `promptModal` and `createTaskModal`) lack inner `.settings-header` and `.settings-body` wrappers. Since `.settings-box` itself does not have padding, the content collapses directly to the borders.
- Modals are shown/hidden in JavaScript using `.classList.add('hidden')` and `.classList.remove('hidden')`. Since `.hidden` has `display: none !important`, it completely bypasses the smooth opacity/visibility transition defined on `.settings-overlay` in `global-styles.css`.

### D. Zero-Emoji Rule Violation
Although `🗑️` was removed from the HTML markup, it is still dynamically injected by `admin.js` (Line 1322):
```javascript
btnGuestCleanup.textContent = '🗑️ Clean Guests (24h+)';
```

---

## 4. Detailed Refactoring Strategy

### 4.1. Stylesheet & FX Clean Up (No Code Modification)
- **Stylesheet inclusion**: Retain `<link rel="stylesheet" href="/global-styles.css">` at line 8 and ensure no references to `admin.css` or `new_styles.css` are added.
- **Landing effects**: Ensure `<div class="noise"></div>` and `<div class="scanlines"></div>` remain completely absent from `admin.html`.

### 4.2. Modal Layout Standardisation
Refactor all five modal overlays to follow the standardized nested DOM structure:

```html
<!-- Generic Template -->
<div id="[modalId]" class="settings-overlay">
  <div class="settings-box" style="max-width: [customWidth];">
    <div class="settings-header">
      <span style="font-family: var(--font-sans); font-size: 16px; font-weight: 700;">[TITLE IN CAPS]</span>
      <button class="btn-text" id="[closeBtnId]">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        CLOSE
      </button>
    </div>
    <div class="settings-body" style="gap: 16px;">
      <!-- Content here -->
    </div>
  </div>
</div>
```

*Note: For `divisionPickerModal`, which is a blocking setup modal, the CLOSE button is omitted from the header to force interaction.*

### 4.3. JavaScript Modal Toggle Update
Update the event listeners and show/hide logic in `admin.js` and `admin-workflow.js` to toggle the `.active` class on modal elements, and remove the `.hidden` class from the overlays in the HTML file:
- **Show**: `modal.classList.add('active');`
- **Hide**: `modal.classList.remove('active');`

### 4.4. Typography & Attributes Cleanup
- Merge the duplicate style attributes on `h2` elements:
  *Before:* `<h2 style="font-size:22px; font-weight:700; margin:0;" style="font-family: var(--font-sans);">`
  *After:* `<h2 style="font-size:22px; font-weight:700; margin:0; font-family: var(--font-sans);">`
- Add `font-family: var(--font-sans)` to `.modal-title` class inside `global-styles.css` to cover all modal headers.
- Clean up duplicate `role="status"` and `aria-live="polite"` on `#statusText` span.

### 4.5. Border Contrast & Radii Mapping
- Add `border-radius: var(--radius-card);` to dashboard stats cards.
- Add `border-radius: var(--radius-pill);` to `.btn-unified.primary` in `global-styles.css`.
- Update the dynamically generated question blocks in `admin-workflow.js` to use `border-radius: var(--radius-card); border: var(--border-main);` for both the block container and the textareas.
- Remove `border-left` overrides on `.kanban-card` in `global-styles.css` to keep its border strictly a unified `1.5px solid var(--text-main)`.

### 4.6. Accessibility Enhancements
- Add `aria-hidden="true"` to dynamic SVGs generated in `admin.js` lines 560, 562, and 564.
- Add `role="status" aria-live="polite"` to status elements (`#guestCleanupResult`, `#contributionStatus`, `#authMessage`).

---

## 5. Implementation Diff Blueprint

The following diff blueprints represent the exact changes required in the files (to be applied by the implementer subagent):

### 5.1. admin.html Proposed Changes

```diff
<<<<
    <div id="authMessage" style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase;">Verifying Identity...</div>
====
    <div id="authMessage" role="status" aria-live="polite" style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted); letter-spacing:0.1em; text-transform:uppercase;">Verifying Identity...</div>
>>>>

<<<<
        <div class="toolbar">
          <h2 style="font-size:22px; font-weight:700; margin:0;" style="font-family: var(--font-sans);">Analytics & Activity Logs</h2>
====
        <div class="toolbar">
          <h2 style="font-size:22px; font-weight:700; margin:0; font-family: var(--font-sans);">Analytics & Activity Logs</h2>
>>>>

<<<<
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px;">
            <div style="background:var(--bg-card); border:var(--border-main); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL USERS</div>
              <div id="dashTotalUsers" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL APP UPTIME</div>
              <div id="dashTotalUptime" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">CURRENTLY ONLINE</div>
              <div id="dashOnlineCount" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">MY POINTS</div>
              <div id="myPoints" style="font-size:36px; font-weight:700;">-</div>
              <div id="contributionStatus" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">GUEST CLEANUP</div>
              <div id="guestCleanupResult" style="font-size:14px; font-weight:600; margin-bottom:12px; min-height:24px; color:var(--text-muted);">Remove stale guest accounts</div>
              <button id="btnGuestCleanup" class="btn-unified" style="width:100%; padding:8px;"> Clean Guests (24h+)</button>
            </div>
          </div>
====
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:24px;">
            <div style="background:var(--bg-card); border:var(--border-main); border-radius:var(--radius-card); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL USERS</div>
              <div id="dashTotalUsers" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); border-radius:var(--radius-card); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">TOTAL APP UPTIME</div>
              <div id="dashTotalUptime" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); border-radius:var(--radius-card); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">CURRENTLY ONLINE</div>
              <div id="dashOnlineCount" style="font-size:36px; font-weight:700;">-</div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); border-radius:var(--radius-card); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">MY POINTS</div>
              <div id="myPoints" style="font-size:36px; font-weight:700;">-</div>
              <div id="contributionStatus" role="status" aria-live="polite" style="margin-top:12px; font-size:13px; font-weight:600;"></div>
            </div>
            <div style="background:var(--bg-card); border:var(--border-main); border-radius:var(--radius-card); padding:24px;">
              <div style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted); margin-bottom:8px;">GUEST CLEANUP</div>
              <div id="guestCleanupResult" role="status" aria-live="polite" style="font-size:14px; font-weight:600; margin-bottom:12px; min-height:24px; color:var(--text-muted);">Remove stale guest accounts</div>
              <button id="btnGuestCleanup" class="btn-unified" style="width:100%; padding:8px;">Clean Guests (24h+)</button>
            </div>
          </div>
>>>>

<<<<
            <div id="waConfigContainer" style="padding:16px; border-top:var(--border-main); display:none; background:var(--bg-card);">
                <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-bottom:8px; font-family:var(--font-mono);">WhatsApp API</div>
                <input type="text" id="myWaInput" class="auth-input" placeholder="e.g. 62812..." style="width:100%; margin-bottom:12px; padding:10px; font-size:14px;">
                <button class="btn-unified" id="btnSaveWa" style="width:100%; background:var(--accent); color:var(--bg-main); border:none; font-weight:700; padding:12px; font-size:14px;">Save</button>
            </div>
====
            <div id="waConfigContainer" style="padding:16px; border-top:var(--border-main); display:none; background:var(--bg-card);">
                <div style="font-size:13px; font-weight:700; color:var(--text-main); margin-bottom:8px; font-family:var(--font-mono);">WhatsApp API</div>
                <input type="text" id="myWaInput" class="auth-input" placeholder="e.g. 62812..." style="width:100%; margin-bottom:12px; padding:10px; font-size:14px;">
                <button class="btn-unified primary" id="btnSaveWa" style="width:100%;">Save</button>
            </div>
>>>>

<<<<
                        <h2 id="orgViewTitle" style="font-size:32px; font-weight:800; margin:0; letter-spacing:-1px;" style="font-family: var(--font-sans);">All Users</h2>
====
                        <h2 id="orgViewTitle" style="font-size:32px; font-weight:800; margin:0; letter-spacing:-1px; font-family: var(--font-sans);">All Users</h2>
>>>>

<<<<
                            <span class="slider" style="background:transparent; border:1px solid var(--danger);"></span>
====
                            <span class="slider" style="background:transparent; border:1.5px solid var(--danger);"></span>
>>>>

<<<<
            <h2 style="font-size:22px; font-weight:700; margin:0;" style="font-family: var(--font-sans);">Task Board</h2>
====
            <h2 style="font-size:22px; font-weight:700; margin:0; font-family: var(--font-sans);">Task Board</h2>
>>>>

<<<<
      <div class="status-bar">
        <span id="statusText" role="status" aria-live="polite" role="status" aria-live="polite">Ready</span>
        <span id="itemCount">0 items</span>
      </div>
====
      <div class="status-bar">
        <span id="statusText" role="status" aria-live="polite">Ready</span>
        <span id="itemCount">0 items</span>
      </div>
>>>>

<<<<
  <!-- Create Task Modal -->
  <div id="createTaskModal" class="settings-overlay hidden bottom-up">
    <div class="settings-box">
      <div class="modal-title" style="margin-bottom:16px;">Create New Content Task</div>
      
      <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
              <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Title</label>
              <input type="text" id="taskTitle" class="auth-input" placeholder="e.g. Farmakologi Dasar" style="width:100%; box-sizing:border-box;">
          </div>
          
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Category</label>
                  <select id="taskCategory" class="auth-input" style="width:100%; box-sizing:border-box;">
                      <option value="CBT">CBT</option>
                      <option value="OSCE">OSCE</option>
                      <option value="Video">Video</option>
                      <option value="Summary">Summary</option>
                      <option value="__NEW__" style="font-weight:bold;">+ Add New Category...</option>
                  </select>
              </div>
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Priority</label>
                  <select id="taskPriority" class="auth-input" style="width:100%; box-sizing:border-box;">
                      <option value="low">Low</option>
                      <option value="normal" selected>Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                  </select>
              </div>
          </div>
          
          <div style="display:flex; gap:12px;">
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Semester</label>
                  <select id="taskSemester" class="auth-input" style="width:100%; box-sizing:border-box;">
                      <option value="1">Semester 1</option>
                      <option value="2">Semester 2</option>
                      <option value="3">Semester 3</option>
                      <option value="4">Semester 4</option>
                      <option value="5">Semester 5</option>
                      <option value="6">Semester 6</option>
                      <option value="7">Semester 7</option>
                      <option value="8">Semester 8</option>
                  </select>
              </div>
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Block</label>
                  <input type="text" id="taskBlock" class="auth-input" placeholder="e.g. Block 1.5" style="width:100%; box-sizing:border-box;">
              </div>
          </div>
          
          <div style="display:flex; gap:12px;">
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Due Date (Optional)</label>
                  <input type="date" id="taskDueDate" class="auth-input" style="width:100%; box-sizing:border-box;">
              </div>
              <div style="flex:1;">
                  <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Assign To (Optional)</label>
                  <select id="taskAssignTo" class="auth-input" style="width:100%; box-sizing:border-box;">
                      <option value="">-- Unassigned --</option>
                  </select>
              </div>
          </div>
          
          <div>
              <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Target File Path (Optional)</label>
              <input type="text" id="taskTargetPath" class="auth-input" placeholder="e.g. content/farmako/bab1.html" style="width:100%; box-sizing:border-box;">
          </div>
          
          <div>
              <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Description & Notes</label>
              <textarea id="taskDescription" class="auth-input" style="width:100%; height:80px; box-sizing:border-box; resize:vertical; font-family:inherit;" placeholder="Add specific instructions for the developer..."></textarea>
          </div>
      </div>
      
      <div class="modal-actions" style="margin-top:24px;">
        <button id="taskCancel" class="btn-unified" onclick="document.getElementById('createTaskModal').classList.add('hidden')">Cancel</button>
        <button id="taskConfirm" class="btn-unified primary">Create Task</button>
      </div>
    </div>
  </div>

  <!-- Generic Prompt Modal (used by customPrompt, customConfirm, customAlert) -->
  <div id="promptModal" class="settings-overlay hidden">
    <div class="settings-box">
      <div class="modal-title" id="promptTitle">Enter value</div>
      <input type="text" id="promptInput" class="auth-input" />
      <div class="modal-actions">
        <button id="promptCancel" class="btn-unified">Cancel</button>
        <button id="promptConfirm" class="btn-unified primary">Confirm</button>
      </div>
    </div>
  </div>

  <!-- HTML Editor Modal -->
  <div id="editorModal" class="settings-overlay hidden">
    <div class="settings-box editor-modal" id="editorModalContainer" style="width: 95vw; height: 95vh; max-width: 100%; display: flex; flex-direction: column; padding: 24px;">
      <div class="modal-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: var(--border-main); padding-bottom: 16px; margin-bottom: 0;">
        <div style="display:flex; align-items:center; gap:16px;">
          <span id="editorTitle" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--accent);">Editing File</span>
        </div>
        <div style="display:flex; align-items:center; gap:16px;">
          <button id="editorFullscreen" class="btn-unified" style="font-size: 14px; padding: 8px 12px; border-color: var(--border-medium);" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
          </button>
          <button id="editorClose" style="background:transparent; color:var(--text-main); border:none; font-size:28px; cursor:pointer; line-height: 1; padding: 0;">&times;</button>
        </div>
      </div>
      <div class="editor-container" id="editorSplitContainer">
        <div id="editorPane" style="width: 50%; display: flex; flex-direction: column; height: 100%; background: #2b2b2b;">
          <textarea id="codeEditor"></textarea>
        </div>
        <div class="editor-resizer" id="editorResizer"></div>
        <div id="previewPane" style="width: 50%; display: flex; background: #fff; height: 100%;">
          <iframe id="editorPreview" style="width: 100%; height: 100%; border: none;"></iframe>
        </div>
      </div>
      <div class="modal-actions">
        <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); letter-spacing: 0.5px;">[Ctrl+F] Search &bull; [Esc] Close</div>
        <div style="display: flex; gap: 12px;">
          <button id="editorCancel" class="btn-unified" style="padding: 10px 20px;">Cancel</button>
          <button id="editorSave" class="btn-unified primary" style="padding: 10px 20px;">Save Changes</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Context Actions Modal -->
  <div id="contextModal" class="settings-overlay hidden bottom-up">
    <div class="settings-box">
      <div class="modal-title" id="contextTitle" style="font-family:var(--font-sans); font-size:24px; font-weight:600; text-align:center; padding-bottom:12px; border-bottom:var(--border-main); margin-bottom:8px;">File Actions</div>
      <div id="contextActions" style="display:flex; flex-direction:column; gap:8px;"></div>
      <button class="btn-unified" id="contextCancel" style="margin-top:16px; justify-content:center; width:100%;" onclick="document.getElementById('contextModal').classList.add('hidden')">Cancel</button>
    </div>
  </div>

  <!-- Toast Container -->
  <div id="toastContainer" style="position:fixed; bottom:80px; right:24px; display:flex; flex-direction:column; gap:8px; z-index:9999; pointer-events:none;"></div>

  <!-- Division Picker Modal -->
  <div id="divisionPickerModal" class="settings-overlay hidden" style="z-index:99999;">
    <div class="settings-box" style="text-align:center; padding:32px;">
      <h2 style="margin-top:0;" style="font-family: var(--font-sans);">Pilih Divisi Kamu</h2>
      <p style="font-size:14px; color:var(--text-muted); margin-bottom:24px;">Kamu wajib bergabung dengan salah satu divisi untuk bisa berkontribusi.</p>
      <div style="display:flex; flex-direction:column; gap:12px;">
         <button class="btn-unified primary" onclick="joinDivision('development')" style="justify-content:center;">Development (Pembuat Konten)</button>
         <button class="btn-unified primary" onclick="joinDivision('review')" style="justify-content:center;">Database Review (Quality Assurance)</button>
         <button class="btn-unified primary" onclick="joinDivision('management')" style="justify-content:center;">Management (Pengurus & Inovasi)</button>
      </div>
    </div>
  </div>
====
  <!-- Create Task Modal -->
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
        <div style="display:flex; flex-direction:column; gap:12px;">
            <div>
                <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Title</label>
                <input type="text" id="taskTitle" class="auth-input" placeholder="e.g. Farmakologi Dasar" style="width:100%; box-sizing:border-box;">
            </div>
            
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Category</label>
                    <select id="taskCategory" class="auth-input" style="width:100%; box-sizing:border-box;">
                        <option value="CBT">CBT</option>
                        <option value="OSCE">OSCE</option>
                        <option value="Video">Video</option>
                        <option value="Summary">Summary</option>
                        <option value="__NEW__" style="font-weight:bold;">+ Add New Category...</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Priority</label>
                    <select id="taskPriority" class="auth-input" style="width:100%; box-sizing:border-box;">
                        <option value="low">Low</option>
                        <option value="normal" selected>Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>
            </div>
            
            <div style="display:flex; gap:12px;">
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Semester</label>
                    <select id="taskSemester" class="auth-input" style="width:100%; box-sizing:border-box;">
                        <option value="1">Semester 1</option>
                        <option value="2">Semester 2</option>
                        <option value="3">Semester 3</option>
                        <option value="4">Semester 4</option>
                        <option value="5">Semester 5</option>
                        <option value="6">Semester 6</option>
                        <option value="7">Semester 7</option>
                        <option value="8">Semester 8</option>
                    </select>
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Block</label>
                    <input type="text" id="taskBlock" class="auth-input" placeholder="e.g. Block 1.5" style="width:100%; box-sizing:border-box;">
                </div>
            </div>
            
            <div style="display:flex; gap:12px;">
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Due Date (Optional)</label>
                    <input type="date" id="taskDueDate" class="auth-input" style="width:100%; box-sizing:border-box;">
                </div>
                <div style="flex:1;">
                    <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Assign To (Optional)</label>
                    <select id="taskAssignTo" class="auth-input" style="width:100%; box-sizing:border-box;">
                        <option value="">-- Unassigned --</option>
                    </select>
                </div>
            </div>
            
            <div>
                <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Target File Path (Optional)</label>
                <input type="text" id="taskTargetPath" class="auth-input" placeholder="e.g. content/farmako/bab1.html" style="width:100%; box-sizing:border-box;">
            </div>
            
            <div>
                <label style="font-size:12px; color:var(--text-muted); font-weight:600;">Description & Notes</label>
                <textarea id="taskDescription" class="auth-input" style="width:100%; height:80px; box-sizing:border-box; resize:vertical; font-family:inherit;" placeholder="Add specific instructions for the developer..."></textarea>
            </div>
        </div>
        
        <div class="modal-actions" style="display:flex; gap:12px; justify-content:flex-end; margin-top:12px;">
          <button id="taskCancel" class="btn-unified" onclick="document.getElementById('createTaskModal').classList.remove('active')">Cancel</button>
          <button id="taskConfirm" class="btn-unified primary">Create Task</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Generic Prompt Modal (used by customPrompt, customConfirm, customAlert) -->
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

  <!-- HTML Editor Modal -->
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
          <div id="editorPane" style="width: 50%; display: flex; flex-direction: column; height: 100%; background: #2b2b2b;">
            <textarea id="codeEditor"></textarea>
          </div>
          <div class="editor-resizer" id="editorResizer"></div>
          <div id="previewPane" style="width: 50%; display: flex; background: #fff; height: 100%;">
            <iframe id="editorPreview" style="width: 100%; height: 100%; border: none;"></iframe>
          </div>
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

  <!-- Context Actions Modal -->
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

  <!-- Toast Container -->
  <div id="toastContainer" style="position:fixed; bottom:80px; right:24px; display:flex; flex-direction:column; gap:8px; z-index:9999; pointer-events:none;"></div>

  <!-- Division Picker Modal -->
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
>>>>

<<<<
  <h2 style="margin-top:0;" style="font-family: var(--font-sans);">Pilih Divisi Kamu</h2>
====
  <h2 style="margin-top:0; font-family: var(--font-sans);">Pilih Divisi Kamu</h2>
>>>>
```

### 5.2. admin.js Proposed Changes

```diff
<<<<
        if (item.type === 'folder') {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        } else if (isImg) {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        } else {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        }
====
        if (item.type === 'folder') {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>';
        } else if (isImg) {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>';
        } else {
          icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>';
        }
>>>>

<<<<
      const emodal = document.getElementById('editorModal');
      const emodalContainer = document.getElementById('editorModalContainer');
      document.getElementById('editorTitle').textContent = `Editing: ${item.name}`;
      emodal.classList.remove('hidden');
====
      const emodal = document.getElementById('editorModal');
      const emodalContainer = document.getElementById('editorModalContainer');
      document.getElementById('editorTitle').textContent = `Editing: ${item.name}`;
      emodal.classList.add('active');
>>>>

<<<<
      document.getElementById('editorClose').onclick = () => emodal.classList.add('hidden');
      document.getElementById('editorCancel').onclick = () => emodal.classList.add('hidden');
====
      document.getElementById('editorClose').onclick = () => emodal.classList.remove('active');
      document.getElementById('editorCancel').onclick = () => emodal.classList.remove('active');
>>>>

<<<<
      if (document.getElementById('editorClose')) {
        document.getElementById('editorClose').onclick = () => {
          emodal.classList.add('hidden');
        };
      }
====
      if (document.getElementById('editorClose')) {
        document.getElementById('editorClose').onclick = () => {
          emodal.classList.remove('active');
        };
      }
>>>>

<<<<
    window.customPrompt = function(title, defaultVal, callback) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        
        titleEl.textContent = title;
        inputEl.value = defaultVal || '';
        modal.classList.remove('hidden');
====
    window.customPrompt = function(title, defaultVal, callback) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');
        
        titleEl.textContent = title;
        inputEl.value = defaultVal || '';
        modal.classList.add('active');
>>>>

<<<<
        btnConfirm.onclick = function() {
            modal.classList.add('hidden');
            if(callback) callback(inputEl.value);
        };
        btnCancel.onclick = function() {
            modal.classList.add('hidden');
            if(callback) callback(null);
        };
    };
====
        btnConfirm.onclick = function() {
            modal.classList.remove('active');
            if(callback) callback(inputEl.value);
        };
        btnCancel.onclick = function() {
            modal.classList.remove('active');
            if(callback) callback(null);
        };
        if (btnHeaderCancel) {
            btnHeaderCancel.onclick = function() {
                modal.classList.remove('active');
                if(callback) callback(null);
            };
        }
    };
>>>>

<<<<
    window.customConfirm = function(title, callback) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        
        titleEl.textContent = title;
        inputEl.style.display = 'none'; // hide input
        modal.classList.remove('hidden');
====
    window.customConfirm = function(title, callback) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');
        
        titleEl.textContent = title;
        inputEl.style.display = 'none'; // hide input
        modal.classList.add('active');
>>>>

<<<<
        btnConfirm.onclick = function() {
            modal.classList.add('hidden');
            inputEl.style.display = '';
            if(callback) callback(true);
        };
        btnCancel.onclick = function() {
            modal.classList.add('hidden');
            inputEl.style.display = '';
            if(callback) callback(false);
        };
    };
====
        btnConfirm.onclick = function() {
            modal.classList.remove('active');
            inputEl.style.display = '';
            if(callback) callback(true);
        };
        btnCancel.onclick = function() {
            modal.classList.remove('active');
            inputEl.style.display = '';
            if(callback) callback(false);
        };
        if (btnHeaderCancel) {
            btnHeaderCancel.onclick = function() {
                modal.classList.remove('active');
                inputEl.style.display = '';
                if(callback) callback(false);
            };
        }
    };
>>>>

<<<<
    window.customAlert = function(title, msg) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        
        titleEl.textContent = title;
        inputEl.style.display = 'none'; // hide input
        
        let msgEl = document.getElementById('promptMsg');
        if(!msgEl) {
           msgEl = document.createElement('div');
           msgEl.id = 'promptMsg';
           msgEl.style.marginBottom = '16px';
           msgEl.style.fontSize = '14px';
           inputEl.parentNode.insertBefore(msgEl, inputEl);
        }
        msgEl.textContent = msg;
        msgEl.style.display = 'block';
        
        btnCancel.style.display = 'none';
        
        modal.classList.remove('hidden');
        
        btnConfirm.onclick = function() {
          modal.classList.add('hidden');
          msgEl.style.display = 'none';
          inputEl.style.display = '';
          btnCancel.style.display = '';
        };
    };
====
    window.customAlert = function(title, msg) {
        const modal = document.getElementById('promptModal');
        const titleEl = document.getElementById('promptTitle');
        const inputEl = document.getElementById('promptInput');
        const btnConfirm = document.getElementById('promptConfirm');
        const btnCancel = document.getElementById('promptCancel');
        const btnHeaderCancel = document.getElementById('promptHeaderCancel');
        
        titleEl.textContent = title;
        inputEl.style.display = 'none'; // hide input
        
        let msgEl = document.getElementById('promptMsg');
        if(!msgEl) {
           msgEl = document.createElement('div');
           msgEl.id = 'promptMsg';
           msgEl.style.marginBottom = '16px';
           msgEl.style.fontSize = '14px';
           inputEl.parentNode.insertBefore(msgEl, inputEl);
        }
        msgEl.textContent = msg;
        msgEl.style.display = 'block';
        
        btnCancel.style.display = 'none';
        
        modal.classList.add('active');
        
        btnConfirm.onclick = function() {
          modal.classList.remove('active');
          msgEl.style.display = 'none';
          inputEl.style.display = '';
          btnCancel.style.display = '';
        };
        if (btnHeaderCancel) {
            btnHeaderCancel.onclick = function() {
                modal.classList.remove('active');
                msgEl.style.display = 'none';
                inputEl.style.display = '';
                btnCancel.style.display = '';
            };
        }
    };
>>>>

<<<<
        btnGuestCleanup.disabled = false;
        btnGuestCleanup.textContent = '🗑️ Clean Guests (24h+)';
====
        btnGuestCleanup.disabled = false;
        btnGuestCleanup.textContent = 'Clean Guests (24h+)';
>>>>

<<<<
    const adminThemeBtns = document.querySelectorAll('.admin-theme-btn');
====
    const adminThemeBtns = document.querySelectorAll('.admin-theme-btn-unified');
>>>>

<<<<
      toast.style.border = '1px solid var(--border-light)';
      if (type === 'error') toast.style.borderLeft = '4px solid var(--danger)';
      else if (type === 'success') toast.style.borderLeft = '4px solid #000000';
      else toast.style.borderLeft = '4px solid var(--accent)';
      toast.style.padding = '12px 16px';
      toast.style.borderRadius = '4px';
====
      toast.style.border = 'var(--border-main)';
      if (type === 'error') toast.style.borderLeft = '4px solid var(--danger)';
      else if (type === 'success') toast.style.borderLeft = '4px solid #000000';
      else toast.style.borderLeft = '4px solid var(--accent)';
      toast.style.padding = '12px 16px';
      toast.style.borderRadius = 'var(--radius-card)';
>>>>
```

### 5.3. admin-workflow.js Proposed Changes

```diff
<<<<
            document.getElementById('divisionPickerModal').classList.remove('hidden');
====
            document.getElementById('divisionPickerModal').classList.add('active');
>>>>

<<<<
        document.getElementById('divisionPickerModal').classList.add('hidden');
====
        document.getElementById('divisionPickerModal').classList.remove('active');
>>>>

<<<<
    const modal = document.getElementById('createTaskModal');
    
    modal.classList.remove('hidden');
====
    const modal = document.getElementById('createTaskModal');
    
    modal.classList.add('active');
>>>>

<<<<
            modal.classList.add('hidden');
====
            modal.classList.remove('active');
>>>>

<<<<
    const modal = document.getElementById('contextModal');
    
    modal.classList.remove('hidden');
====
    const modal = document.getElementById('contextModal');
    
    modal.classList.add('active');
>>>>

<<<<
    document.getElementById('contextModal').classList.add('hidden');
====
    document.getElementById('contextModal').classList.remove('active');
>>>>

<<<<
    document.getElementById('contextModal').classList.add('hidden');
====
    document.getElementById('contextModal').classList.remove('active');
>>>>

<<<<
        block.style.cssText = 'background:var(--bg-main); padding:16px; border-radius:0; border:1px solid var(--border-medium);';
        
        block.innerHTML = `
            <div style="font-weight:600; margin-bottom:8px;">Question ${idx + 1}</div>
            <textarea id="q_edit_${idx}" style="width:100%; height:150px; background:#1e1e1e; color:#d4d4d4; font-family:monospace; font-size:12px; padding:12px; border:1px solid #333; border-radius:0; resize:vertical;">${outerHTML}</textarea>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
               <button class="btn btn-report-issue" data-idx="${idx}" style="border-color:var(--danger); color:var(--danger);">Report Issue</button>
            </div>
        `;
====
        block.style.cssText = 'background:var(--bg-main); padding:16px; border-radius:var(--radius-card); border:var(--border-main);';
        
        block.innerHTML = `
            <div style="font-weight:600; margin-bottom:8px;">Question ${idx + 1}</div>
            <textarea id="q_edit_${idx}" style="width:100%; height:150px; background:#1e1e1e; color:#d4d4d4; font-family:monospace; font-size:12px; padding:12px; border:var(--border-main); border-radius:var(--radius-card); resize:vertical;">${outerHTML}</textarea>
            <div style="margin-top:8px; display:flex; justify-content:flex-end;">
               <button class="btn-unified btn-report-issue" data-idx="${idx}" style="border-color:var(--danger); border-radius:var(--radius-card); color:var(--danger); padding:8px 16px;">Report Issue</button>
            </div>
        `;
>>>>
```

### 5.4. global-styles.css Proposed Changes

```diff
<<<<
    .modal-title { font-size: 18px; font-weight: 600; color: var(--text-main); }
====
    .modal-title { font-family: var(--font-sans); font-size: 18px; font-weight: 600; color: var(--text-main); }
>>>>

<<<<
.kanban-card {
  background: var(--bg-card) !important;
  border: var(--border-main) !important;
  border-left: 4px solid var(--accent) !important;
  padding: 16px !important;
  border-radius: var(--radius-card) !important;
  font-size: 12px !important;
  cursor: pointer !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s !important;
  display: flex !important; flex-direction: column !important; gap: 8px !important;
}
====
.kanban-card {
  background: var(--bg-card) !important;
  border: var(--border-main) !important;
  padding: 16px !important;
  border-radius: var(--radius-card) !important;
  font-size: 12px !important;
  cursor: pointer !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s, border-color 0.2s !important;
  display: flex !important; flex-direction: column !important; gap: 8px !important;
}
>>>>

<<<<
    .btn-unified.primary { background: var(--text-main); color: var(--bg-main); border-color: transparent; font-weight: 600; }
====
    .btn-unified.primary { background: var(--text-main); color: var(--bg-main); border-color: transparent; font-weight: 600; border-radius: var(--radius-pill); }
>>>>

<<<<
    .auth-input { background: var(--bg-main); border: 1px solid var(--border-medium); color: var(--text-main); padding: 8px 12px; border-radius: 8px; outline: none; }
====
    .auth-input { background: var(--bg-main); border: var(--border-main); color: var(--text-main); padding: 8px 12px; border-radius: var(--radius-card); outline: none; }
>>>>
```
