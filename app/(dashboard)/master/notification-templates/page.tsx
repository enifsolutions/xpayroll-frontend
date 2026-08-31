'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from "@/components/ui/Input";
import { showSuccess, showError } from '@/lib/toast';
import {
  PlusIcon,
  Pencil,
  Trash2,
  Eye,
  Mail,
  MessageSquare,
  Bell,
  Monitor,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { NOTIFICATION_TEMPLATES_STEPS } from "@/lib/tours/notification-templates";

/* ─── Types ─────────────────────────────────────────── */
interface NotificationTemplate {
  id: string;
  code: string;
  channel: string;
  subject: string | null;
  bodyTemplate: string;
  status: string; // Active | Drafting | Inactive
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface TemplateForm {
  code: string;
  channel: string;
  subject: string;
  bodyTemplate: string;
  status: string;
}

const EMPTY: TemplateForm = {
  code: "",
  channel: "Email",
  subject: "",
  bodyTemplate: "",
  status: "Active",
};

const CHANNEL_OPTIONS = [
  { value: 'Email', label: 'Email' },
  { value: 'SMS',   label: 'SMS'   },
  { value: 'Push',  label: 'Push'  },
  { value: 'InApp', label: 'In-App'},
];

const STATUS_OPTIONS = ["Active", "Drafting", "Inactive"];

const PAGE_SIZE = 10;

/* ─── Helpers ───────────────────────────────────────── */
function channelBadge(channel: string) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    Email: { cls: "xp-badge-primary", icon: <Mail size={11} /> },
    SMS: { cls: "xp-badge-warning", icon: <MessageSquare size={11} /> },
    Push: { cls: "xp-badge-info", icon: <Bell size={11} /> },
    InApp: { cls: "xp-badge-neutral", icon: <Monitor size={11} /> },
  };
  const m = map[channel] ?? { cls: "xp-badge-neutral", icon: null };
  const label =
    CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel;
  return (
    <span className={`xp-badge ${m.cls} inline-flex items-center gap-1`}>
      {m.icon}
      {label}
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Active:   'xp-badge-success',
    Drafting: 'xp-badge-neutral',
    Inactive: 'xp-badge-danger',
  };
  return (
    <span className={`xp-badge ${map[status] ?? 'xp-badge-neutral'}`}>
      {status.toUpperCase()}
    </span>
  );
}

