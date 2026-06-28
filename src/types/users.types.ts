export interface UserDto {
  id: string;
  employeeId: string | null;
  roleId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  employeeName: string | null;
  roleName: string | null;
  isTempPassword: boolean;
  tempPasswordExpiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface UserActivityDto {
  id: string;
  userId: string;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  entityLabel: string | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
  totalCount: number;
}

export interface SaveUserPayload {
  id: string | null;
  employeeId: string | null;
  roleId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  systemRole: string | null;
  isActive: boolean;
  userId: string;
  action: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export interface EmployeeOption {
  id: string;
  employeeName: string;
  email: string;
}
