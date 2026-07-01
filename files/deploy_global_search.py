#!/usr/bin/env python3
"""
XpayRoll Pro — Global Search Deploy Script
Run from any directory on Mac:
  python3 deploy_global_search.py
"""

import os

BASE = "/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend"

FILES = {}

# ─────────────────────────────────────────────────────────────────────────────
FILES["src/data/searchIndex.ts"] = r"""// src/data/searchIndex.ts
// XpayRoll Pro — Global Search Index
// Frontend-only navigation search. Add new pages here as they are built.

export type SearchCategory =
  | 'Dashboard'
  | 'Employees'
  | 'Attendance'
  | 'Leave'
  | 'Payroll'
  | 'Tax'
  | 'Reports'
  | 'Master Data'
  | 'System'

export interface SearchItem {
  id: string
  title: string
  description: string
  href: string
  category: SearchCategory
  keywords: string[]
  icon: string
}

export const searchIndex: SearchItem[] = [
  // ── Dashboard
  { id: 'dashboard', title: 'Dashboard', description: 'KPI widgets, payroll overview, quick stats', href: '/dashboard', category: 'Dashboard', keywords: ['home', 'overview', 'kpi', 'widgets', 'summary'], icon: 'LayoutDashboard' },

  // ── Employees
  { id: 'employees-list', title: 'Employees', description: 'View and manage all employee records', href: '/employees', category: 'Employees', keywords: ['staff', 'worker', 'personnel', 'hr', 'headcount'], icon: 'Users' },
  { id: 'employees-add', title: 'Add New Employee', description: 'Onboard a new employee via the setup wizard', href: '/employees?action=add', category: 'Employees', keywords: ['new', 'create', 'onboard', 'hire', 'wizard'], icon: 'UserPlus' },
  { id: 'employee-contracts', title: 'Employee Contracts', description: 'View contract details for employees', href: '/employees', category: 'Employees', keywords: ['contract', 'agreement', 'probation', 'permanent'], icon: 'FileText' },
  { id: 'employee-loans', title: 'Employee Loans & DSR', description: 'Loan records and debt service ratios', href: '/employees', category: 'Employees', keywords: ['loan', 'dsr', 'debt', 'advance', 'repayment'], icon: 'Banknote' },
  { id: 'employee-benefits', title: 'Employee Benefits', description: 'Allowances, bonuses and commissions per employee', href: '/employees', category: 'Employees', keywords: ['allowance', 'bonus', 'commission', 'benefit'], icon: 'Gift' },
  { id: 'employee-deductions', title: 'Employee Deductions', description: 'Statutory and voluntary deductions per employee', href: '/employees', category: 'Employees', keywords: ['deduction', 'statutory', 'voluntary', 'epf', 'etf'], icon: 'Minus' },
  { id: 'employee-tax-profiles', title: 'Employee Tax Profiles', description: 'APIT/PAYE tax profile settings per employee', href: '/employees', category: 'Employees', keywords: ['tax', 'apit', 'paye', 'profile', 'withholding'], icon: 'Receipt' },
  { id: 'employee-leave-balances', title: 'Employee Leave Balances', description: 'Leave entitlements and remaining balances', href: '/employees', category: 'Employees', keywords: ['leave', 'balance', 'entitlement', 'annual', 'casual', 'sick'], icon: 'CalendarCheck' },
  { id: 'shift-assignments', title: 'Shift Assignments', description: 'Assign shifts to employees', href: '/employees', category: 'Employees', keywords: ['shift', 'roster', 'schedule', 'assign', 'rotation'], icon: 'Clock' },

  // ── Attendance
  { id: 'attendance-logs', title: 'Attendance Logs', description: 'Daily attendance records for all employees', href: '/attendance/logs', category: 'Attendance', keywords: ['attendance', 'log', 'check-in', 'check-out', 'biometric', 'present', 'absent'], icon: 'ClipboardList' },
  { id: 'attendance-adjustments', title: 'Attendance Adjustments', description: 'Review and approve attendance adjustment requests', href: '/attendance/adjustments', category: 'Attendance', keywords: ['adjustment', 'correction', 'request', 'regularise', 'regularize'], icon: 'ClipboardEdit' },
  { id: 'attendance-nopay', title: 'No-Pay Freeze', description: 'Manage no-pay periods and attendance freezes', href: '/attendance/nopay', category: 'Attendance', keywords: ['no pay', 'nopay', 'freeze', 'unpaid', 'absent deduction'], icon: 'Ban' },

  // ── Leave
  { id: 'leave-requests', title: 'Leave Requests', description: 'Approve, reject or manage employee leave requests', href: '/leave/requests', category: 'Leave', keywords: ['leave', 'request', 'approve', 'reject', 'annual', 'casual', 'sick', 'apply'], icon: 'CalendarOff' },
  { id: 'leave-templates', title: 'Leave Templates', description: 'Configure leave template headers and entitlement lines', href: '/master/leave-templates', category: 'Leave', keywords: ['leave template', 'entitlement', 'setup', 'configure'], icon: 'LayoutTemplate' },

  // ── Payroll
  { id: 'payroll-run', title: 'Payroll Run', description: 'Generate payslips for a pay period', href: '/payroll/run', category: 'Payroll', keywords: ['payroll', 'run', 'generate', 'process', 'payslip', 'salary'], icon: 'Play' },
  { id: 'payslips', title: 'Payslips', description: 'View, print, export and email payslips', href: '/payroll/payslips', category: 'Payroll', keywords: ['payslip', 'salary slip', 'pay', 'print', 'export', 'pdf', 'email'], icon: 'FileText' },
  { id: 'payroll-bank-transfer', title: 'Bank Transfer Report', description: 'Generate bank transfer file for salary payments', href: '/payroll/reports/bank-transfer', category: 'Payroll', keywords: ['bank', 'transfer', 'payment', 'salary', 'neft'], icon: 'Building2' },
  { id: 'payroll-cost-centre', title: 'Cost Centre Report', description: 'Payroll cost breakdown by cost centre', href: '/payroll/reports/cost-centre', category: 'Payroll', keywords: ['cost centre', 'cost center', 'department cost', 'allocation'], icon: 'PieChart' },
  { id: 'payroll-comparison', title: 'Payroll Comparison Report', description: 'Month-on-month payroll comparison', href: '/payroll/reports/comparison', category: 'Payroll', keywords: ['comparison', 'compare', 'month', 'variance', 'difference'], icon: 'BarChart2' },
  { id: 'payroll-loan-deduction', title: 'Loan Deduction Report', description: 'Summary of loan deductions in a pay period', href: '/payroll/reports/loan-deduction', category: 'Payroll', keywords: ['loan', 'deduction', 'repayment', 'report'], icon: 'Banknote' },
  { id: 'payroll-epf-cform', title: 'EPF C-Form', description: 'Employees Provident Fund C-Form report', href: '/payroll/reports/epf-cform', category: 'Payroll', keywords: ['epf', 'c form', 'provident fund', 'contribution'], icon: 'FileSpreadsheet' },
  { id: 'payroll-etf-return', title: 'ETF Return Report', description: 'Employees Trust Fund return report', href: '/payroll/reports/etf-return', category: 'Payroll', keywords: ['etf', 'trust fund', 'return', 'contribution'], icon: 'FileSpreadsheet' },
  { id: 'payroll-print-log', title: 'Payroll Print Log', description: 'Audit log of all payslip prints (ORIGINAL/COPY)', href: '/payroll/reports/print-log', category: 'Payroll', keywords: ['print', 'log', 'audit', 'original', 'copy', 'watermark'], icon: 'Printer' },

  // ── Tax
  { id: 'tax-apit-01', title: 'APIT Schedule 01', description: 'Monthly APIT deduction schedule for resident employees', href: '/tax/apit/schedule-01', category: 'Tax', keywords: ['apit', 'schedule 01', 'resident', 'monthly tax', 'withholding'], icon: 'FileBarChart' },
  { id: 'tax-apit-02', title: 'APIT Schedule 02', description: 'APIT schedule for lump sum payments', href: '/tax/apit/schedule-02', category: 'Tax', keywords: ['apit', 'schedule 02', 'lump sum', 'gratuity', 'terminal'], icon: 'FileBarChart' },
  { id: 'tax-apit-03', title: 'APIT Schedule 03', description: 'APIT schedule for non-resident employees', href: '/tax/apit/schedule-03', category: 'Tax', keywords: ['apit', 'schedule 03', 'non-resident', 'foreign'], icon: 'FileBarChart' },
  { id: 'tax-apit-summary', title: 'Monthly APIT Payment Summary', description: 'Consolidated APIT payment summary for IRD submission', href: '/tax/apit/payment-summary', category: 'Tax', keywords: ['apit', 'payment summary', 'ird', 'monthly', 'submission'], icon: 'FilePlus' },
  { id: 'tax-t10', title: 'T10 Certificates', description: 'Annual T10 tax certificates for employees', href: '/tax/t10/2026-2027', category: 'Tax', keywords: ['t10', 'certificate', 'annual', 'assessment year', 'paye'], icon: 'Award' },

  // ── HR Reports
  { id: 'report-attendance-summary', title: 'Attendance Summary Report', description: 'Monthly attendance summary per employee', href: '/reports/hr/attendance-summary', category: 'Reports', keywords: ['attendance', 'summary', 'report', 'present', 'absent', 'late'], icon: 'ClipboardList' },
  { id: 'report-leave-balance', title: 'Leave Balance Report', description: 'Remaining leave balances for all employees', href: '/reports/hr/leave-balance', category: 'Reports', keywords: ['leave', 'balance', 'report', 'entitlement', 'remaining'], icon: 'CalendarDays' },
  { id: 'report-headcount', title: 'Headcount Report', description: 'Headcount breakdown by department and branch', href: '/reports/hr/headcount', category: 'Reports', keywords: ['headcount', 'count', 'department', 'branch', 'strength'], icon: 'Users' },
  { id: 'report-late-arrivals', title: 'Late Arrivals Report', description: 'Employees arriving late in a given period', href: '/reports/hr/late-arrivals', category: 'Reports', keywords: ['late', 'tardiness', 'arrival', 'punctuality', 'report'], icon: 'AlarmClock' },
  { id: 'report-overtime', title: 'Overtime Report', description: 'Overtime hours worked per employee', href: '/reports/hr/overtime', category: 'Reports', keywords: ['overtime', 'ot', 'extra hours', 'overtime hours'], icon: 'Timer' },
  { id: 'report-nopay', title: 'No-Pay Report', description: 'No-pay deduction summary per pay period', href: '/reports/hr/no-pay', category: 'Reports', keywords: ['no pay', 'nopay', 'unpaid', 'deduction', 'report'], icon: 'Ban' },
  { id: 'report-leave-utilisation', title: 'Leave Utilisation Report', description: 'How much leave each employee has used', href: '/reports/hr/leave-utilisation', category: 'Reports', keywords: ['leave', 'utilisation', 'utilization', 'used', 'consumed'], icon: 'TrendingUp' },
  { id: 'report-contract-expiry', title: 'Contract Expiry Report', description: 'Employees whose contracts are expiring soon', href: '/reports/hr/contract-expiry', category: 'Reports', keywords: ['contract', 'expiry', 'expiring', 'renewal', 'end date'], icon: 'CalendarX' },

  // ── Master Data
  { id: 'master-branches', title: 'Branches', description: 'Manage company branch locations', href: '/master/branches', category: 'Master Data', keywords: ['branch', 'location', 'office', 'site'], icon: 'MapPin' },
  { id: 'master-departments', title: 'Departments', description: 'Manage departments', href: '/master/departments', category: 'Master Data', keywords: ['department', 'division', 'unit', 'section'], icon: 'Network' },
  { id: 'master-designations', title: 'Designations', description: 'Manage job titles and designations', href: '/master/designations', category: 'Master Data', keywords: ['designation', 'title', 'job title', 'position', 'grade'], icon: 'Briefcase' },
  { id: 'master-shifts', title: 'Shifts', description: 'Configure work shifts and timings', href: '/master/shifts', category: 'Master Data', keywords: ['shift', 'timing', 'work hours', 'roster', 'schedule'], icon: 'Clock' },
  { id: 'master-statutory-rates', title: 'Statutory Rates', description: 'EPF, ETF and other statutory contribution rates', href: '/master/statutory-rates', category: 'Master Data', keywords: ['statutory', 'epf', 'etf', 'rate', 'contribution', 'legal'], icon: 'Percent' },
  { id: 'master-tax-config', title: 'Tax Configuration', description: 'APIT tax slabs and configuration', href: '/master/tax-config', category: 'Master Data', keywords: ['tax', 'apit', 'slab', 'bracket', 'configuration', 'paye'], icon: 'Settings2' },
  { id: 'master-attendance-policies', title: 'Attendance Policies', description: 'Late grace periods, overtime thresholds and rules', href: '/master/attendance-policies', category: 'Master Data', keywords: ['attendance', 'policy', 'grace', 'overtime', 'rule', 'threshold'], icon: 'ShieldCheck' },
  { id: 'master-devices', title: 'Biometric Devices', description: 'Manage ZKTeco and HikVision biometric devices', href: '/master/devices', category: 'Master Data', keywords: ['device', 'biometric', 'zkteco', 'hikvision', 'fingerprint', 'adms'], icon: 'Fingerprint' },
  { id: 'master-public-holidays', title: 'Public Holidays', description: 'Configure public holidays for the year', href: '/master/public-holidays', category: 'Master Data', keywords: ['holiday', 'public holiday', 'national', 'poya', 'calendar'], icon: 'CalendarHeart' },
  { id: 'master-leave-types', title: 'Leave Types', description: 'Annual, casual, sick and other leave type settings', href: '/master/leave-types', category: 'Master Data', keywords: ['leave type', 'annual', 'casual', 'sick', 'maternity', 'paternity', 'unpaid'], icon: 'CalendarMinus' },
  { id: 'master-benefit-types', title: 'Benefit Types', description: 'Configure allowance and bonus type definitions', href: '/master/benefit-types', category: 'Master Data', keywords: ['benefit', 'allowance', 'bonus', 'type', 'commission'], icon: 'Gift' },
  { id: 'master-deduction-types', title: 'Deduction Types', description: 'Configure statutory and voluntary deduction types', href: '/master/deduction-types', category: 'Master Data', keywords: ['deduction', 'statutory', 'voluntary', 'type', 'definition'], icon: 'MinusCircle' },
  { id: 'master-bank-branches', title: 'Bank Branches', description: 'Bank and branch master data for salary payments', href: '/master/bank-branches', category: 'Master Data', keywords: ['bank', 'branch', 'swift', 'code', 'payment'], icon: 'Building2' },
  { id: 'master-crews', title: 'Crews', description: 'Manage employee crew groupings', href: '/master/crews', category: 'Master Data', keywords: ['crew', 'group', 'team'], icon: 'UsersRound' },
  { id: 'master-groups', title: 'Groups', description: 'Manage employee groups', href: '/master/groups', category: 'Master Data', keywords: ['group', 'cluster', 'category'], icon: 'Layers' },
  { id: 'master-notification-templates', title: 'Notification Templates', description: 'Email and in-app notification template content', href: '/master/notification-templates', category: 'Master Data', keywords: ['notification', 'template', 'email', 'message', 'alert'], icon: 'Bell' },

  // ── System
  { id: 'system-roles', title: 'Roles & Permissions', description: 'Manage roles, permission matrix and user access', href: '/system/roles', category: 'System', keywords: ['role', 'permission', 'access', 'rbac', 'matrix', 'user access'], icon: 'Shield' },
  { id: 'system-users', title: 'User Accounts', description: 'Manage system user accounts and status', href: '/system/users', category: 'System', keywords: ['user', 'account', 'login', 'password', 'active', 'inactive'], icon: 'UserCog' },
  { id: 'system-company-settings', title: 'Company Settings', description: 'Company profile, logo and statutory registration details', href: '/system/company-settings', category: 'System', keywords: ['company', 'settings', 'profile', 'logo', 'epf number', 'etf number'], icon: 'Building' },
  { id: 'my-profile', title: 'My Profile', description: 'Personal info, password and 2FA settings', href: '/my-profile', category: 'System', keywords: ['profile', 'password', '2fa', 'avatar', 'personal', 'account'], icon: 'UserCircle' },
]
"""

