"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Banknote,
  Gift,
  Minus,
  Receipt,
  CalendarCheck,
  Clock,
  ClipboardList,
  Ban,
  CalendarOff,
  LayoutTemplate,
  Play,
  Building2,
  PieChart,
  BarChart2,
  FileSpreadsheet,
  Printer,
  FileBarChart,
  FilePlus,
  Award,
  CalendarDays,
  AlarmClock,
  Timer,
  TrendingUp,
  CalendarX,
  MapPin,
  Network,
  Briefcase,
  Percent,
  Settings2,
  ShieldCheck,
  Fingerprint,
  CalendarHeart,
  CalendarMinus,
  MinusCircle,
  UsersRound,
  Layers,
  Bell,
  Shield,
  UserCog,
  Building,
  UserCircle,
  X,
  ArrowRight,
  ClipboardEdit,
  ScanFace,
} from "lucide-react";
import { searchIndex, SearchItem, SearchCategory } from "@/data/searchIndex";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  UserPlus,
  FileText,
  Banknote,
  Gift,
  Minus,
  Receipt,
  CalendarCheck,
  Clock,
  ClipboardList,
  Ban,
  CalendarOff,
  LayoutTemplate,
  Play,
  Building2,
  PieChart,
  BarChart2,
  FileSpreadsheet,
  Printer,
  FileBarChart,
  FilePlus,
  Award,
  CalendarDays,
  AlarmClock,
  Timer,
  TrendingUp,
  CalendarX,
  MapPin,
  Network,
  Briefcase,
  Percent,
  Settings2,
  ShieldCheck,
  Fingerprint,
  CalendarHeart,
  CalendarMinus,
  MinusCircle,
  UsersRound,
  Layers,
  Bell,
  Shield,
  UserCog,
  Building,
  UserCircle,
  ClipboardEdit,
  ScanFace,
};

const categoryStyle: Record<SearchCategory, { bg: string; text: string }> = {
  Dashboard: {
    bg: "bg-violet-100 dark:bg-violet-900/30",
    text: "text-violet-700 dark:text-violet-300",
  },
  Employees: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-300",
  },
  Attendance: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-300",
  },
  Leave: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-700 dark:text-teal-300",
  },
  Payroll: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  Tax: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
  },
  Reports: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-700 dark:text-orange-300",
  },
  "Master Data": {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-300",
  },
  System: {
    bg: "bg-slate-100 dark:bg-slate-700/40",
    text: "text-slate-600 dark:text-slate-300",
  },
};

function scoreItem(item: SearchItem, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const title = item.title.toLowerCase();
  const desc = item.description.toLowerCase();
  const cat = item.category.toLowerCase();
  const kw = item.keywords.join(" ").toLowerCase();
  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (title.includes(q)) return 80;
  if (kw.includes(q)) return 70;
  if (desc.includes(q)) return 60;
  if (cat.includes(q)) return 50;
  const parts = q.split(" ").filter(Boolean);
  const allText = `${title} ${kw} ${desc} ${cat}`;
  const matched = parts.filter((p) => allText.includes(p)).length;
  if (matched === parts.length) return 40;
  if (matched > 0) return 20;
  return 0;
}

function runSearch(query: string): SearchItem[] {
  if (!query.trim()) return [];
  return searchIndex
    .map((item) => ({ item, score: scoreItem(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.item);
}

const quickAccessIds = [
  "dashboard",
  "employees-list",
  "leave-requests",
  "payroll-run",
  "payslips",
  "attendance-logs",
];
const quickItems = searchIndex.filter((i) => quickAccessIds.includes(i.id));

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setActiveIdx(0);
    }
  }, [open]);

  useEffect(() => {
    setResults(runSearch(query));
    setActiveIdx(0);
  }, [query]);

  const displayItems = query.trim() ? results : quickItems;
  const activeItem = displayItems[activeIdx] ?? null;

  const navigate = useCallback(
    (item: SearchItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, displayItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeItem) navigate(activeItem);
  };

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(
      `[data-idx="${activeIdx}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm w-72 max-w-full"
        aria-label="Open search (Ctrl+K)"
      >
        <Search size={15} className="flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          Search employees, payroll, records…
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-mono">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      {/* Palette */}
      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-start justify-center pt-[10vh] px-4"
          style={{
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(2px)",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            style={{
              background: "var(--color-background, white)",
              border: "1px solid var(--color-border, #e5e7eb)",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
              <Search size={18} className="text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search pages, reports, employees…"
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 font-mono"
              >
                esc
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
              <div className="px-4 pt-1 pb-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  {query.trim()
                    ? results.length > 0
                      ? `${results.length} result${results.length !== 1 ? "s" : ""}`
                      : "No results"
                    : "Quick access"}
                </span>
              </div>

              {query.trim() && results.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No pages found for &ldquo;<strong>{query}</strong>&rdquo;
                </div>
              )}

              {displayItems.map((item, idx) => {
                const Icon = iconMap[item.icon] ?? Search;
                const style = categoryStyle[item.category];
                const isActive = idx === activeIdx;
                return (
                  <div
                    key={item.id}
                    data-idx={idx}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseDown={() => navigate(item)}
                    className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${isActive ? "bg-violet-50 dark:bg-violet-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}
                    >
                      <Icon size={15} className={style.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {item.description}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                    >
                      {item.category}
                    </span>
                    {isActive && (
                      <ArrowRight
                        size={14}
                        className="flex-shrink-0 text-violet-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">
                  ↵
                </kbd>{" "}
                go
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 rounded border border-gray-200 dark:border-gray-700 font-mono">
                  esc
                </kbd>{" "}
                close
              </span>
              <span className="ml-auto">XpayRoll Pro</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
