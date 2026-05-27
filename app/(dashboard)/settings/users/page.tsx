"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon, Pencil, Trash2, KeyRound } from "lucide-react";
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

const EMPTY_FORM: SaveUserPayload = {
  id: null,
  employeeId: null,
  roleId: null,
  email: "",
  firstName: "",
  lastName: "",
  systemRole: null,
  isActive: true,
  userId: "1",
  action: "ADD",
};

export default function UsersPage() {
  useRequirePermission("Settings.Users.View");

  const userId = useAuthStore((s) => s.user?.userId ?? "1");
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
    } catch {
      showError("Load Failed", "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

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

  // const openReset = (u: UserDto) => {
  //   setResetTarget(u);
  //   setNewPassword("");
  //   setPwdError("");
  //   setResetOpen(true);
  // };

  const validate = (): boolean => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return false;
    }
    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return false;
    }
    if (!editing) {
      if (!form.email?.trim()) {
        setError("Email is required.");
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    setError("");
    if (!validate()) return;
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
        e?.response?.data?.message ?? "Could not save user.",
      );
    }
  };

  const openDelete = (u: UserDto) => {
    setDeleteTarget(u);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
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
    } catch {
      showError("Delete Failed", "Could not delete user.");
    }
  };

  const openReset = (u: UserDto) => {
    setResetTarget(u);
    setResetOpen(true);
  };

  const handleReset = async () => {
    if (!resetTarget) return;
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
    } catch {
      showError("Reset Failed", "Could not reset password.");
    }
  };

  // const handleResetPassword = async () => {
  //   setPwdError("");
  //   if (!newPassword || newPassword.length < 8) {
  //     setPwdError("Password must be at least 8 characters.");
  //     return;
  //   }
  //   try {
  //     await axios.post("/users/save", {
  //       id: resetTarget!.id,
  //       firstName: resetTarget!.firstName,
  //       lastName: resetTarget!.lastName,
  //       password: newPassword,
  //       action: "UPDATE",
  //       userId,
  //     });
  //     setResetOpen(false);
  //     showSuccess(
  //       "Password Reset",
  //       `Password updated for ${resetTarget!.firstName}.`,
  //     );
  //   } catch {
  //     showError("Reset Failed", "Could not reset password.");
  //   }
  // };

  const set = (key: keyof SaveUserPayload, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">User Accounts</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage system user access and role assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
            <span>{users.length} users</span>
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
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
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
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-8 text-gray-400"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="heading-text">
                        {u.firstName} {u.lastName}
                      </td>
                      <td>{u.email}</td>
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
                        {u.employeeName ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-sm text-gray-500">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString()
                          : "—"}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
              {roles.map((r: RoleOption) => (
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
              {employees.map((e: EmployeeOption) => (
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
