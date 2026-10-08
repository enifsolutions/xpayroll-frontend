#!/usr/bin/env bash
# Copies the Work Patterns frontend files from the extracted zip into the project.
#
# Usage:
#   ./copy_wp_frontend.sh [--with-replaced] [SRC_DIR] [PROJECT_DIR]
#
# Defaults:
#   SRC_DIR     = ~/Downloads/extract   (the folder you unzipped wp_04_frontend.zip into)
#   PROJECT_DIR = /Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend
#
# Default: copies only the 2 NEW files (never overwrites an existing file).
# --with-replaced: ALSO overwrites the 3 changed files, after saving a .bak copy of each.
# The 5 small edits in MANUAL_EDITS.md are always yours to make by hand.

set -euo pipefail

WITH_REPLACED=0
if [[ "${1:-}" == "--with-replaced" ]]; then WITH_REPLACED=1; shift; fi

SRC="${1:-$HOME/Downloads/extract}"
DEST="${2:-/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend}"

# The zip may have been extracted into a sub-folder; find the folder that holds MANUAL_EDITS.md.
if [[ ! -f "$SRC/MANUAL_EDITS.md" ]]; then
  FOUND="$(find "$SRC" -maxdepth 3 -name MANUAL_EDITS.md -print -quit 2>/dev/null || true)"
  [[ -n "$FOUND" ]] && SRC="$(dirname "$FOUND")"
fi

[[ -f "$SRC/MANUAL_EDITS.md" ]] || { echo "ERROR: cannot find the extracted files under: $SRC"; exit 1; }
[[ -f "$DEST/package.json" ]] || { echo "ERROR: $DEST does not look like the frontend project (no package.json)"; exit 1; }

echo "Source : $SRC"
echo "Project: $DEST"
echo

NEW_FILES=(
  "app/(dashboard)/master/work-patterns/page.tsx"
  "src/lib/workPattern.ts"
)
REPLACED_FILES=(
  "app/(dashboard)/master/shifts/page.tsx"
  "app/(dashboard)/employees/[id]/shift-assignments/page.tsx"
  "app/(dashboard)/employees/[id]/shift-assignments/shift-assignments.types.ts"
)

for f in "${NEW_FILES[@]}"; do
  [[ -f "$SRC/$f" ]] || { echo "MISSING in source: $f"; exit 1; }
  if [[ -e "$DEST/$f" ]]; then
    echo "SKIP (already exists, not overwritten): $f"
  else
    mkdir -p "$(dirname "$DEST/$f")"
    cp "$SRC/$f" "$DEST/$f"
    echo "NEW      : $f"
  fi
done

echo
for f in "${REPLACED_FILES[@]}"; do
  [[ -f "$SRC/$f" ]] || { echo "MISSING in source: $f"; exit 1; }
  if [[ $WITH_REPLACED -eq 1 ]]; then
    mkdir -p "$(dirname "$DEST/$f")"
    if [[ -e "$DEST/$f" ]]; then cp "$DEST/$f" "$DEST/$f.bak"; fi
    cp "$SRC/$f" "$DEST/$f"
    echo "REPLACED : $f   (backup: $f.bak)"
  else
    echo "NOT COPIED (use --with-replaced, or merge by hand with changes.diff): $f"
  fi
done

echo
echo "Done. Next: make the 5 edits in $SRC/MANUAL_EDITS.md, then run: npm run build"
echo "If you used --with-replaced, delete the *.bak files once the build passes."
