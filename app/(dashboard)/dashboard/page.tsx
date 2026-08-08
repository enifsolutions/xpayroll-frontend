'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import axios from '@/lib/axios'
import { showError } from '@/lib/toast'
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
    Users, UserCheck, UserPlus, Clock,
    CalendarCheck, CalendarX, AlertCircle,
    Banknote, TrendingUp, FileText, CreditCard,
    ChevronRight, ChevronLeft, Settings,
    GripVertical, Eye, EyeOff, X,
    ArrowUpRight, Bell, Maximize2, Minimize2,
    Square, Cake, Star, Building2, GitBranch,
} from 'lucide-react'
import { getErrorMessage } from "@/lib/apiError";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardSummary {
    totalEmployees: number; activeEmployees: number; newThisMonth: number; onProbation: number
    presentToday: number; absentToday: number; lateToday: number; onLeaveToday: number
    pendingLeaveRequests: number; approvedThisMonth: number
    lastRunPeriod: string | null; lastRunStatus: string | null
    lastRunNetPay: number; lastRunEmployeeCount: number
    activeLoans: number; totalOutstanding: number
}
interface PayrollTrend        { monthLabel: string; netPay: number; runCount: number }
interface AttTrend            { dayLabel: string; presentCt: number; absentCt: number; lateCt: number }
interface ContractExpiry      { employeeId: string; employeeCode: string; fullName: string; contractType: string; endDate: string; daysLeft: number }
interface CalendarEvent       { eventDate: string; eventType: 'holiday'|'leave'; title: string; employeeId: string|null; fullName: string|null; isOptional: boolean }
interface DeptHeadcount       { departmentId: string; departmentName: string; total: number; active: number }
interface BranchHeadcount     { branchId: string; branchName: string; isHead: boolean; total: number; active: number }
interface UpcomingBirthday    { employeeId: string; employeeCode: string; fullName: string; department: string; birthdayDate: string; daysAway: number }
interface WorkAnniversary     { employeeId: string; employeeCode: string; fullName: string; department: string; joinDate: string; years: number; daysAway: number }

// ─── Widget system ────────────────────────────────────────────────────────────
const WIDGET_IDS = [
    'kpi-row','attendance','leave','payroll-run','loans',
    'payroll-trend','att-trend','contract-expiries','calendar',
    'dept-headcount','branch-headcount','birthdays','anniversaries',
] as const
type WidgetId   = typeof WIDGET_IDS[number]
type WidgetSize = 'full' | 'half' | 'third'

const WIDGET_LABELS: Record<WidgetId, string> = {
    'kpi-row':           'Key Metrics',
    'attendance':        "Today's Attendance",
    'leave':             'Leave Summary',
    'payroll-run':       'Last Payroll Run',
    'loans':             'Active Loans',
    'payroll-trend':     'Net Pay Trend',
    'att-trend':         'Attendance Trend',
    'contract-expiries': 'Contract Expiries',
    'calendar':          'Calendar',
    'dept-headcount':    'Department Headcount',
    'branch-headcount':  'Branch Headcount',
    'birthdays':         'Upcoming Birthdays',
    'anniversaries':     'Work Anniversaries',
}

const DEFAULT_SIZES: Record<WidgetId, WidgetSize> = {
    'kpi-row':           'full',
    'attendance':        'half',
    'leave':             'half',
    'payroll-run':       'half',
    'loans':             'half',
    'payroll-trend':     'full',
    'att-trend':         'full',
    'contract-expiries': 'half',
    'calendar':          'half',
    'dept-headcount':    'half',
    'branch-headcount':  'half',
    'birthdays':         'half',
    'anniversaries':     'half',
}

const STORAGE_KEY = 'xp_dash_v5'

interface Prefs {
    order:   WidgetId[]
    visible: Record<WidgetId, boolean>
    sizes:   Record<WidgetId, WidgetSize>
}

