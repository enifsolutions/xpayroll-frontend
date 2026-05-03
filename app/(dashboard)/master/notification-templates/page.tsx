'use client';

import { useEffect, useState, useRef } from 'react';
import api from '@/lib/axios';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Switcher from '@/components/ui/Switcher';
import { showSuccess, showError } from '@/lib/toast';
import { PlusIcon, Pencil, Trash2, Eye } from 'lucide-react';

interface NotificationTemplate {
  id: string;
  code: string;
  channel: string;
  subject: string | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface NotificationTemplateForm {
  code: string;
  channel: string;
  subject: string;
  bodyTemplate: string;
  isActive: boolean;
}

const EMPTY: NotificationTemplateForm = {
  code: '',
  channel: 'Email',
  subject: '',
  bodyTemplate: '',
  isActive: true,
};

const CHANNEL_OPTIONS = [
  { value: 'Email', label: 'Email' },
  { value: 'SMS',   label: 'SMS'   },
  { value: 'Push',  label: 'Push'  },
  { value: 'InApp', label: 'In-App'},
];

const CHANNEL_COLORS: Record<string, string> = {
  Email: 'xp-badge-primary',
  SMS:   'xp-badge-warning',
  Push:  'xp-badge-info',
  InApp: 'xp-badge-neutral',
};

export default function NotificationTemplatesPage() {
  const [items, setItems]             = useState<NotificationTemplate[]>([]);
  const [loading, setLoading]         = useState(true);
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<NotificationTemplate | null>(null);
  const [editing, setEditing]         = useState<NotificationTemplate | null>(null);
  const [form, setForm]               = useState<NotificationTemplateForm>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const initialized                   = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<NotificationTemplate[]>('/NotificationTemplates');
      setItems(res.data);
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load notification templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (item: NotificationTemplate) => {
    setEditing(item);
    setForm({
      code:         item.code,
      channel:      item.channel,
      subject:      item.subject ?? '',
      bodyTemplate: item.bodyTemplate,
      isActive:     item.isActive,
    });
    setError('');
    setDialogOpen(true);
  };

  const openPreview = (item: NotificationTemplate) => {
    setPreviewItem(item);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim())         { setError('Template code is required.'); return; }
    if (!form.bodyTemplate.trim()) { setError('Body template is required.'); return; }
    if (form.channel === 'Email' && !form.subject.trim()) {
      setError('Subject is required for email templates.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post('/NotificationTemplates/save', {
        action:       editing ? 'UPDATE' : 'ADD',
        id:           editing?.id ?? null,
        code:         form.code.trim().toUpperCase().replace(/\s+/g, '_'),
        channel:      form.channel,
        subject:      form.subject.trim() || null,
        bodyTemplate: form.bodyTemplate.trim(),
        isActive:     form.isActive,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? 'Template updated' : 'Template created', form.code);
    } catch (err: any) {
      showError('Failed to save', err?.response?.data?.error ?? 'Could not save template.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: NotificationTemplate) => {
    if (!confirm(`Delete template "${item.code}"?`)) return;
    try {
      await api.post('/NotificationTemplates/save', { action: 'DELETE', id: item.id });
      await load();
      showSuccess('Template deleted', item.code);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete template.');
    }
  };

  const channelLabel = (c: string) =>
    CHANNEL_OPTIONS.find(o => o.value === c)?.label ?? c;

  const filtered = channelFilter ? items.filter(t => t.channel === channelFilter) : items;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Notification Templates</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Email, SMS and push notification templates for automated payroll notifications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input"
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
          >
            <option value="">All Channels</option>
            {CHANNEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openAdd}>
            Add Template
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Channel</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="w-28 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-400">
                      No notification templates found
                    </td>
                  </tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td>
                      <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {item.code}
                      </code>
                    </td>
                    <td>
                      <span className={`xp-badge ${CHANNEL_COLORS[item.channel] ?? 'xp-badge-neutral'}`}>
                        {channelLabel(item.channel)}
                      </span>
                    </td>
                    <td className="max-w-xs truncate text-gray-500 text-sm">
                      {item.subject ?? '—'}
                    </td>
                    <td>
                      <span className={`xp-badge ${item.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openPreview(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Preview"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <h5 className="h5 mb-4">{editing ? 'Edit Template' : 'Add Notification Template'}</h5>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Template Code <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. PAYSLIP_READY"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                disabled={!!editing}
              />
            </div>
            <div>
              <label className="form-label">Channel</label>
              <select
                className="input w-full"
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
              >
                {CHANNEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.channel === 'Email' && (
            <div>
              <label className="form-label">Subject <span className="text-error">*</span></label>
              <Input
                placeholder="e.g. Your payslip for {{month}} is ready"
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className="form-label">Body Template <span className="text-error">*</span></label>
            <textarea
              className="input w-full h-36 resize-none font-mono text-sm"
              placeholder={`Hi {{employee_name}},\n\nYour payslip for {{period}} is ready...`}
              value={form.bodyTemplate}
              onChange={e => setForm(f => ({ ...f, bodyTemplate: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Available placeholders: {'{{employee_name}}'}, {'{{company_name}}'}, {'{{period}}'}, {'{{amount}}'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Active</span>
            <Switcher
              checked={form.isActive}
              onChange={val => setForm(f => ({ ...f, isActive: val }))}
            />
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? 'Update' : 'Create'}
          </Button>
        </div>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onRequestClose={() => setPreviewOpen(false)}
      >
        <h5 className="h5 mb-4">Template Preview — {previewItem?.code}</h5>

        {previewItem && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`xp-badge ${CHANNEL_COLORS[previewItem.channel] ?? 'xp-badge-neutral'}`}>
                {channelLabel(previewItem.channel)}
              </span>
              <span className={`xp-badge ${previewItem.isActive ? 'xp-badge-success' : 'xp-badge-danger'}`}>
                {previewItem.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {previewItem.subject && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subject</p>
                <p className="text-sm heading-text">{previewItem.subject}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Body</p>
              <pre className="text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg whitespace-pre-wrap font-mono">
                {previewItem.bodyTemplate}
              </pre>
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <Button variant="plain" onClick={() => setPreviewOpen(false)}>Close</Button>
        </div>
      </Dialog>
    </div>
  );
}