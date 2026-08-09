#!/usr/bin/env python3
"""
XpayRoll - Recruitment Dashboard Widgets - Frontend Patch
Run from: ~/My Files/XpayRoll/xpayroll-frontend
    python3 add_recruitment_widgets.py
"""
import sys

PATH = "app/(dashboard)/dashboard/page.tsx"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

replacements = []  # list of (old, new, label)

# ─────────────────────────────────────────────────────────────────────────
# 1. Icons import
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""    Square, Cake, Star, Building2, GitBranch,
} from 'lucide-react'""",
"""    Square, Cake, Star, Building2, GitBranch,
    Briefcase, Send, Target, ListChecks,
} from 'lucide-react'""",
    "icons import"
))

# ─────────────────────────────────────────────────────────────────────────
# 2. New interfaces (after WorkAnniversary interface line)
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""interface WorkAnniversary     { employeeId: string; employeeCode: string; fullName: string; department: string; joinDate: string; years: number; daysAway: number }""",
"""interface WorkAnniversary     { employeeId: string; employeeCode: string; fullName: string; department: string; joinDate: string; years: number; daysAway: number }

// -- Recruitment --
interface RecruitmentSummary { openRequisitionsCount: number; activePipelineCount: number; offersPendingCount: number; hiresThisMonthCount: number; avgMatchScore: number | null; avgTimeToHireDays: number | null }
interface AppTrendPoint      { applicationDate: string; applicationsCount: number }
interface FunnelRow          { stage: string; reachedCount: number; pctOfApplied: number; dropOffPct: number | null }
interface SourceEffRow       { source: string; applications: number; interviewed: number; offered: number; hired: number; conversionPct: number }
interface ReqAgingRow        { requisitionCode: string; title: string; department: string; branch: string; status: string; createdDate: string; openedDate: string | null; daysOpen: number; headcount: number; headcountFilled: number; headcountRemaining: number; targetStartDate: string | null }
interface DiversityRow       { department: string; stage: string; male: number | null; female: number | null; other: number | null; preferNotToSay: number | null; total: number }
interface StaleRequisition   { id: string; requisitionCode: string; title: string; departmentId: string | null; branchId: string | null; daysOpen: number; targetStartDate: string | null; status: string }
interface UpcomingInterview  { id: string; applicationId: string; candidateName: string; requisitionTitle: string; roundName: string | null; interviewType: string; scheduledStart: string; status: string }
interface OfferAwaiting      { id: string; applicationId: string; candidateName: string; designationId: string | null; salaryOffered: number; sentAt: string | null; expiryDate: string | null }
interface TopCandidate       { applicationId: string; candidateId: string; candidateName: string; requisitionTitle: string; aiMatchScore: number; stage: string }
interface RecentHire         { applicationId: string; candidateName: string; requisitionTitle: string; hiredEmployeeId: string; hiredAt: string }""",
    "new interfaces"
))

# ─────────────────────────────────────────────────────────────────────────
# 3. WIDGET_IDS
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""const WIDGET_IDS = [
    'kpi-row','attendance','leave','payroll-run','loans',
    'payroll-trend','att-trend','contract-expiries','calendar',
    'dept-headcount','branch-headcount','birthdays','anniversaries',
] as const""",
"""const WIDGET_IDS = [
    'kpi-row','attendance','leave','payroll-run','loans',
    'payroll-trend','att-trend','contract-expiries','calendar',
    'dept-headcount','branch-headcount','birthdays','anniversaries',
    'rec-kpi-row','rec-applications-trend','rec-funnel','rec-source-effectiveness',
    'rec-requisition-aging','rec-diversity-snapshot','rec-stale-requisitions',
    'rec-upcoming-interviews','rec-offers-awaiting','rec-top-candidates','rec-recent-hires',
] as const""",
    "WIDGET_IDS"
))

# ─────────────────────────────────────────────────────────────────────────
# 4. WIDGET_LABELS
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""    'birthdays':         'Upcoming Birthdays',
    'anniversaries':     'Work Anniversaries',
}""",
"""    'birthdays':         'Upcoming Birthdays',
    'anniversaries':     'Work Anniversaries',
    'rec-kpi-row':              'Recruitment Overview',
    'rec-applications-trend':   'Applications Trend',
    'rec-funnel':               'Pipeline Funnel',
    'rec-source-effectiveness': 'Source Effectiveness',
    'rec-requisition-aging':    'Requisition Aging',
    'rec-diversity-snapshot':   'Diversity Snapshot',
    'rec-stale-requisitions':   'Stale Requisitions',
    'rec-upcoming-interviews':  'Upcoming Interviews',
    'rec-offers-awaiting':      'Offers Awaiting Response',
    'rec-top-candidates':       'Top Match Candidates',
    'rec-recent-hires':         'Recent Hires',
}""",
    "WIDGET_LABELS"
))

