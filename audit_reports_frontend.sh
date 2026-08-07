#!/usr/bin/env bash
# ============================================================================
# XpayRoll — Recruitment Reports (Phase 6) — Frontend Pattern Audit
# Run from: /Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend
# Read-only. Paste full output back.
# ============================================================================

set -uo pipefail
BASE="/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend"
cd "$BASE" || { echo "Cannot cd into $BASE — adjust path and rerun"; exit 1; }

echo ""
echo "=== 1. FIND EXISTING REPORTS PAGE(S) UNDER app/(dashboard) ==="
find "src/app/(dashboard)" -type d -iname "*report*" 2>/dev/null

echo ""
echo "=== 2. LIST FILES UNDER THE REPORTS DIRECTORY (if found) ==="
REPORTS_DIR=$(find "src/app/(dashboard)" -type d -iname "*report*" 2>/dev/null | head -1)
if [ -n "$REPORTS_DIR" ]; then
    echo "Found: $REPORTS_DIR"
    find "$REPORTS_DIR" -type f | sort
else
    echo "No directory matching '*report*' found under app/(dashboard). Reports may be nested inside module folders (payroll/, hr/) — searching below."
fi

echo ""
echo "=== 3. SEARCH FOR REPORT-RELATED PAGE FILES ANYWHERE UNDER src/app ==="
find src/app -iname "*report*" -type f 2>/dev/null | sort

echo ""
echo "=== 4. SEARCH FOR KEY REPORT NAMES (BankTransfer, CostCentre, AttendanceSummary, Headcount) TO LOCATE PATTERN SOURCE ==="
for kw in "BankTransfer" "CostCentre" "AttendanceSummary" "Headcount" "LateArrivals" "Overtime" "NoPay" "LeaveUtilisation" "ContractExpiry"; do
    echo "--- Files matching '$kw' ---"
    grep -rl "$kw" src/ --include="*.tsx" --include="*.ts" 2>/dev/null
done

echo ""
echo "=== 5. SHOW CONTENTS OF MAIN REPORTS INDEX/PICKER PAGE (if found) ==="
MAIN_REPORT_PAGE=$(find "$REPORTS_DIR" -iname "page.tsx" 2>/dev/null | head -1)
if [ -n "$MAIN_REPORT_PAGE" ]; then
    echo "Found: $MAIN_REPORT_PAGE"
    cat "$MAIN_REPORT_PAGE"
else
    echo "No page.tsx found directly in reports dir."
fi

echo ""
echo "=== 6. EXPORT MECHANISM — SEARCH FOR BLOB DOWNLOAD PATTERN (responseType: 'blob') IN REPORT-RELATED FILES ==="
grep -rl "responseType.*blob" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | xargs -I{} grep -l -i "report" {} 2>/dev/null

echo ""
echo "=== 7. CONFIRM Recruitment.Reports.* PERMISSION CONSTANTS EXIST IN permissions.ts ==="
if [ -f "src/lib/permissions.ts" ]; then
    grep -n -i "Recruitment.*Report\|Reports.*View\|Reports.*Export" src/lib/permissions.ts
else
    echo "src/lib/permissions.ts not found — searching elsewhere:"
    find src -iname "permissions.ts" 2>/dev/null
fi

echo ""
echo "=== 8. LIST ALL RECRUITMENT FRONTEND PAGES BUILT SO FAR (for consistency reference) ==="
find "src/app/(dashboard)/recruitment" -type f -iname "page.tsx" 2>/dev/null | sort

echo ""
echo "=== 9. SEARCH FOR EXISTING CHART/VIZ LIBRARY USAGE (Recharts) IN NON-REPORT PAGES, TO REUSE FOR FUNNEL/DIVERSITY CHARTS ==="
grep -rl "from 'recharts'\|from \"recharts\"" src/ --include="*.tsx" 2>/dev/null | sort

echo ""
echo "=== 10. CHECK NAVIGATION CONFIG FOR EXISTING REPORT MENU ENTRIES (pattern for adding Recruitment Reports link) ==="
if [ -f "src/configs/navigation.config.ts" ]; then
    grep -n -i "report" src/configs/navigation.config.ts
else
    echo "navigation.config.ts not found at expected path."
fi

echo ""
echo "=== DONE — paste full output back for report-definition proposal ==="
