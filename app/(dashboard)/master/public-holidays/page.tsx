'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import {
  PlusIcon,
  Pencil,
  Trash2,
  CalendarX,
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { PUBLIC_HOLIDAYS_STEPS } from "@/lib/tours/public-holidays";

interface PublicHoliday {
  id: string;
  name: string;
  description?: string;
  holidayDate: string;
  isOptional: boolean;
  createdAt: string;
}

interface PublicHolidayForm {
  name: string;
  description: string;
  holidayDate: string;
  isOptional: boolean;
}

interface IcsHoliday {
  name: string;
  description: string;
  holidayDate: string;
  isOptional: boolean;
  selected: boolean;
  duplicate: boolean;
}

const EMPTY: PublicHolidayForm = {
  name: "",
  description: "",
  holidayDate: "",
  isOptional: false,
};
const PAGE_SIZE = 10;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDateUTC(d: string) {
  return new Date(d + "T00:00:00Z");
}
function formatDateFull(d: string) {
  const dt = parseDateUTC(d);
  return `${MONTHS_FULL[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
}
function getDayOfWeek(d: string) {
  return parseDateUTC(d).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}
function getDaysRemaining(d: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseDateUTC(d).getTime() - today.getTime()) / 86400000);
}

function parseIcs(
  text: string,
): { name: string; description: string; holidayDate: string }[] {
  const results: { name: string; description: string; holidayDate: string }[] =
    [];
  const events = text.split("BEGIN:VEVENT");
  for (let i = 1; i < events.length; i++) {
    const block = events[i];
    const nameMatch = block.match(/^SUMMARY[^:]*:(.+)$/m);
    const descMatch = block.match(/^DESCRIPTION[^:]*:(.+)$/m);
    const dateMatch = block.match(/^DTSTART[^:]*:(\d{8})/m);
    if (!nameMatch || !dateMatch) continue;
    const raw = dateMatch[1];
    results.push({
      name: nameMatch[1].trim().replace(/\\n/g, " ").replace(/\\/g, ""),
      description: descMatch
        ? descMatch[1].trim().replace(/\\n/g, " ").replace(/\\/g, "")
        : "",
      holidayDate: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
    });
  }
  return results.sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
}

export default function PublicHolidaysPage() {
  const tour = useTour("admin-page-public-holidays", PUBLIC_HOLIDAYS_STEPS);
  useRequirePermission(Permissions.MasterData.PublicHolidays.View);
  const canManage = usePermission(Permissions.MasterData.PublicHolidays.Manage);
  const userId = useAuthStore((s) => s.user?.userId);

  const [items, setItems] = useState<PublicHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PublicHoliday | null>(null);
  const [form, setForm] = useState<PublicHolidayForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [page, setPage] = useState(1);
  const initialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ICS state
  const [icsDialogOpen, setIcsDialogOpen] = useState(false);
  const [icsStep, setIcsStep] = useState<"idle" | "preview">("idle");
  const [icsHolidays, setIcsHolidays] = useState<IcsHoliday[]>([]);
  const [icsFileName, setIcsFileName] = useState("");
  const [importing, setImporting] = useState(false);

  const load = async (year?: number) => {
    try {
      setLoading(true);
      const res = await api.get<PublicHoliday[]>(
        `/PublicHolidays?year=${year ?? yearFilter}`,
      );
      setItems(res.data);
      setPage(1);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load public holidays.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    load(yearFilter);
  }, [yearFilter]);

  // Pagination
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError("");
    setDialogOpen(true);
  };
  const openEdit = (item: PublicHoliday) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      holidayDate: item.holidayDate,
      isOptional: item.isOptional,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.holidayDate) {
      setError("Date is required.");
      return;
    }
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/PublicHolidays/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        holidayDate: form.holidayDate,
        isOptional: form.isOptional,
        userId,
      });
      setDialogOpen(false);
      await load(yearFilter);
      showSuccess(editing ? "Holiday updated" : "Holiday added", form.name);
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Could not save holiday.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PublicHoliday) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    try {
      await api.post("/PublicHolidays/save", {
        action: "DELETE",
        id: item.id,
        userId,
      });
      await load(yearFilter);
      showSuccess("Holiday deleted", item.name);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete holiday.",
      );
    }
  };

  // ICS
  const handleIcsFile = (file: File) => {
    if (!file.name.endsWith(".ics")) {
      showError("Invalid file", "Please upload a .ics calendar file.");
      return;
    }
    setIcsFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseIcs(text);
      if (parsed.length === 0) {
        showError(
          "No events found",
          "The .ics file contained no VEVENT entries.",
        );
        return;
      }
      const existingDates = new Set(items.map((i) => i.holidayDate));
      setIcsHolidays(
        parsed.map((h) => ({
          ...h,
          isOptional: false,
          selected: !existingDates.has(h.holidayDate),
          duplicate: existingDates.has(h.holidayDate),
        })),
      );
      setIcsStep("preview");
      setIcsDialogOpen(true);
    };
    reader.readAsText(file);
  };

  const handleIcsImport = async () => {
    const toImport = icsHolidays.filter((h) => h.selected && !h.duplicate);
    if (toImport.length === 0) {
      showError("Nothing selected", "Select at least one holiday to import.");
      return;
    }
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    setImporting(true);
    try {
      const res = await api.post<{ imported: number }>(
        "/PublicHolidays/batch-import",
        {
          holidays: toImport.map((h) => ({
            name: h.name,
            description: h.description || null,
            holidayDate: h.holidayDate,
            isOptional: h.isOptional,
          })),
          year: yearFilter,
          userId,
        },
      );
      setIcsDialogOpen(false);
      setIcsStep("idle");
      await load(yearFilter);
      showSuccess(
        "Import complete",
        `${res.data.imported} holiday${res.data.imported !== 1 ? "s" : ""} imported successfully.`,
      );
    } catch (err: any) {
      showError(
        "Import failed",
        err?.response?.data?.error ?? "Could not import holidays.",
      );
    } finally {
      setImporting(false);
    }
  };

  const toggleIcsSelect = (i: number) =>
    setIcsHolidays((prev) =>
      prev.map((h, idx) => (idx === i ? { ...h, selected: !h.selected } : h)),
    );
  const toggleAllIcs = (val: boolean) =>
    setIcsHolidays((prev) =>
      prev.map((h) => (h.duplicate ? h : { ...h, selected: val })),
    );
  const closeIcsDialog = () => {
    setIcsDialogOpen(false);
    setIcsStep("idle");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i);
  const mandatory = items.filter((h) => !h.isOptional).length;
  const optional = items.filter((h) => h.isOptional).length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = items.find((h) => parseDateUTC(h.holidayDate) >= today);
  const icsSelectable = icsHolidays.filter((h) => !h.duplicate);
  const icsSelected = icsSelectable.filter((h) => h.selected);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="h3">Public Holidays</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            Manage company-wide public holidays used in payroll and leave
            calculations for the upcoming fiscal year.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            //onClick={loadAll}
            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            data-tour="public-holidays-refresh-button"
            title="Refresh all"
          >
            <RefreshCw size={15} />
          </button>

          {canManage && (
            <Button
              variant="solid"
              icon={<PlusIcon size={16} />}
              onClick={openAdd}
              data-tour="public-holidays-add-button"
            >
              Add Holiday
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Total
                </p>
                <p className="text-2xl font-bold heading-text mt-0.5">
                  {loading ? "–" : String(items.length).padStart(2, "0")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Calendarized Holidays
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-purple-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Mandatory
                </p>
                <p className="text-2xl font-bold heading-text mt-0.5">
                  {loading ? "–" : String(mandatory).padStart(2, "0")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Fixed Company Days
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="m9 16 2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Optional
                </p>
                <p className="text-2xl font-bold heading-text mt-0.5">
                  {loading ? "–" : String(optional).padStart(2, "0")}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Floating Holidays
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
          }}
        >
          <div className="p-5 h-full flex flex-col justify-between">
            {upcoming ? (
              <>
                <span className="inline-block text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full w-fit mb-2">
                  UPCOMING
                </span>
                <div>
                  <p className="text-white font-bold text-base leading-tight">
                    {upcoming.name}
                  </p>
                  <p className="text-indigo-200 text-sm mt-0.5">
                    {formatDateFull(upcoming.holidayDate)}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="text-indigo-300 text-xs uppercase tracking-wider">
                    Days Remaining
                  </p>
                  <p className="text-white text-xl font-bold">
                    ~ {getDaysRemaining(upcoming.holidayDate)} Days
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="inline-block text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full w-fit mb-2">
                  UPCOMING
                </span>
                <p className="text-indigo-200 text-sm mt-2">
                  No upcoming holidays
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body">
          {/* Toolbar */}
          <div
            className="flex items-center justify-between mb-4"
            data-tour="public-holidays-filter-row"
          >
            <div className="flex items-center gap-2">
              <h6 className="font-semibold heading-text">Holiday Schedule</h6>
              <span className="xp-badge xp-badge-info">{yearFilter} List</span>
              {!loading && items.length > 0 && (
                <span className="text-xs text-gray-400">
                  {items.length} holidays
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {years.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYearFilter(y)}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      yearFilter === y
                        ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
              {canManage && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".ics"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleIcsFile(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 text-sm font-medium"
                    data-tour="public-holidays-import-button"
                  >
                    <Upload size={14} /> Import .ics
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table
                className="table-default table-hover w-full"
                data-tour="public-holidays-table-card"
              >
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Holiday Name</th>
                    <th>Type</th>
                    <th className="w-24 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <div className="flex flex-col items-center py-14 text-gray-400">
                          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                            <CalendarX size={24} />
                          </div>
                          <p className="text-sm">
                            No holidays defined for {yearFilter}.
                          </p>
                          {canManage && (
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="text-primary text-sm mt-2 hover:underline flex items-center gap-1"
                            >
                              <Upload size={13} /> Import from .ics calendar
                              file
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paged.map((item) => {
                      const dt = parseDateUTC(item.holidayDate);
                      return (
                        <tr key={item.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center justify-center w-11 h-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
                                <span className="text-[10px] font-semibold text-primary uppercase leading-none">
                                  {MONTHS_SHORT[dt.getUTCMonth()]}
                                </span>
                                <span className="text-lg font-bold heading-text leading-tight">
                                  {dt.getUTCDate()}
                                </span>
                              </div>
                              <span className="font-medium heading-text">
                                {formatDateFull(item.holidayDate)}
                              </span>
                            </div>
                          </td>
                          <td className="text-gray-500 text-sm">
                            {getDayOfWeek(item.holidayDate)}
                          </td>
                          <td>
                            <p className="font-semibold heading-text">
                              {item.name}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-400 mt-0.5 max-w-sm truncate">
                                {item.description}
                              </p>
                            )}
                          </td>
                          <td>
                            <span
                              className={`xp-badge ${item.isOptional ? "xp-badge-warning" : "xp-badge-info"}`}
                            >
                              {item.isOptional ? "Optional" : "Mandatory"}
                            </span>
                          </td>
                          <td className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {canManage && (
                                <button
                                  onClick={() => openEdit(item)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20 transition-colors"
                                  title="Edit"
                                >
                                  <Pencil size={15} />
                                </button>
                              )}
                              {canManage && (
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, items.length)} of {items.length}{" "}
                    holidays
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (n) => (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            page === n
                              ? "bg-primary text-white"
                              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {n}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Holiday" : "Add Public Holiday"}
        </h5>
        <div className="space-y-4">
          <div>
            <label className="form-label">
              Name <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. Vesak Poya Day"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">
              Description{" "}
              <span className="text-gray-400 text-xs">(optional)</span>
            </label>
            <Input
              placeholder="e.g. Full Moon Poya Observance"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="form-label">
              Date <span className="text-error">*</span>
            </label>
            <Input
              type="date"
              value={form.holidayDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, holidayDate: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Optional Holiday</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Employees can choose whether to take this day off
              </p>
            </div>
            <Switcher
              checked={form.isOptional}
              onChange={(val) => setForm((f) => ({ ...f, isOptional: val }))}
            />
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update" : "Add Holiday"}
          </Button>
        </div>
      </Dialog>

      {/* ICS Import Dialog */}
      <Dialog
        isOpen={icsDialogOpen}
        onClose={closeIcsDialog}
        onRequestClose={closeIcsDialog}
      >
        <div style={{ width: "680px" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h5 className="h5">Import from Calendar</h5>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                {icsFileName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 rounded-full bg-primary text-white">
                1 Preview
              </span>
              <span>→</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                2 Import
              </span>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 mb-4 text-sm">
            <span className="text-gray-500">
              Found{" "}
              <strong className="heading-text">{icsHolidays.length}</strong>{" "}
              events
            </span>
            <span className="text-orange-500 flex items-center gap-1">
              <AlertCircle size={13} />{" "}
              <strong>{icsHolidays.filter((h) => h.duplicate).length}</strong>{" "}
              already exist
            </span>
            <span className="text-success flex items-center gap-1">
              <CheckCircle2 size={13} /> <strong>{icsSelected.length}</strong>{" "}
              selected to import
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => toggleAllIcs(true)}
                className="text-xs text-primary hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => toggleAllIcs(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                Deselect all
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-8 px-3 py-2"></th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {icsHolidays.map((h, i) => (
                  <tr
                    key={i}
                    className={`border-t border-gray-100 dark:border-gray-700 ${h.duplicate ? "opacity-50" : ""}`}
                  >
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={h.selected}
                        disabled={h.duplicate}
                        onChange={() => toggleIcsSelect(i)}
                        className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                      {formatDateFull(h.holidayDate)}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium heading-text">{h.name}</p>
                      {h.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {h.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {h.duplicate ? (
                        <span className="xp-badge xp-badge-warning">
                          Exists
                        </span>
                      ) : (
                        <span className="xp-badge xp-badge-success">New</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Button variant="plain" onClick={closeIcsDialog}>
              Cancel
            </Button>
            <Button
              variant="solid"
              loading={importing}
              onClick={handleIcsImport}
              disabled={icsSelected.length === 0}
            >
              Import{" "}
              {icsSelected.length > 0
                ? `${icsSelected.length} Holiday${icsSelected.length !== 1 ? "s" : ""}`
                : ""}
            </Button>
          </div>
        </div>
      </Dialog>

      {tour.visible && (
        <TourOverlay
          step={tour.step}
          stepIndex={tour.stepIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onPrev={tour.prev}
          onDismiss={tour.dismiss}
          nextStepTarget={tour.nextStep?.target}
        />
      )}
    </div>
  );
}