# ─────────────────────────────────────────────────────────────────────────
# 5. DEFAULT_SIZES
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""    'birthdays':         'half',
    'anniversaries':     'half',
}""",
"""    'birthdays':         'half',
    'anniversaries':     'half',
    'rec-kpi-row':              'full',
    'rec-applications-trend':   'full',
    'rec-funnel':               'half',
    'rec-source-effectiveness': 'half',
    'rec-requisition-aging':    'half',
    'rec-diversity-snapshot':   'half',
    'rec-stale-requisitions':   'half',
    'rec-upcoming-interviews':  'half',
    'rec-offers-awaiting':      'half',
    'rec-top-candidates':       'half',
    'rec-recent-hires':         'half',
}""",
    "DEFAULT_SIZES"
))

# ─────────────────────────────────────────────────────────────────────────
# 6. New widget components (inserted before Settings Panel section)
# ─────────────────────────────────────────────────────────────────────────
RECRUITMENT_WIDGETS = '''
// ════════════════════════════════════════════════════════════════════════════════
// RECRUITMENT WIDGETS
// ════════════════════════════════════════════════════════════════════════════════

function RecruitmentKpiRow({ d, loading, router, grip }: { d:RecruitmentSummary|null; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const cards = [
        { label:'Open Requisitions', value:fmt(d?.openRequisitionsCount??0), sub:'currently open',            icon:<Briefcase size={20}/>, color:'from-indigo-500 to-indigo-600',  light:'bg-indigo-50 text-indigo-600',  href:'/recruitment/requisitions' },
        { label:'Active Pipeline',   value:fmt(d?.activePipelineCount??0),   sub:'candidates in process',      icon:<Users size={20}/>,     color:'from-sky-400 to-cyan-500',       light:'bg-sky-50 text-sky-500',        href:'/recruitment/pipeline' },
        { label:'Offers Pending',    value:fmt(d?.offersPendingCount??0),    sub:'awaiting action',            icon:<Send size={20}/>,      color:'from-amber-400 to-orange-500',   light:'bg-amber-50 text-amber-600',    href:'/recruitment/offers/approvals' },
        { label:'Hires This Month',  value:fmt(d?.hiresThisMonthCount??0),   sub:'converted to employee',      icon:<UserPlus size={20}/>,  color:'from-emerald-500 to-emerald-600',light:'bg-emerald-50 text-emerald-600',href:null },
        { label:'Avg Match Score',   value:d?.avgMatchScore!=null?d.avgMatchScore.toFixed(1):'—',        sub:'AI score, active pipeline', icon:<Target size={20}/>, color:'from-violet-500 to-purple-600', light:'bg-violet-50 text-violet-600', href:null },
        { label:'Avg Time to Hire',  value:d?.avgTimeToHireDays!=null?`${d.avgTimeToHireDays.toFixed(0)}d`:'—', sub:'applied → hired',      icon:<Clock size={20}/>,    color:'from-rose-400 to-pink-600',     light:'bg-rose-50 text-rose-500',     href:'/reports/recruitment/time-to-hire' },
    ]
    return (
        <div className="bg-white dark:bg-[#0d1c2d] rounded-2xl shadow-sm border border-gray-100 dark:border-[#273647] p-5 [.dark_&]:!bg-[#0d1c2d]">
            <div className="flex items-center gap-2 mb-4">{grip && <Grip {...grip} />}<span className="font-semibold text-gray-700 dark:text-gray-100 text-sm">Recruitment Overview</span></div>
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

function ApplicationsTrendWidget({ trend, loading, router, grip }: { trend:AppTrendPoint[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Applications Trend — Last 30 Days" href="/recruitment/pipeline" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : trend.length===0 ? (
                    <div className="text-center py-12 text-gray-300"><TrendingUp size={36} className="mx-auto mb-2"/><p className="text-sm">No applications data yet</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={210}>
                        <LineChart data={trend} margin={{top:4,right:4,left:0,bottom:0}}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
                            <XAxis dataKey="applicationDate" tick={{fontSize:10,fill:'#9ca3af'}} axisLine={false} tickLine={false} interval={4}
                                tickFormatter={(v:string)=>new Date(v).toLocaleDateString('en-LK',{day:'numeric',month:'short'})}/>
                            <YAxis tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                            <Tooltip labelFormatter={(v:string)=>new Date(v).toLocaleDateString('en-LK',{day:'numeric',month:'short',year:'numeric'})} contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}}/>
                            <Line type="monotone" dataKey="applicationsCount" name="Applications" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function FunnelWidget({ data, loading, router, grip }: { data:FunnelRow[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Pipeline Funnel" href="/reports/recruitment/funnel" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><ListChecks size={36} className="mx-auto mb-2"/><p className="text-sm">No pipeline data yet</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 34)}>
                        <BarChart data={data} layout="vertical" margin={{top:0,right:48,left:0,bottom:0}} barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                            <XAxis type="number" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                            <YAxis type="category" dataKey="stage" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false} width={90}/>
                            <Tooltip formatter={(v:number,_n:string,p:any)=>[`${v} (${p.payload.pctOfApplied}%)`,'Reached']} contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}} cursor={{fill:'rgba(99,102,241,0.06)'}}/>
                            <Bar dataKey="reachedCount" name="Reached" fill="#6366f1" radius={[0,6,6,0]} label={{position:'right',fontSize:11,fill:'#6366f1',fontWeight:600}}/>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function SourceEffectivenessWidget({ data, loading, router, grip }: { data:SourceEffRow[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Source Effectiveness" href="/reports/recruitment/source-effectiveness" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-52"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Target size={36} className="mx-auto mb-2"/><p className="text-sm">No source data yet</p></div>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
                        <BarChart data={data} layout="vertical" margin={{top:0,right:16,left:0,bottom:0}} barCategoryGap="25%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                            <XAxis type="number" tick={{fontSize:11,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                            <YAxis type="category" dataKey="source" tick={{fontSize:11,fill:'#6b7280'}} axisLine={false} tickLine={false} width={90}/>
                            <Tooltip contentStyle={{borderRadius:10,border:'none',boxShadow:'0 4px 20px rgba(0,0,0,0.1)',fontSize:12}} cursor={{fill:'rgba(99,102,241,0.06)'}}/>
                            <Legend wrapperStyle={{fontSize:11}}/>
                            <Bar dataKey="applications" name="Applications" fill="#a78bfa" radius={[0,4,4,0]}/>
                            <Bar dataKey="hired" name="Hired" fill="#10b981" radius={[0,4,4,0]}/>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </WCard>
    )
}

function RequisitionAgingWidget({ data, loading, router, grip }: { data:ReqAgingRow[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Requisition Aging" href="/reports/recruitment/requisition-aging" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Briefcase size={36} className="mx-auto mb-2"/><p className="text-sm">No open requisitions</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.slice(0,10).map(r=>{
                            const urgency = r.daysOpen>=45?'bg-red-50 border-red-100':r.daysOpen>=21?'bg-amber-50 border-amber-100':'bg-gray-50 border-gray-100'
                            const badge   = r.daysOpen>=45?'xp-badge-danger':r.daysOpen>=21?'xp-badge-warning':'xp-badge-info'
                            return (
                                <div key={r.requisitionCode} onClick={()=>router.push('/recruitment/requisitions')} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${urgency}`}>
                                    <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{r.title}</p><p className="text-xs text-gray-400">{r.department} · {r.headcountFilled}/{r.headcount} filled</p></div>
                                    <span className={`xp-badge ${badge} shrink-0 ml-2`}>{r.daysOpen}d</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function DiversitySnapshotWidget({ data, loading, router, grip }: { data:DiversityRow[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Diversity Snapshot" href="/reports/recruitment/diversity-snapshot" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Users size={36} className="mx-auto mb-2"/><p className="text-sm">No diversity data yet</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.slice(0,10).map((r,i)=>(
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                                <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{r.department}</p><p className="text-xs text-gray-400">{r.stage}</p></div>
                                <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500 dark:text-gray-300">
                                    <span>M: {r.male??'—'}</span><span>F: {r.female??'—'}</span><span className="font-semibold text-gray-800 dark:text-white">Σ {r.total}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function StaleRequisitionsWidget({ data, loading, router, grip }: { data:StaleRequisition[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Stale Requisitions" href="/recruitment/requisitions" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Briefcase size={36} className="mx-auto mb-2"/><p className="text-sm">No open requisitions</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(r=>{
                            const urgency = r.daysOpen>=45?'bg-red-50 border-red-100':r.daysOpen>=21?'bg-amber-50 border-amber-100':'bg-gray-50 border-gray-100'
                            const badge   = r.daysOpen>=45?'xp-badge-danger':r.daysOpen>=21?'xp-badge-warning':'xp-badge-info'
                            return (
                                <div key={r.id} onClick={()=>router.push(`/recruitment/requisitions/${r.id}`)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-shadow ${urgency}`}>
                                    <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{r.title}</p><p className="text-xs text-gray-400">{r.requisitionCode}</p></div>
                                    <span className={`xp-badge ${badge} shrink-0 ml-2`}>{r.daysOpen}d open</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function UpcomingInterviewsWidget({ data, loading, router, grip }: { data:UpcomingInterview[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Upcoming Interviews" href="/recruitment/interviews" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><CalendarCheck size={36} className="mx-auto mb-2"/><p className="text-sm">No interviews scheduled soon</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(iv=>(
                            <div key={iv.id} onClick={()=>router.push('/recruitment/interviews')} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={iv.candidateName} color="blue"/>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{iv.candidateName}</p>
                                        <p className="text-xs text-gray-400 truncate">{iv.requisitionTitle} · {iv.roundName??iv.interviewType}</p>
                                    </div>
                                </div>
                                <span className="xp-badge xp-badge-info text-xs shrink-0 ml-2">{new Date(iv.scheduledStart).toLocaleDateString('en-LK',{day:'numeric',month:'short'})} {new Date(iv.scheduledStart).toLocaleTimeString('en-LK',{hour:'2-digit',minute:'2-digit'})}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function OffersAwaitingWidget({ data, loading, router, grip }: { data:OfferAwaiting[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Offers Awaiting Response" href="/recruitment/offers/approvals" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Send size={36} className="mx-auto mb-2"/><p className="text-sm">No offers awaiting response</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(o=>(
                            <div key={o.id} onClick={()=>router.push('/recruitment/offers/approvals')} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={o.candidateName} color="amber"/>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{o.candidateName}</p>
                                        <p className="text-xs text-gray-400 truncate">{fmtC(o.salaryOffered)}</p>
                                    </div>
                                </div>
                                <span className="xp-badge xp-badge-warning text-xs shrink-0 ml-2">{o.expiryDate?`Exp ${new Date(o.expiryDate).toLocaleDateString('en-LK',{day:'numeric',month:'short'})}`:'Sent'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function TopMatchCandidatesWidget({ data, loading, router, grip }: { data:TopCandidate[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    const scoreBadge = (s:number) => s>=80?'xp-badge-success':s>=60?'xp-badge-info':'xp-badge-neutral'
    return (
        <WCard>
            <WHead title="Top Match Candidates" href="/recruitment/pipeline" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><Target size={36} className="mx-auto mb-2"/><p className="text-sm">No scored candidates yet</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(c=>(
                            <div key={c.applicationId} onClick={()=>router.push('/recruitment/pipeline')} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={c.candidateName} color="violet"/>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{c.candidateName}</p>
                                        <p className="text-xs text-gray-400 truncate">{c.requisitionTitle}</p>
                                    </div>
                                </div>
                                <span className={`xp-badge ${scoreBadge(c.aiMatchScore)} text-xs shrink-0 ml-2`}>{c.aiMatchScore.toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

function RecentHiresWidget({ data, loading, router, grip }: { data:RecentHire[]; loading:boolean; router:ReturnType<typeof useRouter>; grip?:React.HTMLAttributes<HTMLSpanElement> }) {
    return (
        <WCard>
            <WHead title="Recent Hires" href="/employees" router={router} grip={grip}/>
            <div className="px-5 pb-5">
                {loading ? <Skel h="h-44"/> : data.length===0 ? (
                    <div className="text-center py-10 text-gray-300"><UserPlus size={36} className="mx-auto mb-2"/><p className="text-sm">No recent hires</p></div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {data.map(h=>(
                            <div key={h.applicationId} onClick={()=>router.push(`/employees/${h.hiredEmployeeId}`)} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:!bg-[#122131]/40 cursor-pointer transition-colors group">
                                <div className="flex items-center gap-3 min-w-0">
                                    <Avatar name={h.candidateName} color="emerald"/>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{h.candidateName}</p>
                                        <p className="text-xs text-gray-400 truncate">{h.requisitionTitle}</p>
                                    </div>
                                </div>
                                <span className="xp-badge xp-badge-success text-xs shrink-0 ml-2">{new Date(h.hiredAt).toLocaleDateString('en-LK',{day:'numeric',month:'short'})}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </WCard>
    )
}

'''

replacements.append((
"""// ─── Settings Panel ───────────────────────────────────────────────────────────""",
RECRUITMENT_WIDGETS + """// ─── Settings Panel ───────────────────────────────────────────────────────────""",
    "widget components"
))

