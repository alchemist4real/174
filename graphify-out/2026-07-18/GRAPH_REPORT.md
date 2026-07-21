# Graph Report - .  (2026-07-18)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 769 nodes · 1872 edges · 45 communities (36 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `43ace075`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- admin-styles.css
- fp.js
- index.html
- tokens.css
- loadDivisions
- admin.js
- live.html
- openTaskModal
- package.json
- docs.html
- gpush.sh
- build.js
- contributions_setup.sql
- README.md
- var(--border-medium)
- package.json
- vercel.json
- admin.html
- var(--c1)
- var(--font-mono)
- verifyAdmin
- .active
- adminAction
- var(--text-muted)
- createNewTaskPrompt
- var(--scrim)
- index-styles.css
- var(--c3)
- loadTasks
- var(--c4)
- .gitignore
- .da
- .docs-
- .org-sidebar-inner-li
- .toggle-
- .w3
- .guide-tooltip

## God Nodes (most connected - your core abstractions)
1. `var(--c3)` - 69 edges
2. `var(--font-mono)` - 53 edges
3. `var(--c1)` - 46 edges
4. `var(--text-muted)` - 40 edges
5. `var(--accent)` - 39 edges
6. `renderUsers()` - 33 edges
7. `var(--border-light)` - 33 edges
8. `var(--border-main)` - 33 edges
9. `var(--text-main)` - 32 edges
10. `openTaskModal()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `initWorkflow()` --references--> `.active`  [EXTRACTED]
  admin-workflow.js → global-styles.css
- `loadTasks()` --references--> `var(--border-light)`  [EXTRACTED]
  admin-workflow.js → global-styles.css
- `loadTasks()` --references--> `var(--text-main)`  [EXTRACTED]
  admin-workflow.js → global-styles.css
- `loadTasks()` --references--> `var(--text-muted)`  [EXTRACTED]
  admin-workflow.js → global-styles.css
- `loadTasks()` --references--> `#filterTaskAssignee`  [EXTRACTED]
  admin-workflow.js → admin.html

## Import Cycles
- None detected.

## Communities (45 total, 9 thin omitted)

### Community 0 - "admin-styles.css"
Cohesion: 0.02
Nodes (116): .analytics-grid, .analytics-value, .announcement-group, .announcement-input, .auth-brand-logo, .auth-brand-wrapper, .bottom-dock-brand, .bottom-dock-brand-img (+108 more)

### Community 1 - "fp.js"
Cohesion: 0.14
Nodes (38): a(), b(), c(), d(), e(), en(), f(), Fn() (+30 more)

### Community 2 - "index.html"
Cohesion: 0.03
Nodes (71): #adminSection, #authEmail, #authForm, #authMsg, #authPassword, #authUsername, #btnBack, #btnCancelNewPassword (+63 more)

### Community 3 - "tokens.css"
Cohesion: 0.05
Nodes (86): updateAdminThemeBtns(), renderTasksAsSyllabus(), .activity-log-item, .analytics-card, .art-bg, .auth-brand-subtitle, .badge, .badge-admin (+78 more)

### Community 4 - "loadDivisions"
Cohesion: 0.09
Nodes (33): loadTree(), loadDivisions(), parseCBTHtml(), .div-count, .div-name, .slider-danger-style, .text-danger-style, .toast-error (+25 more)

### Community 5 - "admin.js"
Cohesion: 0.05
Nodes (42): adminThemeBtns, applyAdminTheme(), authMessage, authOverlay, btnGuestCleanup, currentTree, dragOverlay, fileBrowser (+34 more)

### Community 6 - "live.html"
Cohesion: 0.11
Nodes (25): openEditor(), .fullscreen, #btnRefreshDivisions, #btnRefreshTasks, #btnRefreshUsers, #codeEditor, #col-in_progress, #col-in_review (+17 more)

### Community 7 - "openTaskModal"
Cohesion: 0.16
Nodes (14): fetchFileSecureBlob(), openContextModal(), openTaskModal(), .a, .btn, #allUsersControls, #btnAddDivisionMember, #btnDivFilterAll (+6 more)

### Community 8 - "package.json"
Cohesion: 0.25
Nodes (7): dependencies, @supabase/supabase-js, name, scripts, build, version, @supabase/supabase-js

### Community 10 - "gpush.sh"
Cohesion: 0.60
Nodes (5): err(), info(), ok(), gpush.sh script, warn()

### Community 11 - "build.js"
Cohesion: 0.50
Nodes (4): build(), fs, path, walkDir()

### Community 12 - "contributions_setup.sql"
Cohesion: 0.20
Nodes (8): handler(), server, created_at (TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text), id (UUID), points (INTEGER), user_id (UUID), POLICY "Allow public read access for contributions", TABLE public.contributions

### Community 13 - "README.md"
Cohesion: 0.15
Nodes (12): About, Acknowledgements, Contributing, Disclaimer, Features, How to Contribute, Journey, License (+4 more)