function loadPrefs(): Prefs {
    try {
        const r = localStorage.getItem(STORAGE_KEY)
        if (r) {
            const p = JSON.parse(r) as Prefs
            const missing = WIDGET_IDS.filter(id => !p.order.includes(id))
            return {
                order:   [...p.order, ...missing],
                visible: { ...Object.fromEntries(WIDGET_IDS.map(id => [id, true])), ...p.visible } as Record<WidgetId, boolean>,
                sizes:   { ...DEFAULT_SIZES, ...p.sizes },
            }
        }
    } catch {}
    return {
        order:   [...WIDGET_IDS],
        visible: Object.fromEntries(WIDGET_IDS.map(id => [id, true])) as Record<WidgetId, boolean>,
        sizes:   { ...DEFAULT_SIZES },
    }
}
function savePrefs(p: Prefs) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt  = (n: number) => new Intl.NumberFormat('en-LK').format(n)
const fmtC = (n: number) => 'Rs. ' + new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n)
const fmtS = (n: number) => n >= 1_000_000 ? `Rs.${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `Rs.${(n/1_000).toFixed(0)}K` : `Rs.${n}`

const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#f87171','#60a5fa','#a78bfa','#34d399','#fb923c']

// ─── Layout engine ────────────────────────────────────────────────────────────
type LayoutRow = { id: WidgetId; cols: number }[]

function buildLayout(order: WidgetId[], visible: Record<WidgetId,boolean>, sizes: Record<WidgetId,WidgetSize>): LayoutRow[] {
    const toCols: Record<WidgetSize,number> = { full:12, half:6, third:4 }
    const rows: LayoutRow[] = []
    let row: LayoutRow = [], used = 0
    for (const id of order) {
        if (!visible[id]) continue
        const cols = toCols[sizes[id] ?? 'half']
        if (used + cols > 12 && row.length > 0) { rows.push(row); row=[]; used=0 }
        row.push({ id, cols }); used += cols
        if (used === 12) { rows.push(row); row=[]; used=0 }
    }
    if (row.length > 0) rows.push(row)
    return rows
}

function colsClass(cols: number) {
    if (cols === 12) return 'col-span-12'
    if (cols === 6)  return 'col-span-12 lg:col-span-6'
    if (cols === 4)  return 'col-span-12 lg:col-span-4'
    return 'col-span-12'
}

// ─── Drag wrapper ─────────────────────────────────────────────────────────────
function DragWrap({ id, onStart, onEnter, onEnd, children }: {
    id: WidgetId; onStart:(id:WidgetId)=>void; onEnter:(id:WidgetId)=>void; onEnd:()=>void
    children:(grip:React.HTMLAttributes<HTMLSpanElement>)=>React.ReactNode
}) {
    const [dragging, setDragging] = useState(false)
    const [over,     setOver]     = useState(false)
    const grip: React.HTMLAttributes<HTMLSpanElement> = {
        draggable: true,
        onDragStart: e => { e.stopPropagation(); e.dataTransfer.setData('text/plain',id); e.dataTransfer.effectAllowed='move'; setDragging(true); onStart(id) },
        onDragEnd:   e => { e.stopPropagation(); setDragging(false); setOver(false); onEnd() },
    }
    return (
        <div
            onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect='move' }}
            onDragEnter={e=>{ e.preventDefault(); setOver(true); onEnter(id) }}
            onDragLeave={e=>{ e.preventDefault(); setOver(false) }}
            onDrop={e=>{ e.preventDefault(); setOver(false) }}
            className={`h-full transition-all duration-150 ${dragging?'opacity-40 scale-[0.98]':''} ${over&&!dragging?'ring-2 ring-indigo-400 rounded-2xl':''}`}
        >{children(grip)}</div>
    )
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────
const Skel = ({ h='h-32' }: { h?: string }) => <div className={`animate-pulse rounded-2xl bg-gray-100 dark:!bg-[#122131] ${h}`} />
const Grip = (p: React.HTMLAttributes<HTMLSpanElement>) => (
    <span {...p} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 select-none touch-none shrink-0"><GripVertical size={15} /></span>
)
function WCard({ children, cls='' }: { children: React.ReactNode; cls?: string }) {
    return <div className={`bg-white dark:bg-[#0d1c2d] rounded-2xl shadow-sm border border-gray-100 dark:border-[#273647] overflow-hidden h-full [.dark_&]:!bg-[#0d1c2d] ${cls}`}>{children}</div>
}
function WHead({ title, href, router, grip }: { title:string; href?:string; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
                {grip && <Grip {...grip} />}
                <span className="font-semibold text-gray-700 dark:text-gray-100 text-sm">{title}</span>
            </div>
            {href && <button onClick={()=>router.push(href)} className="flex items-center gap-0.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium">View all <ArrowUpRight size={12} /></button>}
        </div>
    )
}

// Avatar initials helper
function Avatar({ name, size='sm', color='indigo' }: { name:string; size?:'sm'|'md'; color?:string }) {
    const initials = name.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()
    const sz = size==='md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
    return (
        <div className={`${sz} rounded-full bg-${color}-100 dark:bg-${color}-900/40 flex items-center justify-center shrink-0 font-bold text-${color}-600`}>
            {initials}
        </div>
    )
}

// Days away pill
function DaysPill({ days }: { days: number }) {
    if (days === 0) return <span className="xp-badge xp-badge-success text-xs">Today! 🎉</span>
    if (days === 1) return <span className="xp-badge xp-badge-warning text-xs">Tomorrow</span>
    return <span className="xp-badge xp-badge-info text-xs">{days}d</span>
}

// ════════════════════════════════════════════════════════════════════════════════
// EXISTING WIDGETS
// ════════════════════════════════════════════════════════════════════════════════

function KpiRow({ d, loading, router, grip }: { d:DashboardSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const cards = [
        { label:'Total Employees', value:fmt(d?.totalEmployees??0),   sub:`${d?.activeEmployees??0} active`,                                    icon:<Users size={20}/>,       color:'from-indigo-500 to-indigo-600', light:'bg-indigo-50 text-indigo-600',  href:'/employees' },
        { label:'Present Today',   value:fmt(d?.presentToday??0),     sub:d?`${Math.round(((d.presentToday)/(d.activeEmployees||1))*100)}% workforce`:'', icon:<CalendarCheck size={20}/>, color:'from-emerald-500 to-emerald-600', light:'bg-emerald-50 text-emerald-600', href:'/transactions/attendance-logs' },
        { label:'Pending Leave',   value:fmt(d?.pendingLeaveRequests??0), sub:`${d?.approvedThisMonth??0} approved this month`,                icon:<AlertCircle size={20}/>, color:'from-amber-400 to-orange-500',   light:'bg-amber-50 text-amber-600',   href:'/transactions/leave-requests' },
        { label:'Last Net Pay',    value:fmtS(d?.lastRunNetPay??0),   sub:d?.lastRunPeriod??'No run yet',                                       icon:<Banknote size={20}/>,    color:'from-violet-500 to-purple-600', light:'bg-violet-50 text-violet-600', href:'/transactions/payroll-runs' },
        { label:'Active Loans',    value:fmt(d?.activeLoans??0),      sub:`${fmtS(d?.totalOutstanding??0)} outstanding`,                        icon:<CreditCard size={20}/>,  color:'from-rose-400 to-pink-600',     light:'bg-rose-50 text-rose-500',     href:null },
        { label:'New This Month',  value:fmt(d?.newThisMonth??0),     sub:`${d?.onProbation??0} on probation`,                                  icon:<UserPlus size={20}/>,    color:'from-sky-400 to-cyan-500',      light:'bg-sky-50 text-sky-500',       href:'/employees' },
    ]
    return (
        <div className="bg-white dark:bg-[#0d1c2d] rounded-2xl shadow-sm border border-gray-100 dark:border-[#273647] p-5 [.dark_&]:!bg-[#0d1c2d]">
            <div className="flex items-center gap-2 mb-4">{grip && <Grip {...grip} />}<span className="font-semibold text-gray-700 dark:text-gray-100 text-sm">Key Metrics</span></div>
            {loading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{Array.from({length:6}).map((_,i)=><Skel key={i} h="h-24"/>)}</div> : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                    {cards.map(c=>(
                        <div key={c.label} onClick={()=>c.href&&router.push(c.href)} className={`relative rounded-xl p-4 overflow-hidden group xp-metric-card-bg ${c.href?'cursor-pointer':''}`}>
                            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${c.color}`}/>
                            <div className={`inline-flex p-2 rounded-lg mb-3 ${c.light}`}>{c.icon}</div>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white leading-none">{c.value}</p>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-1">{c.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{c.sub}</p>
                            {c.href && <ArrowUpRight size={13} className="absolute top-3 right-3 text-gray-300 group-hover:text-indigo-400 transition-colors"/>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function AttendanceWidget({ d, loading, router, grip }: { d:DashboardSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const total    = d?.activeEmployees||1
    const segments = [
        { label:'Present',  value:d?.presentToday??0,  color:'#10b981', bg:'bg-emerald-500' },
        { label:'Absent',   value:d?.absentToday??0,   color:'#f87171', bg:'bg-red-400'     },
        { label:'Late',     value:d?.lateToday??0,     color:'#fbbf24', bg:'bg-amber-400'   },
        { label:'On Leave', value:d?.onLeaveToday??0,  color:'#60a5fa', bg:'bg-blue-400'    },
    ]
    return (
        <WCard>
            <WHead title="Today's Attendance" href="/transactions/attendance-logs" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-48"/> : (
                    <>
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width={110} height={110}>
                                <PieChart><Pie data={segments.map(s=>({name:s.label,value:s.value||0.01}))} innerRadius={32} outerRadius={52} paddingAngle={2} dataKey="value" startAngle={90} endAngle={-270}>{segments.map((s,i)=><Cell key={i} fill={s.color}/>)}</Pie></PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                                {segments.map(s=>(
                                    <div key={s.label} className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${s.bg}`}/>
                                        <div><p className="text-xs text-gray-400">{s.label}</p><p className="text-lg font-bold text-gray-800 dark:text-white leading-tight">{s.value}</p></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 flex rounded-full overflow-hidden h-1.5 gap-px">
                            {segments.map(s=><div key={s.label} style={{width:`${Math.round((s.value/total)*100)}%`,background:s.color}}/>)}
                            <div className="flex-1 bg-gray-100 dark:bg-[#1c2b3c]"/>
                        </div>
                    </>
                )}
            </div>
        </WCard>
    )
}

function LeaveWidget({ d, loading, router, grip }: { d:DashboardSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const rows = [
        { label:'Pending Requests', sub:'Awaiting action', value:d?.pendingLeaveRequests??0, color:'text-amber-600', from:'from-amber-50 to-orange-50', border:'border-amber-100', icon:<AlertCircle size={16} className="text-amber-600"/>, iconBg:'bg-amber-100', href:'/transactions/leave-requests' },
        { label:'Approved This Month', sub:'Current month', value:d?.approvedThisMonth??0, color:'text-emerald-600', from:'from-emerald-50 to-teal-50', border:'border-emerald-100', icon:<CalendarCheck size={16} className="text-emerald-600"/>, iconBg:'bg-emerald-100', href:null },
        { label:'On Leave Today', sub:'Currently away', value:d?.onLeaveToday??0, color:'text-blue-600', from:'from-blue-50 to-indigo-50', border:'border-blue-100', icon:<Clock size={16} className="text-blue-600"/>, iconBg:'bg-blue-100', href:null },
    ]
    return (
        <WCard>
            <WHead title="Leave Summary" href="/transactions/leave-requests" router={router} grip={grip}/>
            <div className="px-5 pb-5 space-y-3">
                {loading ? <><Skel h="h-14"/><Skel h="h-14"/><Skel h="h-14"/></> : rows.map(row=>(
                    <div key={row.label} onClick={()=>row.href&&router.push(row.href)} className={`flex items-center justify-between p-3 rounded-xl bg-gradient-to-r ${row.from} dark:from-gray-800/40 dark:to-gray-800/40 border ${row.border} dark:border-gray-700 ${row.href?'cursor-pointer hover:shadow-sm':''} transition-shadow`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 ${row.iconBg} dark:bg-white/10 rounded-lg`}>{row.icon}</div>
                            <div><p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{row.label}</p><p className="text-xs text-gray-400">{row.sub}</p></div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-2xl font-bold ${row.color}`}>{row.value}</span>
                            {row.href && <ChevronRight size={14} className="text-gray-400"/>}
                        </div>
                    </div>
                ))}
            </div>
        </WCard>
    )
}

function PayrollRunWidget({ d, loading, router, grip }: { d:DashboardSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Last Payroll Run" href="/transactions/payroll-runs" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : !d?.lastRunPeriod ? (
                    <div className="text-center py-8 text-gray-300"><Banknote size={36} className="mx-auto mb-2"/><p className="text-sm">No completed run yet</p></div>
                ) : (
                    <>
                        <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 dark:from-indigo-950 dark:to-violet-950 dark:border dark:border-indigo-800/50 p-4 mb-4 text-white dark:text-indigo-200">
                            <p className="text-xs text-indigo-200 mb-1">Net Pay</p>
                            <p className="text-2xl font-bold">{fmtC(d.lastRunNetPay)}</p>
                            <p className="text-xs text-indigo-200 mt-1">{d.lastRunPeriod}</p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-50 dark:border-gray-800">
                                <span className="text-xs text-gray-400">Status</span>
                                <span className={`xp-badge ${d.lastRunStatus==='Approved'?'xp-badge-success':'xp-badge-info'} text-xs`}>{d.lastRunStatus}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-xs text-gray-400">Employees covered</span>
                                <span className="font-semibold text-gray-800 dark:text-white text-sm">{fmt(d.lastRunEmployeeCount)}</span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </WCard>
    )
}

function LoansWidget({ d, loading, router, grip }: { d:DashboardSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Active Loans" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-40"/> : (
                    <>
                        <div className="rounded-xl bg-gradient-to-br from-rose-400 to-pink-600 dark:from-rose-950 dark:to-pink-950 dark:border dark:border-rose-800/50 p-4 mb-4 text-white dark:text-rose-200">
                            <p className="text-xs text-rose-200 mb-1">Total Outstanding</p>
                            <p className="text-2xl font-bold">{fmtC(d?.totalOutstanding??0)}</p>
                            <p className="text-xs text-rose-200 mt-1">Across all active loans</p>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <div className="p-2 bg-white dark:bg-[#1c2b3c] rounded-lg shadow-sm"><CreditCard size={16} className="text-rose-500"/></div>
                            <div><p className="text-xs text-gray-400">Active Loans</p><p className="text-lg font-bold text-gray-800 dark:text-white">{fmt(d?.activeLoans??0)}</p></div>
                        </div>
                    </>
                )}
            </div>
        </WCard>
    )
}

function PayrollTrendWidget({ trend, loading, router, grip }: { trend:PayrollTrend[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Monthly Net Pay Trend" href="/transactions/payroll-runs" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : trend.length===0 ? (
                    <div className="text-center py-12 text-gray-300"><TrendingUp size={36} className="mx-auto mb-2"/><p className="text-sm">No payroll data yet</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={trend} margin={{top:4,right:4,left:0,bottom:0}} barCategoryGap="30%">
                            <defs><linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                            <XAxis dataKey="monthLabel" tick={{fill:"#8d90a0"}} axisLine={{stroke:"#273647"}} tickLine={false} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                            <YAxis tickFormatter={fmtS} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} width={68}/>
                            <Tooltip formatter={(v:number)=>[fmtC(v),'Net Pay']} contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}} cursor={{fill:'rgba(99,102,241,0.06)'}}/>
                            <Bar dataKey="netPay" fill="url(#barGrad)" radius={[6,6,0,0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function AttTrendWidget({ trend, loading, router, grip }: { trend:AttTrend[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Attendance Trend — Last 30 Days" href="/transactions/attendance-logs" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : trend.length===0 ? (
                    <div className="text-center py-12 text-gray-300"><CalendarCheck size={36} className="mx-auto mb-2"/><p className="text-sm">No attendance data yet</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={trend} margin={{top:4,right:4,left:0,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                            <XAxis dataKey="dayLabel" tick={{fill:"#8d90a0"}} axisLine={{stroke:"#273647"}} tickLine={false} tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} interval={4}/>
                            <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                            <Tooltip contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}}/>
                            <Line type="monotone" dataKey="presentCt" name="Present" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                            <Line type="monotone" dataKey="absentCt"  name="Absent"  stroke="#f87171" strokeWidth={2}   dot={false} activeDot={{r:4}}/>
                            <Line type="monotone" dataKey="lateCt"    name="Late"    stroke="#fbbf24" strokeWidth={2}   dot={false} activeDot={{r:4}}/>
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function ContractExpiriesWidget({ expiries, loading, router, grip }: { expiries:ContractExpiry[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Upcoming Contract Expiries" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : expiries.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><FileText size={36} className="mx-auto mb-2"/><p className="text-sm">No contracts expiring in 60 days</p></div>
                ) : (
                    <div className="space-y-2">
                        {expiries.map(e=>{
                            const urgency = e.daysLeft<=14?'bg-red-50 border-red-100':e.daysLeft<=30?'bg-amber-50 border-amber-100':'bg-gray-50 border-gray-100'
                            const badge   = e.daysLeft<=14?'xp-badge-danger':e.daysLeft<=30?'xp-badge-warning':'xp-badge-info'
                            return (
                                <div key={e.employeeId} onClick={()=>router.push(`/employees/${e.employeeId}`)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${urgency}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={e.fullName}/>
                                        <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{e.fullName}</p><p className="text-xs text-gray-400">{e.contractType} · {new Date(e.endDate).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'})}</p></div>
                                    </div>
                                    <span className={`xp-badge ${badge} shrink-0 ml-2`}>{e.daysLeft}d</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function CalendarWidget({ events, year, month, onNavigate, loading, router, grip }: { events:CalendarEvent[]; year:number; month:number; onNavigate:(y:number,m:number)=>void; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const today      = new Date()
    const isToday    = (d:number) => today.getFullYear()===year && today.getMonth()+1===month && today.getDate()===d
    const firstDay   = new Date(year,month-1,1).getDay()
    const daysInMonth= new Date(year,month,0).getDate()
    const monthName  = new Date(year,month-1,1).toLocaleString('en-LK',{month:'long',year:'numeric'})
    const [selected, setSelected] = React.useState<number|null>(null)
    const eventMap   = new Map<number,CalendarEvent[]>()
    events.forEach(e=>{ const d=new Date(e.eventDate).getDate(); if(!eventMap.has(d))eventMap.set(d,[]); eventMap.get(d)!.push(e) })
    const prev = ()=>{ const d=month===1?{y:year-1,m:12}:{y:year,m:month-1}; onNavigate(d.y,d.m); setSelected(null) }
    const next = ()=>{ const d=month===12?{y:year+1,m:1}:{y:year,m:month+1}; onNavigate(d.y,d.m); setSelected(null) }
    const selEvents  = selected?(eventMap.get(selected)??[]):[]
    return (
        <WCard>
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">{grip&&<Grip {...grip}/>}<span className="font-semibold text-gray-700 dark:text-gray-100 text-sm">Calendar</span></div>
                <div className="flex items-center gap-1">
                    <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:!bg-[#122131] text-gray-500"><ChevronLeft size={15}/></button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[130px] text-center">{monthName}</span>
                    <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:!bg-[#122131] text-gray-500"><ChevronRight size={15}/></button>
                </div>
            </div>
            <div className="px-4 pb-2">
                <div className="grid grid-cols-7 mb-1">{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}</div>
                {loading?<Skel h="h-48"/>:(
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                        {Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>{
                            const dayEvents=eventMap.get(d)??[]; const hasH=dayEvents.some(e=>e.eventType==='holiday'); const hasL=dayEvents.some(e=>e.eventType==='leave'); const lCount=dayEvents.filter(e=>e.eventType==='leave').length
                            const isTod=isToday(d); const isSel=selected===d; const dow=(firstDay+d-1)%7; const isWe=dow===0||dow===6; const hasEv=dayEvents.length>0
                            return (
                                <div key={d} onClick={()=>setSelected(hasEv?(isSel?null:d):null)} className={['relative flex flex-col items-center pt-1.5 pb-2 rounded-xl transition-all text-sm select-none',hasEv?'cursor-pointer':'',isTod?'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200':'',isSel&&!isTod?'bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300':'',!isTod&&!isSel&&isWe?'text-red-400':'',!isTod&&!isSel&&!isWe?'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:!bg-[#122131]/40':''].filter(Boolean).join(' ')}>
                                    <span className="leading-none">{d}</span>
                                    <div className="flex gap-0.5 mt-1 h-1.5 items-center">
                                        {hasH&&<span className={`w-1.5 h-1.5 rounded-full ${isTod?'bg-yellow-300':'bg-amber-400'}`}/>}
                                        {hasL&&<span className={`w-1.5 h-1.5 rounded-full ${isTod?'bg-green-300':'bg-emerald-400'}`}/>}
                                        {hasL&&lCount>1&&<span className={`text-[8px] font-bold leading-none ${isTod?'text-green-300':'text-emerald-500'}`}>+{lCount-1}</span>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            <div className="flex items-center gap-4 px-5 py-2 border-t border-gray-50 dark:border-gray-800">
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Holiday</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>On Leave</span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400"><span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"/>Today</span>
            </div>
            {selected&&selEvents.length>0&&(
                <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{new Date(year,month-1,selected).toLocaleDateString('en-LK',{weekday:'long',day:'numeric',month:'long'})}</p>
                        <button onClick={()=>setSelected(null)} className="text-gray-400 hover:text-gray-600"><X size={13}/></button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-40 overflow-y-auto">
                        {selEvents.map((e,i)=>(
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-900">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${e.eventType==='holiday'?'bg-amber-400':'bg-emerald-400'}`}/>
                                <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{e.title}</p><p className="text-xs text-gray-400">{e.eventType==='holiday'?(e.isOptional?'Optional holiday':'Public holiday'):'On approved leave'}</p></div>
                                {e.eventType==='leave'&&e.employeeId&&<button onClick={ev=>{ev.stopPropagation();router.push(`/employees/${e.employeeId}`)}} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium shrink-0">View →</button>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </WCard>
    )
}

// ════════════════════════════════════════════════════════════════════════════════
// NEW WIDGETS
// ════════════════════════════════════════════════════════════════════════════════

function DeptHeadcountWidget({ data, loading, router, grip }: { data:DeptHeadcount[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Department Headcount" href="/employees" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Building2 size={36} className="mx-auto mb-2"/><p className="text-sm">No departments found</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
                        <BarChart data={data} layout="vertical" margin={{top:0,right:48,left:0,bottom:0}} barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                            <XAxis type="number" tick={{fill:"#8d90a0"}} axisLine={{stroke:"#273647"}} tickLine={false} tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                            <YAxis type="category" dataKey="departmentName" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false} width={110}/>
                            <Tooltip contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}} cursor={{fill:'rgba(99,102,241,0.06)'}}/>
                            <Bar dataKey="active" name="Active" fill="#6366f1" radius={[0,6,6,0]} label={{position:'right',fontSize:11,fill:'#6366f1',fontWeight:600}}/>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function BranchHeadcountWidget({ data, loading, router, grip }: { data:BranchHeadcount[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const pieData = data.map(b=>({ name: b.branchName, value: b.active }))
    const total   = data.reduce((s,b)=>s+b.active,0)
    return (
        <WCard>
            <WHead title="Branch Headcount" href="/employees" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><GitBranch size={36} className="mx-auto mb-2"/><p className="text-sm">No branches found</p></div>
                ) : (
                    <div className="flex items-center gap-4">
                        {/* Donut */}
                        <div className="shrink-0 relative">
                            <ResponsiveContainer width={140} height={140}>
                                <PieChart>
                                    <Pie data={pieData} innerRadius={42} outerRadius={65} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                                        {pieData.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-2xl font-bold text-gray-800 dark:text-white leading-none">{total}</p>
                                <p className="text-xs text-gray-400">Total</p>
                            </div>
                        </div>
                        {/* Legend list */}
                        <div className="flex-1 space-y-2 min-w-0">
                            {data.map((b,i)=>(
                                <div key={b.branchId} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:CHART_COLORS[i%CHART_COLORS.length]}}/>
                                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{b.branchName}{b.isHead&&<span className="ml-1 text-indigo-400 text-[10px]">HQ</span>}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-xs font-bold text-gray-800 dark:text-white">{b.active}</span>
                                        <span className="text-xs text-gray-400">({total>0?Math.round((b.active/total)*100):0}%)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </WCard>
    )
}

function BirthdaysWidget({ data, loading, router, grip }: { data:UpcomingBirthday[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Upcoming Birthdays" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300">
                        <Cake size={36} className="mx-auto mb-2"/>
                        <p className="text-sm">No birthdays in the next 30 days</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(b=>(
                            <div key={b.employeeId} onClick={()=>router.push(`/employees/${b.employeeId}`)}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative">
                                        <Avatar name={b.fullName} color="pink"/>
                                        {b.daysAway===0&&<span className="absolute -top-1 -right-1 text-sm">🎂</span>}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{b.fullName}</p>
                                        <p className="text-xs text-gray-400 truncate">{b.department}</p>
                                    </div>
                                </div>
                                <DaysPill days={b.daysAway}/>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function AnniversariesWidget({ data, loading, router, grip }: { data:WorkAnniversary[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    // Milestone colors
    const milestoneColor = (years: number) => {
        if (years >= 10) return { badge:'bg-amber-100 text-amber-700 border-amber-200', icon:'🏆' }
        if (years >= 5)  return { badge:'bg-purple-100 text-purple-700 border-purple-200', icon:'⭐' }
        if (years >= 3)  return { badge:'bg-indigo-100 text-indigo-700 border-indigo-200', icon:'🎖️' }
        return                  { badge:'bg-emerald-100 text-emerald-700 border-emerald-200', icon:'🎉' }
    }
    return (
        <WCard>
            <WHead title="Work Anniversaries" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300">
                        <Star size={36} className="mx-auto mb-2"/>
                        <p className="text-sm">No anniversaries in the next 30 days</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(a=>{
                            const m = milestoneColor(a.years)
                            return (
                                <div key={a.employeeId} onClick={()=>router.push(`/employees/${a.employeeId}`)}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar name={a.fullName} color="indigo"/>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{a.fullName}</p>
                                            <p className="text-xs text-gray-400 truncate">{a.department}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${m.badge}`}>
                                            {m.icon} {a.years}yr
                                        </span>
                                        <DaysPill days={a.daysAway}/>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </WCard>
    )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
const SIZE_OPTS: { size:WidgetSize; icon:React.ReactNode; label:string }[] = [
    { size:'third', icon:<Square size={11}/>,    label:'1/3' },
    { size:'half',  icon:<Minimize2 size={11}/>, label:'1/2' },
    { size:'full',  icon:<Maximize2 size={11}/>, label:'Full' },
]

function SettingsPanel({ prefs, onToggle, onResize, onClose }: { prefs:Prefs; onToggle:(id:WidgetId)=>void; onResize:(id:WidgetId,s:WidgetSize)=>void; onClose:()=>void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
            <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose}/>
            <div className="relative z-10 w-80 bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div><p className="font-semibold text-gray-800 dark:text-white text-sm">Customise Dashboard</p><p className="text-xs text-gray-400 mt-0.5">Toggle, resize, and drag to reorder</p></div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:!bg-[#122131] text-gray-500"><X size={16}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {prefs.order.map(id=>(
                        <div key={id} className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 dark:hover:!bg-[#122131]/40">
                                <div className="flex items-center gap-2"><GripVertical size={14} className="text-gray-300"/><span className="text-sm text-gray-700 dark:text-gray-200">{WIDGET_LABELS[id]}</span></div>
                                <button onClick={()=>onToggle(id)} className={`p-1.5 rounded-lg transition-colors ${prefs.visible[id]?'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30':'text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    {prefs.visible[id]?<Eye size={15}/>:<EyeOff size={15}/>}
                                </button>
                            </div>
                            {prefs.visible[id]&&(
                                <div className="flex border-t border-gray-50 dark:border-gray-800">
                                    {SIZE_OPTS.map(opt=>(
                                        <button key={opt.size} onClick={()=>onResize(id,opt.size)} className={['flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',prefs.sizes[id]===opt.size?'bg-indigo-500 text-white':'text-gray-400 hover:bg-gray-50 dark:hover:!bg-[#122131]/60 hover:text-gray-600'].join(' ')}>
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                    <button onClick={onClose} className="btn btn-solid btn-sm w-full">Done</button>
                </div>
            </div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const router      = useRouter()
    const initialized = useRef(false)
    const dragSrc     = useRef<WidgetId|null>(null)

    const [summary,      setSummary]      = useState<DashboardSummary|null>(null)
    const [payTrend,     setPayTrend]     = useState<PayrollTrend[]>([])
    const [attTrend,     setAttTrend]     = useState<AttTrend[]>([])
    const [expiries,     setExpiries]     = useState<ContractExpiry[]>([])
    const [calEvents,    setCalEvents]    = useState<CalendarEvent[]>([])
    const [deptHc,       setDeptHc]       = useState<DeptHeadcount[]>([])
    const [branchHc,     setBranchHc]     = useState<BranchHeadcount[]>([])
    const [birthdays,    setBirthdays]    = useState<UpcomingBirthday[]>([])
    const [anniversaries,setAnniversaries]= useState<WorkAnniversary[]>([])
    const [calYear,      setCalYear]      = useState(()=>new Date().getFullYear())
    const [calMonth,     setCalMonth]     = useState(()=>new Date().getMonth()+1)
    const [loading,      setLoading]      = useState(true)
    const [prefs,        setPrefs]        = useState<Prefs>(()=>loadPrefs())
    const [showSettings, setShowSettings] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [s,pt,at,ex,cal,dh,bh,bd,an] = await Promise.all([
                axios.get('/dashboard/summary'),
                axios.get('/dashboard/payroll-trend?months=6'),
                axios.get('/dashboard/attendance-trend?days=30'),
                axios.get('/dashboard/contract-expiries?days=60'),
                axios.get(`/dashboard/calendar-events?year=${calYear}&month=${calMonth}`),
                axios.get('/dashboard/department-headcount'),
                axios.get('/dashboard/branch-headcount'),
                axios.get('/dashboard/upcoming-birthdays?days=30'),
                axios.get('/dashboard/work-anniversaries?days=30'),
            ])
            setSummary(s.data); setPayTrend(pt.data); setAttTrend(at.data)
            setExpiries(ex.data); setCalEvents(cal.data)
            setDeptHc(dh.data); setBranchHc(bh.data)
            setBirthdays(bd.data); setAnniversaries(an.data)
        } catch (err){ 
            showError('Failed to load dashboard', getErrorMessage(err, "Failed to load dashboard.")) 
        }
        finally  { setLoading(false) }
    }, [calYear, calMonth])

    useEffect(()=>{ if(initialized.current)return; initialized.current=true; load() },[load])
    useEffect(()=>{ savePrefs(prefs) },[prefs])

    const navigateCal = useCallback(async (year:number, month:number) => {
        setCalYear(year); setCalMonth(month)
        try {
          const res = await axios.get(
            `/dashboard/calendar-events?year=${year}&month=${month}`,
          );
          setCalEvents(res.data);
        } catch (err) {
          showError(
            "Failed to load calender events",
            getErrorMessage(err, "Failed to load calendar events."),
          );
        }
    },[])

    const toggleWidget = (id:WidgetId) => setPrefs(p=>({...p,visible:{...p.visible,[id]:!p.visible[id]}}))
    const resizeWidget = (id:WidgetId,size:WidgetSize) => setPrefs(p=>({...p,sizes:{...p.sizes,[id]:size}}))

    const handleDragStart = useCallback((id:WidgetId)=>{ dragSrc.current=id },[])
    const handleDragEnter = useCallback((id:WidgetId)=>{
        const src=dragSrc.current; if(!src||src===id)return
        setPrefs(p=>{ const o=[...p.order],fi=o.indexOf(src),ti=o.indexOf(id); if(fi<0||ti<0)return p; o.splice(fi,1); o.splice(ti,0,src); return {...p,order:o} })
    },[])
    const handleDragEnd = useCallback(()=>{ dragSrc.current=null },[])

    const now=new Date(); const hour=now.getHours()
    const greeting=hour<12?'Good morning':hour<17?'Good afternoon':'Good evening'

    const renderContent = (id:WidgetId, grip:React.HTMLAttributes<HTMLSpanElement>) => {
        switch(id) {
            case 'kpi-row':           return <KpiRow                 d={summary}     loading={loading} router={router} grip={grip}/>
            case 'attendance':        return <AttendanceWidget        d={summary}     loading={loading} router={router} grip={grip}/>
            case 'leave':             return <LeaveWidget             d={summary}     loading={loading} router={router} grip={grip}/>
            case 'payroll-run':       return <PayrollRunWidget        d={summary}     loading={loading} router={router} grip={grip}/>
            case 'loans':             return <LoansWidget             d={summary}     loading={loading} router={router} grip={grip}/>
            case 'payroll-trend':     return <PayrollTrendWidget      trend={payTrend}  loading={loading} router={router} grip={grip}/>
            case 'att-trend':         return <AttTrendWidget          trend={attTrend}  loading={loading} router={router} grip={grip}/>
            case 'contract-expiries': return <ContractExpiriesWidget  expiries={expiries} loading={loading} router={router} grip={grip}/>
            case 'calendar':          return <CalendarWidget          events={calEvents} year={calYear} month={calMonth} onNavigate={navigateCal} loading={loading} router={router} grip={grip}/>
            case 'dept-headcount':    return <DeptHeadcountWidget     data={deptHc}   loading={loading} router={router} grip={grip}/>
            case 'branch-headcount':  return <BranchHeadcountWidget   data={branchHc} loading={loading} router={router} grip={grip}/>
            case 'birthdays':         return <BirthdaysWidget         data={birthdays} loading={loading} router={router} grip={grip}/>
            case 'anniversaries':     return <AnniversariesWidget     data={anniversaries} loading={loading} router={router} grip={grip}/>
        }
    }

    const layout = buildLayout(prefs.order, prefs.visible, prefs.sizes)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            {/* Welcome banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 dark:from-indigo-950 dark:via-indigo-900 dark:to-violet-950 px-8 py-8">
                <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-white/5"/>
                <div className="absolute top-4 right-32 w-32 h-32 rounded-full bg-white/5"/>
                <div className="absolute -bottom-16 right-10 w-48 h-48 rounded-full bg-white/5"/>
                <div className="relative flex items-center justify-between">
                    <div>
                        <p className="text-indigo-200 text-sm mb-1">{greeting} 👋</p>
                        <h2 className="text-white font-bold text-2xl">Welcome back</h2>
                        <p className="text-indigo-300 text-sm mt-1">{now.toLocaleDateString('en-LK',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
                        {!loading&&summary&&summary.pendingLeaveRequests>0&&(
                            <div onClick={()=>router.push('/transactions/leave-requests')} className="mt-3 inline-flex items-center gap-2 bg-white/15 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full cursor-pointer transition-colors">
                                <Bell size={13}/>You have <strong>{summary.pendingLeaveRequests}</strong> pending leave {summary.pendingLeaveRequests===1?'request':'requests'}<ChevronRight size={12}/>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} disabled={loading} className="bg-white/15 hover:bg-white/25 text-white text-xs px-4 py-2 rounded-xl transition-colors font-medium">{loading?'Loading…':'Refresh'}</button>
                        <button onClick={()=>setShowSettings(true)} className="bg-white/15 hover:bg-white/25 text-white text-xs px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-1.5"><Settings size={13}/> Widgets</button>
                    </div>
                </div>
            </div>

            {/* Widget grid */}
            <div className="p-6 space-y-4">
                {layout.map((row,ri)=>(
                    <div key={ri} className="grid grid-cols-12 gap-4 items-stretch">
                        {row.map(({id,cols})=>(
                            <div key={id} className={`${colsClass(cols)} h-full`}>
                                <DragWrap id={id} onStart={handleDragStart} onEnter={handleDragEnter} onEnd={handleDragEnd}>
                                    {grip=>renderContent(id,grip)}
                                </DragWrap>
                            </div>
                        ))}
                    </div>
                ))}
                {layout.length===0&&(
                    <div className="text-center py-24 text-gray-400">
                        <EyeOff size={44} className="mx-auto mb-3 opacity-30"/>
                        <p className="text-sm font-medium">All widgets are hidden</p>
                        <button onClick={()=>setShowSettings(true)} className="btn btn-default btn-sm mt-4">Manage Widgets</button>
                    </div>
                )}
            </div>

            {showSettings&&<SettingsPanel prefs={prefs} onToggle={toggleWidget} onResize={resizeWidget} onClose={()=>setShowSettings(false)}/>}
        </div>
    )
}
