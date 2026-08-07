"use client";

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { showSuccess, showError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type { Role, Permission, UserWithRole } from "@/types/roles.types";
import UserOverridesDialog from "./UserOverridesDialog";

type Props = {
  users: UserWithRole[];
  roles: Role[];
  permissions: Permission[];
  onRefresh: () => Promise<void>;
};

export default function UsersTab({
  users,
  roles,
  permissions,
  onRefresh,
}: Props) {
  const actingUserId = useAuthStore((s) => s.user?.userId);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [overrideUser, setOverrideUser] = useState<UserWithRole | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const filtered = users.filter((u) => {
    const name =
      `${u.firstName ?? ""} ${u.lastName ?? ""} ${u.email}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchRole = !filterRole || u.roleId === filterRole;
    return matchSearch && matchRole;
  });

  const handleAssign = async (userId: string, roleId: string | null) => {
    if (!actingUserId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    try {
      await api.post("/roles/users/assign", {
        userId,
        roleId,
        actingUserId,
      });
      await onRefresh();
      showSuccess("Updated", "User role updated.");
    } catch (e: any) {
      showError(
        "Update Failed",
        e?.response?.data?.detail ?? "Could not update user role.",
      );
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <input
            className="input w-full"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-full"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-default table-hover w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>System Role</th>
                <th>Assigned Role</th>
                <th>Status</th>
                <th className="text-center">Overrides</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-gray-400 text-sm"
                  >
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div>
                        <p className="font-medium heading-text">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </td>
                    <td>
                      {user.systemRole ? (
                        <span className="xp-badge xp-badge-info">
                          {user.systemRole}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td>
                      <select
                        className="input w-full text-sm"
                        value={user.roleId ?? ""}
                        onChange={(e) =>
                          handleAssign(user.id, e.target.value || null)
                        }
                      >
                        <option value="">— No Role —</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {user.isActive ? (
                        <span className="xp-badge xp-badge-success">
                          Active
                        </span>
                      ) : (
                        <span className="xp-badge xp-badge-danger">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setOverrideUser(user);
                            setOverrideOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                          title="Manage overrides"
                        >
                          <Settings2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {overrideUser && (
        <UserOverridesDialog
          isOpen={overrideOpen}
          onClose={() => setOverrideOpen(false)}
          user={overrideUser}
          permissions={permissions}
        />
      )}
    </>
  );
}
