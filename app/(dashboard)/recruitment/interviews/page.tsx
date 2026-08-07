"use client";

import { useEffect, useRef, useState } from "react";
import Input from "@/components/ui/Input";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import ApplicationInterviews from "@/components/recruitment/ApplicationInterviews";
import ApplicationOffer from "@/components/recruitment/ApplicationOffer";
import { CalendarClock, Users, Search, Clock } from "lucide-react";

// TODO CONFIRM: shape of applications search results — guessed based on
// candidate/requisition fields seen in fn_get_interviews' own join.
interface ApplicationSearchResult {
  id: string;
  candidateName: string;
  requisitionTitle: string;
  stage: string;
}

export default function InterviewsPage() {
  useRequirePermission(Permissions.Recruitment.Interview.View);

  const initialized = useRef(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApplicationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<ApplicationSearchResult | null>(
    null,
  );

  const [stats, setStats] = useState({
    thisWeek: "—",
    upcoming: "—",
    panelsAssigned: "—",
    completed: "—",
  });

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await api.get("/interviews/stats");
      setStats({
        thisWeek: String(res.data.thisWeek),
        upcoming: String(res.data.upcoming),
        panelsAssigned: String(res.data.panelsAssigned),
        completed: String(res.data.completed),
      });
    } catch {
      // non-fatal — cards just stay at placeholder dashes
    }
  }

  async function search(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      // TODO CONFIRM: real applications search route/params — guessed as
      // /applications?search= based on other list-page conventions in this project
      const res = await api.get("/applications", { params: { search: q } });
      // Exclude terminal stages the SP won't allow scheduling against anyway
      // (v_out=3 in sp_action_interview) — keeps the UI's allowed set in
      // sync with the actual backend business rule rather than inventing
      // a separate opinion here.
      const TERMINAL_STAGES = ["Rejected", "Withdrawn", "Hired"];
      const filtered = res.data.filter(
        (r: ApplicationSearchResult) => !TERMINAL_STAGES.includes(r.stage),
      );
      setResults(filtered);
    } catch {
      showError("Search failed", "Could not search applications.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3>Interview Scheduling</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Schedule interviews and manage panels across applications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CalendarClock size={20} />}
          bg="bg-blue-500"
          label="This Week"
          value={stats.thisWeek}
        />
        <StatCard
          icon={<Clock size={20} />}
          bg="bg-amber-400"
          label="Upcoming"
          value={stats.upcoming}
        />
        <StatCard
          icon={<Users size={20} />}
          bg="bg-emerald-500"
          label="Panels Assigned"
          value={stats.panelsAssigned}
        />
        <StatCard
          icon={<CalendarClock size={20} />}
          bg="bg-rose-500"
          label="Completed"
          value={stats.completed}
        />
      </div>

      {!selected ? (
        <div className="card">
          <div className="card-body">
            <label className="form-label">Find an application</label>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <Input
                className="pl-9"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Search by candidate name or requisition title..."
              />
            </div>

            {searching && (
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Searching...
              </div>
            )}

            {results.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded mt-3 divide-y divide-gray-100 dark:divide-gray-700">
                {results.map((r) => (
                  <button
                    key={r.id}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
                    onClick={() => setSelected(r)}
                  >
                    <div>
                      <div className="font-medium">{r.candidateName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {r.requisitionTitle}
                      </div>
                    </div>
                    <span className="xp-badge xp-badge-neutral">{r.stage}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <button
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
            onClick={() => setSelected(null)}
          >
            &larr; Search a different application
          </button>
          <div className="card mb-4">
            <div className="card-body flex items-center justify-between">
              <div>
                <div className="font-semibold">{selected.candidateName}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {selected.requisitionTitle}
                </div>
              </div>
              <span className="xp-badge xp-badge-neutral">
                {selected.stage}
              </span>
            </div>
          </div>
          <ApplicationInterviews applicationId={selected.id} />
          <div className="mt-6">
            <ApplicationOffer applicationId={selected.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  bg,
  label,
  value,
}: {
  icon: React.ReactNode;
  bg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4 py-4">
        <div
          className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-white`}
        >
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}
