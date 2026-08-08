"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  PlusIcon,
  Pencil,
  Trash2,
  KeyRound,
  Users,
  ShieldCheck,
  Clock,
  Crown,
  Search,
  Download,
  SlidersHorizontal,
  LogIn,
  UserPlus,
  History,
} from "lucide-react";
import axios from "@/lib/axios";
import { useAuthStore } from "@/store/authStore";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { showSuccess, showError } from "@/lib/toast";
import type {
  UserDto,
  SaveUserPayload,
  RoleOption,
  EmployeeOption,
} from "@/types/users.types";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import UserActivityDrawer from "@/components/users/UserActivityDrawer";

const EMPTY_FORM: SaveUserPayload = {
  id: null,
  employeeId: null,
  roleId: null,
  email: "",
  firstName: "",
  lastName: "",
  systemRole: null,
  isActive: true,
  userId: "",
  action: "ADD",
};

const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-orange-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatTimeAgo(date: string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function UsersPage() {
  useRequirePermission("Settings.Users.View");

  const userId = useAuthStore((s) => s.user?.userId);
  const canCreate = usePermission("Settings.Users.Create");
  const canEdit = usePermission("Settings.Users.Edit");
  const canDelete = usePermission("Settings.Users.Delete");
  const canReset = usePermission("Settings.Users.ResetPassword");

  const initialized = useRef(false);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserDto | null>(null);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [form, setForm] = useState<SaveUserPayload>({ ...EMPTY_FORM });
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Activity drawer
  const [activityUser, setActivityUser] = useState<UserDto | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [uRes, rRes, eRes] = await Promise.all([
        axios.get("/users"),
        axios.get("/roles"),
        axios.get("/employees"),
      ]);
      setUsers(uRes.data ?? []);
      setRoles(rRes.data ?? []);
      setEmployees(
        (eRes.data ?? []).map((e: any) => ({
          id: e.id,
          employeeName: `${e.firstName} ${e.lastName}`,
          email: e.email,
        })),
      );
    } catch (err:any){
      showError(
        "Load Failed",
        err?.response?.data?.error ?? "Could not load users.",
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

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const tempPasswordUsers = users.filter((u) => u.isTempPassword).length;
  const superUsers = users.filter(
    (u) => u.systemRole === "SuperAdmin" || u.systemRole === "CompanySuperUser",
  ).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.roleName ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const recentActivity = useMemo(() => {
    return [...users]
      .filter((u) => u.lastLoginAt)
      .sort(
        (a, b) =>
          new Date(b.lastLoginAt!).getTime() -
          new Date(a.lastLoginAt!).getTime(),
      )
      .slice(0, 5);
  }, [users]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, userId });
    setError("");
    setDialogOpen(true);
  };
  const openEdit = (u: UserDto) => {
    setEditing(u);
    setForm({
      id: u.id,
      employeeId: u.employeeId ?? null,
      roleId: u.roleId ?? null,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      systemRole: u.systemRole ?? null,
      isActive: u.isActive,
      userId,
      action: "UPDATE",
    });
    setError("");
    setDialogOpen(true);
  };
  const openActivity = (u: UserDto) => {
    setActivityUser(u);
    setActivityOpen(true);
  };

  const validate = (): boolean => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return false;
    }
    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return false;
    }
    if (!editing && !form.email?.trim()) {
      setError("Email is required.");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError("");
    if (!validate()) return;
    if (!userId) {
      setError("Session not fully loaded yet — please refresh and try again.");
      return;
    }
    try {
      await axios.post("/users/save", { ...form, userId });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "User Updated" : "User Created",
        `${form.firstName} ${form.lastName}`,
      );
    } catch (e: any) {
      showError(
        "Save Failed",
        e?.response?.data?.error ?? "Could not save user.",
      );
    }
  };

  const openDelete = (u: UserDto) => {
    setDeleteTarget(u);
    setDeleteOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    try {
      await axios.post("/users/save", {
        id: deleteTarget.id,
        action: "DELETE",
        userId,
        firstName: deleteTarget.firstName,
        lastName: deleteTarget.lastName,
      });
      setDeleteOpen(false);
      await load();
      showSuccess(
        "User Deleted",
        `${deleteTarget.firstName} ${deleteTarget.lastName} removed.`,
      );
    } catch (err: any) {
      showError(
        "Delete Failed",
        err?.response?.data?.error ?? "Could not delete user.",
      );
    }
  };

  const openReset = (u: UserDto) => {
    setResetTarget(u);
    setResetOpen(true);
  };
  const handleReset = async () => {
    if (!resetTarget) return;
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    try {
      await axios.post(`/users/${resetTarget.id}/reset-password`, {
        email: resetTarget.email,
        firstName: resetTarget.firstName,
        lastName: resetTarget.lastName,
        userId,
      });
      setResetOpen(false);
      showSuccess(
        "Password Reset",
        `A temporary password has been sent to ${resetTarget.email}.`,
      );
    } catch (err: any) {
      showError(
        "Reset Failed",
        err?.response?.data?.error ?? "Could not reset password.",
      );
    }
  };

  const set = (key: keyof SaveUserPayload, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (
        let i = Math.max(2, page - 1);
        i <= Math.min(totalPages - 1, page + 1);
        i++
      )
        pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return (
      <div className="flex items-center justify-between mt-4 px-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {Math.min(page * PAGE_SIZE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {filtered.length}
          </span>{" "}
          entries
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            ‹
          </button>
          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={`e-${i}`}
                className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => setPage(p as number)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-primary text-white" : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
              >
                {p}
              </button>
            ),
          )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">User Accounts</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage system access levels and user profiles.
          </p>
        </div>
        {canCreate && (
          <Button
            variant="solid"
            onClick={openAdd}
            icon={<PlusIcon size={15} />}
          >
            Add User
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total Users",
            value: totalUsers,
            icon: <Users size={22} className="text-white" />,
            bg: "bg-blue-500",
          },
          {
            label: "Active Users",
            value: activeUsers,
            icon: <ShieldCheck size={22} className="text-white" />,
            bg: "bg-emerald-500",
          },
          {
            label: "Pending Auth",
            value: tempPasswordUsers,
            icon: <Clock size={22} className="text-white" />,
            bg: "bg-amber-400",
          },
          {
            label: "Super Users",
            value: superUsers,
            icon: <Crown size={22} className="text-white" />,
            bg: "bg-rose-500",
          },
        ].map((c) => (
          <div key={c.label} className="card">
            <div className="card-body flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}
              >
                {c.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {c.label}
                </p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                  {c.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <SlidersHorizontal size={14} /> Filters
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Download size={14} /> Export
              </button>
            </div>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name or email..."
                className="input pl-8 py-1.5 text-sm w-64"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table-default table-hover w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Linked Employee</th>
                      <th>Last Login</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-8 text-gray-400"
                        >
                          {search
                            ? "No users match your search."
                            : "No users found."}
                        </td>
                      </tr>
                    )}
                    {paginated.map((u) => {
                      const initials = getInitials(u.firstName, u.lastName);
                      const avatarColor = getAvatarColor(
                        `${u.firstName}${u.lastName}`,
                      );
                      return (
                        <tr key={u.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center flex-shrink-0`}
                              >
                                <span className="text-white text-xs font-semibold">
                                  {initials}
                                </span>
                              </div>
                              <span className="heading-text font-medium">
                                {u.firstName} {u.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="text-sm">{u.email}</td>
                          <td>
                            {u.roleName || u.systemRole ? (
                              <span className="xp-badge xp-badge-info">
                                {u.roleName ?? u.systemRole}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td>
                            {u.employeeName ? (
                              <span className="text-sm font-medium text-primary">
                                {u.employeeName}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="text-sm text-gray-500">
                            {u.lastLoginAt
                              ? formatTimeAgo(u.lastLoginAt)
                              : "Never"}
                          </td>
                          <td>
                            <div className="flex flex-col gap-1">
                              <span
                                className={`xp-badge ${u.isActive ? "xp-badge-success" : "xp-badge-danger"}`}
                              >
                                {u.isActive ? "Active" : "Inactive"}
                              </span>
                              {u.isTempPassword && (
                                <span className="xp-badge xp-badge-warning">
                                  Temp Password
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="flex justify-end gap-1">
                              {/* Activity log */}
                              <button
                                className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500"
                                title="Activity Log"
                                onClick={() => openActivity(u)}
                              >
                                <History size={15} />
                              </button>
                              {canEdit && (
                                <>
                                  {canReset && (
                                    <button
                                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                                      title="Reset Password"
                                      onClick={() => openReset(u)}
                                    >
                                      <KeyRound size={15} />
                                    </button>
                                  )}
                                  <button
                                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500"
                                    title="Edit"
                                    onClick={() => openEdit(u)}
                                  >
                                    <Pencil size={15} />
                                  </button>
                                </>
                              )}
                              {canDelete && (
                                <button
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                                  title="Delete"
                                  onClick={() => openDelete(u)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-body">
            <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-4">
              Recent Activity
            </h5>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                No recent logins.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-start gap-3 cursor-pointer group"
                    onClick={() => openActivity(u)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${getAvatarColor(`${u.firstName}${u.lastName}`)} flex items-center justify-center flex-shrink-0 mt-0.5`}
                    >
                      <LogIn size={13} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
                        {u.firstName} {u.lastName} logged in
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {formatTimeAgo(u.lastLoginAt)} • {u.email}
                      </p>
                    </div>
                    <History
                      size={13}
                      className="text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0"
                    />
                  </div>
                ))}
                {users
                  .filter((u) => u.isTempPassword)
                  .slice(0, 2)
                  .map((u) => (
                    <div
                      key={`new-${u.id}`}
                      className="flex items-start gap-3 cursor-pointer group"
                      onClick={() => openActivity(u)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${getAvatarColor(`${u.firstName}${u.lastName}`)} flex items-center justify-center flex-shrink-0 mt-0.5`}
                      >
                        <UserPlus size={13} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
                          User created:{" "}
                          <span className="text-primary">
                            {u.firstName} {u.lastName}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Awaiting first login
                        </p>
                      </div>
                      <History
                        size={13}
                        className="text-gray-300 dark:text-gray-600 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0"
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Security Overview */}
        <div className="card">
          <div className="card-body">
            <h5 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Security Overview
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              User account health at a glance.
            </p>
            <div className="space-y-5">
              {[
                {
                  label: "Active user rate",
                  value: `${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%`,
                  pct:
                    totalUsers > 0
                      ? Math.round((activeUsers / totalUsers) * 100)
                      : 0,
                  color: "bg-emerald-500",
                },
                {
                  label: "Pending first login",
                  value: `${tempPasswordUsers} user${tempPasswordUsers !== 1 ? "s" : ""}`,
                  pct:
                    totalUsers > 0
                      ? Math.round((tempPasswordUsers / totalUsers) * 100)
                      : 0,
                  color: "bg-amber-400",
                },
                {
                  label: "Users with assigned role",
                  value: `${users.filter((u) => u.roleId || u.systemRole).length} / ${totalUsers}`,
                  pct:
                    totalUsers > 0
                      ? Math.round(
                          (users.filter((u) => u.roleId || u.systemRole)
                            .length /
                            totalUsers) *
                            100,
                        )
                      : 0,
                  color: "bg-blue-500",
                },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-300">
                      {row.label}
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {row.value}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${row.color} rounded-full transition-all duration-700`}
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Ensure all active users have an assigned role and linked
                employee record for full RBAC coverage.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Drawer */}
      <UserActivityDrawer
        user={activityUser}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
      />

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit User" : "Add User"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                First Name <span className="text-error">*</span>
              </label>
              <Input
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="form-label">
                Last Name <span className="text-error">*</span>
              </label>
              <Input
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <label className="form-label">
              Email {!editing && <span className="text-error">*</span>}
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="user@company.com"
              disabled={!!editing}
            />
          </div>
          <div>
            <label className="form-label">Role</label>
            <select
              className="input w-full"
              value={form.roleId ?? ""}
              onChange={(e) => set("roleId", e.target.value || null)}
            >
              <option value="">— Select role —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Linked Employee</label>
            <select
              className="input w-full"
              value={form.employeeId ?? ""}
              onChange={(e) => set("employeeId", e.target.value || null)}
            >
              <option value="">— None —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeName} ({e.email})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <Switcher
              checked={form.isActive ?? true}
              onChange={(v) => set("isActive", v)}
            />
            <span className="text-sm">Active</span>
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSave}>
              {editing ? "Update User" : "Create User"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset Password"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to reset the password for{" "}
            <strong className="text-gray-700 dark:text-gray-200">
              {resetTarget?.firstName} {resetTarget?.lastName}
            </strong>
            ?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A temporary password will be generated and sent to{" "}
            <strong className="text-gray-700 dark:text-gray-200">
              {resetTarget?.email}
            </strong>
            . The user must change it immediately after logging in.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleReset}>
              Send Temporary Password
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete User"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete{" "}
            <strong className="text-gray-700 dark:text-gray-200">
              {deleteTarget?.firstName} {deleteTarget?.lastName}
            </strong>
            ?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. The user will lose all access
            immediately.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleDelete}>
              Delete User
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}