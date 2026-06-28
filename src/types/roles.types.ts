export type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isLocked: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string | null;
};

export type Permission = {
  id: string;
  module: string;
  feature: string;
  action: string;
  displayName: string;
  description: string | null;
};

export type UserWithRole = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  systemRole: string | null;
  roleId: string | null;
  roleName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type PermissionOverride = {
  id: string;
  userId: string;
  permissionId: string;
  permissionKey: string;
  displayName: string;
  isGranted: boolean;
  grantedByName: string | null;
  reason: string | null;
  grantedAt: string;
};
