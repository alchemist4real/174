# Riset: Fitur Claude Code CLI untuk Integrasi Native-Feel di Antigravity

**Tujuan dokumen:** kumpulan data terstruktur untuk fine-tuning/pengembangan plugin custom yang menjalankan Claude Code CLI di bawah Antigravity, dengan pengalaman pengguna yang terasa seperti model native Antigravity, bukan pemanggilan CLI eksternal.

**Tanggal riset:** 14 Juli 2026
**Sumber utama:** docs.claude.com / code.claude.com (resmi Anthropic), antigravity.google/docs (resmi Google), forum discuss.ai.google.dev, laporan komunitas terverifikasi silang.

---

## 0. Ringkasan Eksekutif

| Aspek | Claude Code CLI | Antigravity 2.0 / IDE / CLI (`agy`) |
|---|---|---|
| Bahasa runtime | Node.js (native binary tersedia) | Go (agy CLI dan Antigravity 2.0), fork VS Code untuk IDE |
| Mode headless | `claude -p` + `--output-format stream-json` | `antigravity run "..."` / `agy` |
| Instruksi proyek | `CLAUDE.md`, `.claude/rules/*.md` | `GEMINI.md` (Rules), `~/.gemini/GEMINI.md` (global) |
| Reusable prompt | Skills (`SKILL.md`), Slash Commands | Workflows (`.agent/workflows/`) |
| Ekstensi terbungkus | Plugins (`.claude-plugin/plugin.json`) | Plugins (rebrand dari Gemini CLI Extensions) |
| Event interception | Hooks (25+ event: PreToolUse, PostToolUse, dst) | Hooks JSON (5 event inti: PreToolUse, PostToolUse, PreInvocation, PostInvocation, Stop) |
| Sub-agent | Subagents (`.claude/agents/*.md`), depth-limited (5), agent teams | Dynamic subagents (spawn on-the-fly, konteks terisolasi) |
| Konfigurasi MCP | `.mcp.json` (`mcpServers`) | `mcp_config.json` (`mcpServers`) — skema identik |
| Bisa jadi MCP server | **Ya** — `claude mcp serve` | Tidak terdokumentasi (arah kebalikan: konsumsi MCP server) |
| Model picker pihak ketiga native | N/A (produk sendiri) | **Tidak didukung resmi** — dikonfirmasi thread forum Google tanpa solusi |
| System prompt override | `--system-prompt`, `--append-system-prompt`, Output Styles | Tidak ada API publik setara yang terdokumentasi |

**Temuan kunci (penting untuk keputusan arsitektur Sir):** Antigravity **tidak menyediakan model-picker resmi untuk provider pihak ketiga** (termasuk Claude) di panel model utamanya. Dua thread di forum resmi Google AI Developers (`Antigravity add your own API Keys/Models`, Maret 2026, dan `How to properly configure Custom/OpenAI-Compatible Models in Antigravity IDE?`, Juni 2026) sama-sama tidak mendapat jawaban resmi berhasil — percobaan menyuntik lewat `.antigravity/settings.json` dengan key seperti `antigravity.ai.provider: "openai-compatible"` **tidak berfungsi**, dan salah satu balasan komunitas menyebut ini kemungkinan disengaja karena model Gemini terikat model bisnis rate-limit Google. Ini berarti pendekatan "Claude Code muncul di dropdown model Antigravity" kemungkinan besar **tidak dapat dicapai lewat jalur resmi/didukung** — jalur realistis ada di lapisan MCP, Editor Extension, atau CLI-passthrough (dijelaskan di Bagian 4).

---

## 1. Claude Code CLI — Fitur Inti yang Relevan untuk Wrapper

### 1.1 Mode Headless / Non-Interaktif (`-p` / `--print`)

Ini adalah pintu masuk utama untuk menjalankan Claude Code sebagai "backend" di bawah UI lain.

```bash
claude -p "query" [flags]
```

Flag kunci untuk wrapper:

