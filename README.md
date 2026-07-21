<p align="center">
  <img src="assets/animated-banner.svg" alt="MR-CAPSULES Animated Terminal Banner" width="100%">
</p>

<p align="center">
  <a href="https://mr-capsules.vercel.app"><img src="https://img.shields.io/badge/Website-mr--capsules.vercel.app-00f2fe?style=for-the-badge&logo=vercel" alt="Website"></a>
  <a href="https://mr-capsules.vercel.app/docs.html"><img src="https://img.shields.io/badge/Docs-Interactive%20Guide-38bdf8?style=for-the-badge&logo=gitbook" alt="Docs"></a>
  <img src="https://img.shields.io/badge/MCP%20Server-v2025--06--18-c084fc?style=for-the-badge&logo=anthropic" alt="MCP Server Protocol">
  <img src="https://img.shields.io/badge/License-Non--Profit-4ade80?style=for-the-badge" alt="License">
</p>

---

## 📖 About MR-CAPSULES

**MR-CAPSULES** is a non-profit open-source educational sanctuary established in August 2025, dedicated to preserving, sharing, and transforming academic materials for medical and health science students.

What started as shared HTML notes among friends has evolved into an **advanced, web-based educational ecosystem**. The platform converts dense lecture slides, past exam questions, and practicum manuals into centralized, interactive **Choice-Based Test (CBT) question pools**, **OSCE practice modules**, and **Live Study Rooms**.

Beyond serving as a static archive, MR-CAPSULES functions as a **hybrid platform** equipped with an **Admin Management Portal**, an **integrated Kanban workflow**, and a full **Model Context Protocol (MCP) serverless API gateway** for seamless AI assistant collaboration.

