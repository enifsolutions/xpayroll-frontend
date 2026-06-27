'use client';

import { useEffect, useState } from 'react';
import { X, Clock, Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/axios';
import { showError } from '@/lib/toast';
import { LeaveTemplateAuditItem, LeaveTemplateSnapshot } from '@/types/leaveTemplate.types';

interface Props {
  templateId: string;
  templateName: string;
  open: boolean;
  onClose: () => void;
}

function ActionBadge({ action }: { action: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    CREATE: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: <Plus size={11} />,    label: 'Created' },
    UPDATE: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: <Pencil size={11} />,  label: 'Updated' },
    DELETE: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',               icon: <Trash2 size={11} />,  label: 'Deleted' },
  };
  const cfg = map[action] ?? map.UPDATE;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function SnapshotDiff({
  before,
  after,
}: {
  before: LeaveTemplateSnapshot | null;
  after:  LeaveTemplateSnapshot | null;
}) {
  // For CREATE — show only after; for DELETE — show only before; for UPDATE — diff
  const snap = after ?? before;
  if (!snap) return null;

  const fields: { label: string; key: keyof LeaveTemplateSnapshot }[] = [
    { label: 'Name',        key: 'name' },
    { label: 'Code',        key: 'code' },
    { label: 'Description', key: 'description' },
    { label: 'Active',      key: 'isActive' },
  ];

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-xs">
      {/* Scalar fields */}
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="text-left px-3 py-1.5 font-medium text-gray-500 w-28">Field</th>
            {before && <th className="text-left px-3 py-1.5 font-medium text-gray-500">Before</th>}
            {after  && <th className="text-left px-3 py-1.5 font-medium text-gray-500">After</th>}
          </tr>
        </thead>
        <tbody>
          {fields.map(({ label, key }) => {
            const bVal = before ? String(before[key] ?? '—') : null;
            const aVal = after  ? String(after[key]  ?? '—') : null;
            const changed = before && after && bVal !== aVal;
            return (
              <tr key={key} className={`border-t border-gray-100 dark:border-gray-700 ${changed ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                <td className="px-3 py-1.5 font-medium text-gray-500">{label}</td>
                {bVal !== null && (
                  <td className={`px-3 py-1.5 ${changed ? 'text-red-500 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                    {bVal}
                  </td>
                )}
                {aVal !== null && (
                  <td className={`px-3 py-1.5 ${changed ? 'text-emerald-600 font-semibold dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {aVal}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Items */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
        <p className="font-medium text-gray-500 mb-1">Leave Types</p>
        <div className="flex flex-col gap-1">
          {(after ?? before)!.items.map((item) => {
            const bItem = before?.items.find((i) => i.leaveTypeId === item.leaveTypeId);
            const aItem = after?.items.find((i)  => i.leaveTypeId === item.leaveTypeId);
            const daysChanged = before && after && bItem && aItem && bItem.entitledDays !== aItem.entitledDays;
            const isNew    = after  && !before?.items.find((i) => i.leaveTypeId === item.leaveTypeId);
            const isRemoved = before && !after?.items.find((i)  => i.leaveTypeId === item.leaveTypeId);
            return (
              <div
                key={item.leaveTypeId}
                className={`flex items-center justify-between rounded px-2 py-1 ${
                  isNew     ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                  isRemoved ? 'bg-red-50 dark:bg-red-900/20' :
                  daysChanged ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {item.leaveTypeName}
                  <span className="text-gray-400 ml-1">({item.leaveTypeCode})</span>
                </span>
                <span className="flex items-center gap-2">
                  {daysChanged && (
                    <span className="text-red-500 line-through">{bItem!.entitledDays}d</span>
                  )}
                  <span className={daysChanged ? 'text-emerald-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                    {(aItem ?? bItem ?? item).entitledDays}d
                  </span>
                  {isNew     && <span className="text-emerald-600 font-bold">+ New</span>}
                  {isRemoved && <span className="text-red-500 font-bold">Removed</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AuditEntry({ entry }: { entry: LeaveTemplateAuditItem }) {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(entry.changedAt);
  const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <ActionBadge action={entry.action} />
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">{entry.changedByName}</p>
            <p className="text-xs text-gray-400">{dateStr} at {timeStr}</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <SnapshotDiff before={entry.beforeSnapshot} after={entry.afterSnapshot} />
        </div>
      )}
    </div>
  );
}

export default function LeaveTemplateAuditDrawer({ templateId, templateName, open, onClose }: Props) {
  const [logs,    setLogs]    = useState<LeaveTemplateAuditItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.get<LeaveTemplateAuditItem[]>(`/LeaveTemplate/${templateId}/audit`)
      .then((r) => setLogs(r.data))
      .catch(() => showError('Failed to load audit log.'))
      .finally(() => setLoading(false));
  }, [open, templateId]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-white text-sm">Audit History</h4>
              <p className="text-xs text-gray-400">{templateName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading audit log…</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No audit records found.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((entry) => (
                <AuditEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-400 text-center">
          Showing last {logs.length} change{logs.length !== 1 ? 's' : ''}
        </div>
      </div>
    </>
  );
}
