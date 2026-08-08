'use client'
import { useRequirePermission } from '@/hooks/useRequirePermission'
import { useEffect, useRef, useState, useMemo } from "react";
import {
  PlusIcon,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
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

interface Group {
  id: string; name: string; code: string; description?: string | null;
  leadId?: string | null; leadName?: string | null;
  departmentId?: string | null; departmentName?: string | null;
  isActive: boolean;
}
interface Department { id: string; name: string; }
interface Employee { id: string; firstName: string; lastName: string; }

interface GroupForm {
  name: string; code: string; description: string;
  leadId: string; departmentId: string; isActive: boolean;
}
const EMPTY: GroupForm = {
  name: "",
  code: "",
  description: "",
  leadId: "",
  departmentId: "",
  isActive: true,
};

// ── Avatar helper ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40',     text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40',     text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300' },
  { bg: 'bg-pink-100 dark:bg-pink-900/40',     text: 'text-pink-700 dark:text-pink-300' },
]
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function GroupAvatar({ name }: { name: string }) {
  const c = avatarColor(name)
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.bg} ${c.text}`}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

// ── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10
function Pagination({ total, page, onChange }: { total: number; page: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  const nums: (number | '…')[] = []
  if (pages <= 7) { for (let i = 1; i <= pages; i++) nums.push(i) }
  else {
    nums.push(1)
    if (page > 3) nums.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i)
    if (page < pages - 2) nums.push('…')
    nums.push(pages)
  }
  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-sm text-gray-500">
        Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange(page - 1)}
          className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">‹</button>
        {nums.map((n, i) => n === '…'
          ? <span key={`e${i}`} className="px-2 text-gray-400">…</span>
          : <button key={n} onClick={() => onChange(n as number)}
              className={`w-8 h-8 text-sm rounded border ${page === n
                ? 'bg-primary text-white border-primary'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>{n}</button>
        )}
        <button disabled={page === pages} onClick={() => onChange(page + 1)}
          className="px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800">›</button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function GroupsPage() {
  const userId = useAuthStore((s) => s.user?.userId);
  useRequirePermission(Permissions.MasterData.Groups.View);
  const canManage = usePermission(Permissions.MasterData.Groups.Manage);
  const initialized = useRef(false);

  const [items, setItems] = useState<Group[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupForm>(EMPTY);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);

  // filter / pagination
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterDept, setFilterDept] = useState("");
  const [page, setPage] = useState(1);

  const load = async () => {
    try {
      const [grpRes, deptRes, empRes] = await Promise.all([
        api.get<Group[]>("groups"),
        api.get<Department[]>("departments"),
        api.get<Employee[]>("employees"),
      ]);
      setItems(grpRes.data);
      setDepartments(deptRes.data.filter((d: any) => d.isActive));
      setEmployees(empRes.data);
    } catch (err:any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load groups.",
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

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((g) => g.isActive).length;
    const inactive = total - active;
    const depts = new Set(items.map((g) => g.departmentId).filter(Boolean))
      .size;
    return { total, active, inactive, depts };
  }, [items]);

  // ── Filter + paginate ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((g) => {
      if (filterStatus === "active" && !g.isActive) return false;
      if (filterStatus === "inactive" && g.isActive) return false;
      if (filterDept && g.departmentId !== filterDept) return false;
      if (
        q &&
        !g.name.toLowerCase().includes(q) &&
        !g.code.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [items, search, filterStatus, filterDept]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );
  const resetPage = () => setPage(1);

  // ── Form helpers ───────────────────────────────────────────────────────────
  const f =
    (field: keyof GroupForm) =>
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
  const openEdit = (item: Group) => {
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
      await api.post("groups/save", {
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
      showSuccess(editing ? "Group Updated" : "Group Added", form.name);
    } catch (e: any) {
      showError(
        "Save failed",
        e?.response?.data?.error ?? "Failed to save group.",
      );
    } finally {
      setSaving(false);
    }
  };

  const promptDelete = (item: Group) => {
    setDeleteTarget(item);
    setConfirmOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("groups/save", {
        action: "DELETE",
        id: deleteTarget.id,
        userId: userId,
      });
      setConfirmOpen(false);
      setDeleteTarget(null);
      await load();
      showSuccess("Group Removed", deleteTarget.name);
    } catch (e:any){
      showError(
        "Delete Failed",
        e?.response?.data?.error ?? "Could not remove group.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Groups</h3>
          <p className="text-gray-500 mt-1">
            Manage employee groups and their leads.
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            icon={<PlusIcon size={16} />}
            onClick={openAdd}
          >
            Add Group
          </Button>
        )}
      </div>

      {/* ── KPI stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Groups",
            value: stats.total,
            icon: <Users size={20} />,
            bg: "bg-blue-500",
          },
          {
            label: "Active",
            value: stats.active,
            icon: <UserCheck size={20} />,
            bg: "bg-emerald-500",
          },
          {
            label: "Inactive",
            value: stats.inactive,
            icon: <UserX size={20} />,
            bg: "bg-rose-500",
          },
          {
            label: "Departments",
            value: stats.depts,
            icon: <Building2 size={20} />,
            bg: "bg-amber-400",
          },
        ].map((card) => (
          <div key={card.label} className="card">
            <div className="card-body flex items-center gap-4 py-4">
              <div
                className={`w-11 h-11 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${card.bg}`}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold heading-text leading-none">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                className="input w-full pl-8 h-9 text-sm"
                placeholder="Search name or code…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
              />
            </div>
            <select
              className="input h-9 text-sm w-36"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as any);
                resetPage();
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              className="input h-9 text-sm w-44"
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                resetPage();
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {(search || filterStatus !== "all" || filterDept) && (
              <button
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                  setFilterDept("");
                  resetPage();
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>GROUP</th>
                    <th>DEPARTMENT</th>
                    <th>LEAD</th>
                    <th>STATUS</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-10 text-gray-400"
                      >
                        {search || filterStatus !== "all" || filterDept
                          ? "No groups match your filters."
                          : "No groups found. Add your first group."}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <GroupAvatar name={item.name} />
                            <div>
                              <p className="font-medium heading-text leading-tight">
                                {item.name}
                              </p>
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                                {item.code}
                              </code>
                            </div>
                          </div>
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
                                className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-gray-500 hover:text-violet-600 transition-colors"
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
              <Pagination
                total={filtered.length}
                page={page}
                onChange={setPage}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Add / Edit dialog ── */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-lg">
          <h5 className="h5 mb-5">{editing ? "Edit Group" : "Add Group"}</h5>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={f("name")}
                  placeholder="Group name"
                />
              </div>
              <div>
                <label className="form-label">
                  Code <span className="text-red-500">*</span>
                </label>
                <Input
                  value={form.code}
                  onChange={f("code")}
                  placeholder="GRP001"
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
                id="group_active"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
                className="w-4 h-4 rounded border-gray-300 text-primary"
              />
              <label
                htmlFor="group_active"
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

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Group"
        message={deleteTarget ? `Remove group "${deleteTarget.name}"?` : ""}
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}