# ─────────────────────────────────────────────────────────────────────────
# 7. New state hooks
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""    const [anniversaries,setAnniversaries]= useState<WorkAnniversary[]>([])""",
"""    const [anniversaries,setAnniversaries]= useState<WorkAnniversary[]>([])
    const [recSummary,   setRecSummary]   = useState<RecruitmentSummary|null>(null)
    const [appTrend,     setAppTrend]     = useState<AppTrendPoint[]>([])
    const [funnel,       setFunnel]       = useState<FunnelRow[]>([])
    const [sourceEff,    setSourceEff]    = useState<SourceEffRow[]>([])
    const [reqAging,     setReqAging]     = useState<ReqAgingRow[]>([])
    const [diversity,    setDiversity]    = useState<DiversityRow[]>([])
    const [staleReqs,    setStaleReqs]    = useState<StaleRequisition[]>([])
    const [upcomingIvs,  setUpcomingIvs]  = useState<UpcomingInterview[]>([])
    const [offersAwait,  setOffersAwait]  = useState<OfferAwaiting[]>([])
    const [topCandidates,setTopCandidates]= useState<TopCandidate[]>([])
    const [recentHires,  setRecentHires]  = useState<RecentHire[]>([])""",
    "state hooks"
))

# ─────────────────────────────────────────────────────────────────────────
# 8. load() — add recruitment fetch as a resilient allSettled batch
#    (kept separate from the existing Promise.all so a missing Recruitment
#     permission for one endpoint - e.g. Offers - never breaks payroll/HR widgets)
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""            setSummary(s.data); setPayTrend(pt.data); setAttTrend(at.data)
            setExpiries(ex.data); setCalEvents(cal.data)
            setDeptHc(dh.data); setBranchHc(bh.data)
            setBirthdays(bd.data); setAnniversaries(an.data)
        } catch (err){ 
            showError('Failed to load dashboard', getErrorMessage(err, "Failed to load dashboard.")) 
        }
        finally  { setLoading(false) }
    }, [calYear, calMonth])""",
