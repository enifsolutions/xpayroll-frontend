"use client";

import { useEffect, useState } from "react";
import { Trash2, PlusIcon } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { showSuccess, showError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type {
  Permission,
  UserWithRole,
  PermissionOverride,
} from "@/types/roles.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  user: UserWithRole;
  permissions: Permission[];
};

const EMPTY_FORM = { permissionId: "", isGranted: true, reason: "" };

export default function UserOverridesDialog({
  isOpen,
  onClose,
  user,
  permissions,
}: Props) {
  const actingUserId = useAuthStore((s) => s.user?.userId ?? "1");

  const [overrides, setOverrides] = useState<PermissionOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/roles/users/${user.id}/overrides`);
      setOverrides(res.data.map((o: any) => ({ ...o, id: String(o.id) })));
    } catch {
      showError("Load Failed", "Could not load overrides.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const handleAdd = async () => {
    if (!form.permissionId) return;
    setSaving(true);
    try {
      await api.post("/roles/users/overrides/save", {
        action: "ADD",
        userId: user.id,
        permissionId: form.permissionId,
        isGranted: form.isGranted,
        reason: form.reason || null,
        actingUserId,
      });
      setAddOpen(false);
      setForm(EMPTY_FORM);
      await load();
      showSuccess("Saved", "Override added.");
    } catch (e: any) {
      showError(
        "Save Failed",
        e?.response?.data?.detail ?? "Could not save override.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.post("/roles/users/overrides/save", {
        action: "DELETE",
        id,
        actingUserId,
      });
      await load();
      showSuccess("Removed", "Override removed.");
    } catch {
      showError("Delete Failed", "Could not remove override.");
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h5 className="h5">Permission Overrides</h5>
            <p className="text-xs text-gray-500 mt-0.5">
              {user.firstName} {user.lastName} · {user.email}
            </p>
          </div>
          <Button
            variant="solid"
            icon={<PlusIcon size={14} />}
            onClick={() => {
              setAddOpen(true);
              setForm(EMPTY_FORM);
            }}
          >
            Add Override
          </Button>
        </div>

        {/* Add form */}
        {addOpen && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Permission</label>
                <select
                  className="input w-full"
                  value={form.permissionId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, permissionId: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {permissions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.module}.{p.feature}.{p.action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Type</label>
                <select
                  className="input w-full"
                  value={form.isGranted ? "grant" : "deny"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      isGranted: e.target.value === "grant",
                    }))
                  }
                >
                  <option value="grant">Grant</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Reason (optional)</label>
              <input
                className="input w-full"
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="Why is this override needed?"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="plain" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="solid"
                onClick={handleAdd}
                loading={saving}
                disabled={!form.permissionId}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* Overrides list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : overrides.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            No overrides. User inherits all permissions from their assigned
            role.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {overrides.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm font-medium heading-text">
                    {o.displayName}
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {o.permissionKey}
                  </p>
                  {o.reason && (
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      {o.reason}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {o.isGranted ? (
                    <span className="xp-badge xp-badge-success">Grant</span>
                  ) : (
                    <span className="xp-badge xp-badge-danger">Deny</span>
                  )}
                  <button
                    onClick={() => handleDelete(o.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
          <Button variant="plain" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