# ─────────────────────────────────────────────────────────────────────────────
FILES["src/components/GlobalSearch.tsx"] = r"""'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, LayoutDashboard, Users, UserPlus, FileText, Banknote, Gift, Minus,
  Receipt, CalendarCheck, Clock, ClipboardList, Ban, CalendarOff, LayoutTemplate,
  Play, Building2, PieChart, BarChart2, FileSpreadsheet, Printer, FileBarChart,
  FilePlus, Award, CalendarDays, AlarmClock, Timer, TrendingUp, CalendarX,
  MapPin, Network, Briefcase, Percent, Settings2, ShieldCheck, Fingerprint,
  CalendarHeart, CalendarMinus, MinusCircle, UsersRound, Layers, Bell, Shield,
  UserCog, Building, UserCircle, X, ArrowRight, ClipboardEdit,
} from 'lucide-react'
import { searchIndex, SearchItem, SearchCategory } from '@/data/searchIndex'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, UserPlus, FileText, Banknote, Gift, Minus, Receipt,
  CalendarCheck, Clock, ClipboardList, Ban, CalendarOff, LayoutTemplate, Play,
  Building2, PieChart, BarChart2, FileSpreadsheet, Printer, FileBarChart,
  FilePlus, Award, CalendarDays, AlarmClock, Timer, TrendingUp, CalendarX,
  MapPin, Network, Briefcase, Percent, Settings2, ShieldCheck, Fingerprint,
  CalendarHeart, CalendarMinus, MinusCircle, UsersRound, Layers, Bell, Shield,
  UserCog, Building, UserCircle, ClipboardEdit,
}

const categoryStyle: Record<SearchCategory, { bg: string; text: string }> = {
  Dashboard:    { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300' },
  Employees:    { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300' },
  Attendance:   { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300' },
  Leave:        { bg: 'bg-teal-100 dark:bg-teal-900/30',    text: 'text-teal-700 dark:text-teal-300' },
  Payroll:      { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  Tax:          { bg: 'bg-rose-100 dark:bg-rose-900/30',    text: 'text-rose-700 dark:text-rose-300' },
  Reports:      { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  'Master Data':{ bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  System:       { bg: 'bg-slate-100 dark:bg-slate-700/40',  text: 'text-slate-600 dark:text-slate-300' },
}

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const title = item.title.toLowerCase()
  const desc  = item.description.toLowerCase()
  const cat   = item.category.toLowerCase()
  const kw    = item.keywords.join(' ').toLowerCase()
  if (title === q) return 100
  if (title.startsWith(q)) return 90
  if (title.includes(q)) return 80
  if (kw.includes(q)) return 70
  if (desc.includes(q)) return 60
  if (cat.includes(q)) return 50
  const parts = q.split(' ').filter(Boolean)
  const allText = `${title} ${kw} ${desc} ${cat}`
  const matched = parts.filter(p => allText.includes(p)).length
  if (matched === parts.length) return 40
  if (matched > 0) return 20
  return 0
}

function runSearch(query: string): SearchItem[] {
  if (!query.trim()) return []
  return searchIndex
    .map(item => ({ item, score: scoreItem(item, query) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(x => x.item)
}

const quickAccessIds = ['dashboard', 'employees-list', 'leave-requests', 'payroll-run', 'payslips', 'attendance-logs']
const quickItems = searchIndex.filter(i => quickAccessIds.includes(i.id))

export default function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchItem[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQuery(''); setResults([]); setActiveIdx(0) }
  }, [open])

  useEffect(() => { setResults(runSearch(query)); setActiveIdx(0) }, [query])

  const displayItems = query.trim() ? results : quickItems
  const activeItem = displayItems[activeIdx] ?? null

  const navigate = useCallback((item: SearchItem) => { setOpen(false); router.push(item.href) }, [router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, displayItems.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeItem) navigate(activeItem)
  }

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm w-72 max-w-full"
        aria-label="Open search (Ctrl+K)"
      >
        <Search size={15} className="flex-shrink-0" />
        <span className="flex-1 text-left truncate">Search employees, payroll, records…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-mono">
          <span>⌘</span><span>K</span>
        </kbd>
      </button>

      {/* Palette */}
      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onMouseDown={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--color-background, white)', border: '1px solid var(--color-border, #e5e7eb)' }}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, reports, employees…"
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
              {query && <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>}
              <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono">esc</button>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
              <div className="px-4 pt-1 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  {query.trim() ? (results.length > 0 ? `${results.length} result${results.length !== 1 ? 's' : ''}` : 'No results') : 'Quick access'}
                </span>
              </div>

              {query.trim() && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No pages found for &ldquo;<strong>{query}</strong>&rdquo;
                </div>
              )}

              {displayItems.map((item, idx) => {
                const Icon = iconMap[item.icon] ?? Search
                const style = categoryStyle[item.category]
                const isActive = idx === activeIdx
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseDown={() => navigate(item)}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isActive ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                      <Icon size={15} className={style.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{item.title}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}>{item.category}</span>
                    {isActive && <ArrowRight size={14} className="flex-shrink-0 text-violet-500" />}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">↵</kbd> go</span>
              <span className="flex items-center gap-1"><kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">esc</kbd> close</span>
              <span className="ml-auto">XpayRoll Pro</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
"""

# ─────────────────────────────────────────────────────────────────────────────
def write(rel_path: str, content: str):
    full = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, 'w', encoding='utf-8') as f:
        f.write(content.lstrip('\n'))
    print(f"  ✓  {rel_path}")

print("\nXpayRoll Pro — Deploying Global Search\n")
for rel, src in FILES.items():
    write(rel, src)

print("""
Done!

Next steps
──────────
1. Open your header/topbar layout component (e.g. app/(dashboard)/layout.tsx
   or src/components/layouts/Header.tsx) and replace the existing search
   placeholder with:

     import GlobalSearch from '@/components/GlobalSearch'
     ...
     <GlobalSearch />

2. Restart the dev server:
     npm run dev

3. Test: click the search bar OR press Ctrl+K / Cmd+K.

To add more pages later, open src/data/searchIndex.ts and append a new
object to the searchIndex array — no other changes needed.
""")