### Community 17 - "var(--border-medium)"
Cohesion: 0.29
Nodes (7): .auth-btn-outline, .btn-editor-fullscreen, .danger, .div-card-members-section, .inline-spinner, .lightbox-btn, var(--border-medium)

### Community 24 - "admin.html"
Cohesion: 0.13
Nodes (21): sanitize(), updateBulkDeleteUI(), #activityLogList, #activityPlaceholder, #authMessage, #authOverlay, #btnBulkDelete, #btnRefreshOrganization (+13 more)

### Community 25 - "var(--c1)"
Cohesion: 0.11
Nodes (23): .art-icon, .art-name, .auth-box, .auth-btn, .btn-back-home, .guide-highlight, .iframe-overlay, .main-panel (+15 more)

### Community 26 - "var(--font-mono)"
Cohesion: 0.11
Nodes (24): .CodeMirror, .auth-brand-left, .auth-input, .auth-msg, .auth-overlay, .auth-subtitle, .auth-title, .brand (+16 more)

### Community 27 - "verifyAdmin"
Cohesion: 0.20
Nodes (10): get(), redirectToHome(), verifyAdmin(), #adminTabs, #announcementText, #btnSendAnnouncement, #btnSignOut, #dashOnlineCount (+2 more)

### Community 28 - ".active"
Cohesion: 0.25
Nodes (13): customAlert(), customConfirm(), customPrompt(), uploadFilesSequential(), .active, #btnNewFolder, #btnUpload, #promptCancel (+5 more)

### Community 29 - "adminAction"
Cohesion: 0.15
Nodes (16): adminAction(), fetchFileSecureText(), showPreview(), .drag-active, .grid-mode, #btnRefresh, #btnToggleView, #dragOverlay (+8 more)

### Community 30 - "var(--text-muted)"
Cohesion: 0.12
Nodes (17): .analytics-label, .auth-status-msg, .cleanup-result, .div-card-desc, .division-picker-desc, .editor-helper-text, .form-label, .loading-spinner-wrapper (+9 more)

### Community 31 - "createNewTaskPrompt"
Cohesion: 0.21
Nodes (18): createNewTaskPrompt(), .hidden, #createTaskModal, #syllabusTableContainer, #taskAssignTo, #taskBlock, #taskCancel, #taskCategory (+10 more)

### Community 32 - "var(--scrim)"
Cohesion: 0.67
Nodes (3): .custom-modal-overlay, .settings-overlay, var(--scrim)

### Community 33 - "index-styles.css"
Cohesion: 0.06
Nodes (32): .animating, .auth-container, .auth-form, .cf-wrap, .glitch-text, .guide-footer, .guide-step-count, .left-ctrl (+24 more)

### Community 34 - "var(--c3)"
Cohesion: 0.11
Nodes (24): .art, .art-dot-grid, .auth-brand-title, .btn-top-back, .card-label, .editor-container, .file-browser, .guide-body (+16 more)

### Community 35 - "loadTasks"
Cohesion: 0.15
Nodes (18): apiCall(), initWorkflow(), loadTasks(), parsedQuestions, renderKanban(), #btnCreateTask, #divisionPickerModal, #filterTaskAssignee (+10 more)

### Community 36 - "var(--c4)"
Cohesion: 0.14
Nodes (16): renderBrowser(), .alert-box, .bottom-dock, .dragging, .editor-resizer, .file-actions, .file-checkbox, .file-icon (+8 more)

### Community 37 - ".gitignore"
Cohesion: 0.50
Nodes (3): ignore:.env*.local, ignore:node_modules/, ignore:.vercel

## Knowledge Gaps
- **275 isolated node(s):** `parsedQuestions`, `currentTree`, `fileCache`, `selectedFiles`, `authOverlay` (+270 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `.active` connect `.active` to `admin-styles.css`, `fp.js`, `var(--c3)`, `loadTasks`, `loadDivisions`, `admin.js`, `live.html`, `openTaskModal`, `tokens.css`, `var(--c4)`, `index-styles.css`, `admin.html`, `var(--c1)`, `createNewTaskPrompt`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `In()` connect `fp.js` to `.active`, `createNewTaskPrompt`, `openTaskModal`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `var(--c3)` connect `var(--c3)` to `index.html`, `tokens.css`, `var(--c4)`, `admin.js`, `loadDivisions`, `openTaskModal`, `.guide-tooltip`, `var(--border-medium)`, `var(--c1)`, `var(--font-mono)`, `.active`, `adminAction`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `parsedQuestions`, `currentTree`, `fileCache` to the rest of the system?**
  _275 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `admin-styles.css` be split into smaller, more focused modules?**
  _Cohesion score 0.017094017094017096 - nodes in this community are weakly interconnected._
- **Should `fp.js` be split into smaller, more focused modules?**
  _Cohesion score 0.13636363636363635 - nodes in this community are weakly interconnected._
- **Should `index.html` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._