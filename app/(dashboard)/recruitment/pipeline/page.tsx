'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, X, History, UserX, Ban, Search, RefreshCw, Users as UsersIcon, Sparkles,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import api from '@/lib/axios';
import { showSuccess, showError } from '@/lib/toast';
import { usePermission } from '@/hooks/usePermission';
import { useRequirePermission } from '@/hooks/useRequirePermission';
import { Permissions } from '@/lib/permissions';
import MatchScoreDrawer, { MatchReasoningDto } from '@/components/recruitment/MatchScoreDrawer';

// ---------- Types (mirrors backend DTOs exactly, camelCase over the wire) ----------

interface ApplicationDto {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  candidatePhone: string | null;
  requisitionId: string;
  requisitionCode: string;
  requisitionTitle: string;
  postingId: string | null;
  stage: string;
  stageChangedAt: string;
  daysInStage: number;
  aiMatchScore: number | null;
  aiMatchReasoning: unknown; // parsed into MatchReasoningDto by MatchScoreDrawer
  aiScoredAt: string | null;
  aiModelVersion: string | null;
  aiScoreCount: number;
  rejectionReason: string | null;
  rejectionStage: string | null;
  hiredEmployeeId: string | null;
  appliedAt: string;
}

interface StageHistoryDto {
  id: string;
  applicationId: string;
  fromStage: string | null;
  toStage: string;
  notes: string | null;
  changedById: string | null;
  changedByName: string | null;
  changedAt: string;
}

interface CandidateDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  currentDesignation: string | null;
  currentEmployer: string | null;
  totalExperienceYears: number | null;
  isBlacklisted: boolean;
  applicationCount: number;
}

interface RequisitionDto {
  id: string;
  requisitionCode: string;
  title: string;
  status: string;
  headcount: number;
  headcountFilled: number;
  applicationCount: number;
}

// ---------- Stage config ----------

const MOVABLE_STAGES = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Offer', 'OnHold'] as const;
type MovableStage = typeof MOVABLE_STAGES[number];

const STAGE_LABELS: Record<string, string> = {
  Applied: 'Applied',
  Screening: 'Screening',
  Shortlisted: 'Shortlisted',
  Interview: 'Interview',
  Offer: 'Offer',
  OnHold: 'On Hold',
  Hired: 'Hired',
  Rejected: 'Rejected',
  Withdrawn: 'Withdrawn',
};

const STAGE_BADGE: Record<string, string> = {
  Applied: 'xp-badge-neutral',
  Screening: 'xp-badge-info',
  Shortlisted: 'xp-badge-info',
  Interview: 'xp-badge-warning',
  Offer: 'xp-badge-warning',
  OnHold: 'xp-badge-neutral',
  Hired: 'xp-badge-success',
  Rejected: 'xp-badge-danger',
  Withdrawn: 'xp-badge-neutral',
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-indigo-500', 'bg-purple-500', 'bg-teal-500', 'bg-orange-500',
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function scoreColor(score: number) {
  if (score >= 75) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10';
  if (score >= 50) return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10';
  return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10';
}

function timeAgo(days: number) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--border-color, #d1d5db)',
  background: 'var(--input-bg, transparent)',
};

export default function PipelinePage() {
  return (
    <Suspense fallback={null}>
      <PipelineBoard />
    </Suspense>
  );
}

