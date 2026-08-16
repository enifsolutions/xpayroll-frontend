"use client";

import { useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  CreditCard,
  Users,
  CalendarCheck,
  Database,
  ShieldCheck,
  Bell,
  BarChart3,
  MessageCircle,
  BookOpen,
  Briefcase,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type FaqItem = {
  id: string;
  q: string;
  a: string;
};

type FaqCategory = {
  id: string;
  title: string;
  description: string;
  icon: typeof CreditCard;
  accent: string; // tailwind color token used for icon chip
  items: FaqItem[];
};

const CATEGORIES: FaqCategory[] = [
  {
    id: "payroll",
    title: "Payroll & Tax",
    description: "Payroll runs, payslips, EPF/ETF/APIT, tax config",
    icon: CreditCard,
    accent: "blue",
    items: [
      {
        id: "payroll-run",
        q: "How do I run payroll for a pay period?",
        a: "Go to Payroll > Payroll Run, select the pay period and company/branch scope, then click Generate. The engine calculates gross pay, EPF/ETF, APIT and any loans or deductions for every active employee. Review the summary, then Approve to lock the run. You need Payroll.PayrollRun.Approve to complete this step.",
      },
      {
        id: "statutory-rates",
        q: "Where do I configure EPF/ETF/APIT statutory rates?",
        a: "Go to Master Data > Statutory Rates. Add or update the employee/employer EPF percentage, ETF percentage, and the APIT tax bands. Changes apply to payroll runs generated after the effective date, so historical runs are never recalculated automatically.",
      },
      {
        id: "payslip",
        q: "How do I view or download an employee's payslip?",
        a: "Open Payroll > Payroll Run, select the completed run, then find the employee and click the Payslip icon to preview or download the PDF. Employees with self-service access can also see their own payslips under Profile > Pay Stubs.",
      },
      {
        id: "void-run",
        q: "What happens if I need to void a completed payroll run?",
        a: "Open the payroll run and choose Void. This reverses any statutory postings and marks the run as void in the audit trail — it does not delete the record. You'll need Payroll.PayrollRun.Void permission, and a new corrected run should be generated afterward.",
      },
      {
        id: "tax-year",
        q: "How do I set up tax configuration for a new assessment year?",
        a: "Go to Master Data > Tax Config, click Add, and enter the assessment year (e.g. 2026-2027) along with the relevant relief thresholds and bands. The system keeps prior years intact so historical payroll and reports remain accurate.",
      },
    ],
  },
  {
    id: "employees",
    title: "Employee Management",
    description: "Onboarding, profiles, contracts, loans",
    icon: Users,
    accent: "violet",
    items: [
      {
        id: "add-employee",
        q: "How do I add a new employee?",
        a: "Go to Employees > Add Employee and fill in personal details, employment details (branch, department, designation), and contract information. Once saved, the employee automatically gets a system-generated employee code and appears in the directory.",
      },
      {
        id: "bank-details",
        q: "How do I update an employee's bank account information?",
        a: "Open the employee's profile, go to the Payment Details tab, and edit the bank name, branch, and account number. Save to apply — the change takes effect from the next payroll run and is recorded in the employee's audit history.",
      },
      {
        id: "assign-org",
        q: "How do I assign an employee to a branch, department, and designation?",
        a: "These are set on the employee's Employment tab, either when creating the record or via Edit afterward. Branches, departments, and designations themselves are managed under Master Data, so add those first if the option you need isn't listed.",
      },
      {
        id: "audit-history",
        q: "How do I view an employee's change history?",
        a: "Open the employee's profile and click the History icon (clock, top right of the record). This opens the audit drawer showing every Create/Update/Delete action with a before-and-after diff, who made the change, and when.",
      },
      {
        id: "loans",
        q: "How do I record a loan for an employee?",
        a: "Go to the employee's profile > Loans tab, click Add Loan, and enter the amount, number of installments, and start date. The installment is automatically deducted each payroll run until the balance reaches zero.",
      },
    ],
  },
  {
    id: "leave-attendance",
    title: "Leave & Attendance",
    description: "Leave requests, approvals, shifts, biometrics",
    icon: CalendarCheck,
    accent: "rose",
    items: [
      {
        id: "apply-leave",
        q: "How do I apply for leave?",
        a: "Go to Leave > Apply Leave, choose the leave type, select the date range, and add a reason if required. Your available balance is shown before you submit. The request goes to your supervisor (and HR, if two-level approval is enabled) for approval.",
      },
      {
        id: "two-level-approval",
        q: "How does two-level leave approval work?",
        a: "When enabled in Settings, a leave request first needs Supervisor Approval, then a final Approve from HR before it's confirmed. Both steps are logged in the leave audit trail. If two-level approval is off, a single Approve action finalizes the request.",
      },
      {
        id: "attendance-policy",
        q: "How do I set up an attendance policy?",
        a: "Go to Master Data > Attendance Policies, click Add, and configure tracking mode, break/overtime tracking, late grace period in minutes, and which check-in methods are allowed (self check-in, biometric, QR/NFC). Assign the policy to shifts or employees afterward.",
      },
      {
        id: "biometric-device",
        q: "How do I connect a biometric device?",
        a: "Go to Master Data > Devices, add the device with its IP address and location, and pair it with a branch. XpayRoll polls HikVision ISAPI devices for punch data; once connected, check-in/check-out events sync automatically into attendance logs.",
      },
      {
        id: "leave-balance",
        q: "How do I check an employee's leave balance?",
        a: "Open the employee's profile > Leave tab to see entitled, carried-forward, used, and remaining days per leave type for the current year. HR can also run the Leave Balance report for a branch- or department-wide view.",
      },
    ],
  },
  {
    id: "master-data",
    title: "Master Data & Settings",
    description: "Branches, shifts, holidays, templates",
    icon: Database,
    accent: "amber",
    items: [
      {
        id: "branch-dept",
        q: "How do I add a branch or department?",
        a: "Go to Master Data > Branches or Departments, click Add, and fill in the name and details. These lists feed directly into the Employment tab when creating or editing an employee, so set them up before onboarding staff.",
      },
      {
        id: "shift",
        q: "How do I create a new shift?",
        a: "Go to Master Data > Shifts, click Add, and set the expected start/end time, breaks, and the attendance policy it should follow. Employees are then linked to a shift via a shift assignment with an effective date range.",
      },
      {
        id: "holiday",
        q: "How do I add a public holiday?",
        a: "Go to Master Data > Public Holidays, click Add, and enter the date and name. Holidays automatically override attendance and leave calculations for that date across all employees, unless a branch-specific calendar is configured.",
      },
      {
        id: "notification-template",
        q: "How do I create or edit a notification template?",
        a: "Go to Master Data > Notification Templates. Each template maps to a system event (e.g. leave approved, payroll completed) and controls the message shown in the notification dropdown and any email sent via the template.",
      },
    ],
  },
  {
    id: "security",
    title: "Security & Permissions",
    description: "Passwords, roles, access control",
    icon: ShieldCheck,
    accent: "slate",
    items: [
      {
        id: "reset-password",
        q: "How do I reset my password?",
        a: "Click your profile picture (top right) > Profile > Security, then choose Change Password. If you're locked out, use the Forgot Password link on the login page — a reset link is emailed to your registered address.",
      },
      {
        id: "roles-permissions",
        q: "How do roles and permissions work?",
        a: "Every action in XpayRoll is tied to a permission key like HR.Employee.View or Payroll.PayrollRun.Approve. Roles bundle these keys together, and each user is assigned a role. Admins can also grant or deny individual permissions to a specific user as an override.",
      },
      {
        id: "hidden-menu",
        q: "Why can't I see a menu item or a button?",
        a: "Menus and action buttons are shown only if your role includes the matching permission key. If something you need is missing, ask your administrator to grant the relevant permission — the underlying API also enforces this, so it can't be bypassed from the browser.",
      },
      {
        id: "audit-trail",
        q: "How do I check who changed a record and when?",
        a: "Most modules (employees, leave, payroll, master data) have a History icon that opens an audit drawer with a timeline of Create/Update/Delete actions, the user who made each change, a timestamp, and a before/after diff of the fields that changed.",
      },
    ],
  },
  {
    id: "notifications-search",
    title: "Notifications & Search",
    description: "Alerts and finding things fast",
    icon: Bell,
    accent: "sky",
    items: [
      {
        id: "notifications",
        q: "How do notifications work?",
        a: "Click the bell icon in the header to see recent alerts — leave requests, payroll completion, approvals, and more. Managers with company-wide access see events across the organization; everyone else sees events scoped to their own reporting hierarchy.",
      },
      {
        id: "global-search",
        q: "How do I quickly find a page, employee, or record?",
        a: "Press Ctrl+K (or Cmd+K on Mac) anywhere in the app to open the global search palette. Start typing to jump straight to a page, employee, or setting — results are fuzzy-matched so partial or slightly misspelled queries still work.",
      },
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Exports, dashboards, insights",
    icon: BarChart3,
    accent: "emerald",
    items: [
      {
        id: "available-reports",
        q: "What reports are available?",
        a: "Under Reports you'll find attendance reports (late arrivals, absenteeism), leave balance and utilization, payroll cost summaries, and headcount by branch/department. New widget-based dashboards (Executive Overview, Payroll Cost Trend) are being added over time.",
      },
      {
        id: "export-report",
        q: "How do I export a report to Excel or PDF?",
        a: "Open any report, apply your filters (date range, branch, department), then click the Export button and choose Excel or PDF. Exports run in the background for large date ranges and download automatically once ready.",
      },
    ],
  },
  {
    id: "recruitment",
    title: "Recruitment",
    description:
      "Requisitions, postings, candidates, pipeline, interviews, offers",
    icon: Briefcase,
    accent: "violet",
    items: [
      {
        id: "rec-requisition",
        q: "How do I raise and approve a job requisition?",
        a: "Go to Recruitment > Requisitions and click New Requisition. Fill in the designation, branch, headcount, and justification, then submit. Requisitions go through a two-level approval workflow (ApproveL1, then ApproveL2) before they can be linked to a posting. You need Recruitment.Requisition.ApproveL1 or ApproveL2 depending on your role to action pending requisitions.",
      },
      {
        id: "rec-posting",
        q: "How do I publish a job posting?",
        a: "Go to Recruitment > Postings, select an approved requisition, and create a posting from it. Once ready, click Publish to make it live on the public careers page (accessible via its public slug). Unpublish at any time to close applications without deleting the posting or its data.",
      },
      {
        id: "rec-candidate-cv",
        q: "How do I add a candidate and use AI CV parsing?",
        a: "Go to Recruitment > Candidates and click Add Candidate, or upload a CV directly. If AI CV Parsing is enabled in Company Settings (Recruitment.Ai.ParseCv), the system extracts name, contact details, skills, experience, and education automatically. Low-confidence fields are amber-flagged for you to review and correct before saving. The manual entry form is always available even if AI parsing is off.",
      },
      {
        id: "rec-pipeline",
        q: "How does the recruitment Pipeline (Kanban) work?",
        a: "Recruitment > Pipeline is the daily-driver screen. Each requisition shows candidates as cards across stages: Applied, Screening, Shortlisted, Interview, Offer, Hired, Rejected, Withdrawn, On Hold. Drag a card to move it to the next stage, or use the card menu. Every stage change is written to the application's audit history along with who made the change and when.",
      },
      {
        id: "rec-match-score",
        q: "How do I use AI Match Scoring to rank candidates?",
        a: "On a requisition's pipeline, use the Score Shortlist action (requires Recruitment.Ai.MatchScore) to have AI score candidates against the requisition's skills and experience requirements. Each candidate gets a score with reasoning, strengths, gaps, and suggested interview questions. Scoring is on-demand only — it never runs automatically — and the score is advisory: a human always makes the reject decision. Name, gender, age, marital status, photo, religion, ethnicity, and address are excluded from every scoring prompt.",
      },
      {
        id: "rec-interview-scorecard",
        q: "How do I schedule an interview and submit a scorecard?",
        a: "From a candidate's application, go to Interviews and click Schedule Interview to set the round, type (Phone/Technical/HR/Panel/Final), date, and panel members. After the interview, each panellist submits their own Scorecard using the designation's scorecard template. To prevent anchoring bias, you only see your own scorecard until you submit it — Recruitment.Interview.ViewAllScorecards unlocks all panellists' scores afterward or for HR Manager.",
      },
      {
        id: "rec-offers",
        q: "How do I create, approve, and send an offer?",
        a: "Go to Recruitment > Offers to see all offers with KPI cards and lifecycle status (Draft, Pending Approval, Approved, Sent, Accepted, Declined, Negotiating, Expired, Withdrawn). Use the offer builder to set designation, branch, salary, and allowances — a live statutory preview shows EPF/ETF/APIT and true employer cost as you type. Submit for approval (Recruitment.Offer.Approve), then Send to generate the PDF offer letter and email it to the candidate. Filters and pagination let you track every offer in flight.",
      },
      {
        id: "rec-onboarding",
        q: "What happens when a candidate accepts an offer?",
        a: "Once an offer is marked Accepted, use Convert to Employee (Recruitment.Onboarding.ConvertToEmployee) to open the standard Employee Add wizard pre-filled with the candidate's personal data, designation, branch, and offered salary. The candidate's CV and offer letter are attached automatically as employee documents, and deduction defaults resolve through the normal Company > Branch > Department > Designation override chain — no re-entry needed.",
      },
      {
        id: "rec-reports",
        q: "What recruitment reports are available?",
        a: "Recruitment > Reports covers five report types: hiring funnel, time-to-hire, source effectiveness, requisition aging, and diversity snapshot. Access is controlled by Recruitment.Reports.View, and export by Recruitment.Reports.Export.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export default function HelpCenterPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return CATEGORIES.map((cat) => {
      let items = cat.items;

      if (q) {
        items = items.filter(
          (item) =>
            item.q.toLowerCase().includes(q) ||
            item.a.toLowerCase().includes(q),
        );
      }

      if (activeCategory && activeCategory !== cat.id) {
        items = [];
      }

      return { ...cat, items };
    }).filter((cat) => cat.items.length > 0);
  }, [query, activeCategory]);

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id));
  };

  const handleCategoryClick = (id: string) => {
    setActiveCategory((prev) => (prev === id ? null : id));
    setOpenItem(null);
  };

  return (
    <div className="w-full mx-auto py-10 px-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "var(--xp-primary, #2563eb)" }}
        >
          How can we help you today?
        </h1>
        <p style={{ color: "var(--xp-text-muted, #6b7280)" }}>
          Search the knowledge base for answers about payroll, employees, leave,
          and system settings.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl mx-auto mb-8">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: "var(--xp-text-muted, #9ca3af)" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for questions (e.g., payroll run, leave approval...)"
          className="w-full pl-11 pr-4 py-3 rounded-xl outline-none text-sm"
          style={{
            background: "var(--xp-surface, #fff)",
            border: "1px solid var(--xp-border, #e5e7eb)",
            color: "var(--xp-text, #111827)",
          }}
        />
      </div>

      {/* Category quick cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className="text-left p-4 rounded-xl transition-shadow hover:shadow-md"
              style={{
                background: "var(--xp-surface, #fff)",
                border: active
                  ? "1.5px solid var(--xp-primary, #2563eb)"
                  : "1px solid var(--xp-border, #e5e7eb)",
              }}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-${cat.accent}-100`}
              >
                <Icon size={18} className={`text-${cat.accent}-600`} />
              </div>
              <div
                className="font-semibold text-sm mb-0.5"
                style={{ color: "var(--xp-text, #111827)" }}
              >
                {cat.title}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--xp-text-muted, #6b7280)" }}
              >
                {cat.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* FAQ sections */}
      {filtered.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl"
          style={{
            background: "var(--xp-surface, #fff)",
            border: "1px solid var(--xp-border, #e5e7eb)",
          }}
        >
          <p style={{ color: "var(--xp-text-muted, #6b7280)" }}>
            No results for &ldquo;{query}&rdquo;. Try a different search term or
            contact support below.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((cat) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} className={`text-${cat.accent}-600`} />
                  <h2
                    className="text-lg font-semibold"
                    style={{ color: "var(--xp-text, #111827)" }}
                  >
                    {cat.title}
                  </h2>
                </div>

                <div className="space-y-3">
                  {cat.items.map((item) => {
                    const isOpen = openItem === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: "var(--xp-surface, #fff)",
                          border: "1px solid var(--xp-border, #e5e7eb)",
                        }}
                      >
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center justify-between text-left px-5 py-4"
                        >
                          <span
                            className="font-medium text-sm pr-4"
                            style={{
                              color: "var(--xp-text, #111827)",
                            }}
                          >
                            {item.q}
                          </span>
                          <ChevronDown
                            size={18}
                            className={`shrink-0 transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                            style={{
                              color: "var(--xp-text-muted, #9ca3af)",
                            }}
                          />
                        </button>
                        {isOpen && (
                          <div
                            className="px-5 pb-4 text-sm leading-relaxed"
                            style={{
                              color: "var(--xp-text-muted, #4b5563)",
                            }}
                          >
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contact CTA */}
      <div
        className="mt-12 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
        style={{
          background:
            "linear-gradient(135deg, var(--xp-primary, #2563eb), #1d4ed8)",
        }}
      >
        <div>
          <h3 className="text-white text-lg font-semibold mb-1">
            Still have questions?
          </h3>
          <p className="text-blue-100 text-sm">
            Can&rsquo;t find what you&rsquo;re looking for? Reach out to our
            support team.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <a
            href="mailto:info.xpayroll@gmail.com"
            className="flex items-center gap-2 bg-white text-blue-600 font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <MessageCircle size={16} />
            Contact Support
          </a>
          <a
            href="/system/documentation"
            className="flex items-center gap-2 bg-blue-500/30 text-white font-medium text-sm px-4 py-2.5 rounded-lg hover:bg-blue-500/40 transition-colors border border-blue-400/40"
          >
            <BookOpen size={16} />
            Documentation
          </a>
        </div>
      </div>
    </div>
  );
}
