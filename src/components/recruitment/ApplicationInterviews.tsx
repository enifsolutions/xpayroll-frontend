"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import InterviewScorecardDialog from "@/components/recruitment/InterviewScorecardDialog";
import InterviewSummaryDialog from "@/components/recruitment/InterviewSummaryDialog";

import {
  CalendarClock,
  MapPin,
  Video,
  Phone,
  Plus,
  Pencil,
  Trash2,
  Users,
  Star,
  X,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

type InterviewType = "OnSite" | "Virtual" | "Phone";
type InterviewStatus = "Scheduled" | "Completed" | "Cancelled" | "NoShow";

interface Interview {
  id: string; // BigInt as string — never coerce with Number()
  applicationId: string;
  candidateId: string;
  candidateName: string;
  requisitionTitle: string;
  roundNumber: number;
  roundName: string | null;
  interviewType: InterviewType;
  scorecardTemplateId: string | null;
  scorecardTemplateName: string | null;
  scheduledStart: string;
  scheduledEnd: string | null;
  location: string | null;
  meetingLink: string | null;
  status: InterviewStatus;
  instructions: string | null;
  internalNotes: string | null;
  cancellationReason: string | null;
  panelCount: number;
  isPanelist: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface Panelist {
  id: string;
  interviewId: string;
  panelistEmployeeId: string;
  panelistName: string;
  isLead: boolean;
  createdAt: string;
}

interface InterviewFormState {
  id: string | null;
  roundName: string;
  interviewType: InterviewType;
  scorecardTemplateId: string;
  scheduledStart: string; // datetime-local input value
  scheduledEnd: string;
  location: string;
  meetingLink: string;
  instructions: string;
  internalNotes: string;
}

const emptyForm: InterviewFormState = {
  id: null,
  roundName: "",
  interviewType: "Phone",
  scorecardTemplateId: "",
  scheduledStart: "",
  scheduledEnd: "",
  location: "",
  meetingLink: "",
  instructions: "",
  internalNotes: "",
};

const typeIcon: Record<InterviewType, React.ReactNode> = {
  OnSite: <MapPin size={14} />,
  Virtual: <Video size={14} />,
  Phone: <Phone size={14} />,
};

const statusBadgeClass: Record<InterviewStatus, string> = {
  Scheduled: "xp-badge xp-badge-info",
  Completed: "xp-badge xp-badge-success",
  Cancelled: "xp-badge xp-badge-danger",
  NoShow: "xp-badge xp-badge-warning",
};

// ============================================================================
// Component
// ============================================================================

export default function ApplicationInterviews({
  applicationId,
}: {
  applicationId: string;
}) {
  useRequirePermission(Permissions.Recruitment.Interview.View);

  // AI summary trigger is shown only when BOTH hold — never disabled, hidden
  // entirely otherwise, per the "manual path is never a degraded fallback" rule.
  const canSummarise = usePermission(Permissions.Recruitment.Ai.InterviewSummary);

  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InterviewFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [panelOpenFor, setPanelOpenFor] = useState<Interview | null>(null);
  const [scorecardOpenFor, setScorecardOpenFor] = useState<Interview | null>(
    null,
  );
  const [summaryOpenFor, setSummaryOpenFor] = useState<Interview | null>(
    null,
  );

  // TODO CONFIRM: scorecard template list endpoint + shape
  const [scorecardTemplates, setScorecardTemplates] = useState<
    { id: string; name: string }[]
  >([]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  async function load() {
    try {
      setLoading(true);
      const [interviewsRes, aiSettingsRes] = await Promise.all([
        api.get(`/interviews/application/${applicationId}`),
        api.get("/company/ai-settings"),
      ]);
      setInterviews(interviewsRes.data);
      setAiSummaryEnabled(!!aiSettingsRes.data?.interviewSummaryEnabled);
    } catch (err) {
      showError(
        "Failed to load",
        "Could not load interviews for this application.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadScorecardTemplates(designationId?: string) {
    try {
      // TODO CONFIRM: actual scorecard templates list route + query param name
      const res = await api.get(`/scorecard-templates`, {
        params: designationId ? { designationId } : undefined,
      });
      setScorecardTemplates(res.data);
    } catch {
      // non-fatal — template picker just stays empty, recruiter can still schedule
      setScorecardTemplates([]);
    }
  }

  function openAdd() {
    setForm(emptyForm);
    loadScorecardTemplates();
    setDialogOpen(true);
  }

  function openEdit(interview: Interview) {
    setForm({
      id: interview.id,
      roundName: interview.roundName ?? "",
      interviewType: interview.interviewType,
      scorecardTemplateId: interview.scorecardTemplateId ?? "",
      scheduledStart: toDatetimeLocal(interview.scheduledStart),
      scheduledEnd: interview.scheduledEnd
        ? toDatetimeLocal(interview.scheduledEnd)
        : "",
      location: interview.location ?? "",
      meetingLink: interview.meetingLink ?? "",
      instructions: interview.instructions ?? "",
      internalNotes: interview.internalNotes ?? "",
    });
    loadScorecardTemplates();
    setDialogOpen(true);
  }

  async function handleSave() {
    // conditional validation mirrors backend validator — surfaces errors
    // before the round trip, backend remains the source of truth
    if (form.interviewType === "OnSite" && !form.location.trim()) {
      showError(
        "Missing location",
        "Location is required for on-site interviews.",
      );
      return;
    }
    if (form.interviewType === "Virtual" && !form.meetingLink.trim()) {
      showError(
        "Missing meeting link",
        "Meeting link is required for virtual interviews.",
      );
      return;
    }
    if (!form.scheduledStart) {
      showError("Missing date/time", "Scheduled start is required.");
      return;
    }
    if (
      form.scheduledEnd &&
      new Date(form.scheduledEnd) <= new Date(form.scheduledStart)
    ) {
      showError(
        "Invalid time range",
        "Scheduled end must be after scheduled start.",
      );
      return;
    }

    try {
      setSaving(true);
      await api.post("/interviews/save", {
        id: form.id,
        action: form.id ? "UPDATE" : "ADD",
        applicationId: form.id ? null : applicationId,
        roundName: form.roundName || null,
        interviewType: form.interviewType,
        scorecardTemplateId: form.scorecardTemplateId || null,
        scheduledStart: new Date(form.scheduledStart).toISOString(),
        scheduledEnd: form.scheduledEnd
          ? new Date(form.scheduledEnd).toISOString()
          : null,
        location: form.location || null,
        meetingLink: form.meetingLink || null,
        status: null,
        instructions: form.instructions || null,
        internalNotes: form.internalNotes || null,
        cancellationReason: null,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        "Saved",
        form.id ? "Interview updated." : "Interview scheduled.",
      );
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.message ?? "Could not save the interview.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.post("/interviews/save", {
        id: deleteTarget.id,
        action: "DELETE",
      });
      setDeleteTarget(null);
      await load();
      showSuccess("Deleted", "Interview removed.");
    } catch (err: any) {
      showError(
        "Delete failed",
        err?.response?.data?.message ?? "Could not delete the interview.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-semibold">Interviews</h5>
          <Button
            size="sm"
            variant="solid"
            icon={<Plus size={15} />}
            onClick={openAdd}
          >
            Schedule Interview
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            Loading interviews...
          </div>
        ) : interviews.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
            No interviews scheduled yet for this application.
          </div>
        ) : (
          <table className="table-default table-hover w-full">
            <thead>
              <tr>
                <th>Round</th>
                <th>Type</th>
                <th>Scheduled</th>
                <th>Panel</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {interviews.map((iv) => (
                <tr key={iv.id}>
                  <td>
                    <div className="font-medium">Round {iv.roundNumber}</div>
                    {iv.roundName && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {iv.roundName}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {typeIcon[iv.interviewType]}
                      <span>{iv.interviewType}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <CalendarClock size={14} className="text-gray-400" />
                      {new Date(iv.scheduledStart).toLocaleString()}
                    </div>
                  </td>
                  <td>
                    <button
                      className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => setPanelOpenFor(iv)}
                    >
                      <Users size={14} />
                      {iv.panelCount}
                    </button>
                  </td>
                  <td>
                    <span className={statusBadgeClass[iv.status]}>
                      {iv.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(iv)} title="Edit">
                        <Pencil
                          size={15}
                          className="text-gray-500 hover:text-blue-600"
                        />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(iv)}
                        title="Delete"
                      >
                        <Trash2
                          size={15}
                          className="text-gray-500 hover:text-rose-600"
                        />
                      </button>

                      {iv.isPanelist && (
                        <button
                          onClick={() => setScorecardOpenFor(iv)}
                          title="Score"
                        >
                          <ClipboardCheck
                            size={15}
                            className="text-gray-500 hover:text-emerald-600"
                          />
                        </button>
                      )}

                      {/* AI Interview Summary trigger — hidden entirely (not
                          disabled) unless BOTH the permission and the company
                          toggle are on. The manual path (reading scorecards
                          directly) is always the fallback either way. */}
                      {canSummarise && aiSummaryEnabled && (
                        <button
                          onClick={() => setSummaryOpenFor(iv)}
                          title="AI Interview Summary"
                        >
                          <Sparkles
                            size={15}
                            className="text-gray-500 hover:text-violet-600"
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={560}
      >
        <h5>{form.id ? "Edit Interview" : "Schedule Interview"}</h5>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="col-span-2">
            <label className="form-label">Round Name (optional)</label>
            <Input
              value={form.roundName}
              onChange={(e) => setForm({ ...form, roundName: e.target.value })}
              placeholder="e.g. Technical Round"
            />
          </div>

          <div>
            <label className="form-label">Interview Type</label>
            <select
              className="input w-full"
              value={form.interviewType}
              onChange={(e) =>
                setForm({
                  ...form,
                  interviewType: e.target.value as InterviewType,
                })
              }
            >
              <option value="Phone">Phone</option>
              <option value="Virtual">Virtual</option>
              <option value="OnSite">On-site</option>
            </select>
          </div>

          <div>
            <label className="form-label">Scorecard Template</label>
            <select
              className="input w-full"
              value={form.scorecardTemplateId}
              onChange={(e) =>
                setForm({ ...form, scorecardTemplateId: e.target.value })
              }
            >
              <option value="">Use designation default</option>
              {scorecardTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Scheduled Start</label>
            <Input
              type="datetime-local"
              value={form.scheduledStart}
              onChange={(e) =>
                setForm({ ...form, scheduledStart: e.target.value })
              }
            />
          </div>

          <div>
            <label className="form-label">Scheduled End (optional)</label>
            <Input
              type="datetime-local"
              value={form.scheduledEnd}
              onChange={(e) =>
                setForm({ ...form, scheduledEnd: e.target.value })
              }
            />
          </div>

          {form.interviewType === "OnSite" && (
            <div className="col-span-2">
              <label className="form-label">Location</label>
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="e.g. HQ - Meeting Room 2"
              />
            </div>
          )}

          {form.interviewType === "Virtual" && (
            <div className="col-span-2">
              <label className="form-label">Meeting Link</label>
              <Input
                value={form.meetingLink}
                onChange={(e) =>
                  setForm({ ...form, meetingLink: e.target.value })
                }
                placeholder="https://..."
              />
            </div>
          )}

          <div className="col-span-2">
            <label className="form-label">
              Instructions (candidate-facing)
            </label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.instructions}
              onChange={(e) =>
                setForm({ ...form, instructions: e.target.value })
              }
            />
          </div>

          <div className="col-span-2">
            <label className="form-label">Internal Notes</label>
            <textarea
              className="input w-full"
              rows={2}
              value={form.internalNotes}
              onChange={(e) =>
                setForm({ ...form, internalNotes: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="plain" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {form.id ? "Save Changes" : "Schedule Interview"}
          </Button>
        </div>
      </Dialog>

      {/* Delete confirm — matches Requisitions page's centered confirm pattern */}
      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onRequestClose={() => setDeleteTarget(null)}
        width={420}
      >
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-100 dark:bg-red-900/30">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white">
              Delete Interview
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {`Delete Round ${deleteTarget?.roundNumber} for ${deleteTarget?.candidateName}? This cannot be undone.`}
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-1">
            <Button variant="default" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="solid"
              loading={deleting}
              className="bg-red-500 hover:bg-red-600 text-white border-red-500"
              onClick={handleDelete}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Panel management */}
      {panelOpenFor && (
        <InterviewPanelDrawer
          interview={panelOpenFor}
          onClose={() => setPanelOpenFor(null)}
          onChanged={load}
        />
      )}

      {/* Scorecard submission */}
      {scorecardOpenFor && (
        <InterviewScorecardDialog
          interviewId={scorecardOpenFor.id}
          scorecardTemplateId={scorecardOpenFor.scorecardTemplateId}
          onClose={() => setScorecardOpenFor(null)}
          onSubmitted={load}
        />
      )}

      {/* AI interview summary */}
      {summaryOpenFor && (
        <InterviewSummaryDialog
          interviewId={summaryOpenFor.id}
          roundNumber={summaryOpenFor.roundNumber}
          candidateName={summaryOpenFor.candidateName}
          onClose={() => setSummaryOpenFor(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Panel management drawer
// ============================================================================

function InterviewPanelDrawer({
  interview,
  onClose,
  onChanged,
}: {
  interview: Interview;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [panel, setPanel] = useState<Panelist[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [allEmployees, setAllEmployees] = useState<
    { id: string; name: string }[]
  >([]);
  const [employeeResults, setEmployeeResults] = useState<
    { id: string; name: string }[]
  >([]);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadPanel();
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      // No dedicated search endpoint confirmed to exist — the real Employees
      // page itself works off a full list with client-side search, so we
      // match that pattern here rather than a guessed /employees/search route.
      const res = await api.get("/employees");
      const mapped = (res.data ?? []).map((e: any) => ({
        id: e.id,
        name: `${e.firstName ?? e.first_name ?? ""} ${e.lastName ?? e.last_name ?? ""}`.trim(),
      }));
      setAllEmployees(mapped);
    } catch {
      setAllEmployees([]);
    }
  }

  function searchEmployees(query: string) {
    setEmployeeQuery(query);
    if (query.trim().length < 2) {
      setEmployeeResults([]);
      return;
    }
    const q = query.toLowerCase();
    setEmployeeResults(
      allEmployees.filter((e) => e.name.toLowerCase().includes(q)),
    );
  }

  async function loadPanel() {
    try {
      setLoading(true);
      const res = await api.get(`/interviews/${interview.id}/panel`);
      setPanel(res.data);
    } catch {
      showError("Failed to load", "Could not load the interview panel.");
    } finally {
      setLoading(false);
    }
  }

  async function addPanelist(employeeId: string, isLead: boolean) {
    try {
      setAdding(true);
      await api.post("/interviews/panel/save", {
        id: null,
        action: "ADD",
        interviewId: interview.id,
        panelistEmployeeId: employeeId,
        isLead,
      });
      setEmployeeQuery("");
      setEmployeeResults([]);
      await loadPanel();
      onChanged();
      showSuccess("Added", "Panelist added.");
    } catch (err: any) {
      showError(
        "Failed to add",
        err?.response?.data?.message ?? "Could not add this panelist.",
      );
    } finally {
      setAdding(false);
    }
  }

  async function removePanelist(panelistId: string) {
    try {
      await api.post("/interviews/panel/save", {
        id: panelistId,
        action: "DELETE",
      });
      await loadPanel();
      onChanged();
      showSuccess("Removed", "Panelist removed.");
    } catch (err: any) {
      showError(
        "Failed to remove",
        err?.response?.data?.message ?? "Could not remove this panelist.",
      );
    }
  }

  async function setLead(panelistId: string, employeeId: string) {
    try {
      await api.post("/interviews/panel/save", {
        id: panelistId,
        action: "SET_LEAD",
      });
      await loadPanel();
      onChanged();
      showSuccess("Updated", "Lead panelist updated.");
    } catch (err: any) {
      showError(
        "Could not set lead",
        err?.response?.data?.message ?? "Could not update the lead panelist.",
      );
    }
  }

  return (
    <Dialog
      isOpen={true}
      onClose={onClose}
      onRequestClose={onClose}
      width={480}
    >
      <div className="flex items-center justify-between">
        <h5>Interview Panel — Round {interview.roundNumber}</h5>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
          Loading...
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {panel.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No panelists added yet.
            </div>
          )}
          {panel.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2"
            >
              <div className="flex items-center gap-2">
                {p.isLead && (
                  <Star size={14} className="text-amber-400 fill-amber-400" />
                )}
                <span>{p.panelistName}</span>
                {p.isLead && (
                  <span className="xp-badge xp-badge-info">Lead</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!p.isLead && (
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => setLead(p.id, p.panelistEmployeeId)}
                  >
                    Make lead
                  </button>
                )}
                <button onClick={() => removePanelist(p.id)} title="Remove">
                  <Trash2
                    size={14}
                    className="text-gray-400 hover:text-rose-600"
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label className="form-label">Add Panelist</label>
        <Input
          value={employeeQuery}
          onChange={(e) => searchEmployees(e.target.value)}
          placeholder="Search employees by name..."
          disabled={adding}
        />
        {employeeResults.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded mt-1 max-h-40 overflow-auto">
            {employeeResults.map((e) => (
              <button
                key={e.id}
                className="block w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm"
                onClick={() => addPanelist(e.id, false)}
                disabled={adding}
              >
                {e.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