function PipelineBoard() {
  useRequirePermission(Permissions.Recruitment.Application.View);

  const searchParams = useSearchParams();
  const initialReqId = searchParams.get('requisitionId') || '';

  const canCreate = usePermission(Permissions.Recruitment.Application.Create);
  const canChangeStage = usePermission(Permissions.Recruitment.Application.ChangeStage);
  const canReject = usePermission(Permissions.Recruitment.Application.Reject);
  const canScore = usePermission(Permissions.Recruitment.Ai.MatchScore);
  const canOverrideLimit = usePermission(Permissions.Recruitment.Ai.OverrideScoreLimit);
  const [maxRescoreCount, setMaxRescoreCount] = useState(3);

  const [requisitions, setRequisitions] = useState<RequisitionDto[]>([]);
  const [applications, setApplications] = useState<ApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqId, setSelectedReqId] = useState<string>(initialReqId);
  const [search, setSearch] = useState('');

  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [historyApp, setHistoryApp] = useState<ApplicationDto | null>(null);
  const [historyItems, setHistoryItems] = useState<StageHistoryDto[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectApp, setRejectApp] = useState<{ app: ApplicationDto; action: 'REJECT' | 'WITHDRAW' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [scoreApp, setScoreApp] = useState<ApplicationDto | null>(null);
  const [scoringShortlist, setScoringShortlist] = useState(false);

  const loadRequisitions = useCallback(async () => {
    try {
      const { data } = await api.get<RequisitionDto[]>("/requisitions");
      setRequisitions(data);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load requisitions.",
      );
    }
  }, []);

  const loadApplications = useCallback(async (reqId: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<ApplicationDto[]>('/applications', {
        params: reqId ? { requisitionId: reqId } : undefined,
      });
      setApplications(data);
    } catch (err:any){
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load applications.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequisitions(); }, [loadRequisitions]);

  useEffect(() => {
    api.get('/company/ai-settings')
      .then(({ data }) => {
        if (data?.matchScoringMaxRescoreCount) setMaxRescoreCount(data.matchScoringMaxRescoreCount);
      })
      .catch(() => { /* non-critical — falls back to default of 3 */ });
  }, []);
  useEffect(() => { loadApplications(selectedReqId); }, [selectedReqId, loadApplications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(a =>
      a.candidateName.toLowerCase().includes(q) ||
      a.requisitionTitle.toLowerCase().includes(q) ||
      a.requisitionCode.toLowerCase().includes(q)
    );
  }, [applications, search]);

  const columns = useMemo(() => {
    const map: Record<string, ApplicationDto[]> = {};
    MOVABLE_STAGES.forEach(s => (map[s] = []));
    filtered.forEach(a => {
      if ((MOVABLE_STAGES as readonly string[]).includes(a.stage)) {
        map[a.stage].push(a);
      }
    });
    return map;
  }, [filtered]);

  const terminalCounts = useMemo(() => {
    const counts = { Hired: 0, Rejected: 0, Withdrawn: 0 };
    filtered.forEach(a => {
      if (a.stage === 'Hired') counts.Hired++;
      else if (a.stage === 'Rejected') counts.Rejected++;
      else if (a.stage === 'Withdrawn') counts.Withdrawn++;
    });
    return counts;
  }, [filtered]);

  const refresh = () => loadApplications(selectedReqId);

  // ---------- Drag & drop ----------

  const onDragStart = (e: React.DragEvent, id: string) => {
    if (!canChangeStage) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  };

  const onDragEnd = () => {
    setDraggingId(null);
    setDragOverStage(null);
  };

  const onColumnDragOver = (e: React.DragEvent, stage: string) => {
    if (!canChangeStage) return;
    e.preventDefault();
    setDragOverStage(stage);
  };

  const onColumnDrop = async (e: React.DragEvent, toStage: string) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    if (!id) return;
    const app = applications.find(a => a.id === id);
    if (!app || app.stage === toStage) return;

    const prev = applications;
    setApplications(cur => cur.map(a => (a.id === id ? { ...a, stage: toStage, daysInStage: 0 } : a)));

    try {
      await api.post('/applications/move-stage', { id, toStage });
      showSuccess('Stage updated', `${app.candidateName} moved to ${STAGE_LABELS[toStage]}.`);
    } catch (err: any) {
      setApplications(prev);
      showError(
        "Move failed",
        err?.response?.data?.error ?? "Could not update the stage.",
      );
    }
  };

  // ---------- History drawer ----------

  const openHistory = async (app: ApplicationDto) => {
    setHistoryApp(app);
    setHistoryLoading(true);
    try {
      const { data } = await api.get<StageHistoryDto[]>(`/applications/${app.id}/history`);
      setHistoryItems(data);
    } catch (err:any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load stage history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---------- Reject / Withdraw ----------

  const submitReject = async () => {
    if (!rejectApp) return;
    if (rejectApp.action === 'REJECT' && !rejectReason.trim()) {
      showError('Reason required', 'Please enter a reason for rejecting this candidate.');
      return;
    }
    setRejectSaving(true);
    try {
      await api.post('/applications/reject', {
        action: rejectApp.action,
        id: rejectApp.app.id,
        reason: rejectReason.trim() || undefined,
      });
      showSuccess(
        rejectApp.action === 'REJECT' ? 'Application rejected' : 'Application withdrawn',
        `${rejectApp.app.candidateName} has been ${rejectApp.action === 'REJECT' ? 'rejected' : 'marked as withdrawn'}.`
      );
      setRejectApp(null);
      setRejectReason('');
      refresh();
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.error ?? "Could not complete this action.",
      );
    } finally {
      setRejectSaving(false);
    }
  };

  // ---------- AI match scoring ----------

  const handleScored = (applicationId: string, score: number, reasoning: MatchReasoningDto) => {
    setApplications(cur => cur.map(a =>
      a.id === applicationId
        ? { ...a, aiMatchScore: score, aiMatchReasoning: reasoning, aiScoredAt: new Date().toISOString(), aiScoreCount: a.aiScoreCount + 1 }
        : a
    ));
    setScoreApp(cur => (cur && cur.id === applicationId
      ? { ...cur, aiMatchScore: score, aiMatchReasoning: reasoning, aiScoredAt: new Date().toISOString(), aiScoreCount: cur.aiScoreCount + 1 }
      : cur));
  };

  const scoreShortlist = async () => {
    if (!selectedReqId) {
      showError('Select a requisition', 'Choose a requisition to score its shortlist.');
      return;
    }
    setScoringShortlist(true);
    try {
      const { data } = await api.post('/applications/ai-score-shortlist', {
        requisitionId: selectedReqId,
      });
      showSuccess(
        'Shortlist scored',
        `${data.scored} candidate${data.scored === 1 ? '' : 's'} scored${data.failed > 0 ? `, ${data.failed} failed` : ''}.`
      );
      refresh();
    } catch (err: any) {
      showError(
        "Scoring failed",
        err?.response?.data?.error ?? "Could not score the shortlist.",
      );
    } finally {
      setScoringShortlist(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3>Recruitment Pipeline</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Drag candidates between stages as they move through the process.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="plain" icon={<RefreshCw size={16} />} onClick={refresh}>
            Refresh
          </Button>
          {canScore && selectedReqId && (
            <Button
              variant="twoTone"
              icon={scoringShortlist ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              disabled={scoringShortlist}
              onClick={scoreShortlist}
            >
              {scoringShortlist ? 'Scoring...' : 'Score Shortlist'}
            </Button>
          )}
          {canCreate && (
            <Button variant="solid" color="primary" icon={<Plus size={16} />} onClick={() => setAddOpen(true)}>
              Add to Pipeline
            </Button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard icon={<UsersIcon size={18} className="text-white" />} bg="bg-blue-500" label="Active in pipeline"
          value={MOVABLE_STAGES.reduce((sum, s) => sum + columns[s].length, 0)} />
        <KpiCard icon={<History size={18} className="text-white" />} bg="bg-emerald-500" label="Hired"
          value={terminalCounts.Hired} />
        <KpiCard icon={<Ban size={18} className="text-white" />} bg="bg-rose-500" label="Rejected"
          value={terminalCounts.Rejected} />
        <KpiCard icon={<UserX size={18} className="text-white" />} bg="bg-amber-400" label="Withdrawn"
          value={terminalCounts.Withdrawn} />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body flex flex-wrap items-center gap-3">
          <select
            value={selectedReqId}
            onChange={e => setSelectedReqId(e.target.value)}
            style={{ ...selectStyle, minWidth: '260px' }}
          >
            <option value="">All Requisitions</option>
            {requisitions.map(r => (
              <option key={r.id} value={r.id}>
                {r.requisitionCode} — {r.title} ({r.headcountFilled}/{r.headcount})
              </option>
            ))}
          </select>

          <div className="relative flex-1" style={{ minWidth: '200px' }}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search candidate or requisition..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="card"><div className="card-body text-center text-gray-500 py-10">Loading pipeline...</div></div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {MOVABLE_STAGES.map(stage => (
            <div
              key={stage}
              onDragOver={e => onColumnDragOver(e, stage)}
              onDragLeave={() => setDragOverStage(cur => (cur === stage ? null : cur))}
              onDrop={e => onColumnDrop(e, stage)}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl"
              style={{
                background: dragOverStage === stage ? 'rgba(99,102,241,0.08)' : 'transparent',
                border: dragOverStage === stage ? '2px dashed rgba(99,102,241,0.5)' : '2px dashed transparent',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <span className={`xp-badge ${STAGE_BADGE[stage]}`}>{STAGE_LABELS[stage]}</span>
                <span className="text-xs text-gray-400">{columns[stage].length}</span>
              </div>

              <div className="flex flex-col gap-2 px-1" style={{ minHeight: '80px' }}>
                {columns[stage].map(app => (
                  <div
                    key={app.id}
                    draggable={canChangeStage}
                    onDragStart={e => onDragStart(e, app.id)}
                    onDragEnd={onDragEnd}
                    className="card cursor-grab active:cursor-grabbing"
                    style={{ opacity: draggingId === app.id ? 0.4 : 1 }}
                  >
                    <div className="card-body py-3 px-3">
                      <div className="flex items-start gap-2">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(app.candidateName)}`}>
                          {initials(app.candidateName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{app.candidateName}</p>
                          {!selectedReqId && (
                            <p className="truncate text-xs text-gray-400">{app.requisitionCode} · {app.requisitionTitle}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {app.aiMatchScore != null && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreColor(app.aiMatchScore)}`}>
                            {Math.round(app.aiMatchScore)}% match
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{timeAgo(app.daysInStage)} in stage</span>
                      </div>

                      <div className="mt-2 flex items-center gap-1 border-t border-gray-100 pt-2 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() => openHistory(app)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                          title="View history"
                        >
                          <History size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setScoreApp(app)}
                          className="rounded p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                          title="AI match score"
                        >
                          <Sparkles size={14} />
                        </button>
                        {canReject && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setRejectApp({ app, action: 'REJECT' }); setRejectReason(''); }}
                              className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                              title="Reject"
                            >
                              <Ban size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setRejectApp({ app, action: 'WITHDRAW' }); setRejectReason(''); }}
                              className="rounded p-1 text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10"
                              title="Mark withdrawn"
                            >
                              <UserX size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {columns[stage].length === 0 && (
                  <div className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-xs text-gray-400 dark:border-gray-800">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Terminal stages strip */}
      {(terminalCounts.Rejected > 0 || terminalCounts.Withdrawn > 0 || terminalCounts.Hired > 0) && (
        <TerminalStagesPanel
          applications={filtered.filter(a => !(MOVABLE_STAGES as readonly string[]).includes(a.stage))}
          onHistory={openHistory}
        />
      )}

      {/* Add to Pipeline dialog */}
      {addOpen && (
        <AddToPipelineDialog
          requisitions={requisitions}
          defaultRequisitionId={selectedReqId}
          existingApplications={applications}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); refresh(); }}
        />
      )}

      {/* History drawer */}
      {historyApp && (
        <HistoryDrawer
          app={historyApp}
          items={historyItems}
          loading={historyLoading}
          onClose={() => { setHistoryApp(null); setHistoryItems([]); }}
        />
      )}

      {/* AI Match Score drawer */}
      {scoreApp && (
        <MatchScoreDrawer
          app={scoreApp}
          canScore={canScore}
          canOverrideLimit={canOverrideLimit}
          maxRescoreCount={maxRescoreCount}
          onClose={() => setScoreApp(null)}
          onScored={handleScored}
        />
      )}

      {/* Reject / Withdraw dialog */}
      {rejectApp && (
        <Dialog isOpen onClose={() => setRejectApp(null)} onRequestClose={() => setRejectApp(null)}>
          <h5>{rejectApp.action === 'REJECT' ? 'Reject Application' : 'Mark as Withdrawn'}</h5>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {rejectApp.action === 'REJECT'
              ? `${rejectApp.app.candidateName} will be removed from the active pipeline.`
              : `${rejectApp.app.candidateName} will be marked as having withdrawn their application.`}
          </p>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium">
              Reason {rejectApp.action === 'REJECT' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={rejectApp.action === 'REJECT' ? 'Why is this candidate being rejected?' : 'Optional note'}
              style={{ ...selectStyle, width: '100%' }}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="plain" onClick={() => setRejectApp(null)} disabled={rejectSaving}>Cancel</Button>
            <Button variant="solid" color="primary" disabled={rejectSaving} onClick={submitReject}>
              {rejectSaving ? 'Saving...' : rejectApp.action === 'REJECT' ? 'Reject' : 'Confirm Withdrawal'}
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

// ---------- Small components ----------

function KpiCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number }) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>{icon}</div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TerminalStagesPanel({ applications, onHistory }: { applications: ApplicationDto[]; onHistory: (a: ApplicationDto) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="card-body flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-medium">Closed applications ({applications.length})</span>
        <span className="text-xs text-gray-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="card-body border-t border-gray-100 pt-0 dark:border-gray-800">
          <table className="table-default table-hover w-full">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Requisition</th>
                <th>Stage</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {applications.map(a => (
                <tr key={a.id}>
                  <td>{a.candidateName}</td>
                  <td>{a.requisitionCode}</td>
                  <td><span className={`xp-badge ${STAGE_BADGE[a.stage]}`}>{STAGE_LABELS[a.stage]}</span></td>
                  <td className="max-w-xs truncate text-sm text-gray-500">{a.rejectionReason || '—'}</td>
                  <td>
                    <button type="button" onClick={() => onHistory(a)} className="text-gray-400 hover:text-gray-600">
                      <History size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryDrawer({
  app, items, loading, onClose,
}: { app: ApplicationDto; items: StageHistoryDto[]; loading: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white p-5 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h5>Stage History</h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">{app.candidateName} · {app.requisitionCode}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500">No stage changes recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((h, idx) => (
              <div key={h.id} className="relative pl-6">
                <div className="absolute left-0 top-1 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                {idx < items.length - 1 && (
                  <div className="absolute left-[4.5px] top-4 h-full w-px bg-gray-200 dark:bg-gray-700" />
                )}
                <p className="text-sm font-medium">
                  {h.fromStage ? `${STAGE_LABELS[h.fromStage] || h.fromStage} → ` : ''}
                  {STAGE_LABELS[h.toStage] || h.toStage}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(h.changedAt).toLocaleString()} {h.changedByName ? `· ${h.changedByName}` : ''}
                </p>
                {h.notes && <p className="mt-1 text-xs text-gray-500">{h.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddToPipelineDialog({
  requisitions, defaultRequisitionId, existingApplications, onClose, onSaved,
}: {
  requisitions: RequisitionDto[];
  defaultRequisitionId: string;
  existingApplications: ApplicationDto[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [requisitionId, setRequisitionId] = useState(defaultRequisitionId);
  const [search, setSearch] = useState('');
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCandidates = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<CandidateDto[]>('/candidates', {
        params: { search: q || undefined, isBlacklisted: false },
      });
      setCandidates(data);
    } catch (err:any){
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load candidates.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadCandidates(search), 300);
    return () => clearTimeout(t);
  }, [search, loadCandidates]);

  const applicationsForReq = useMemo(
    () => (requisitionId ? existingApplications.filter(a => a.requisitionId === requisitionId) : []),
    [existingApplications, requisitionId]
  );

  // Only an ACTIVE (or Hired) application blocks re-adding. Rejected/Withdrawn
  // no longer block re-application (matches the sp_action_application fix).
  const alreadyAppliedIds = useMemo(
    () => new Set(applicationsForReq.filter(a => a.stage !== 'Rejected' && a.stage !== 'Withdrawn').map(a => a.candidateId)),
    [applicationsForReq]
  );

  // Candidates who were previously Rejected/Withdrawn for this requisition —
  // shown as a soft note, selection still allowed.
  const closedStageByCandidateId = useMemo(() => {
    const m = new Map<string, string>();
    applicationsForReq
      .filter(a => a.stage === 'Rejected' || a.stage === 'Withdrawn')
      .forEach(a => m.set(a.candidateId, a.stage));
    return m;
  }, [applicationsForReq]);

  const submit = async () => {
    if (!requisitionId) { showError('Requisition required', 'Please select a requisition.'); return; }
    if (!selectedId) { showError('Candidate required', 'Please select a candidate.'); return; }
    setSaving(true);
    try {
      await api.post('/applications/save', {
        action: 'ADD',
        candidateId: selectedId,
        requisitionId,
      });
      showSuccess('Added to pipeline', "The candidate has been added to this requisition's pipeline.");
      onSaved();
    } catch (err: any) {
      showError(
        "Add failed",
        err?.response?.data?.error ?? "Could not add candidate to pipeline.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog isOpen onClose={onClose} onRequestClose={onClose}>
      <h5>Add Candidate to Pipeline</h5>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Requisition</label>
        <select
          value={requisitionId}
          onChange={e => { setRequisitionId(e.target.value); setSelectedId(null); }}
          style={{ ...selectStyle, width: '100%' }}
        >
          <option value="">Select a requisition...</option>
          {requisitions.filter(r => r.status === 'Open').map(r => (
            <option key={r.id} value={r.id}>{r.requisitionCode} — {r.title}</option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium">Candidate</label>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates by name..." />
      </div>

      <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800">
        {loading ? (
          <p className="p-4 text-center text-sm text-gray-500">Loading...</p>
        ) : candidates.length === 0 ? (
          <p className="p-4 text-center text-sm text-gray-500">No candidates found.</p>
        ) : (
          candidates.map(c => {
            const applied = alreadyAppliedIds.has(c.id);
            const closedStage = closedStageByCandidateId.get(c.id);
            const fullName = `${c.firstName} ${c.lastName}`;
            return (
              <button
                key={c.id}
                type="button"
                disabled={applied}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left last:border-0 dark:border-gray-800 ${
                  applied ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                } ${selectedId === c.id ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`}
              >
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(fullName)}`}>
                  {initials(fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{fullName}</p>
                  <p className="truncate text-xs text-gray-400">
                    {c.currentDesignation || 'No current designation'} {c.totalExperienceYears ? `· ${c.totalExperienceYears}y exp` : ''}
                  </p>
                  {!applied && closedStage && (
                    <p className="truncate text-xs text-amber-600">
                      Previously {closedStage === 'Rejected' ? 'rejected' : 'withdrawn'} — can re-apply
                    </p>
                  )}
                </div>
                {applied && <span className="xp-badge xp-badge-neutral flex-shrink-0">Already applied</span>}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="plain" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="solid" color="primary" disabled={saving} onClick={submit}>
          {saving ? 'Adding...' : 'Add to Pipeline'}
        </Button>
      </div>
    </Dialog>
  );
}