| Flag | Fungsi | Kenapa penting untuk Antigravity-wrapper |
|---|---|---|
| `--bare` | Skip auto-discovery hooks/skills/plugins/MCP/CLAUDE.md — start cepat, hasil deterministik | Wajib untuk panggilan terprogram supaya tidak membawa state proyek Claude Code milik Sir sendiri yang tak relevan |
| `--output-format stream-json` + `--verbose` + `--include-partial-messages` | Streaming token demi token via newline-delimited JSON | **Kunci utama "terasa native"** — Antigravity bisa render token secara live persis seperti model built-in-nya, bukan tunggu output penuh |
| `--output-format json` | Payload terstruktur dengan `result`, `session_id`, `total_cost_usd` | Untuk mode non-stream (mis. subagent call) |
| `--json-schema '<schema>'` | Output tervalidasi sesuai JSON Schema | Untuk memaksa Claude Code balas dalam skema yang bisa langsung di-parse UI Antigravity (mis. daftar file yang diubah) |
| `--system-prompt` / `--system-prompt-file` | **Mengganti total** system prompt Claude Code | Dipakai kalau ingin persona benar-benar dikendalikan wrapper, tanpa identitas "coding assistant" default |
| `--append-system-prompt` / `--append-system-prompt-file` | Menambah instruksi tanpa menghapus default | Dipakai kalau tetap ingin perilaku coding Claude Code, tinggal menambah gaya/konteks |
| `--session-id <uuid>` | Set ID sesi eksplisit | Untuk memetakan 1:1 sesi Antigravity ↔ sesi Claude Code, supaya `--resume` bisa dipakai lintas turn |
| `--resume <id>` / `--continue` | Melanjutkan sesi | Wrapper perlu menyimpan `session_id` per percakapan Antigravity dan memanggil ulang dengan flag ini di setiap turn — ini yang membuat "memory" terasa menyatu, bukan reset tiap kali |
| `--max-turns` | Batas turn agentic | Mencegah runaway loop saat dipanggil headless tanpa pengawasan interaktif |
| `--max-budget-usd` | Batas dolar API per panggilan | Guard biaya untuk plugin custom |
| `--permission-mode <mode>` | `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` | Wrapper harus memilih mode ini secara eksplisit karena `PermissionRequest` hook **tidak berjalan** di mode `-p` (lihat 1.3) |
| `--allowedTools` / `--disallowedTools` | Auto-approve/deny tool spesifik | Karena tidak ada dialog izin interaktif di headless, ini wajib diisi eksplisit |
| `--mcp-config` | Load MCP server dari file/string JSON | Untuk menyuntikkan tool MCP milik Antigravity ke sesi Claude Code |
| `--strict-mcp-config` | Hanya pakai MCP dari `--mcp-config`, abaikan sumber lain | Isolasi supaya Claude Code tidak "bocor" memakai `.mcp.json` proyek Sir yang tak terduga |
| `--add-dir` | Tambah direktori kerja tambahan | Untuk memberi akses file lintas-repo sesuai workspace Antigravity |
| `--no-session-persistence` | Sesi tidak disimpan ke disk | Untuk mode stateless/one-shot dari wrapper |
| `--fallback-model <model1,model2>` | Rantai fallback model otomatis | Ketahanan saat model utama overload |
| `--prompt-suggestions` | Emit prediksi prompt lanjutan | Bisa dipetakan ke UI "next suggestion" ala Antigravity |

**Contoh command wrapper minimal**, streaming, sesi persisten, tool dibatasi:

```bash
claude --bare -p \
  --session-id "$ANTIGRAVITY_TURN_UUID" \
  --output-format stream-json --verbose --include-partial-messages \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Bash(git *)" \
  --append-system-prompt-file ./antigravity-persona.txt \
  --mcp-config ./antigravity-exposed-mcp.json \
  "isi prompt dari user Antigravity di sini"
```

### 1.2 Struktur Event `system/init` — Untuk Mapping UI

Event pertama dalam stream (`--output-format stream-json`) adalah `system/init`, isinya: model, tools, MCP servers, plugin yang termuat. Field `capabilities` (array string, mis. `interrupt_receipt_v1`) dipakai untuk feature-detection versi — **jangan bandingkan string versi**, cek field ini.

Field plugin di event init:
- `plugins`: array plugin yang berhasil load (`name`, `path`)
- `plugin_errors`: error saat load plugin — dipakai wrapper untuk fail-fast di CI/pipeline jika plugin wajib gagal termuat

### 1.3 Batasan Kritis di Mode Headless (`-p`)

Ini bagian yang **wajib diketahui** sebelum desain wrapper, karena banyak asumsi dari mode interaktif tidak berlaku:

- **`PermissionRequest` hook tidak berjalan** di mode `-p`. Solusinya: pakai `PreToolUse` hook untuk keputusan otomatis, atau isi `--allowedTools`/`--permission-mode` secara eksplisit sebelum panggilan.
- Background Bash task (dev server, watch build) yang masih hidup akan dimatikan ~5 detik setelah hasil final dikirim dan stdin ditutup (kecuali subagent/workflow, yang ditunggu hingga 10 menit via `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`).
- Piped stdin dibatasi 10MB — file besar harus direferensikan via path, bukan di-pipe.
- Command built-in yang hanya jalan di interface terminal (mis. `/login`) tidak tersedia di mode `-p`.

### 1.4 Output Styles — Kunci "Menyamarkan Identitas Claude Code"

Output Styles memodifikasi system prompt Claude Code secara langsung, bukan sekadar menambah instruksi turn-per-turn.

```yaml
---
name: Antigravity Native Persona
description: Persona untuk menyamarkan Claude Code sebagai model native Antigravity
keep-coding-instructions: true   # true = tetap pakai perilaku coding Claude Code, hanya ubah gaya bicara/format
---

Instruksi tambahan di sini menjadi bagian akhir system prompt.
```

