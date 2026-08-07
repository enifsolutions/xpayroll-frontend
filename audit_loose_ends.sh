#!/usr/bin/env bash
# ============================================================================
# XpayRoll — Loose-ends audit: useRequirePermission hook + OverrideScoreLimit check
# Run from: /Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend
# ============================================================================

set -uo pipefail
BASE="/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend"
cd "$BASE" || { echo "Cannot cd into $BASE"; exit 1; }

echo ""
echo "=== 1. FIND useRequirePermission HOOK DEFINITION ==="
find src -iname "*useRequirePermission*" -o -iname "*use-require-permission*" 2>/dev/null
grep -rl "useRequirePermission" src/hooks src/lib 2>/dev/null

echo ""
echo "=== 2. SHOW HOOK SOURCE (if found) ==="
HOOK_FILE=$(find src -iname "*useRequirePermission*" 2>/dev/null | head -1)
if [ -n "$HOOK_FILE" ]; then
    echo "Found: $HOOK_FILE"
    cat "$HOOK_FILE"
else
    echo "Not found by filename — searching for the export/function definition directly:"
    grep -rn "function useRequirePermission\|export.*useRequirePermission" src/ --include="*.ts" --include="*.tsx" 2>/dev/null
fi

echo ""
echo "=== 3. SHOW ONE EXAMPLE USAGE (any existing page that calls it) ==="
grep -rl "useRequirePermission(" src/app 2>/dev/null | head -1 | xargs -I{} sh -c 'echo "--- {} ---"; cat "{}"' 2>/dev/null

echo ""
echo "=== 4. CONFIRM OverrideScoreLimit STATUS IN permissions.ts (backlog check) ==="
grep -n "OverrideScoreLimit" src/lib/permissions.ts

echo ""
echo "=== 5. CONFIRM pipeline/page.tsx:160 STILL REFERENCES IT / STILL ERRORS ==="
sed -n '150,170p' "src/app/(dashboard)/recruitment/pipeline/page.tsx" 2>/dev/null

echo ""
echo "=== 6. RUN A QUICK TYPE CHECK TO CONFIRM THE BACKLOG ITEM IS RESOLVED ==="
npx tsc --noEmit 2>&1 | grep -i "pipeline/page.tsx" || echo "No pipeline/page.tsx errors found — backlog item appears resolved."

echo ""
echo "=== DONE ==="
