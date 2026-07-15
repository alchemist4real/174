#!/usr/bin/env bash
# gpush.sh - Smart adaptive git push launcher
# Requires: git, GitHub CLI (gh) already authenticated
# Usage: ./gpush.sh   (or add to PATH and call: gpush)

set -uo pipefail

# ---------- colors ----------
C_RESET='\033[0m'
C_GREEN='\033[0;32m'
C_YELLOW='\033[0;33m'
C_RED='\033[0;31m'
C_BLUE='\033[0;34m'

info()  { echo -e "${C_BLUE}[i]${C_RESET} $1"; }
ok()    { echo -e "${C_GREEN}[ok]${C_RESET} $1"; }
warn()  { echo -e "${C_YELLOW}[!]${C_RESET} $1"; }
err()   { echo -e "${C_RED}[x]${C_RESET} $1"; }

# ---------- 1. Sanity checks ----------
if ! command -v git &>/dev/null; then
    err "git tidak ditemukan. Install dulu."
    exit 1
fi

if ! command -v gh &>/dev/null; then
    err "GitHub CLI (gh) tidak ditemukan. Install dulu: https://cli.github.com"
    exit 1
fi

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
    err "Folder ini bukan git repo."
    read -rp "Mau init repo git di sini? (y/n): " init_choice
    if [[ "$init_choice" == "y" ]]; then
        git init
        ok "Repo git baru dibuat."
    else
        info "Dibatalkan."
        exit 0
    fi
fi

if ! gh auth status &>/dev/null; then
    err "GitHub CLI belum login. Jalankan: gh auth login"
    exit 1
fi

# ---------- 2. Detect / create remote ----------
if ! git remote get-url origin &>/dev/null; then
    warn "Belum ada remote 'origin'."
    read -rp "Masukkan URL remote GitHub (kosongkan utk skip): " remote_url
    if [[ -n "$remote_url" ]]; then
        git remote add origin "$remote_url"
        ok "Remote origin ditambahkan: $remote_url"
    else
        warn "Tidak ada remote. Push akan gagal nanti kecuali kamu set manual."
    fi
fi

# ---------- 3. Detect / create branch ----------
current_branch=$(git symbolic-ref --short -q HEAD)

if [[ -z "$current_branch" ]]; then
    warn "HEAD detached atau belum ada branch."
    default_branch="main"
    read -rp "Nama branch baru mau dibuat (default: $default_branch): " new_branch
    new_branch=${new_branch:-$default_branch}
    git checkout -b "$new_branch"
    current_branch="$new_branch"
    ok "Branch baru '$current_branch' dibuat."
else
    info "Branch aktif: $current_branch"
fi

# ---------- 4. Check staged / unstaged changes ----------
git update-index -q --refresh
has_staged=$(git diff --cached --name-only | wc -l)
has_unstaged=$(git diff --name-only | wc -l)
has_untracked=$(git ls-files --others --exclude-standard | wc -l)

if [[ "$has_staged" -eq 0 ]]; then
    if [[ "$has_unstaged" -eq 0 && "$has_untracked" -eq 0 ]]; then
        # nothing changed at all — check if there are unpushed commits
        ahead=$(git rev-list --count @{u}.. 2>/dev/null || echo "0")
        if [[ "$ahead" -gt 0 ]]; then
            info "Tidak ada perubahan baru, tapi ada $ahead commit yang belum di-push."
        else
            ok "Tidak ada perubahan dan tidak ada commit pending. Semua sudah sinkron."
            exit 0
        fi
    else
        warn "Ada perubahan yang belum di-stage:"
        echo ""
        git status --short
        echo ""
        echo "Pilihan staging:"
        echo "  1) Stage semua file (git add -A)"
        echo "  2) Pilih file manual (interactive)"
        echo "  3) Batal"
        read -rp "Pilih (1/2/3): " stage_choice
        case "$stage_choice" in
            1)
                git add -A
                ok "Semua file di-stage."
                ;;
            2)
                git add -p
                ok "Staging manual selesai."
                ;;
            *)
                info "Dibatalkan."
                exit 0
                ;;
        esac
    fi
fi

# ---------- 5. Commit (only if something staged) ----------
staged_now=$(git diff --cached --name-only | wc -l)
if [[ "$staged_now" -gt 0 ]]; then
    # auto-generate commit message from diff stat
    diff_summary=$(git diff --cached --stat | tail -n 1 | sed 's/^ *//')
    changed_files=$(git diff --cached --name-only | tr '\n' ' ')
    auto_msg="update: ${diff_summary}"

    echo ""
    info "Draft commit message otomatis:"
    echo "    $auto_msg"
    echo "    files: $changed_files"
    read -rp "Pakai pesan ini? (y = pakai / ketik pesan sendiri / n = batal): " msg_choice

    if [[ "$msg_choice" == "y" || -z "$msg_choice" ]]; then
        commit_msg="$auto_msg"
    elif [[ "$msg_choice" == "n" ]]; then
        info "Dibatalkan."
        exit 0
    else
        commit_msg="$msg_choice"
    fi

    git commit -m "$commit_msg"
    ok "Commit dibuat: $commit_msg"
fi

# ---------- 6. Push (adaptive: handles no-upstream, conflicts) ----------
push_output=$(git push origin "$current_branch" 2>&1)
push_status=$?

if [[ $push_status -eq 0 ]]; then
    ok "Push berhasil ke origin/$current_branch."
elif echo "$push_output" | grep -q "has no upstream branch"; then
    warn "Branch belum punya upstream. Set upstream dan push..."
    git push --set-upstream origin "$current_branch"
    ok "Upstream diset, push berhasil."
elif echo "$push_output" | grep -qi "rejected\|fetch first\|non-fast-forward"; then
    warn "Push ditolak (remote punya commit baru). Mencoba pull --rebase..."
    if git pull --rebase origin "$current_branch"; then
        ok "Rebase berhasil, mencoba push ulang..."
        if git push origin "$current_branch"; then
            ok "Push berhasil setelah rebase."
        else
            err "Push masih gagal setelah rebase. Cek manual."
            echo "$push_output"
            exit 1
        fi
    else
        err "Rebase gagal, kemungkinan ada conflict."
        warn "Selesaikan conflict manual, lalu jalankan: git rebase --continue"
        exit 1
    fi
else
    err "Push gagal karena alasan lain:"
    echo "$push_output"
    exit 1
fi

# ---------- 7. Summary ----------
echo ""
ok "Selesai. Branch '$current_branch' sudah sinkron dengan origin."