Field frontmatter:
| Field | Fungsi |
|---|---|
| `name` | Nama style (default: nama file) |
| `description` | Muncul di picker `/config` |
| `keep-coding-instructions` | `true` = pertahankan instruksi software-engineering bawaan Claude Code; `false` = dihapus total, dipakai kalau tugasnya bukan coding sama sekali |
| `force-for-plugin` | Khusus plugin: paksa style ini aktif otomatis saat plugin enabled, override `outputStyle` milik user |

**Untuk kasus Sir**, kombinasi paling tepat: `--system-prompt-file` (mengganti total) atau Output Style dengan `force-for-plugin: true` jika didistribusikan sebagai plugin — supaya Claude Code tidak pernah menyebut dirinya "Claude Code" ke user Antigravity kecuali diinstruksikan.

### 1.5 Hooks — Titik Kontrol Runtime

25 event hook tersedia (lihat tabel lengkap di dokumentasi asli); yang paling relevan untuk wrapper:

| Event | Kegunaan untuk wrapper Antigravity |
|---|---|
| `SessionStart` (matcher: `startup`, `resume`, `clear`, `compact`) | Suntik konteks Antigravity (nama workspace, file aktif) ke setiap sesi baru |
| `UserPromptSubmit` | Intersep prompt sebelum diproses — bisa dipakai untuk translasi format pesan Antigravity → format yang Claude Code harapkan |
| `PreToolUse` / `PostToolUse` | Log setiap tool call ke sistem observability Antigravity; blokir tool yang tak diizinkan kebijakan Antigravity |
| `Stop` | Deteksi selesai-turn untuk sinyal balik ke UI Antigravity |
| `PermissionRequest` | **Tidak aktif di `-p` mode** — gunakan `PreToolUse` sebagai gantinya untuk keputusan otomatis |

