export interface LeaveTemplateItem {
  itemId: string;
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  entitledDays: number;
}

export interface LeaveTemplate {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  items: LeaveTemplateItem[];
}

export interface LeaveTemplateItemForm {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  entitledDays: number | string;
  maxDays?: number;
}

export interface LeaveTemplateAuditItem {
  id: string;
  leaveTemplateId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  beforeSnapshot: LeaveTemplateSnapshot | null;
  afterSnapshot:  LeaveTemplateSnapshot | null;
  changedBy: string | null;
  changedByName: string;
  changedAt: string;
}

export interface LeaveTemplateSnapshot {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  items: {
    leaveTypeId: string;
    leaveTypeName: string;
    leaveTypeCode: string;
    entitledDays: number;
  }[];
}
