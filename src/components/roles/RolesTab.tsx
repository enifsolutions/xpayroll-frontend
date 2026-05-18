"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, Shield, ShieldCheck, Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { showSuccess, showError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type { Role, Permission } from "@/types/roles.types";
import PermissionMatrixDialog from "./PermissionMatrixDialog";

type Props = {
  roles: Role[];
  permissions: Permission[];
  onRefresh: () => Promise<void>;
  addTrigger?: number;
};

const EMPTY = { name: "", description: "" };

export default function RolesTab({
  roles,
  permissions,
  onRefresh,
  addTrigger,
}: Props) {
  const userId = useAuthStore((s) => s.user?.userId ?? "1");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [matrixRole, setMatrixRole] = useState<Role | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (addTrigger && addTrigger > 0) openAdd();
  }, [addTrigger]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditing(role);
    setForm({ name: role.name, description: role.description ?? "" });
    setError("");
    setDialogOpen(true);
  };

  const openMatrix = (role: Role) => {
    setMatrixRole(role);
    setMatrixOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Role name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/roles/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing ? editing.id : null,
        name: form.name.trim(),
        description: form.description.trim() || null,
        userId,
      });
      setDialogOpen(false);
      await onRefresh();
      showSuccess("Saved", editing ? "Role updated." : "Role created.");
    } catch (e: any) {
      showError(
        "Save Failed",
        e?.response?.data?.detail ?? "Could not save role.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await api.post("/roles/save", { action: "DELETE", id: role.id, userId });
      await onRefresh();
      showSuccess("Deleted", `Role "${role.name}" removed.`);
    } catch (e: any) {
      showError(
        "Delete Failed",
        e?.response?.data?.detail ?? "Could not delete role.",
      );
    }
  };

  const systemRoles = roles.filter((r) => r.isSystemRole);
  const customRoles = roles.filter((r) => !r.isSystemRole);

  return (
    <>
      <div className="space-y-6">
        {/* System Roles */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            System Roles
          </p>
          <div className="overflow-x-auto">
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Description</th>
                  <th className="text-center">Users</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {systemRoles.map((role) => (
                  <tr key={role.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={15} className="text-primary" />
                        <span className="font-medium heading-text">
                          {role.name}
                        </span>
                        <span className="xp-badge xp-badge-info">System</span>
                      </div>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {role.description ?? "—"}
                    </td>
                    <td className="text-center">
                      <span className="xp-badge xp-badge-neutral">
                        {role.userCount}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => openMatrix(role)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                          title="View permissions"
                        >
                          <Settings2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Custom Roles */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
            Custom Roles
          </p>
          {customRoles.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm border border-dashed rounded-lg">
              No custom roles yet. Click <strong>Add Role</strong> to create
              one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Description</th>
                    <th className="text-center">Users</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customRoles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Shield size={15} className="text-gray-400" />
                          <span className="font-medium heading-text">
                            {role.name}
                          </span>
                        </div>
                      </td>
                      <td className="text-gray-500 text-sm">
                        {role.description ?? "—"}
                      </td>
                      <td className="text-center">
                        <span className="xp-badge xp-badge-neutral">
                          {role.userCount}
                        </span>
                      </td>
                      <td>
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openMatrix(role)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                            title="Edit permissions"
                          >
                            <Settings2 size={15} />
                          </button>
                          <button
                            onClick={() => openEdit(role)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(role)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        className="max-w-md w-full"
      >
        <div className="p-6 space-y-4">
          <h5 className="h5">{editing ? "Edit Role" : "Add Role"}</h5>
          <div>
            <label className="form-label">
              Role Name <span className="text-error">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => {
                setForm((f) => ({ ...f, name: e.target.value }));
                setError("");
              }}
              placeholder="e.g. Finance Officer"
            />
          </div>
          <div>
            <label className="form-label">Description</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Optional description"
            />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="plain" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Permission Matrix Dialog */}
      {matrixRole && (
        <PermissionMatrixDialog
          isOpen={matrixOpen}
          onClose={() => setMatrixOpen(false)}
          role={matrixRole}
          permissions={permissions}
        />
      )}
    </>
  );
}
