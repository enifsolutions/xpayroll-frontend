"use client";

import { useState, useRef, useEffect } from "react";
import { Shield, Users, Key, ClipboardList, PlusIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { showError } from "@/lib/toast";
import api from "@/lib/axios";
import type { Role, Permission, UserWithRole } from "@/types/roles.types";
import RolesTab from "@/components/roles/RolesTab";
import UsersTab from "@/components/roles/UsersTab";
import AuditTab from "@/components/roles/AuditTab";

const TABS = [
  { key: "roles", label: "Roles", icon: Shield },
  { key: "users", label: "User Assignment", icon: Users },
  { key: "audit", label: "Audit Log", icon: ClipboardList },
];

export default function RolesManagementPage() {
  const [activeTab, setActiveTab] = useState("roles");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTrigger, setAddTrigger] = useState(0);
  const initialized = useRef(false);

  const loadRoles = async () => {
    try {
      const res = await api.get("/roles");
      setRoles(res.data.map((r: any) => ({ ...r, id: String(r.id) })));
    } catch {
      showError("Load Failed", "Could not load roles.");
    }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get("/roles/permissions");
      setPermissions(res.data.map((p: any) => ({ ...p, id: String(p.id) })));
    } catch {
      showError("Load Failed", "Could not load permissions.");
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/roles/users");
      setUsers(
        res.data.map((u: any) => ({
          ...u,
          id: String(u.id),
          roleId: u.roleId ? String(u.roleId) : null,
        })),
      );
    } catch {
      showError("Load Failed", "Could not load users.");
    }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRoles(), loadPermissions(), loadUsers()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadAll();
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Roles & Permissions</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage roles, assign permissions and control user access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
            <Shield size={14} className="text-primary" />
            <span>{roles.length} roles</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800">
            <Key size={14} className="text-warning" />
            <span>{permissions.length} permissions</span>
          </div>
          {activeTab === "roles" && (
            <Button
              variant="solid"
              icon={<PlusIcon size={15} />}
              onClick={() => setAddTrigger((n) => n + 1)}
            >
              Add Role
            </Button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="card">
        <div className="card-body p-0">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 dark:border-gray-700 px-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {activeTab === "roles" && (
                  <RolesTab
                    roles={roles}
                    permissions={permissions}
                    onRefresh={loadRoles}
                    addTrigger={addTrigger}
                  />
                )}
                {activeTab === "users" && (
                  <UsersTab
                    users={users}
                    roles={roles}
                    permissions={permissions}
                    onRefresh={loadUsers}
                  />
                )}
                {activeTab === "audit" && <AuditTab />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
