'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useEffect, useRef, useState, useMemo } from "react";
import {
  PlusIcon,
  Pencil,
  Trash2,
  Users,
  CheckCircle,
  XCircle,
  Building2,
  Search,
} from "lucide-react";
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { showSuccess, showError } from '@/lib/toast'
import api from '@/lib/axios'
import { usePermission } from '@/hooks/usePermission'
import { Permissions } from '@/lib/permissions'
import { useAuthStore } from "@/store/authStore";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { CREWS_STEPS } from "@/lib/tours/crews";

interface Crew {
  id: string; name: string; code: string; description?: string | null;
  leadId?: string | null; leadName?: string | null;
  departmentId?: string | null; departmentName?: string | null;
  isActive: boolean;
}
interface Department { id: string; name: string; }
interface Employee { id: string; firstName: string; lastName: string; }

interface CrewForm {
  name: string; code: string; description: string;
  leadId: string; departmentId: string; isActive: boolean;
}
const EMPTY: CrewForm = {
  name: "",
  code: "",
  description: "",
  leadId: "",
  departmentId: "",
  isActive: true,
};

const PAGE_SIZE = 10;

export default function CrewsPage() {
  const tour = useTour("admin-page-crews", CREWS_STEPS);
  const userId = useAuthStore((s) => s.user?.userId);
  useRequirePermission(Permissions.MasterData.Crews.View);
  const canManage = usePermission(Permissions.MasterData.Crews.Manage);
  const initialized = useRef(false);

  const [items, setItems] = useState<Crew[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Crew | null>(null);
  const [form, setForm] = useState<CrewForm>(EMPTY);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Crew | null>(null);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [crewRes, deptRes, empRes] = await Promise.all([
        api.get<Crew[]>("crews"),
        api.get<Department[]>("departments"),
        api.get<Employee[]>("employees"),
      ]);
      setItems(crewRes.data);
      setDepartments(deptRes.data.filter((d: any) => d.isActive));
      setEmployees(empRes.data);
    } catch (err:any){
      showError(
        "Load Failed",
        err?.response?.data?.error ?? "Could not load crews.",
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

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.isActive).length;
    const inactive = items.filter((i) => !i.isActive).length;
    const withLead = items.filter((i) => !!i.leadId).length;
    return { total, active, inactive, withLead };
  }, [items]);

  // Filtered + paginated
  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.leadName ?? "").toLowerCase().includes(q) ||
          (i.departmentName ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter === "active") list = list.filter((i) => i.isActive);
    if (statusFilter === "inactive") list = list.filter((i) => !i.isActive);
    if (deptFilter) list = list.filter((i) => i.departmentId === deptFilter);
    return list;
  }, [items, search, statusFilter, deptFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatus = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };
  const onDept = (v: string) => {
    setDeptFilter(v);
    setPage(1);
  };

  const pageNums = (): (number | "...")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, "...", totalPages];
    if (page >= totalPages - 3)
      return [
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  };

  const f =
    (field: keyof CrewForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setDialogOpen(true);
  };
  const openEdit = (item: Crew) => {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      description: item.description ?? "",
      leadId: item.leadId ?? "",
      departmentId: item.departmentId ?? "",
      isActive: item.isActive,
    });
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.code.trim()) {
      setError("Code is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("crews/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || null,
        leadId: form.leadId || null,
        departmentId: form.departmentId || null,
        isActive: form.isActive,
        userId: userId,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Crew Updated" : "Crew Added", form.name);
    } catch (e: any) {
      showError(
        "Save failed",
        e?.response?.data?.error ?? "Failed to save crew.",
      );
    } finally {
      setSaving(false);
    }
  };

  const promptDelete = (item: Crew) => {
    setDeleteTarget(item);
    setConfirmOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("crews/save", {
        action: "DELETE",
        id: deleteTarget.id,
        userId: userId,
      });
      setConfirmOpen(false);
      setDeleteTarget(null);
      await load();
      showSuccess("Crew Removed", deleteTarget.name);
    } catch (err:any){
      showError(
        "Delete Failed",
        err?.response?.data?.error ?? "Could not remove crew.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Crews</h3>
          <p className="text-gray-500 mt-1">
            Manage crew groups and their leads.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
            data-tour="crews-add-button"
          >
            Add Crew
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Crews",
            value: stats.total,
            icon: <Users size={20} className="text-white" />,
            bg: "bg-blue-500",
          },
          {
            label: "Active",
            value: stats.active,
            icon: <CheckCircle size={20} className="text-white" />,
            bg: "bg-emerald-500",
          },
          {
            label: "Inactive",
            value: stats.inactive,
            icon: <XCircle size={20} className="text-white" />,
            bg: "bg-rose-500",
          },
          {
            label: "With Lead",
            value: stats.withLead,
            icon: <Building2 size={20} className="text-white" />,
            bg: "bg-amber-400",
          },
        ].map((card) => (
          <div key={card.label} className="card">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className={`${card.bg} p-2.5 rounded-lg flex-shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold heading-text">
                    {card.value}
                  </p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {/* Filter Bar */}
          <div
            className="flex items-center gap-3 mb-4 flex-wrap"
            data-tour="crews-filter-row"
          >
            <div className="relative flex-1 min-w-0">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                className="input w-full pl-9"
                placeholder="Search by name, code, lead or department…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
            <select
              className="input w-full sm:w-40"
              value={statusFilter}
              onChange={(e) => onStatus(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="input w-full sm:w-48"
              value={deptFilter}
              onChange={(e) => onDept(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <span className="text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              {search || statusFilter || deptFilter ? " (filtered)" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table
                className="table-default table-hover w-full"
                data-tour="crews-table-card"
              >
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Lead</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-12 text-gray-400"
                      >
                        {search || statusFilter || deptFilter
                          ? "No crews match your filters."
                          : "No crews found."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {item.code}
                          </code>
                        </td>
                        <td className="font-medium heading-text">
                          {item.name}
                        </td>
                        <td className="text-gray-500">
                          {item.departmentName ?? "—"}
                        </td>
                        <td className="text-gray-500">
                          {item.leadName ?? "—"}
                        </td>
                        <td>
                          <span
                            className={`xp-badge ${item.isActive ? "xp-badge-success" : "xp-badge-neutral"}`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            {canManage && (
                              <button
                                onClick={() => openEdit(item)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {canManage && (
                              <button
                                onClick={() => promptDelete(item)}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <p className="text-sm text-gray-500">
                    Showing{" "}
                    {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                    {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                    {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2.5 py-1.5 rounded text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ‹
                    </button>
                    {pageNums().map((n, i) =>
                      n === "..." ? (
                        <span
                          key={`e${i}`}
                          className="px-2.5 py-1.5 text-sm text-gray-400"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n as number)}
                          className={`px-2.5 py-1.5 rounded text-sm border transition-colors ${
                            page === n
                              ? "bg-primary text-white border-primary"
                              : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
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
                      className="px-2.5 py-1.5 rounded text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      ›
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? "Edit Crew" : "Add Crew"}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={f("name")}
                  placeholder="Crew name"
                />
              </div>
              <div>
                <label className="form-label">
                  Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.code}
                  onChange={f("code")}
                  placeholder="CRW001"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Department</label>
              <select
                className="input w-full"
                value={form.departmentId}
                onChange={f("departmentId")}
              >
                <option value="">— Select Department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Lead</label>
              <select
                className="input w-full"
                value={form.leadId}
                onChange={f("leadId")}
              >
                <option value="">— Select Lead —</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Description</label>
              <textarea
                className="input w-full"
                rows={2}
                value={form.description}
                onChange={f("description")}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="crew_active"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <label
                htmlFor="crew_active"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Active
              </label>
            </div>
            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>
                {editing ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Crew"
        message={deleteTarget ? `Remove crew "${deleteTarget.name}"?` : ""}
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />

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
    </>
  );
}