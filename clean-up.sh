#!/usr/bin/env bash
# cleanup.sh — remove alignment artifacts + backup folders from git tracking
# Keeps them on local disk (git rm --cached), only removes from repo
set -euo pipefail
P="$PWD"
ok(){ printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }

[ -d .git ] || { echo "not a git repo"; exit 1; }

# --- 1. Extend .gitignore ---
if ! grep -qE '^\.backup-\*/$' .gitignore; then
  cat >> .gitignore <<'GITEOF'

# alignment artifacts and local backups — do not commit
.backup-*/
.nday-db-phase2-backup-*/
.nday-refactor-backup-*/
align-*.sh
full-align.sh
cleanup.sh
GITEOF
  ok "extended .gitignore"
fi

# --- 2. Untrack (keep on disk) known artifacts ---
untrack_if_tracked() {
  local path="$1"
  if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
    git rm -r --cached --quiet "$path"
    ok "untracked: $path (still on disk)"
  fi
}

untrack_if_tracked ".backup-20261110-032831"
untrack_if_tracked ".nday-db-phase2-backup-qpgTEd"
untrack_if_tracked ".nday-refactor-backup-2026-11-09T07-43-24-502Z"
untrack_if_tracked "align-c.sh"
untrack_if_tracked "align-d.sh"
untrack_if_tracked "align-e.sh"
untrack_if_tracked "align-f.sh"
untrack_if_tracked "full-align.sh"
untrack_if_tracked "cleanup.sh"

# --- 3. Delete the file literally named "=" ---
if [ -f "=" ]; then
  git rm --quiet "=" 2>/dev/null || true
  rm -f "="
  ok "deleted stray file: ="
fi

# --- 4. Show what's still tracked at root (sanity) ---
echo
echo "=== root-level tracked files after cleanup ==="
git ls-files | awk -F/ 'NF==1' | sort

# --- 5. Re-commit ---
echo
git add -A
if git diff --cached --quiet; then
  warn "nothing to commit — already clean"
else
  git commit -m "Clean repo: untrack local backups, alignment scripts, stray files"
  ok "committed"
fi

echo
echo "================================================================"
echo "  NEW COMMIT HASH — copy this to your video end slate"
echo "================================================================"
git rev-parse HEAD
echo "================================================================"