Struktur hook JSON (stdin → stdout via exit code atau JSON):
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "/path/to/policy-check.sh" }
        ]
      }
    ]
  }
}
```
- Exit 0 = tidak ada keberatan (lanjut normal)
- Exit 2 = blokir, stderr jadi alasan yang diteruskan ke Claude
- JSON di stdout (exit 0) untuk kontrol granular: `permissionDecision: "allow"|"deny"|"ask"|"defer"`

Tipe hook selain `command`: `http` (POST ke endpoint), `mcp_tool` (panggil tool MCP yang sudah tersambung), `prompt` (evaluasi LLM sekali-jalan, default Haiku), `agent` (verifikasi multi-turn dengan akses tool, eksperimental).

### 1.6 Subagents — Arsitektur Multi-Agent

- Subagent = file Markdown + frontmatter YAML, jalan di context window terpisah.
- Built-in: `Explore` (read-only, cepat), `Plan` (riset untuk plan mode), `general-purpose` (semua tool).
- Custom subagent bisa didefinisikan lewat file (`.claude/agents/*.md`) **atau** langsung sebagai JSON via flag `--agents` (berguna untuk wrapper yang generate agent secara dinamis tanpa nulis file):

```bash
claude --agents '{
  "antigravity-reviewer": {
    "description": "Review perubahan sesuai standar workspace Antigravity",
    "prompt": "Kamu adalah reviewer kode untuk workspace ini...",
    "tools": ["Read", "Grep", "Glob"],
    "model": "sonnet"
  }
}'
```
- Depth limit: 5 level (subagent tak bisa spawn lebih dalam dari itu).
- `isolation: worktree` — subagent dapat copy repo terisolasi di git worktree sendiri, berguna kalau Antigravity ingin subagent Claude Code bekerja paralel tanpa konflik file dengan sesi utama Antigravity.
- Resume subagent: pakai `SendMessage` dengan agent ID/name — subagent yang sudah selesai bisa "dibangunkan" lagi tanpa mulai dari nol.

### 1.7 Sistem Prompt Flags — Perbandingan 4 Cara

| Flag/Fitur | Cakupan | Skenario pakai untuk wrapper |
|---|---|---|
| `--system-prompt` / `--system-prompt-file` | Ganti total | Wrapper ingin kendali penuh identitas, tak mewarisi safety/tool-guidance bawaan (tanggung jawab penuh di tangan wrapper) |
| `--append-system-prompt` / `-file` | Tambah di akhir | Wrapper ingin tetap dapat tool-guidance & safety instructions bawaan, hanya menambah persona/konteks |
| Output Styles | Modifikasi persisten, per-project/user | Kalau ingin dipilih ulang lintas sesi tanpa flag ulang tiap panggilan |
| CLAUDE.md | Pesan user setelah system prompt | Konteks proyek/codebase, bukan identitas |

### 1.8 Claude Code sebagai MCP Server — Jalur Integrasi Paling Native

```bash
claude mcp serve
```

Ini membuat Claude Code sendiri jadi MCP **server** stdio yang bisa dikonsumsi client MCP manapun (termasuk Antigravity, karena Antigravity adalah MCP **client**). Server ini mengekspos tool-tool Claude Code (View, Edit, LS, dll).

Konfigurasi contoh (format `claude_desktop_config.json`, pola sama berlaku untuk `mcp_config.json` Antigravity):
```json
{
  "mcpServers": {
    "claude-code": {
      "type": "stdio",
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    }
  }
}
```

**Catatan penting:** MCP server ini hanya mengekspos tool Claude Code — **klien (Antigravity) yang bertanggung jawab implementasi konfirmasi user** untuk setiap tool call. Ini berarti kalau Sir pakai jalur ini, permission-flow harus dibangun ulang di sisi Antigravity/plugin, bukan otomatis diwarisi dari Claude Code.

### 1.9 MCP dari Sisi Claude Code — Skema yang Bisa Ditransfer 1:1 ke Antigravity

Format `.mcp.json` Claude Code:
```json
{
  "mcpServers": {
    "nama-server": {
      "type": "stdio",
      "command": "path/to/server",
      "args": [],
      "env": {}
    }
  }
}
```

Ini **hampir identik** dengan `mcp_config.json` milik Antigravity (lihat Bagian 2.2) — kunci root sama-sama `mcpServers`, field sama (`command`, `args`, `env`). Ini jalur transfer konfigurasi termudah antara dua sistem.

---

## 2. Google Antigravity — Arsitektur yang Relevan

### 2.1 Permukaan Produk (Product Surfaces)

| Surface | Fungsi | Analogi Claude Code |
|---|---|---|
| **Antigravity IDE** | Fork VS Code, editor + agent panel, artifact-based trust layer | Claude Code di VS Code extension |
| **Antigravity 2.0** (standalone) | "Command tower" — kelola banyak agent paralel lintas workspace, scheduled tasks | Agent View / background sessions Claude Code |
| **Antigravity CLI (`agy`/`antigravity`)** | Terminal-native, dibangun ulang di Go (mengganti Gemini CLI, deadline migrasi 18 Juni 2026) | Claude Code CLI itu sendiri |
| **Antigravity SDK (`google-antigravity`, Python)** | Programatik embed harness ke aplikasi sendiri | Claude Agent SDK |

Semua permukaan berbagi **shared agent engine/harness** — update ke core (tool baru, permission model baru) otomatis tersedia di semua permukaan tanpa backport terpisah. Ini paralel dengan filosofi Claude Code + Agent SDK.

### 2.2 Konfigurasi MCP Antigravity

Lokasi file (bervariasi versi/dokumentasi, beberapa alias yang dilaporkan):
- `~/.gemini/antigravity/mcp_config.json` (per beberapa sumber lama)
- `$HOME/.gemini/config/mcp_config.json` (menurut Codelab resmi Getting Started)
- `.gemini/antigravity/mcp_config.json` (project-level, per sumber lain)
- `<project_root>/.agents/mcp_config.json` (Antigravity CLI, per dokumentasi hooks)

> Catatan: lokasi persis tampak berubah antar versi/rilis Antigravity — **verifikasi lewat UI "Manage MCP Servers → View raw config"** di instalasi Sir untuk path aktual, karena dokumentasi pihak ketiga tidak konsisten menyebut satu path tunggal.

Skema:
```json
{
  "mcpServers": {
    "nama-server": {
      "command": "uv",
      "args": ["--directory", "path_to_root", "run", "main.py"]
    }
  }
}
```
Untuk header HTTP custom (API key, bearer token), tambahkan objek `headers` (dikonfirmasi docs `antigravity.google/docs/ide-mcp`).

Cara akses UI:
1. Buka sesi Agent → dropdown "..." di panel editor → **MCP Servers**
2. **Manage MCP Servers** → **View raw config** untuk edit `mcp_config.json` langsung
3. Alternatif: **Settings → Customizations → Add MCP+**

MCP server resmi Google Cloud (BigQuery, AlloyDB, Spanner, dll.) auto-enable begitu API terkait diaktifkan di project GCP Sir — tidak perlu config manual.

### 2.3 Rules & Workflows — Setara CLAUDE.md / Skills

| Konsep Antigravity | Lokasi Global | Lokasi Workspace | Analogi Claude Code |
|---|---|---|---|
| **Rules** (instruksi sistem persisten) | `~/.gemini/GEMINI.md` | `your-workspace/.agent/rules/` | `CLAUDE.md` / `.claude/rules/*.md` |
| **Workflows** (prompt reusable/shortcut) | `~/.gemini/antigravity/global_workflows/global-workflow.md` | `your-workspace/.agent/workflows/` | Skills (`SKILL.md`) / Slash Commands |

Analogi tepat sesuai dokumentasi komunitas: *"Rules lebih mirip system instructions, sementara Workflows lebih mirip saved prompts yang dipilih sesuai kebutuhan."* Ini paralel 1:1 dengan pembagian CLAUDE.md (instruksi selalu-aktif) vs Skills (dipicu sesuai konteks).

Contoh pembuatan workflow via CLI:
```bash
ag workflow create generate-unit-tests
# Menghasilkan file test untuk tiap method, konsisten penamaan
```

### 2.4 Hooks Antigravity — 5 Event Inti (vs 25 milik Claude Code)

Antigravity CLI mengonsolidasi hook Claude Code (yang diwarisi lewat Gemini CLI) menjadi **5 checkpoint inti**:

| Event Antigravity | Kapan trigger | Padanan konseptual Claude Code |
|---|---|---|
| `PreToolUse` | Sebelum tool call apapun dieksekusi | `PreToolUse` |
| `PostToolUse` | Setelah tool call selesai | `PostToolUse` |
| `PreInvocation` | Sebelum agent dipanggil/mulai turn | `SessionStart` / `UserPromptSubmit` (gabungan) |
| `PostInvocation` | Setelah agent selesai memproses | `Stop` (parsial) |
| `Stop` | Turn benar-benar berakhir | `Stop` |

**Matcher yang valid** (untuk `PreToolUse`/`PostToolUse`):
- Wildcard: `"*"` atau `""` (semua tool)
- Shell: `"run_command"`
- File ops: `"view_file"`, `"write_to_file"`, `"replace_file_content"`, `"multi_replace_file_content"`, `"list_dir"`, `"grep_search"`
- Multi-agent: `"define_subagent"`, `"invoke_subagent"`, `"send_message"`, `"manage_subagents"`
- Izin/interaksi: `"ask_permission"`, `"list_permissions"`, `"ask_question"`
- MCP: `"call_mcp_tool"` (mencakup **semua** operasi lewat server MCP eksternal)
- Regex gabungan: `"run_command|write_to_file"`, `".*_file.*"`

**Lokasi config:**
- Global: `~/.gemini/antigravity-cli/hooks.json`
- Project: `<project_root>/.agents/hooks.json`

**Skema payload — PENTING, berbeda dari Claude Code:**
```json
{
  "block-run-command": {
    "PreToolUse": [
      {
        "matcher": "run_command",
        "hooks": [
          { "type": "command", "command": "/absolute/path/script.sh", "timeout": 30 }
        ]
      }
    ]
  }
}
```

Payload yang diterima script via stdin, argumen tool ada di `.toolCall.args.CommandLine` (bukan `.arguments.CommandLine` seperti versi lama/Gemini CLI):
```bash
#!/bin/bash
input_json=$(cat)
command_line=$(echo "$input_json" | jq -r '.toolCall.args.CommandLine')
```

**Format balasan wajib** (berbeda dari Claude Code yang pakai `hookSpecificOutput`):
```json
{ "allow_tool": false, "deny_reason": "alasan penolakan" }
```
atau
```json
{ "allow_tool": true }
```

**Aturan kritis:**
- Script **harus selalu exit code 0**, bahkan saat menolak (`allow_tool: false`). Exit code non-nol dianggap **kegagalan hook**, bukan penolakan valid, dan bisa memicu crash turn.
- Path command **harus absolut** — path relatif resolve terhadap direktori kerja terminal saat `agy` dijalankan, bukan lokasi file hook, sehingga rawan gagal `exit status 127`.
- Timeout `0` langsung membunuh subprocess — selalu set 15-60 detik.
- Jika hook didefinisikan di scope global **dan** project, **keduanya jalan** (veto-power design) — organisasi tak bisa di-bypass lewat setting project-level.
- Output aggregation: `BeforeTool`/`AfterTool`/dst pakai **veto-power** (satu hook menolak = seluruh operasi diblokir); `BeforeModel`/`AfterModel` pakai **last-write-wins**; `BeforeToolSelection` pakai **union** (gabungan semua tool yang diizinkan tiap hook).

### 2.5 CLI Headless Antigravity

```bash
antigravity run "add input validation to all API endpoints in /api"
antigravity run --workspace ./my-project "generate tests for utils/"
antigravity status
antigravity artifacts --latest
```

Atau via `agy` (shorthand resmi untuk binary `antigravity`):
```bash
agy
/mcp   # cek status MCP server
```

Instalasi & migrasi dari Gemini CLI:
```bash
brew install google/antigravity/antigravity
antigravity auth login
antigravity migrate --from-gemini-cli   # preservasi Skills, Hooks, Subagents lama
```

**Deadline penting:** Gemini CLI dipensiunkan paksa 18 Juni 2026 untuk pelanggan AI Pro/Ultra (pelanggan Gemini Code Assist berbayar masih dapat akses).

### 2.6 Dynamic Subagents Antigravity — Beda Filosofi dari Claude Code

- Claude Code: subagent didefinisikan statis (file/JSON) sebelum dipanggil.
- Antigravity: agent utama bisa **mendefinisikan dan spawn subagent on-the-fly** tanpa definisi sebelumnya (`define_subagent` matcher event membuktikan ini ada di level hook).
- Ini adalah "architectural delta" yang secara eksplisit disebut lebih maju dari subagent statis Claude Code 1.3 dalam beberapa artikel pembanding — meskipun perlu dicatat sumber-sumber ini adalah pihak ketiga, bukan klaim resmi Anthropic maupun Google, jadi treat sebagai observasi komunitas.

### 2.7 Browser Subagent — Fitur yang Tidak Punya Padanan di Claude Code CLI murni

Saat agent Antigravity perlu interaksi browser, ia memanggil **browser subagent** dengan model *berbeda* dari model sesi utama, punya tool sendiri (klik, scroll, ketik, baca console log, screenshot, video capture, DOM capture, markdown parsing). Ini relevan kalau plugin Sir ingin Claude Code "meminjam" kapabilitas browser Antigravity — kemungkinan besar harus lewat MCP bridge, karena browser subagent ini bukan tool MCP standar melainkan primitif internal Antigravity.

### 2.8 Artifacts — Lapisan Trust yang Unik Antigravity

Antigravity punya konsep **Artifacts** (Task List, Implementation Plan, dokumen markdown, diagram arsitektur, rekaman browser, diff kode) sebagai cara agent "membuktikan" pekerjaannya ke user, bukan sekadar melaporkan. User bisa komentar langsung di Artifact (ala Google Docs) dan agent akan mengincorporate feedback tanpa menghentikan alur eksekusi.

**Implikasi untuk wrapper Sir:** supaya Claude Code "terasa native," output-nya idealnya dipetakan ke format Artifact ini (bukan sekadar chat balasan teks), khususnya untuk Task List dan Implementation Plan — dua Artifact yang disebutkan Codelab resmi sebagai output standar sebelum agent menulis kode.

---

## 3. Pemetaan Konsep 1:1 (Rosetta Stone)

| Konsep | Claude Code | Antigravity |
|---|---|---|
| Instruksi proyek persisten | `CLAUDE.md`, `.claude/rules/*.md` | `GEMINI.md` (Rules), `.agent/rules/` |
| Prompt reusable/shortcut | Skills (`SKILL.md`), Slash Commands | Workflows (`.agent/workflows/*.md`) |
| Ekstensi terbungkus & terdistribusi | Plugins (`.claude-plugin/plugin.json`) | Plugins (dulu "Gemini CLI Extensions") |
| Event lifecycle interception | Hooks (25 event, `hooks.json` per skema `hookSpecificOutput`) | Hooks (5 event, `hooks.json` per skema `allow_tool`/`deny_reason`) |
| Sub-task terisolasi konteks | Subagents (statis, depth 5, file `.md`) | Dynamic subagents (spawn on-the-fly) |
| Integrasi tool eksternal | MCP (`.mcp.json`) | MCP (`mcp_config.json`) — skema JSON sama |
| Mode CLI non-interaktif | `claude -p` | `antigravity run` / `agy` |
| Persona/system prompt override | `--system-prompt`, Output Styles | Tidak ada API publik setara terdokumentasi |
| SDK programatik | Claude Agent SDK (TS/Python) | Antigravity SDK (`google-antigravity`, Python) |
| Bukti kerja terverifikasi | Tidak ada konsep native (hanya teks/diff biasa) | **Artifacts** (Task List, Implementation Plan, dll — fitur unik Antigravity) |
| Kapabilitas browser | Chrome MCP / Claude in Chrome (terpisah) | Browser subagent (built-in, model terpisah dari sesi utama) |
| Approval multi-device | Tidak ada built-in (hanya terminal/IDE) | "Agent Approve" — relay ke companion app (iOS/Apple Watch) via plugin loop |

---

## 4. Rekomendasi Arsitektur Plugin Custom

### 4.1 Kendala Fundamental yang Harus Diterima Dulu

Sebelum masuk desain, tiga fakta ini membatasi apa yang *mungkin*:

1. **Tidak ada model-picker resmi untuk provider pihak ketiga di Antigravity.** Dua thread forum resmi (Maret & Juni 2026) menunjukkan percobaan community menyuntik lewat `.antigravity/settings.json` gagal, dan tidak ada tanggapan resmi Google yang mengonfirmasi dukungan. Artinya: **Claude Code tidak bisa muncul sebagai entri di dropdown model Gemini/Claude Sonnet/GPT-OSS bawaan Antigravity** lewat jalur yang didukung — kalaupun ada workaround, itu tidak resmi dan berisiko rusak di update berikutnya (mengubah key setting internal tanpa dokumentasi adalah reverse-engineering, bukan API publik).
2. **MCP adalah jalur resmi dua arah yang solid.** Antigravity = MCP *client* yang matang (MCP Store, custom server, OAuth, dsb). Claude Code = bisa jadi MCP *server* (`claude mcp serve`). Kombinasi keduanya adalah **jalur paling stabil dan didukung** untuk membawa kapabilitas Claude Code ke dalam sesi Antigravity, meski secara UX ia muncul sebagai "tool yang dipanggil model Gemini," bukan "model yang dipanggil langsung."
3. **Hooks Antigravity adalah titik intersepsi runtime yang sah**, dan `call_mcp_tool` matcher secara eksplisit ada — artinya Sir bisa mengamati/memodifikasi setiap kali agent Antigravity memanggil tool MCP (termasuk MCP yang membungkus Claude Code).

### 4.2 Tiga Arsitektur yang Layak Dipertimbangkan (dari paling "terlihat native" ke paling "eksplisit sebagai tool eksternal")

#### Opsi A — Claude Code sebagai MCP Server + Hook Transparency Layer (paling direkomendasikan)

```
User Antigravity ──▶ Agent Gemini (native Antigravity)
                          │
                          │  memanggil tool MCP "claude-code" saat butuh
                          ▼
                  claude mcp serve (stdio)
                          │
                          ▼
                  Claude Code CLI headless (--bare -p --output-format stream-json)
```

- Daftarkan `claude mcp serve` sebagai entri di `mcp_config.json` Antigravity.
- Gunakan **PreInvocation hook** Antigravity untuk mendeteksi kapan prompt user cocok didelegasikan ke tool Claude Code (mis. keyword coding kompleks, atau eksplisit dari Rules), lalu **inject instruksi** ke sesi Gemini supaya ia memanggil tool tersebut secara otomatis tanpa user perlu menyebut "pakai Claude Code."
- Gunakan **PostToolUse hook** dengan matcher `call_mcp_tool` untuk mem-postprocess hasil balik dari server MCP Claude Code — di sinilah Sir bisa strip/replace penyebutan "Claude Code" dari teks balasan sebelum tampil ke user, sekaligus reformat menjadi Artifact (Task List/Implementation Plan) kalau relevan.
- **Kelebihan:** memakai jalur resmi kedua sistem sepenuhnya (MCP untuk Antigravity, `claude mcp serve` untuk Claude Code) — paling tahan terhadap update, tidak reverse-engineer setting internal.
- **Kekurangan:** UX tetap "model utama memanggil tool," bukan "model diganti total." User yang jeli masih bisa melihat jejak tool-call di panel Antigravity kalau tidak disembunyikan lewat post-processing hook.

#### Opsi B — Antigravity Editor Extension yang Membungkus `claude -p` sebagai Backend Custom

```
Antigravity IDE (fork VS Code)
      │
      ▼
Editor Extension custom (mengikuti model ekstensi VS Code yang diwarisi Antigravity)
      │  spawn subprocess
      ▼
claude --bare -p --output-format stream-json --verbose --include-partial-messages
      │
      ▼
Parse stream_event → render token demi token di panel extension
```

- Karena Antigravity IDE adalah fork VS Code, ekosistem ekstensinya **kompatibel dengan VS Code Extension API** (dikonfirmasi: user memasang Python/Jupyter/framework extension langsung dari marketplace VS Code). Ini membuka jalur membangun **panel/webview custom** yang secara visual menyatu dengan chrome IDE Antigravity, lalu di baliknya memanggil `claude -p` sebagai child process.
- Streaming `--output-format stream-json` dengan `--include-partial-messages` memungkinkan extension merender token secara live — dari sisi visual, user tak bisa membedakan ini dari panel agent bawaan Antigravity, selama styling webview dibuat identik.
- **Kelebihan:** kendali penuh atas UI/UX, tak terikat harus "menyamar sebagai tool MCP."
- **Kekurangan:** ini bukan jalur yang didokumentasikan resmi oleh Google untuk *mengganti* agent panel utama — lebih tepat sebagai *panel tambahan*, bukan pengganti model Gemini di panel yang sudah ada. Juga menuntut maintenance mengikuti perubahan internal Antigravity IDE (fork VS Code bisa punya API internal yang beda dari VS Code stock).

#### Opsi C — Antigravity SDK (`google-antigravity`, Python) sebagai Host, Claude Code sebagai Tool Kustom

- Antigravity SDK memungkinkan scaffold agent kustom, registrasi Python tool kustom, dan sambungan MCP server — sesuai deskripsi resmi (`antigravity.google/docs/build-with-google`).
- Bangun **custom Python tool** di dalam agent Antigravity SDK yang, saat dipanggil, menjalankan `claude -p --output-format json` secara sinkron atau `stream-json` secara async, lalu me-return hasilnya sebagai *tool result* ke agent Antigravity SDK.
- Ini pada dasarnya arsitektur yang sama dengan Opsi A tapi di level SDK (dipakai kalau Sir sedang membangun aplikasi/agent Antigravity SDK sendiri dari nol) alih-alih di level konsumsi MCP store.
- **Kelebihan:** paling fleksibel untuk kontrol lifecycle hook (Antigravity SDK punya "lifecycle hooks, multi-agent delegation, structured output" versi programatik, bukan cuma JSON config).
- **Kekurangan:** butuh Sir membangun ulang harness agent dari SDK, bukan tinggal mengonsumsi Antigravity IDE/2.0 yang sudah jadi.

### 4.3 Desain "Menyamarkan Identitas" — Lapisan yang Perlu Digabung dari Ketiga Opsi

Terlepas dari opsi mana yang dipilih, lapisan berikut **wajib** ada supaya hasil akhirnya "terasa seperti model native":

1. **System prompt override total** (`--system-prompt-file`) — hapus semua identitas "Claude Code," ganti dengan persona yang konsisten dengan Rules/Workflows Antigravity milik Sir. Jangan pakai `--append-system-prompt` untuk tujuan ini, karena tetap mewarisi instruksi "kamu adalah Claude Code" di lapisan dasar.
2. **Post-processing hook wajib** (PostToolUse Antigravity dengan matcher `call_mcp_tool`, atau post-processing di Opsi B/C) — untuk strip referensi bermerek dari teks jawaban (mis. Claude Code kadang menyebut nama tool internalnya seperti "Bash tool", "Edit tool" — ini perlu di-mapping ke istilah yang dipakai Antigravity, seperti "run_command", "write_to_file").
3. **Streaming wajib**, bukan tunggu selesai — respons non-streaming terasa "lambat/asing" dibanding pengalaman token-per-token yang sudah jadi ekspektasi user Antigravity untuk semua model native-nya.
4. **Pemetaan sesi 1:1** — simpan `session_id` Claude Code per percakapan Antigravity, pakai `--resume`/`--continue` di setiap turn lanjutan supaya histori terasa menyatu, bukan mulai dari nol tiap kali dipanggil.
5. **Pemetaan Artifact** — kalau memungkinkan, ubah output terstruktur Claude Code (lewat `--json-schema`) menjadi format Task List/Implementation Plan Antigravity, supaya trust-layer khas Antigravity (yang jadi diferensiator utamanya) tetap terasa konsisten meski "otak" di baliknya Claude Code.
6. **Guard biaya & turn** (`--max-budget-usd`, `--max-turns`) — karena headless call tidak diawasi manusia secara real-time seperti sesi interaktif biasa.

### 4.4 Yang TIDAK Direkomendasikan

- **Jangan** mengandalkan setting internal tak terdokumentasi (`antigravity.ai.provider`, `antigravity.openai-compatible.*`) sebagai jalur utama — terbukti gagal di percobaan komunitas dan berisiko berubah/dihapus tanpa peringatan karena bukan API publik.
- **Jangan** mem-bypass permission-flow Claude Code secara diam-diam hanya karena `PermissionRequest` tidak aktif di mode `-p` — tetap eksplisit isi `--allowedTools`/`--permission-mode` dan bangun ulang lapisan konfirmasi di sisi Antigravity (baik lewat hook `ask_permission` Antigravity atau UI custom), supaya tidak ada tindakan berisiko (`Bash`, `Write`) yang lolos tanpa jejak persetujuan.
- **Jangan** menaruh path relatif di `hooks.json` Antigravity — dokumentasi komunitas mengonfirmasi ini penyebab umum kegagalan (`exit status 127`) karena resolve terhadap direktori kerja terminal saat `agy` dijalankan, bukan lokasi file hook.

---

## 5. Sumber

**Resmi Anthropic:**
- https://code.claude.com/docs/en/claude_code_docs_map.md — peta dokumentasi lengkap
- https://code.claude.com/docs/en/headless.md — mode `-p`, streaming, structured output
- https://code.claude.com/docs/en/output-styles.md
- https://code.claude.com/docs/en/cli-reference.md — semua flag CLI
- https://code.claude.com/docs/en/hooks-guide.md
- https://code.claude.com/docs/en/sub-agents.md
- https://code.claude.com/docs/en/mcp.md — termasuk "Use Claude Code as an MCP server"
- https://code.claude.com/docs/en/plugins.md

**Resmi Google:**
- https://antigravity.google/docs/mcp
- https://antigravity.google/docs/ide-mcp
- https://antigravity.google/docs/hooks
- https://antigravity.google/docs/build-with-google
- https://codelabs.developers.google.com/getting-started-google-antigravity

**Forum resmi (bukti gap fitur):**
- https://discuss.ai.google.dev/t/antigravity-add-your-own-api-keys-models/137068
- https://discuss.ai.google.dev/t/how-to-properly-configure-custom-openai-compatible-models-in-antigravity-ide/168654

**Komunitas terverifikasi silang (untuk detail teknis hooks Antigravity CLI yang belum sepenuhnya termuat di docs resmi):**
- https://medium.com/google-cloud/a-developers-guide-to-agent-hooks-in-antigravity-cli-4c1440febd11
- https://www.digitalapplied.com/blog/antigravity-2-google-desktop-agent-deep-dive
- https://dev.to/arindam_1729/antigravity-cli-a-hands-on-guide-to-googles-terminal-coding-agent-5bc7
- https://www.datacamp.com/tutorial/antigravity-cli
- https://aimeetcode.substack.com/p/antigravity-full-guide-from-install

> Catatan metodologis: bagian Antigravity dalam dokumen ini menggabungkan dokumentasi resmi Google dengan laporan komunitas yang diverifikasi silang antar beberapa sumber independen, karena dokumentasi resmi `antigravity.google/docs` tidak sepenuhnya dapat di-fetch sebagai teks statis (halaman client-rendered) pada saat riset ini dilakukan. Detail seperti skema payload hook JSON persis dan path konfigurasi sebaiknya **diverifikasi langsung terhadap instalasi Antigravity Sir** sebelum dipakai di produksi, karena Antigravity 2.0 masih berstatus preview dan beberapa detail (terutama path file) dilaporkan berbeda antar versi/sumber.
