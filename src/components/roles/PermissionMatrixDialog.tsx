"use client";

import { useEffect, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { showSuccess, showError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type { Role, Permission } from "@/types/roles.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  permissions: Permission[];
};

type ModuleGroup = {
  module: string;
  features: { feature: string; permissions: Permission[] }[];
};

function groupPermissions(permissions: Permission[]): ModuleGroup[] {
  const map = new Map<string, Map<string, Permission[]>>();
  for (const p of permissions) {
    if (!map.has(p.module)) map.set(p.module, new Map());
    const fm = map.get(p.module)!;
    if (!fm.has(p.feature)) fm.set(p.feature, []);
    fm.get(p.feature)!.push(p);
  }
  return Array.from(map.entries()).map(([module, fm]) => ({
    module,
    features: Array.from(fm.entries()).map(([feature, perms]) => ({
      feature,
      permissions: perms,
    })),
  }));
}

export default function PermissionMatrixDialog({
  isOpen,
  onClose,
  role,
  permissions,
}: Props) {
  const userId = useAuthStore((s) => s.user?.userId);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const isReadOnly = role.isLocked;

  const groups = groupPermissions(permissions);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api
      .get(`/roles/${role.id}/permissions`)
      .then((res) =>
        setChecked(new Set(res.data.map((r: any) => String(r.permissionId)))),
      )
      .catch(() => showError("Load Failed", "Could not load role permissions."))
      .finally(() => setLoading(false));
  }, [isOpen, role.id]);

  const toggle = (id: string) => {
    if (isReadOnly) return;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    if (isReadOnly) return;
    const ids = permissions.filter((p) => p.module === module).map((p) => p.id);
    const allChecked = ids.every((id) => checked.has(id));
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    if (isReadOnly) return;
    const allChecked = permissions.every((p) => checked.has(p.id));
    setChecked(allChecked ? new Set() : new Set(permissions.map((p) => p.id)));
  };

  const handleSave = async () => {
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/roles/${role.id}/permissions/save`, {
        roleId: role.id,
        permissionIds: Array.from(checked),
        userId,
      });
      showSuccess("Saved", "Permissions updated successfully.");
      onClose();
    } catch (e: any) {
      showError(
        "Save Failed",
        e?.response?.data?.detail ?? "Could not save permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} className="max-w-3xl w-full">
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="h5">Permissions — {role.name}</h5>
              <p className="text-xs text-gray-500 mt-0.5">
                {isReadOnly
                  ? "System role — permissions are read-only"
                  : `${checked.size} of ${permissions.length} permissions selected`}
              </p>
            </div>
            {!isReadOnly && (
              <button
                onClick={toggleAll}
                className="text-xs text-primary hover:underline"
              >
                {permissions.every((p) => checked.has(p.id))
                  ? "Deselect all"
                  : "Select all"}
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-10">
              No permissions seeded yet.
            </p>
          ) : (
            groups.map((group) => {
              const moduleIds = permissions
                .filter((p) => p.module === group.module)
                .map((p) => p.id);
              const allChecked = moduleIds.every((id) => checked.has(id));
              const someChecked =
                moduleIds.some((id) => checked.has(id)) && !allChecked;
              return (
                <div
                  key={group.module}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* Module header */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someChecked;
                      }}
                      onChange={() => toggleModule(group.module)}
                      disabled={isReadOnly}
                      className="rounded"
                    />
                    <span className="font-semibold text-sm heading-text">
                      {group.module}
                    </span>
                    <span className="xp-badge xp-badge-neutral text-xs ml-auto">
                      {moduleIds.filter((id) => checked.has(id)).length} /{" "}
                      {moduleIds.length}
                    </span>
                  </div>
                  {/* Features */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {group.features.map((fg) => (
                      <div key={fg.feature} className="px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
                          {fg.feature}
                        </p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                          {fg.permissions.map((perm) => (
                            <label
                              key={perm.id}
                              className={`flex items-center gap-2 text-sm ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked.has(perm.id)}
                                onChange={() => toggle(perm.id)}
                                disabled={isReadOnly}
                                className="rounded"
                              />
                              <span
                                className={
                                  checked.has(perm.id)
                                    ? "text-gray-800 dark:text-gray-200"
                                    : "text-gray-400"
                                }
                              >
                                {perm.displayName}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="plain" onClick={onClose}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {saving ? "Saving…" : "Save Permissions"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
