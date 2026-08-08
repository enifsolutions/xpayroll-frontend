"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  ClipboardList,
  CheckCircle2,
  Building2,
  AlertTriangle,
} from "lucide-react";
import api from "@/lib/axios";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

interface Designation {
  id: string;
  title: string;
}

interface ScorecardCriterion {
  id: string;
  name: string;
  description: string | null;
  weight: number;
}

interface ScorecardTemplate {
  id: string;
  designationId: string;
  designationTitle: string;
  name: string;
  description: string | null;
  criteria: ScorecardCriterion[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface CriterionForm {
  id: string;
  name: string;
  description: string;
  weight: string;
}

interface TemplateForm {
  id: string | null;
  designationId: string;
  name: string;
  description: string;
  isDefault: boolean;
  criteria: CriterionForm[];
}

const emptyCriterion = (): CriterionForm => ({
  id:
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  name: "",
  description: "",
  weight: "",
});

const emptyForm = (): TemplateForm => ({
  id: null,
  designationId: "",
  name: "",
  description: "",
  isDefault: false,
  criteria: [emptyCriterion()],
});

export default function ScorecardTemplatesPage() {
  useRequirePermission(Permissions.Recruitment.ScorecardTemplate.View);
  const canCreate = usePermission(
    Permissions.Recruitment.ScorecardTemplate.Create,
  );
  const canUpdate = usePermission(
    Permissions.Recruitment.ScorecardTemplate.Update,
  );
  const canDelete = usePermission(
    Permissions.Recruitment.ScorecardTemplate.Delete,
  );

  const initialized = useRef(false);
  const userId = useAuthStore((s) => s.user?.userId);

  const [templates, setTemplates] = useState<ScorecardTemplate[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [filterDesignationId, setFilterDesignationId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "DELETE" | "DEACTIVATE" | null
  >(null);
  const [confirmTarget, setConfirmTarget] = useState<ScorecardTemplate | null>(
    null,
  );
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadDesignations();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get("/scorecard-templates");
      const data = (res.data ?? []).map((t: any) => ({
        ...t,
        id: String(t.id),
        designationId: String(t.designationId),
      }));
      setTemplates(data);
    } catch (err:any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load scorecard templates.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDesignations = async () => {
    try {
      const res = await api.get("/designations");
      const data = (res.data ?? []).map((d: any) => ({
        ...d,
        id: String(d.id),
      }));
      setDesignations(data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Failed to load designations.",
      );
    }
  };

  const openAdd = () => {
    setEditing(false);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (t: ScorecardTemplate) => {
    setEditing(true);
    setForm({
      id: t.id,
      designationId: t.designationId,
      name: t.name,
      description: t.description ?? "",
      isDefault: t.isDefault,
      criteria: t.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? "",
        weight: String(c.weight),
      })),
    });
    setDialogOpen(true);
  };

  const addCriterionRow = () => {
    setForm((f) => ({ ...f, criteria: [...f.criteria, emptyCriterion()] }));
  };

  const removeCriterionRow = (id: string) => {
    setForm((f) => ({ ...f, criteria: f.criteria.filter((c) => c.id !== id) }));
  };

  const updateCriterionRow = (
    id: string,
    field: keyof CriterionForm,
    value: string,
  ) => {
    setForm((f) => ({
      ...f,
      criteria: f.criteria.map((c) =>
        c.id === id ? { ...c, [field]: value } : c,
      ),
    }));
  };

  const weightTotal = form.criteria.reduce(
    (sum, c) => sum + (parseFloat(c.weight) || 0),
    0,
  );

  const handleSave = async () => {
    if (!form.designationId) {
      showError("Validation", "Please select a designation");
      return;
    }
    if (!form.name.trim()) {
      showError("Validation", "Template name is required");
      return;
    }
    if (form.criteria.length === 0) {
      showError("Validation", "Add at least one criterion");
      return;
    }
    if (Math.round(weightTotal) !== 100) {
      showError("Validation", "Criteria weights must sum to 100");
      return;
    }

    try {
      setSaving(true);
      await api.post("/scorecard-templates/save", {
        id: form.id,
        designationId: form.designationId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        criteria: form.criteria.map((c) => ({
          id: c.id,
          name: c.name.trim(),
          description: c.description.trim() || null,
          weight: parseFloat(c.weight) || 0,
        })),
        isDefault: form.isDefault,
        action: editing ? "UPDATE" : "ADD",
        userId,
      });
      setDialogOpen(false);
      await load();
      showSuccess("Success", editing ? "Template updated" : "Template created");
    } catch (err: any) {
      showError(
        "Error",
        err?.response?.data?.error || "Failed to save template",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (t: ScorecardTemplate) => {
    try {
      await api.post("/scorecard-templates/save", {
        id: t.id,
        designationId: t.designationId,
        name: t.name,
        description: t.description,
        criteria: t.criteria,
        isDefault: true,
        action: "SET_DEFAULT",
        userId,
      });
      await load();
      showSuccess(
        "Success",
        `"${t.name}" is now the default for ${t.designationTitle}`,
      );
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.error || "Failed to set default",
      );
    }
  };

  const openToggleActive = (t: ScorecardTemplate) => {
    if (t.isActive) {
      setConfirmTarget(t);
      setConfirmAction("DEACTIVATE");
      setConfirmOpen(true);
    } else {
      activate(t);
    }
  };

  const activate = async (t: ScorecardTemplate) => {
    try {
      await api.post("/scorecard-templates/save", {
        id: t.id,
        designationId: t.designationId,
        name: t.name,
        description: t.description,
        criteria: t.criteria,
        isDefault: t.isDefault,
        action: "ACTIVATE",
        userId,
      });
      await load();
      showSuccess("Success", `"${t.name}" activated`);
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.error || "Failed to activate template",
      );
    }
  };

  const openDelete = (t: ScorecardTemplate) => {
    setConfirmTarget(t);
    setConfirmAction("DELETE");
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmTarget || !confirmAction) return;
    try {
      setConfirmLoading(true);
      await api.post("/scorecard-templates/save", {
        id: confirmTarget.id,
        designationId: confirmTarget.designationId,
        name: confirmTarget.name,
        description: confirmTarget.description,
        criteria: confirmTarget.criteria,
        isDefault: confirmTarget.isDefault,
        action: confirmAction,
        userId,
      });
      setConfirmOpen(false);
      setConfirmTarget(null);
      setConfirmAction(null);
      await load();
      showSuccess(
        "Success",
        confirmAction === "DELETE"
          ? "Template deleted"
          : "Template deactivated",
      );
    } catch (err: any) {
      showError("Action failed", err?.response?.data?.error || "Action failed");
    } finally {
      setConfirmLoading(false);
    }
  };

  const filteredTemplates = filterDesignationId
    ? templates.filter((t) => t.designationId === filterDesignationId)
    : templates;

  const activeCount = templates.filter((t) => t.isActive).length;
  const designationsCoveredCount = new Set(
    templates.map((t) => t.designationId),
  ).size;
  const designationIdsWithActiveDefault = new Set(
    templates
      .filter((t) => t.isDefault && t.isActive)
      .map((t) => t.designationId),
  );
  const missingDefaultCount =
    designations.length - designationIdsWithActiveDefault.size;

  const stats = [
    {
      label: "Total Templates",
      value: templates.length,
      sub: `${designationsCoveredCount} designations covered`,
      icon: <ClipboardList size={20} className="text-white" />,
      bg: "bg-blue-500",
    },
    {
      label: "Active",
      value: activeCount,
      sub: `${templates.length - activeCount} inactive`,
      icon: <CheckCircle2 size={20} className="text-white" />,
      bg: "bg-emerald-500",
    },
    {
      label: "Designations Covered",
      value: designationsCoveredCount,
      sub: `of ${designations.length} total designations`,
      icon: <Building2 size={20} className="text-white" />,
      bg: "bg-amber-400",
    },
    {
      label: "Missing Default",
      value: missingDefaultCount,
      sub: "designations with no active default",
      icon: <AlertTriangle size={20} className="text-white" />,
      bg: "bg-rose-500",
    },
  ];

  return (
    <div>
      {/* page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Scorecard Templates</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define interview evaluation criteria per designation
          </p>
        </div>
        {canCreate && (
          <Button variant="solid" icon={<Plus size={15} />} onClick={openAdd}>
            New Template
          </Button>
        )}
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <div className="card-body flex items-center gap-4 py-4">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}
              >
                {s.icon}
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-none">
                  {loading ? "—" : s.value}
                </p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                  {s.label}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {loading ? "" : s.sub}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="mb-4" style={{ maxWidth: 280 }}>
            <label className="form-label">Filter by Designation</label>
            <select
              className="input w-full"
              value={filterDesignationId}
              onChange={(e) => setFilterDesignationId(e.target.value)}
            >
              <option value="">All Designations</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <table className="table-default table-hover w-full">
            <thead>
              <tr>
                <th>Designation</th>
                <th>Template Name</th>
                <th>Criteria</th>
                <th>Default</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="text-center py-6">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && filteredTemplates.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6">
                    No scorecard templates yet.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredTemplates.map((t) => (
                  <tr key={t.id}>
                    <td>{t.designationTitle}</td>
                    <td>{t.name}</td>
                    <td>{t.criteria.length} criteria</td>
                    <td>
                      {t.isDefault ? (
                        <span className="xp-badge xp-badge-success">
                          Default
                        </span>
                      ) : canUpdate && t.isActive ? (
                        <button
                          type="button"
                          className="text-xs underline text-gray-500 dark:text-gray-400"
                          onClick={() => handleSetDefault(t)}
                        >
                          Set as default
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          —
                        </span>
                      )}
                    </td>
                    <td>
                      {t.isActive ? (
                        <span className="xp-badge xp-badge-info">Active</span>
                      ) : (
                        <span className="xp-badge xp-badge-neutral">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {canUpdate && (
                          <button
                            type="button"
                            title="Edit"
                            onClick={() => openEdit(t)}
                          >
                            <Pencil size={16} />
                          </button>
                        )}
                        {canUpdate && (
                          <button
                            type="button"
                            title={t.isActive ? "Deactivate" : "Activate"}
                            onClick={() => openToggleActive(t)}
                          >
                            <Power size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete"
                            onClick={() => openDelete(t)}
                          >
                            <Trash2 size={16} className="text-rose-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={720}
      >
        <h5 className="h5 mb-4">
          {editing ? "Edit Scorecard Template" : "New Scorecard Template"}
        </h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">Designation</label>
            <select
              className="input w-full"
              value={form.designationId}
              onChange={(e) =>
                setForm((f) => ({ ...f, designationId: e.target.value }))
              }
              disabled={editing}
            >
              <option value="">Select designation</option>
              {designations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Template Name</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Standard Technical Interview"
            />
          </div>

          <div>
            <label className="form-label">Description (optional)</label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Short description shown to interviewers"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="form-label mb-0">
              Set as default for this designation
            </label>
            <Switcher
              checked={form.isDefault}
              onChange={(checked: boolean) =>
                setForm((f) => ({ ...f, isDefault: checked }))
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Criteria</label>
              <span
                className={`xp-badge ${Math.round(weightTotal) === 100 ? "xp-badge-success" : "xp-badge-danger"}`}
              >
                {weightTotal}% of 100%
              </span>
            </div>

            <div className="space-y-2">
              {form.criteria.map((c) => (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Input
                      value={c.name}
                      onChange={(e) =>
                        updateCriterionRow(c.id, "name", e.target.value)
                      }
                      placeholder="Criterion name"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      value={c.description}
                      onChange={(e) =>
                        updateCriterionRow(c.id, "description", e.target.value)
                      }
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div style={{ width: 90 }}>
                    <Input
                      type="number"
                      value={c.weight}
                      onChange={(e) =>
                        updateCriterionRow(c.id, "weight", e.target.value)
                      }
                      placeholder="Weight"
                    />
                  </div>
                  <button
                    type="button"
                    className="mt-2"
                    onClick={() => removeCriterionRow(c.id)}
                    disabled={form.criteria.length === 1}
                    title="Remove criterion"
                  >
                    <Trash2 size={16} className="text-rose-500" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              className="text-sm mt-2 flex items-center gap-1 text-blue-600 dark:text-blue-400"
              onClick={addCriterionRow}
            >
              <Plus size={14} /> Add Criterion
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="plain" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {editing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        variant={confirmAction === "DELETE" ? "danger" : "warning"}
        title={
          confirmAction === "DELETE" ? "Delete Template" : "Deactivate Template"
        }
        message={
          confirmAction === "DELETE"
            ? `Delete "${confirmTarget?.name}"? This cannot be undone.`
            : `Deactivate "${confirmTarget?.name}"? It will no longer be selectable when scheduling interviews.`
        }
        confirmLabel={
          confirmAction === "DELETE" ? "Yes, Delete" : "Yes, Deactivate"
        }
        cancelLabel="Cancel"
        loading={confirmLoading}
        onConfirm={handleConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setConfirmTarget(null);
          setConfirmAction(null);
        }}
      />
    </div>
  );
}