function subjectPreview(item: NotificationTemplate) {
  if (item.subject) return item.subject;
  const preview = item.bodyTemplate.replace(/\n/g, ' ').slice(0, 60);
  return <span className="text-gray-400 italic">{preview}…</span>;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ─── Page ───────────────────────────────────────────── */
export default function NotificationTemplatesPage() {
  const tour = useTour(
    "admin-page-notification-templates",
    NOTIFICATION_TEMPLATES_STEPS,
  );
  useRequirePermission(Permissions.MasterData.NotificationTemplates.View);
  const canManage = usePermission(
    Permissions.MasterData.NotificationTemplates.Manage,
  );

  const [items, setItems] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<NotificationTemplate | null>(
    null,
  );
  const [editing, setEditing] = useState<NotificationTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [channelFilter, setChannelFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const initialized = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<NotificationTemplate[]>(
        "/notification-templates",
      );
      setItems(res.data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load templates.",
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

  /* ── Stats ── */
  const stats = useMemo(() => {
    const active = items.filter((t) => t.status === "Active").length;
    const drafting = items.filter((t) => t.status === "Drafting").length;
    const inactive = items.filter((t) => t.status === "Inactive").length;
    const channels = new Set(items.map((t) => t.channel)).size;
    return { total: items.length, channels, drafting, active, inactive };
  }, [items]);

  /* ── Filter + Paginate ── */
  const filtered = useMemo(() => {
    let r = items;
    if (channelFilter) r = r.filter((t) => t.channel === channelFilter);
    if (statusFilter) r = r.filter((t) => t.status === statusFilter);
    return r;
  }, [items, channelFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [channelFilter, statusFilter]);

  /* ── Dialog helpers ── */
  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setFormError("");
    setDialogOpen(true);
  };
  const openEdit = (item: NotificationTemplate) => {
    setEditing(item);
    setForm({
      code: item.code,
      channel: item.channel,
      subject: item.subject ?? "",
      bodyTemplate: item.bodyTemplate,
      status: item.status,
    });
    setFormError("");
    setDialogOpen(true);
  };
  const openPreview = (item: NotificationTemplate) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      setFormError("Template code is required.");
      return;
    }
    if (!form.bodyTemplate.trim()) {
      setFormError("Body template is required.");
      return;
    }
    if (form.channel === "Email" && !form.subject.trim()) {
      setFormError("Subject is required for email templates.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api.post("/notification-templates/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        code: form.code.trim().toUpperCase().replace(/\s+/g, "_"),
        channel: form.channel,
        subject: form.subject.trim() || null,
        bodyTemplate: form.bodyTemplate.trim(),
        status: form.status,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Template updated" : "Template created", form.code);
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.error ?? "Could not save template.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: NotificationTemplate) => {
    if (!confirm(`Delete template "${item.code}"?`)) return;
    try {
      await api.post("/notification-templates/save", {
        action: "DELETE",
        id: item.id,
      });
      await load();
      showSuccess("Template deleted", item.code);
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Could not delete template.",
      );
    }
  };

  /* ── Pagination buttons ── */
  const paginationButtons = () => {
    const btns: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3) btns.push("…");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        btns.push(i);
      if (page < totalPages - 2) btns.push("…");
      btns.push(totalPages);
    }
    return btns;
  };

  /* ─────────────────────────────────────────────────── */
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="h3">Notification Templates</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Create and manage cross-channel automated communication templates
            for payroll events.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            data-tour="notification-templates-add-button"
          >
            Add Template
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Total Templates */}
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FileText
                  size={18}
                  className="text-blue-600 dark:text-blue-400"
                />
              </div>
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                +2 new today
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
              Total Templates
            </p>
            <p className="text-3xl font-bold heading-text mt-0.5">
              {String(stats.total).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Active Channels */}
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Monitor
                  size={18}
                  className="text-purple-600 dark:text-purple-400"
                />
              </div>
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 mt-0.5" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-0.5" />
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 mt-0.5" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
              Active Channels
            </p>
            <p className="text-3xl font-bold heading-text mt-0.5">
              {String(stats.channels).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Pending Updates */}
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Clock size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs text-red-500 font-semibold bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                Priority
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
              Pending Updates
            </p>
            <p className="text-3xl font-bold heading-text mt-0.5">
              {String(stats.drafting).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Delivery Success */}
        <div className="card">
          <div className="card-body p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <CheckCircle2
                  size={18}
                  className="text-teal-600 dark:text-teal-400"
                />
              </div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                99.2% Goal
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">
              Delivery Success
            </p>
            <p className="text-3xl font-bold heading-text mt-0.5">98.4%</p>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body">
          {/* Filter row */}
          <div
            className="flex items-center justify-between mb-4"
            data-tour="notification-templates-filter-row"
          >
            <div className="flex items-center gap-2">
              {/* Channel filter */}
              <div className="relative">
                <select
                  className="appearance-none pl-8 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 heading-text cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                >
                  <option value="">Filter By Channel</option>
                  {CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <SlidersHorizontal
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>

              {/* Status filter */}
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 heading-text cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Status: All</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            <span className="text-sm text-gray-400">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{" "}
              templates
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table
              className="table-default table-hover w-full"
              data-tour="notification-templates-table-card"
            >
              <thead>
                <tr>
                  <th>Template Code</th>
                  <th>Channel</th>
                  <th>Subject / Preview</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-gray-400">
                      No notification templates found
                    </td>
                  </tr>
                ) : (
                  paginated.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <button
                          onClick={() => openPreview(item)}
                          className="font-semibold text-primary hover:underline text-sm"
                        >
                          {item.code}
                        </button>
                      </td>
                      <td>{channelBadge(item.channel)}</td>
                      <td className="max-w-xs text-sm text-gray-500 truncate">
                        {subjectPreview(item)}
                      </td>
                      <td>{statusBadge(item.status)}</td>
                      <td className="text-sm text-gray-500">
                        {timeAgo(item.updatedAt ?? item.createdAt)}
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openPreview(item)}
                            title="Preview"
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          >
                            <Eye size={15} />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => openEdit(item)}
                                title="Edit"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30 transition-colors"
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
                                title="Delete"
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/30 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                {paginationButtons().map((b, i) =>
                  b === "…" ? (
                    <span key={`e${i}`} className="px-2 text-gray-400 text-sm">
                      …
                    </span>
                  ) : (
                    <button
                      key={b}
                      onClick={() => setPage(b as number)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === b
                          ? "bg-primary text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {b}
                    </button>
                  ),
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
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
          {editing ? "Edit Template" : "Add Notification Template"}
        </h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Template Code <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. PAYSLIP_READY"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                  }))
                }
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="form-label">Channel</label>
              <select
                className="input w-full"
                value={form.channel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, channel: e.target.value }))
                }
              >
                {CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.channel === "Email" && (
            <div>
              <label className="form-label">
                Subject <span className="text-error">*</span>
              </label>
              <Input
                placeholder="e.g. Your payslip for {{month}} is ready"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>
          )}

          <div>
            <label className="form-label">
              Body Template <span className="text-error">*</span>
            </label>
            <textarea
              className="input w-full h-36 resize-none font-mono text-sm"
              placeholder={`Hi {{employee_name}},\n\nYour payslip for {{period}} is ready...`}
              value={form.bodyTemplate}
              onChange={(e) =>
                setForm((f) => ({ ...f, bodyTemplate: e.target.value }))
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              Available placeholders: {"{{employee_name}}"},{" "}
              {"{{company_name}}"}, {"{{period}}"}, {"{{amount}}"}
            </p>
          </div>

          <div>
            <label className="form-label">Status</label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.status === s
                      ? s === "Active"
                        ? "bg-green-600 text-white border-green-600"
                        : s === "Drafting"
                          ? "bg-gray-500 text-white border-gray-500"
                          : "bg-red-500 text-white border-red-500"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-error text-sm">{formError}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Update" : "Create"}
          </Button>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onRequestClose={() => setPreviewOpen(false)}
      >
        <h5 className="h5 mb-4">Template Preview — {previewItem?.code}</h5>

        {previewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {channelBadge(previewItem.channel)}
              {statusBadge(previewItem.status)}
            </div>

            {previewItem.subject && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Subject
                </p>
                <p className="text-sm heading-text">{previewItem.subject}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Body
              </p>
              <pre className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg whitespace-pre-wrap font-mono">
                {previewItem.bodyTemplate}
              </pre>
            </div>

            <div className="text-xs text-gray-400">
              Last updated:{" "}
              {timeAgo(previewItem.updatedAt ?? previewItem.createdAt)}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button variant="plain" onClick={() => setPreviewOpen(false)}>
            Close
          </Button>
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