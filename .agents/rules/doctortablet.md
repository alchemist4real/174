---
trigger: always_on
description: Aturan & System Prompt Sintesis Catatan Medis DoctorTablet via MCP (Standar Repo DoctorTablet: Pre-Writing Mapping, High-Density Anti-PPT, Callouts, Tabel, Mermaid, Formula LaTeX, Dynamic Author Nama Lengkap Tanpa Gelar).
---

## DoctorTablet MCP Note Synthesis Rules

Setiap kali melakukan analisis materi medis, sintesis catatan, atau memanggil fungsi MCP `doctortablet_*` (`doctortablet_save_note`, `doctortablet_read_note`, dll.), WAJIB mematuhi arsitektur & standar resmi repositori **DoctorTablet**:

### 1. Dynamic Author Resolution (Nama Lengkap Tanpa Gelar)
- Parameter `author` HARUS mencerminkan **NAMA LENGKAP SAJA TANPA GELAR** dari pengguna/pemilik akun MCP terotentikasi (contoh: `"Ahmad Muqorrobin"`, BUKAN `"dr. Ahmad Muqorrobin, S.Ked"`).
- DILARANG meng-hardcode gelar medis/akademis (`dr.`, `Sp.A`, `S.Ked`, `Ph.D`) dan DILARANG meng-hardcode nama generik seperti `"Claude Assistant"` atau `"AI Agent"`.

### 2. Pre-Writing Analysis & Concept Mapping
- Sebelum menulis Markdown akhir, WAJIB menganalisis dan memetakan struktur hirarki serta hubungan antar-konsep utama materi rujukan secara menyeluruh sesuai konteks topik sumbernya.

### 3. Karakter Catatan (High-Density & Anti-PPT Style)
- **Bukan Transkrip Slide Mentah**: Catatan adalah hasil elaborasi pemahaman medis mendalam, dilengkapi contoh obat/kasus nyata, analogi intuitif, dan jebakan ujian.
- **Komprehensif & On-Point**: Seluruh detail medis vital (kriteria klinis, angka acuan, dosis, indikasi/kontraindikasi, spesifikasi ilmiah) tercakup lengkap, padat, dan bebas kata-kata basa-basi.

### 4. Elemen Terstruktur Wajib
- **Callouts GitHub**:
  - `> [!NOTE]`: Konsep dasar & konteks elaborasi pemahaman.
  - `> [!TIP]`: Insight praktis klinis di lapangan & tips cepat.
  - `> [!WARNING]`: Peringatan bahaya klinis, kontraindikasi, & **jebakan ujian klasik**.
- **Tabel**: Gunakan tabel markdown untuk matriks komparatif, diagnosis banding, penanda laboratorium, atau komparasi data.
- **Diagram Mermaid**: Gunakan `mermaid` (`flowchart TD` atau `LR`) untuk alur keputusan klinis, algoritma triase, skema ADME/patofisiologi, atau alur prosedur.
- **Formula LaTeX**: Persamaan matematika/klinis kuantitatif ($F = \frac{AUC_{oral}}{AUC_{IV}}$, $MAP$, $CO$, $t_{1/2}$, $CL$, $eGFR$, $Anion\ Gap$) disajikan dalam sintaks LaTeX (`$ ... $` / `$$ ... $$`).

### 5. Integrasi Tool MCP `doctortablet_save_note`
Panggil `doctortablet_save_note` dengan payload lengkap:
```json
{
  "title": "<Judul Catatan>",
  "categoryId": "<Category ID Target>",
  "content": "<Isi Markdown Terstruktur dengan Frontmatter YAML & Callouts>",
  "tags": ["#medical", "#<spesialisasi>"],
  "author": "<Nama Lengkap Pengguna MCP Tanpa Gelar>"
}
```
