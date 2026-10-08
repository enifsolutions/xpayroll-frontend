#!/usr/bin/env bash
# XpayRoll · Onboarding Gate · §5 frontend audit (read-only)
# Run from: /Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend
set -euo pipefail
OUT="frontend_status_audit.txt"
{
  echo "##### Status literals / maps / enums #####"
  grep -rnE "['\"](Active|Probation|OnLeave|Suspended|Resigned|Terminated)['\"]|EmployeeStatus|employeeStatus|statusColor|statusMap|STATUS_OPTIONS|statusOptions" \
       src --include=*.ts --include=*.tsx || true
  echo
  echo "##### Dashboard / headcount consumers #####"
  grep -rnlE "headcount|activeEmployees|totalEmployees|dashboard-summary|dashboardSummary" \
       src --include=*.ts --include=*.tsx || true
  echo
  echo "##### Login error handling (for the 'account not active' message) #####"
  grep -rnE "Invalid credentials|invalid.*password|401|403" \
       src/app/\(auth\)* src/app/portal src/lib 2>/dev/null --include=*.ts --include=*.tsx || true
} > "$OUT"
echo "Done -> $OUT"
