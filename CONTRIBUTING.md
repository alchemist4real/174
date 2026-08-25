# 🤝 Contributing to MR-CAPSULES

Thank you for your interest in contributing to **MR-CAPSULES**! We are a non-profit educational sanctuary dedicated to preserving and sharing academic resources for medical and health science students.

---

## 👥 Division Roles & Workflows

Contributors operate across three specialized divisions:

### 1. 🎛️ Division Management (Pengurus)
- Assigns tasks on the **Kanban Board** (`Open` &rarr; `Done`).
- Manages contributor access, roles, and device permissions.
- Broadcasts platform announcements.

### 2. 💻 Division Development (Pembuat Konten)
- Crafts CBT choice-based practice pools and HTML summaries.
- Uses **Vibe Coding** (AI Prompt Engineering via Claude / Antigravity) to generate clean HTML without writing code manually.
- Moves completed tasks to **Developed (Wait for Review)**.

### 3. 🔍 Division Review & QA (Koreksi)
- Inspects live previews in the built-in HTML CodeMirror editor.
- Validates key answers against references and textbook sources.
- Moves verified tasks to **Done**.

---

## 🤖 AI Assistant Integration via MCP

If you use AI Assistants (Claude Web, Claude Desktop, Antigravity):
1. Navigate to **Admin Panel** &rarr; **API Keys**.
2. Click **+ Generate Key** (`mrc_...`).
3. Connect your AI agent via MCP endpoint: `https://mr-capsules.vercel.app/api/mcp`.

---

## 📋 Pull Request Process

1. Fork the repository and create a feature branch (`git checkout -b feature/cbt-pool-semester-3`).
2. Commit your changes with clear messages (`git commit -m "feat(cbt): add block 1.3 practicum pool"`).
3. Push to your branch and open a Pull Request.
4. Ensure all static build checks pass (`npm run build`).

Thank you for helping empower students and preserve academic knowledge! 💊
