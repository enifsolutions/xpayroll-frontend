"use client";
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { useState, useRef, useEffect } from 'react';
import {
  Shield, Users, Key, ClipboardList, PlusIcon,
  UserCheck, Lock,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { showError } from '@/lib/toast';
import api from '@/lib/axios';
import type { Role, Permission, UserWithRole } from '@/types/roles.types';
import RolesTab from '@/components/roles/RolesTab';
import UsersTab from '@/components/roles/UsersTab';
import AuditTab from '@/components/roles/AuditTab';

const TABS = [
  { key: 'roles',  label: 'Roles',          icon: Shield },
  { key: 'users',  label: 'User Assignment', icon: Users },
  { key: 'audit',  label: 'Audit Log',       icon: ClipboardList },
];

export default function RolesManagementPage() {
  useRequirePermission('Settings.Roles.View');
  const [activeTab,   setActiveTab]   = useState('roles');
  const [roles,       setRoles]       = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users,       setUsers]       = useState<UserWithRole[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addTrigger,  setAddTrigger]  = useState(0);
  const initialized = useRef(false);

  const loadRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.map((r: any) => ({ ...r, id: String(r.id) })));
    } catch { showError('Load Failed', 'Could not load roles.'); }
  };

  const loadPermissions = async () => {
    try {
      const res = await api.get('/roles/permissions');
      setPermissions(res.data.map((p: any) => ({ ...p, id: String(p.id) })));
    } catch { showError('Load Failed', 'Could not load permissions.'); }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/roles/users');
      setUsers(res.data.map((u: any) => ({
        ...u,
        id:     String(u.id),
        roleId: u.roleId ? String(u.roleId) : null,
      })));
    } catch { showError('Load Failed', 'Could not load users.'); }
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      await Promise.all([loadRoles(), loadPermissions(), loadUsers()]);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadAll();
  }, []);

  /* ── derived stats ── */
  const systemRoles   = roles.filter(r => r.isSystemRole).length;
  const customRoles   = roles.filter(r => !r.isSystemRole).length;
  const assignedUsers = users.filter(u => u.roleId).length;
  const lockedRoles   = roles.filter(r => r.isLocked).length;

  const stats = [
    {
      label: 'Total Roles',
      value: roles.length,
      sub:   `${systemRoles} system · ${customRoles} custom`,
      icon:  <Shield    size={20} className="text-white" />,
      bg:    'bg-blue-500',
    },
    {
      label: 'Permissions',
      value: permissions.length,
      sub:   'Across all modules',
      icon:  <Key       size={20} className="text-white" />,
      bg:    'bg-emerald-500',
    },
    {
      label: 'Assigned Users',
      value: assignedUsers,
      sub:   `${users.length - assignedUsers} unassigned`,
      icon:  <UserCheck size={20} className="text-white" />,
      bg:    'bg-amber-400',
    },
    {
      label: 'Locked Roles',
      value: lockedRoles,
      sub:   'System-protected',
      icon:  <Lock      size={20} className="text-white" />,
      bg:    'bg-rose-500',
    },
  ];

  return (
    <div>
      {/* page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Roles & Permissions</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage roles, assign permissions and control user access.
          </p>
        </div>
        {activeTab === 'roles' && (
          <Button
            variant="solid"
            icon={<PlusIcon size={15} />}
            onClick={() => setAddTrigger(n => n + 1)}
          >
            Add Role
          </Button>
        )}
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="card">
            <div className="card-body flex items-center gap-4 py-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                  {loading ? '—' : s.value}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {loading ? '' : s.sub}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* main card with tabs */}
      <div className="card">
        <div className="card-body p-0">

          {/* tab bar */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6">
            <div className="flex">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                      activeTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* summary pills */}
            <div className="flex items-center gap-2 pb-1">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 bg-gray-50 dark:bg-gray-800">
                <Shield size={12} className="text-primary" />
                {roles.length} roles
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 bg-gray-50 dark:bg-gray-800">
                <Key size={12} className="text-amber-500" />
                {permissions.length} permissions
              </span>
            </div>
          </div>

          {/* tab content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {activeTab === 'roles' && (
                  <RolesTab
                    roles={roles}
                    permissions={permissions}
                    onRefresh={loadRoles}
                    addTrigger={addTrigger}
                  />
                )}
                {activeTab === 'users' && (
                  <UsersTab
                    users={users}
                    roles={roles}
                    permissions={permissions}
                    onRefresh={loadUsers}
                  />
                )}
                {activeTab === 'audit' && <AuditTab />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
