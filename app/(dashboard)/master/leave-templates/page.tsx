"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Layers,
  PlusCircle,
  X,
} from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { useAuthStore } from "@/store/authStore";
import { Permissions } from "@/lib/permissions";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import {
  LeaveTemplate,
  LeaveTemplateItemForm,
} from "@/types/leaveTemplate.types";
import { History } from "lucide-react";
import LeaveTemplateAuditDrawer from "@/components/master/LeaveTemplateAuditDrawer";

const PAGE_SIZE = 10;

interface LeaveTypeOption {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
}

interface FormState {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  items: LeaveTemplateItemForm[];
}

const emptyForm = (): FormState => ({
  name: "",
  code: "",
  description: "",
  isActive: true,
  items: [],
});

const emptyItem = (): LeaveTemplateItemForm => ({
  leaveTypeId: "",
  leaveTypeName: "",
  leaveTypeCode: "",
  entitledDays: "",
  maxDays: undefined,
});

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card">
      <div className="card-body py-4 px-5">
        <div className="flex items-center gap-4">
          <div
            className={`${color} rounded-xl p-3 flex items-center justify-center`}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {value}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaveTemplatesPage() {
  useRequirePermission(Permissions.MasterData.LeaveTemplate.View);
  const canCreate = usePermission(Permissions.MasterData.LeaveTemplate.Create);
  const canEdit = usePermission(Permissions.MasterData.LeaveTemplate.Edit);
  const canDelete = usePermission(Permissions.MasterData.LeaveTemplate.Delete);
  const userId = useAuthStore((s) => s.user?.userId);

  const [templates, setTemplates] = useState<LeaveTemplate[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [page, setPage] = useState(1);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveTemplate | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<LeaveTemplate | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  const initialized = useRef(false);

  const openAudit = (t: LeaveTemplate) => {
    setAuditTarget(t);
    setAuditOpen(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [tRes, ltRes] = await Promise.all([
        api.get<LeaveTemplate[]>("/LeaveTemplate"),
        api.get<LeaveTypeOption[]>("/leave-types"),
      ]);
      setTemplates(tRes.data);
      // Ensure all IDs are strings for consistent comparison
      setLeaveTypes(ltRes.data.map((lt) => ({ ...lt, id: String(lt.id) })));
    } catch (err:any){
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load leave templates.",
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return templates.filter((t) => {
      const matchSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q);
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && t.isActive) ||
        (filterStatus === "inactive" && !t.isActive);
      return matchSearch && matchStatus;
    });
  }, [templates, search, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalActive = templates.filter((t) => t.isActive).length;
  const totalInactive = templates.filter((t) => !t.isActive).length;
  const totalLeaveTypeCount = [
    ...new Set(templates.flatMap((t) => t.items.map((i) => i.leaveTypeId))),
  ].length;

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (t: LeaveTemplate) => {
    setEditing(t);
    setForm({
      name: t.name,
      code: t.code,
      description: t.description ?? "",
      isActive: t.isActive,
      items: t.items.map((i) => ({
        leaveTypeId: String(i.leaveTypeId),
        leaveTypeName: i.leaveTypeName,
        leaveTypeCode: i.leaveTypeCode,
        entitledDays: i.entitledDays,
        maxDays: leaveTypes.find((lt) => lt.id === String(i.leaveTypeId))
          ?.daysPerYear,
      })),
    });
    setDialogOpen(true);
  };

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));

  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const updateItemType = (idx: number, leaveTypeId: string) => {
    const lt = leaveTypes.find((l) => l.id === leaveTypeId);
    if (!lt) return;
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx
          ? {
              leaveTypeId: lt.id,
              leaveTypeName: lt.name,
              leaveTypeCode: lt.code,
              entitledDays: "",
              maxDays: lt.daysPerYear,
            }
          : item,
      ),
    }));
  };

  const updateItemDays = (idx: number, val: string) => {
    const maxDays = form.items[idx]?.maxDays;
    if (maxDays !== undefined && Number(val) > maxDays) return;
    setForm((f) => ({
      ...f,
      items: f.items.map((item, i) =>
        i === idx ? { ...item, entitledDays: val } : item,
      ),
    }));
  };

  const selectedIds = (excludeIdx: number) =>
    form.items
      .map((it, i) => (i !== excludeIdx ? it.leaveTypeId : ""))
      .filter(Boolean);

  const handleSave = async () => {
    if (!form.name.trim()) {
      showError("Template name is required.");
      return;
    }
    if (!form.code.trim()) {
      showError("Template code is required.");
      return;
    }
    if (form.items.length === 0) {
      showError("Add at least one leave type.");
      return;
    }
    for (const it of form.items) {
      if (!it.leaveTypeId) {
        showError("Select a leave type for all items.");
        return;
      }
      if (!it.entitledDays || Number(it.entitledDays) <= 0) {
        showError("Entitled days must be greater than 0 for all items.");
        return;
      }
    }
    setSaving(true);
    try {
      await api.post("/LeaveTemplate/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        isActive: form.isActive,
        items: form.items.map((it) => ({
          leaveTypeId: it.leaveTypeId,
          entitledDays: Number(it.entitledDays),
        })),
        userId,
      });
      showSuccess(editing ? "Template updated." : "Template created.");
      setDialogOpen(false);
      load();
    } catch (err: any) {
      showError(
        "Failed to save",
        err?.response?.data?.error ?? "Failed to save template.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (t: LeaveTemplate) => {
    setDeleteTarget(t);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("/LeaveTemplate/save", {
        action: "DELETE",
        id: deleteTarget.id,
        userId,
      });
      showSuccess("Template deleted.");
      setConfirmOpen(false);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.error ?? "Failed to delete template.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            Leave Templates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Define reusable leave packages assigned to employees on onboarding.
          </p>
        </div>
        {canCreate && (
          <Button variant="solid" icon={<Plus size={16} />} onClick={openAdd}>
            New Template
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Templates"
          value={templates.length}
          color="bg-blue-500"
          icon={<FileText size={20} className="text-white" />}
        />
        <StatCard
          label="Active"
          value={totalActive}
          color="bg-emerald-500"
          icon={<CheckCircle size={20} className="text-white" />}
        />
        <StatCard
          label="Inactive"
          value={totalInactive}
          color="bg-rose-500"
          icon={<XCircle size={20} className="text-white" />}
        />
        <StatCard
          label="Leave Types Used"
          value={totalLeaveTypeCount}
          color="bg-amber-500"
          icon={<Layers size={20} className="text-white" />}
        />
      </div>

      {/* Table card */}
      <div className="card">
        <div className="card-body">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="input input-sm pl-9 w-full"
                placeholder="Search name or code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="input input-sm w-40"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <span className="text-sm text-gray-500 self-center">
              {filtered.length} template{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading…</div>
          ) : paged.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No templates found.
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Leave Types</th>
                  <th>Total Days</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t) => {
                  const totalDays = t.items.reduce(
                    (s, i) => s + i.entitledDays,
                    0,
                  );
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="font-medium text-gray-800 dark:text-white">
                          {t.name}
                        </div>
                        {t.description && (
                          <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[220px]">
                            {t.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {t.code}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {t.items.map((i) => (
                            <span
                              key={i.leaveTypeId}
                              className="xp-badge xp-badge-info text-xs"
                            >
                              {i.leaveTypeCode} · {i.entitledDays}d
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {totalDays} days
                        </span>
                      </td>
                      <td>
                        <span
                          className={`xp-badge ${t.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                        >
                          {t.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEdit(t)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                          {/* {canDelete && (
                            <button
                              onClick={() => openDelete(t)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )} */}
                          <button
                            onClick={() => openAudit(t)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-500"
                            title="Audit History"
                          >
                            <History size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        title={editing ? "Edit Leave Template" : "New Leave Template"}
        width={680}
      >
        <div className="flex flex-col gap-5 py-1">
          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Template Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. FLEX Package"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">
                Code <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. FLEX"
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                }
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-gray-400 mt-1">
                  Code cannot be changed after creation.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Description</label>
            <textarea
              className="input w-full resize-none"
              rows={2}
              placeholder="Optional description…"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <Switcher
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Active
            </span>
          </div>

          {/* Leave type items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">
                Leave Types <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <PlusCircle size={15} /> Add Leave Type
              </button>
            </div>

            {form.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 py-6 text-center text-sm text-gray-400">
                No leave types added yet. Click "Add Leave Type" to start.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Leave Type
                  </span>
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Days / Year
                  </span>
                  <span />
                </div>

                {form.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_140px_36px] gap-2 items-center"
                  >
                    {/* Leave type — native select with explicit styling */}
                    <select
                      value={item.leaveTypeId}
                      onChange={(e) => updateItemType(idx, e.target.value)}
                      style={{
                        height: "40px",
                        width: "100%",
                        borderRadius: "10px",
                        border: "1px solid #e5e7eb",
                        backgroundColor: "#f3f4f6",
                        padding: "0 12px",
                        fontSize: "14px",
                        color: "#1f2937",
                        outline: "none",
                        appearance: "auto",
                      }}
                    >
                      <option value="">Select leave type…</option>
                      {leaveTypes.map((lt) => (
                        <option
                          key={lt.id}
                          value={lt.id}
                          disabled={selectedIds(idx).includes(lt.id)}
                        >
                          {lt.name} ({lt.code}) — max {lt.daysPerYear}d
                        </option>
                      ))}
                    </select>

                    {/* Days input */}
                    <div>
                      <input
                        type="number"
                        min={0.5}
                        step={0.5}
                        max={item.maxDays ?? undefined}
                        style={{
                          height: "40px",
                          width: "100%",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb",
                          backgroundColor: "#f3f4f6",
                          padding: "0 12px",
                          fontSize: "14px",
                          color: "#1f2937",
                          outline: "none",
                        }}
                        placeholder={
                          item.maxDays ? `Max ${item.maxDays}` : "e.g. 21"
                        }
                        value={item.entitledDays}
                        onChange={(e) => updateItemDays(idx, e.target.value)}
                      />
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}

                {/* Total row */}
                <div className="grid grid-cols-[1fr_140px_36px] gap-2 px-1 pt-1 border-t border-gray-100 dark:border-gray-700 mt-1">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 text-right pr-2">
                    Total
                  </span>
                  <span className="text-sm font-bold text-gray-800 dark:text-white pl-1">
                    {form.items.reduce(
                      (s, i) => s + (Number(i.entitledDays) || 0),
                      0,
                    )}{" "}
                    days
                  </span>
                  <span />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button
              variant="plain"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {editing ? "Update Template" : "Create Template"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm Delete */}
      <ConfirmDialog
        isOpen={confirmOpen}
        variant="danger"
        title="Delete Template"
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        loading={deleting}
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{deleteTarget?.name}</span>?
        </p>
        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
          Templates assigned to employees cannot be deleted.
        </p>
      </ConfirmDialog>

      <LeaveTemplateAuditDrawer
        templateId={auditTarget?.id ?? ""}
        templateName={auditTarget?.name ?? ""}
        open={auditOpen}
        onClose={() => {
          setAuditOpen(false);
          setAuditTarget(null);
        }}
      />
    </div>
  );
}