🌐 **Live Platform:** [https://mr-capsules.vercel.app](https://mr-capsules.vercel.app)  
📚 **Interactive Documentation:** [https://mr-capsules.vercel.app/docs.html](https://mr-capsules.vercel.app/docs.html)

---

## 🚀 What's New in v2.0 (Recent Updates)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        MR-CAPSULES v2.0 ECOSYSTEM                       │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│  🤖 AI Agent Gateway     │ 📊 Admin Portal          │ ⚡ Live & CBT     │
│  - MCP 2025 Protocol     │ - Kanban Board (5 steps) │ - CBT Pool Engine │
│  - 30+ MCP Tools         │ - Built-in CodeMirror    │ - Flashcard System│
│  - OAuth 2.0 PKCE        │ - Division Management    │ - Live Study Room │
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

### 1. 🤖 Model Context Protocol (MCP) & API Gateway Integration
- **Serverless MCP Protocol (2025-06-18 standard)**: Built-in native support for external AI Agents (Claude Web, Claude Desktop, Antigravity, Custom Agents) at `/api/mcp`.
- **OAuth 2.0 PKCE Auto-Discovery (RFC 8414 & RFC 7591)**: Native registration support for Claude.ai custom connectors without manual OAuth configuration.
- **30+ Specialized MCP Tools**: AI agents can inspect, edit, create, and manage system resources across:
  - `docs_*`: Section management, dynamic tab manipulation (`docs_add_tab`, `docs_update_tab`), with automatic zero inline-style and `.docs-table` class sanitization.
  - `tasks_*`: Workflow tasks management (`tasks_unclaim`, `tasks_start_review`, `tasks_add_note`, `tasks_delete`).
  - `users_*` & `divisions_*`: User blocking, device removal, team management (`divisions_get_members`, `divisions_join`).
  - `cover_*`: Storage cover image management (`cover_list`, `cover_upload`, `cover_delete`).
  - `activity_logs` & `system_cleanup_guests`: System maintenance and monitoring.

### 2. 🎛️ Comprehensive Admin Portal (`admin.html`)
- **Dashboard & Telemetry**: Live system uptime tracker, active member counts, hybrid activity log stream, and contributor leaderboard.
- **Files & Live HTML Editor**: Built-in CodeMirror code editor with real-time live preview for instant CBT question verification.
- **Task Management Board**: 5-column Kanban board (`Open`, `In Progress`, `Developed`, `In Review`, `Done`) integrated with Syllabus filters (CBT, OSCE, Video, Summary).
- **Security & Device Controls**: Role-based access control (Admin, Contributor, Banned), remote device revocation, and guest session cleanup.

### 3. 📖 Modernized Interactive Documentation (`docs.html`)
- Complete redesign using CSS Design Tokens (`tokens.css`) and responsive glassmorphic cards.
- **Dynamic Tab Switcher**: Separates **Panduan Umum (General Contributor Guide)** and **MCP & API Gateway Integration Guide**.

### 4. ⚡ Live Study Room Engine (`live.html`)
- Real-time study sessions, flashcards, live quizzes, and interactive practice pools for exam preparation.

---

## 🎯 Mission & Value Proposition

- 📚 **Preserve Knowledge:** Prevent valuable study materials and past questions from getting lost over time.
- ⚡ **Interactive CBT Format:** Convert static PDFs/notes into interactive choices with immediate answer verification and explanations.
- 🤝 **AI-Assisted Content Pipeline ("Viebo Code"):** Content creators work as Prompt Engineers alongside AI assistants to generate clean HTML question pools rapidly.
- 🔓 **Open Access:** Completely free and non-profit for all students.

---

## 📂 Resource Categories

| Category | Description & Format |
| :--- | :--- |
| **Soal Tahun Kemarin** | Transformed into interactive HTML CBT choice-based practice pools. |
| **Praktikum (Practicum)** | Structured lab manuals and question banks formatted as CBT modules. |
| **Lecture (Materi Kuliah)** | Concise lecture notes and summary question pools. |
| **Faculty Slides (PPT/PDF)** | Preserved presentation archives and reference docs. |
| **Live Study Sessions** | Realtime flashcards, practice pools, and live study sessions. |

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    A[Student / User] -->|Browses CBT & Live Study| B[Vercel Serverless / Frontend]
    C[Contributor / Admin] -->|Kanban & HTML Editor| B
    D[Claude.ai / AI Agents] -->|MCP Protocol / OAuth 2.0 PKCE| E[API Gateway api/mcp.js]
    E -->|30+ MCP Tools| F[(Supabase Database & Storage)]
    B --> F
```

### Core Technologies
- **Frontend Layer:** HTML5, CSS3 (Tokens architecture via `tokens.css`, `global-styles.css`), Vanilla JS, CodeMirror 5.
- **Backend / API Layer:** Vercel Serverless Functions (`api/mcp.js`, `api/admin.js`, `api/tasks.js`, `api/divisions.js`, etc.).
- **Database & Storage:** Supabase Database (PostgreSQL) + Supabase Storage (Covers & Content).
- **AI Infrastructure:** Model Context Protocol (MCP 2025-06-18) + OAuth 2.0 PKCE Auto-Discovery (RFC 8414/7591).
- **Hosting & CI/CD:** Vercel Platform.

---

## 🤝 Division & Contribution Workflow

MR-CAPSULES operates through three collaborative divisions:

```text
               ┌───────────────────────────────────────────────┐
               │           1. MANAGEMENT DIVISION              │
               │   Assigns tasks & oversees Kanban workflow    │
               └──────────────────────┬────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────┐       ┌─────────────────────────────────────────┐
│         2. DEVELOPMENT DIVISION         │       │          3. REVIEW & QA DIVISION        │
│   Creates CBT HTML using Viebo Code     │ ────► │    Verifies answers & moves task to    │
│  (AI Prompt Engineering + HTML Editor)  │       │                 DONE                    │
└─────────────────────────────────────────┘       └─────────────────────────────────────────┘
```

### 👥 Division Roles
1. **Division Management (Pengurus):** Assigns tasks on the Kanban board, manages member permissions, broadcasts announcements, and oversees project progress.
2. **Division Development (Pembuat Konten):** Uses **Viebo Code** (generating code using AI like Claude / Antigravity) to create CBT question pools and HTML content, placing them in *Developed (Wait for Review)*.
3. **Division Review & QA (Koreksi):** Inspects live previews in the HTML editor, validates key answers against references, and moves verified tasks to *Done*.

---

## 🔌 Connecting AI Assistants via MCP

You can connect **Claude.ai Web**, **Claude Desktop**, or **Custom Agents** to MR-CAPSULES:

1. Open **Admin Panel** &rarr; **API Keys** tab.
2. Click **+ Generate Key** to create your API key (`mrc_...`).
3. In **Claude.ai**: Go to `Settings` &rarr; `Connectors` &rarr; `Add Custom Connector`.
4. Enter URL: `https://mr-capsules.vercel.app/api/mcp`
5. Click **Connect** (OAuth 2.0 PKCE auto-discovery will automatically authorize your agent!).

---

## 💻 Local Development Setup

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
# Clone the repository
git clone https://github.com/alchemist4real/MR-CAPSULES.git
cd MR-CAPSULES

# Install dependencies
npm install

# Run static build script
npm run build
```

---

## ⚠️ Disclaimer

MR-CAPSULES is an independent, non-profit educational initiative. All materials are provided strictly for educational purposes. Ownership of lecture content and slides remains with respective authors, lecturers, and academic institutions.

If any material violates copyright or institutional policies, maintainers will review and take down the content upon valid request.

---

<p align="center">
  <sub>Preserving knowledge • Sharing opportunities • Empowering students</sub><br>
  <b>MR-CAPSULES • Since August 2025</b>
</p>