"""            setSummary(s.data); setPayTrend(pt.data); setAttTrend(at.data)
            setExpiries(ex.data); setCalEvents(cal.data)
            setDeptHc(dh.data); setBranchHc(bh.data)
            setBirthdays(bd.data); setAnniversaries(an.data)
        } catch (err){ 
            showError('Failed to load dashboard', getErrorMessage(err, "Failed to load dashboard.")) 
        }

        // Recruitment widgets — fetched independently via allSettled so a user
        // missing one Recruitment permission (e.g. View Offers) doesn't break
        // the payroll/HR widgets above.
        const recResults = await Promise.allSettled([
            axios.get('/recruitment/dashboard/summary'),
            axios.get('/recruitment/dashboard/applications-trend?days=30'),
            axios.get('/recruitment-reports/funnel'),
            axios.get('/recruitment-reports/source-effectiveness'),
            axios.get('/recruitment-reports/requisition-aging'),
            axios.get('/recruitment-reports/diversity-snapshot'),
            axios.get('/recruitment/dashboard/stale-requisitions?limit=10'),
            axios.get('/recruitment/dashboard/upcoming-interviews?days=7&limit=10'),
            axios.get('/recruitment/dashboard/offers-awaiting-response?limit=10'),
            axios.get('/recruitment/dashboard/top-match-candidates?limit=10'),
            axios.get('/recruitment/dashboard/recent-hires?limit=10'),
        ])
        const [rSum,rTrend,rFunnel,rSrc,rAging,rDiv,rStale,rIv,rOff,rTop,rHires] = recResults
        if (rSum.status    ==='fulfilled') setRecSummary(rSum.value.data)
        if (rTrend.status  ==='fulfilled') setAppTrend(rTrend.value.data)
        if (rFunnel.status ==='fulfilled') setFunnel(rFunnel.value.data)
        if (rSrc.status    ==='fulfilled') setSourceEff(rSrc.value.data)
        if (rAging.status  ==='fulfilled') setReqAging(rAging.value.data)
        if (rDiv.status    ==='fulfilled') setDiversity(rDiv.value.data)
        if (rStale.status  ==='fulfilled') setStaleReqs(rStale.value.data)
        if (rIv.status     ==='fulfilled') setUpcomingIvs(rIv.value.data)
        if (rOff.status    ==='fulfilled') setOffersAwait(rOff.value.data)
        if (rTop.status    ==='fulfilled') setTopCandidates(rTop.value.data)
        if (rHires.status  ==='fulfilled') setRecentHires(rHires.value.data)

        setLoading(false)
    }, [calYear, calMonth])""",
    "load() recruitment fetch"
))

# ─────────────────────────────────────────────────────────────────────────
# 9. renderContent switch cases
# ─────────────────────────────────────────────────────────────────────────
replacements.append((
"""            case 'anniversaries':     return <AnniversariesWidget     data={anniversaries} loading={loading} router={router} grip={grip}/>
        }""",
"""            case 'anniversaries':     return <AnniversariesWidget     data={anniversaries} loading={loading} router={router} grip={grip}/>
            case 'rec-kpi-row':              return <RecruitmentKpiRow         d={recSummary}       loading={loading} router={router} grip={grip}/>
            case 'rec-applications-trend':   return <ApplicationsTrendWidget   trend={appTrend}     loading={loading} router={router} grip={grip}/>
            case 'rec-funnel':               return <FunnelWidget              data={funnel}        loading={loading} router={router} grip={grip}/>
            case 'rec-source-effectiveness': return <SourceEffectivenessWidget data={sourceEff}     loading={loading} router={router} grip={grip}/>
            case 'rec-requisition-aging':    return <RequisitionAgingWidget    data={reqAging}      loading={loading} router={router} grip={grip}/>
            case 'rec-diversity-snapshot':   return <DiversitySnapshotWidget   data={diversity}     loading={loading} router={router} grip={grip}/>
            case 'rec-stale-requisitions':   return <StaleRequisitionsWidget   data={staleReqs}     loading={loading} router={router} grip={grip}/>
            case 'rec-upcoming-interviews':  return <UpcomingInterviewsWidget  data={upcomingIvs}   loading={loading} router={router} grip={grip}/>
            case 'rec-offers-awaiting':      return <OffersAwaitingWidget      data={offersAwait}   loading={loading} router={router} grip={grip}/>
            case 'rec-top-candidates':       return <TopMatchCandidatesWidget  data={topCandidates} loading={loading} router={router} grip={grip}/>
            case 'rec-recent-hires':         return <RecentHiresWidget         data={recentHires}   loading={loading} router={router} grip={grip}/>
        }""",
    "renderContent switch"
))

# ─────────────────────────────────────────────────────────────────────────
# Apply
# ─────────────────────────────────────────────────────────────────────────
missing = []
for old, new, label in replacements:
    if old not in src:
        missing.append(label)
        continue
    src = src.replace(old, new, 1)

if missing:
    print("ERROR: could not find anchor text for the following patches — file may have changed since last shared:")
    for m in missing:
        print(f"  - {m}")
    print("\\nNo changes were written. Please share the current page.tsx again.")
    sys.exit(1)

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)

print(f"Success: applied {len(replacements)} patches to {PATH}")
print("Next: npm run build (or your dev server) to verify no TS errors.")
