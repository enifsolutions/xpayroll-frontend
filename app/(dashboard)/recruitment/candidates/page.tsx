"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Ban,
  CheckCircle2,
  Users,
  FileText,
  RefreshCw,
  UserCheck,
  Paperclip,
  Upload,
  Loader2,
  ExternalLink,
  ArrowRightCircle,
  X,
  Sparkles,
  ShieldOff,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";
import { useRequirePermission } from "@/hooks/useRequirePermission";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import DownloadComplianceDocLink from "@/components/recruitment/DownloadComplianceDocLink";
import CandidateErasureDialog from "@/components/recruitment/CandidateErasureDialog";
import { useTour } from "@/hooks/useTour";
import TourOverlay from "@/components/onboarding/TourOverlay";
import { CANDIDATES_STEPS } from "@/lib/tours/candidates";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phoneNumber: string | null;
  nationalIdNumber: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  currentDesignation: string | null;
  currentEmployer: string | null;
  totalExperienceYears: number | null;
  highestEducation: string | null;
  expectedSalary: number | null;
  noticePeriodDays: number | null;
  source: string;
  referredByEmployeeId: string | null;
  referredByName: string | null;
  cvFilePath: string | null;
  cvOriginalFilename: string | null;
  cvParseLogId: string | null;
  isBlacklisted: boolean;
  blacklistReason: string | null;
  consentGivenAt: string | null;
  retentionExpiresAt: string | null;
  applicationCount: number;
  createdAt: string;
}

interface CandidateForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalIdNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  currentDesignation: string;
  currentEmployer: string;
  totalExperienceYears: string;
  highestEducation: string;
  expectedSalary: string;
  noticePeriodDays: string;
  source: string;
  referredByEmployeeId: string;
  cvFilePath: string;
  cvOriginalFilename: string;
  consentGiven: boolean;
  retentionMonths: string;
  notes: string;
}

const EMPTY: CandidateForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  nationalIdNumber: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  currentDesignation: "",
  currentEmployer: "",
  totalExperienceYears: "",
  highestEducation: "",
  expectedSalary: "",
  noticePeriodDays: "",
  source: "Direct",
  referredByEmployeeId: "",
  cvFilePath: "",
  cvOriginalFilename: "",
  consentGiven: false,
  retentionMonths: "12",
  notes: "",
};

const SOURCES = [
  "CareerPage",
  "Referral",
  "JobBoard",
  "Agency",
  "WalkIn",
  "Direct",
  "Rehire",
  "Internal",
];

const GENDERS = ["Male", "Female", "Other", "PreferNotToSay"];

type CandidateAction = "DELETE" | "BLACKLIST" | "UNBLACKLIST";

interface ParseCvResponse {
  parseLogId: string | null;
  fields: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    nationalIdNumber: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    currentDesignation: string | null;
    currentEmployer: string | null;
    highestEducation: string | null;
    totalExperienceYears: number | null;
  };
  missingFields: string[];
  summary: string | null;
}

function toProxyUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  try {
    const u = new URL(pathOrUrl, window.location.origin);
    return `/api/proxy${u.pathname}`;
  } catch {
    return pathOrUrl.startsWith("/")
      ? `/api/proxy${pathOrUrl}`
      : `/api/proxy/${pathOrUrl}`;
  }
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card">
      <div className="card-body flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        >
          <Icon size={22} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {sub && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidatesPageInner() {
  const tour = useTour("admin-page-candidates", CANDIDATES_STEPS);
  useRequirePermission(Permissions.Recruitment.Candidate.View);

  const canCreate = usePermission(Permissions.Recruitment.Candidate.Create);
  const canEdit = usePermission(Permissions.Recruitment.Candidate.Edit);
  const canDelete = usePermission(Permissions.Recruitment.Candidate.Delete);
  const canBlacklist = usePermission(
    Permissions.Recruitment.Candidate.Blacklist,
  );
  const canViewCv = usePermission(Permissions.Recruitment.Candidate.ViewCv);

  const initialized = useRef(false);

  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [blacklistFilter, setBlacklistFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const [form, setForm] = useState<CandidateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [nicConflict, setNicConflict] = useState<Candidate | null>(null);

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [aiCvParsingEnabled, setAiCvParsingEnabled] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [lowConfidenceFields, setLowConfidenceFields] = useState<string[]>([]);
  const [cvFileObject, setCvFileObject] = useState<File | null>(null);
  const [pendingParseLogId, setPendingParseLogId] = useState<string | null>(
    null,
  );

  const [eraseTarget, setEraseTarget] = useState<Candidate | null>(null);
  const [confirmRow, setConfirmRow] = useState<Candidate | null>(null);

  const [confirmAction, setConfirmAction] = useState<CandidateAction | null>(
    null,
  );
  const [blacklistReason, setBlacklistReason] = useState("");
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search.trim()) params.search = search.trim();
      if (sourceFilter) params.source = sourceFilter;
      if (blacklistFilter) params.isBlacklisted = blacklistFilter;
      const res = await api.get<Candidate[]>("/candidates", { params });
      setItems(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load candidates.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAiSettings = async () => {
    try {
      // Real endpoint + shape confirmed against AiSettingsController /
      // AiSettingsDto — property is CvParsingEnabled (-> cvParsingEnabled
      // over the wire), not aiCvParsingEnabled.
      const res = await api.get<{ cvParsingEnabled?: boolean }>(
        "/company/ai-settings",
      );
      setAiCvParsingEnabled(!!res.data?.cvParsingEnabled);
    } catch {
      setAiCvParsingEnabled(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadAiSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sourceFilter, blacklistFilter]);

  const stats = useMemo(() => {
    const withCv = items.filter((c) => !!c.cvFilePath).length;
    const blacklisted = items.filter((c) => c.isBlacklisted).length;
    const experienced = items.filter((c) => c.totalExperienceYears != null);
    const avgExp =
      experienced.length > 0
        ? (
            experienced.reduce((s, c) => s + (c.totalExperienceYears ?? 0), 0) /
            experienced.length
          ).toFixed(1)
        : "—";
    return { total: items.length, blacklisted, withCv, avgExp };
  }, [items]);

  const resetCvState = () => {
    setCvFileObject(null);
    setPendingParseLogId(null);
    setLowConfidenceFields([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setNicConflict(null);
    resetCvState();
    setDialogOpen(true);
  };

  const openEdit = (c: Candidate) => {
    setEditing(c);
    setForm({
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email ?? "",
      phoneNumber: c.phoneNumber ?? "",
      nationalIdNumber: c.nationalIdNumber ?? "",
      dateOfBirth: c.dateOfBirth ?? "",
      gender: c.gender ?? "",
      address: c.address ?? "",
      currentDesignation: c.currentDesignation ?? "",
      currentEmployer: c.currentEmployer ?? "",
      totalExperienceYears: c.totalExperienceYears?.toString() ?? "",
      highestEducation: c.highestEducation ?? "",
      expectedSalary: c.expectedSalary?.toString() ?? "",
      noticePeriodDays: c.noticePeriodDays?.toString() ?? "",
      source: c.source ?? "Direct",
      referredByEmployeeId: c.referredByEmployeeId ?? "",
      cvFilePath: c.cvFilePath ?? "",
      cvOriginalFilename: c.cvOriginalFilename ?? "",
      consentGiven: !!c.consentGivenAt,
      retentionMonths: "12",
      notes: "",
    });
    setError("");
    setNicConflict(null);
    resetCvState();
    setDialogOpen(true);
  };

  const handleCvSelect = async (file: File | null) => {
    if (!file) return;
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
    if (!allowed.includes(ext)) {
      showError("Invalid file", "CV must be a PDF, DOC, or DOCX file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      showError("File too large", "CV must be under 20 MB.");
      return;
    }

    const fd = new FormData();
    fd.append("file", file);

    setUploading(true);
    try {
      const res = await api.post<{ url: string }>(
        "/files/upload-doc/candidates",
        fd,
      );
      setForm((f) => ({
        ...f,
        cvFilePath: res.data.url,
        cvOriginalFilename: file.name,
      }));
      setCvFileObject(file);
      setPendingParseLogId(null);
      setLowConfidenceFields([]);
      showSuccess("CV attached", file.name);
    } catch (err: any) {
      showError(
        "Upload failed",
        err?.response?.data?.error ?? "Could not upload the CV file.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCvRemove = () => {
    setForm((f) => ({ ...f, cvFilePath: "", cvOriginalFilename: "" }));
    resetCvState();
  };

  const handleParseCv = async () => {
    if (!cvFileObject) {
      showError(
        "Parse failed",
        "The original file isn't available to parse — try re-uploading it.",
      );
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", cvFileObject);
      const res = await api.post<ParseCvResponse>("/candidates/parse-cv", fd);

      const f = res.data.fields;
      setForm((prev) => ({
        ...prev,
        firstName: f.firstName ?? prev.firstName,
        lastName: f.lastName ?? prev.lastName,
        email: f.email ?? prev.email,
        phoneNumber: f.phoneNumber ?? prev.phoneNumber,
        nationalIdNumber: f.nationalIdNumber ?? prev.nationalIdNumber,
        dateOfBirth: f.dateOfBirth ?? prev.dateOfBirth,
        gender: f.gender ?? prev.gender,
        address: f.address ?? prev.address,
        currentDesignation: f.currentDesignation ?? prev.currentDesignation,
        currentEmployer: f.currentEmployer ?? prev.currentEmployer,
        highestEducation: f.highestEducation ?? prev.highestEducation,
        totalExperienceYears:
          f.totalExperienceYears != null
            ? String(f.totalExperienceYears)
            : prev.totalExperienceYears,
      }));

      setLowConfidenceFields(res.data.missingFields ?? []);
      setPendingParseLogId(res.data.parseLogId ?? null);

      showSuccess(
        "CV parsed",
        "Review the highlighted fields before saving — nothing was auto-saved. Note: expected salary and notice period aren't extracted yet.",
      );
    } catch (err: any) {
      showError(
        "Parse failed",
        err?.response?.data?.error ??
          "Could not parse the CV. You can still fill the form in manually.",
      );
    } finally {
      setParsing(false);
    }
  };

  const isLowConfidence = (field: string) =>
    lowConfidenceFields.includes(field);
  const flagClass = (field: string) =>
    isLowConfidence(field)
      ? "ring-2 ring-amber-400 rounded-lg transition-shadow"
      : "";

  const handleSave = async () => {
    if (!editing) {
      if (!form.firstName.trim()) {
        setError("First name is required.");
        return;
      }
      if (!form.lastName.trim()) {
        setError("Last name is required.");
        return;
      }
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setError("");
    setNicConflict(null);
    try {
      const res = await api.post<{ id: string }>("/candidates/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        firstName: form.firstName.trim() || null,
        lastName: form.lastName.trim() || null,
        email: form.email.trim() || null,
        phoneNumber: form.phoneNumber.trim() || null,
        nationalIdNumber: form.nationalIdNumber.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        currentDesignation: form.currentDesignation.trim() || null,
        currentEmployer: form.currentEmployer.trim() || null,
        totalExperienceYears: form.totalExperienceYears
          ? Number(form.totalExperienceYears)
          : null,
        highestEducation: form.highestEducation.trim() || null,
        expectedSalary: form.expectedSalary
          ? Number(form.expectedSalary)
          : null,
        noticePeriodDays: form.noticePeriodDays
          ? Number(form.noticePeriodDays)
          : null,
        source: form.source || null,
        referredByEmployeeId:
          form.source === "Referral" && form.referredByEmployeeId
            ? form.referredByEmployeeId
            : null,
        cvFilePath: form.cvFilePath || null,
        cvOriginalFilename: form.cvOriginalFilename || null,
        consentGiven: form.consentGiven,
        retentionMonths: form.retentionMonths
          ? Number(form.retentionMonths)
          : null,
        notes: form.notes.trim() || null,
      });

      const candidateId = res.data.id;

      if (pendingParseLogId) {
        try {
          await api.post("/candidates/save", {
            action: "LINK_PARSE_LOG",
            id: candidateId,
            cvParseLogId: pendingParseLogId,
            cvFilePath: form.cvFilePath || null,
            cvOriginalFilename: form.cvOriginalFilename || null,
          });
        } catch (linkErr: any) {
          showError(
            "CV parse not linked",
            linkErr?.response?.data?.error ??
              "The candidate was saved, but the parsed CV data could not be linked. You can re-run parsing from Edit.",
          );
        }
      }

      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Candidate updated" : "Candidate added",
        `${form.firstName} ${form.lastName}`,
      );
    } catch (err: any) {
      if (
        err?.response?.status === 409 &&
        err?.response?.data?.code === "NIC_CONFLICT"
      ) {
        const existingId = err.response.data.existingCandidateId as string;
        const existing = items.find((c) => c.id === existingId) ?? null;
        setNicConflict(
          existing ??
            ({
              id: existingId,
              firstName: "",
              lastName: "(details not loaded)",
            } as Candidate),
        );
        showError(
          "Duplicate NIC",
          err?.response?.data?.error ??
            "A candidate with this NIC already exists.",
        );
      } else {
        showError(
          "Save failed",
          err?.response?.data?.error ?? "Could not save candidate.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const goToExistingCandidate = () => {
    if (!nicConflict) return;
    setDialogOpen(false);
    if (nicConflict.firstName) {
      openEdit(nicConflict);
    } else {
      showError(
        "Candidate exists elsewhere",
        "Refresh the list and search by NIC to find the existing record.",
      );
    }
  };

  const askConfirm = (c: Candidate, action: CandidateAction) => {
    setConfirmRow(c);
    setConfirmAction(action);
    setBlacklistReason("");
  };

  const closeConfirm = () => {
    setConfirmRow(null);
    setConfirmAction(null);
    setBlacklistReason("");
  };

  const runAction = async () => {
    if (!confirmRow || !confirmAction) return;
    if (confirmAction === "BLACKLIST" && !blacklistReason.trim()) {
      showError(
        "Reason required",
        "Enter a reason to blacklist this candidate.",
      );
      return;
    }
    setActing(true);
    try {
      await api.post("/candidates/save", {
        action: confirmAction,
        id: confirmRow.id,
        reason: confirmAction === "BLACKLIST" ? blacklistReason.trim() : null,
      });
      closeConfirm();
      await load();
      showSuccess(
        "Candidate updated",
        `${confirmRow.firstName} ${confirmRow.lastName}`,
      );
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.error ?? "Could not complete the action.",
      );
    } finally {
      setActing(false);
    }
  };

  const confirmCopy = () => {
    const name = confirmRow
      ? `${confirmRow.firstName} ${confirmRow.lastName}`
      : "";
    switch (confirmAction) {
      case "DELETE":
        return {
          title: "Delete candidate",
          message: `"${name}" will be removed from the talent pool. This cannot be undone.`,
          danger: true,
        };
      case "BLACKLIST":
        return {
          title: "Blacklist candidate",
          message: `"${name}" will be flagged and excluded from future matching.`,
          danger: true,
        };
      case "UNBLACKLIST":
        return {
          title: "Remove from blacklist",
          message: `"${name}" will be eligible for future requisitions again.`,
          danger: false,
        };
      default:
        return { title: "", message: "", danger: false };
    }
  };

  const dateFmt = (s: string | null) =>
    s
      ? new Date(s).toLocaleDateString("en-LK", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Candidate Pool
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Your talent pool — independent of any single requisition
          </p>
        </div>
        {canCreate && (
          <Button
            variant="solid"
            size="sm"
            icon={<Plus size={15} />}
            onClick={openAdd}
            data-tour="candidate-add-button"
          >
            Add Candidate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total"
          value={loading ? "—" : stats.total}
          sub="In the talent pool"
          icon={Users}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
        <KpiCard
          label="With CV"
          value={loading ? "—" : stats.withCv}
          sub="CV file attached"
          icon={FileText}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <KpiCard
          label="Avg. Experience"
          value={loading ? "—" : stats.avgExp}
          sub="Years, where known"
          icon={UserCheck}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />
        <KpiCard
          label="Blacklisted"
          value={loading ? "—" : stats.blacklisted}
          sub="Excluded from matching"
          icon={Ban}
          color="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
        />
      </div>

      <div className="card">
        <div className="card-body">
          <div
            className="flex items-center gap-3 mb-4 flex-wrap"
            data-tour="candidate-filter-row"
          >
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search name, email, phone, NIC…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input w-auto"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="">All Sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="input w-auto"
              value={blacklistFilter}
              onChange={(e) => setBlacklistFilter(e.target.value)}
            >
              <option value="">All Candidates</option>
              <option value="false">Active only</option>
              <option value="true">Blacklisted only</option>
            </select>

            <button
              onClick={load}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {items.length} candidate{items.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No candidates found</p>
              {(search || sourceFilter || blacklistFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setSourceFilter("");
                    setBlacklistFilter("");
                  }}
                  className="text-xs text-violet-500 hover:underline mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="table-default table-hover w-full"
                data-tour="candidate-table-card"
              >
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Current Role</th>
                    <th>Experience</th>
                    <th>Source</th>
                    <th>CV</th>
                    <th>Applications</th>
                    <th>Added</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white text-sm">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.isBlacklisted && (
                            <span className="xp-badge xp-badge-danger">
                              Blacklisted
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {c.email ?? c.phoneNumber ?? "—"}
                        </p>
                      </td>

                      <td>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {c.currentDesignation ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {c.currentEmployer ?? ""}
                        </p>
                      </td>

                      <td>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {c.totalExperienceYears != null
                            ? `${c.totalExperienceYears} yrs`
                            : "—"}
                        </span>
                      </td>

                      <td>
                        <span className="xp-badge xp-badge-neutral">
                          {c.source}
                        </span>
                        {c.source === "Referral" && c.referredByName && (
                          <p className="text-[11px] text-gray-400 mt-1">
                            via {c.referredByName}
                          </p>
                        )}
                      </td>

                      <td>
                        {c.cvFilePath ? (
                          canViewCv ? (
                            <a
                              href={toProxyUrl(c.cvFilePath)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-violet-500 hover:underline"
                              title={c.cvOriginalFilename ?? "View CV"}
                            >
                              <Paperclip size={12} />
                              View
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                              <Paperclip size={12} />
                              Attached
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      <td>
                        {c.applicationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-violet-500">
                            <ArrowRightCircle size={13} />
                            {c.applicationCount}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </td>

                      <td>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {dateFmt(c.createdAt)}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {canBlacklist && !c.isBlacklisted && (
                            <button
                              onClick={() => askConfirm(c, "BLACKLIST")}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Blacklist"
                            >
                              <Ban size={15} />
                            </button>
                          )}

                          {canBlacklist && c.isBlacklisted && (
                            <button
                              onClick={() => askConfirm(c, "UNBLACKLIST")}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                              title="Remove from blacklist"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => askConfirm(c, "DELETE")}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setEraseTarget(c)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                              title="Erase Personal Data (PDPA)"
                            >
                              <ShieldOff size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
        width={720}
      >
        <h5 className="h5 mb-4">
          {editing
            ? `Edit ${editing.firstName} ${editing.lastName}`
            : "Add Candidate"}
        </h5>

        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3.5">
            <label className="form-label mb-1">CV</label>

            <div className="flex items-center flex-wrap gap-3">
              {!form.cvOriginalFilename ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  icon={
                    uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )
                  }
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Upload CV"}
                </Button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-1.5">
                  <Paperclip size={13} className="text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[220px]">
                    {form.cvOriginalFilename}
                  </span>
                  {form.cvFilePath && (
                    <a
                      href={toProxyUrl(form.cvFilePath)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-500 hover:underline inline-flex items-center"
                      title="View CV"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCvRemove}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove CV"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleCvSelect(e.target.files?.[0] ?? null)}
              />

              {aiCvParsingEnabled && cvFileObject && !pendingParseLogId && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  icon={
                    parsing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )
                  }
                  disabled={parsing}
                  onClick={handleParseCv}
                >
                  {parsing ? "Parsing…" : "Parse CV & Autofill"}
                </Button>
              )}

              {pendingParseLogId && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} />
                  Parsed — will attach on save
                </span>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-1.5">
              PDF, DOC, or DOCX — up to 20 MB.
              {aiCvParsingEnabled
                ? " Upload works on its own — parsing (PDF only) is optional and only runs when you click it."
                : " Stored only; AI parsing is turned off for this company."}
            </p>

            {lowConfidenceFields.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
                Fields outlined in amber weren&apos;t found in the CV — please
                fill them in or double-check before saving. Expected salary and
                notice period are never auto-filled; the parser doesn&apos;t
                extract those.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                First Name <span className="text-error">*</span>
              </label>
              <div className={flagClass("firstName")}>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">
                Last Name <span className="text-error">*</span>
              </label>
              <div className={flagClass("lastName")}>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Email</label>
              <div className={flagClass("email")}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">Phone Number</label>
              <div className={flagClass("phoneNumber")}>
                <Input
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">NIC</label>
              <div className={flagClass("nationalIdNumber")}>
                <Input
                  value={form.nationalIdNumber}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      nationalIdNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">Date of Birth</label>
              <Input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Gender</label>
              <select
                className="input w-full"
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value }))
                }
              >
                <option value="">— Select —</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Address</label>
            <div className={flagClass("address")}>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Current Designation</label>
              <div className={flagClass("currentDesignation")}>
                <Input
                  value={form.currentDesignation}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentDesignation: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">Current Employer</label>
              <div className={flagClass("currentEmployer")}>
                <Input
                  value={form.currentEmployer}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      currentEmployer: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Experience (yrs)</label>
              <div className={flagClass("totalExperienceYears")}>
                <Input
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.totalExperienceYears}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      totalExperienceYears: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="form-label">Expected Salary</label>
              <Input
                type="number"
                min={0}
                value={form.expectedSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expectedSalary: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Notice Period (days)</label>
              <Input
                type="number"
                min={0}
                value={form.noticePeriodDays}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    noticePeriodDays: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">Highest Education</label>
            <div className={flagClass("highestEducation")}>
              <Input
                value={form.highestEducation}
                onChange={(e) =>
                  setForm((f) => ({ ...f, highestEducation: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Source</label>
              <select
                className="input w-full"
                value={form.source}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source: e.target.value }))
                }
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {form.source === "Referral" && (
              <div>
                <label className="form-label">Referring Employee ID</label>
                <Input
                  placeholder="Employee ID"
                  value={form.referredByEmployeeId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      referredByEmployeeId: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Candidate consent obtained
              </span>
              <p className="text-xs text-gray-400">
                Confirms the candidate agreed to their data being stored (PDPA).
              </p>
            </div>
            <Switcher
              checked={form.consentGiven}
              onChange={(checked: boolean) =>
                setForm((f) => ({ ...f, consentGiven: checked }))
              }
            />
          </div>
          <DownloadComplianceDocLink label="View our AI Transparency & Bias Statement" />

          <div>
            <label className="form-label">Notes</label>
            <textarea
              className="input w-full resize-y"
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              <p>{error}</p>
              {nicConflict && (
                <button
                  type="button"
                  onClick={goToExistingCandidate}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  <ArrowRightCircle size={13} />
                  View existing candidate
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Save Changes" : "Add Candidate"}
          </Button>
        </div>
      </Dialog>

      {/* Confirm action */}
      <Dialog
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        onRequestClose={closeConfirm}
        width={420}
      >
        <div className="text-center space-y-4">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              confirmCopy().danger
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-violet-100 dark:bg-violet-900/30"
            }`}
          >
            {confirmCopy().danger ? (
              confirmAction === "DELETE" ? (
                <Trash2 size={24} className="text-red-500" />
              ) : (
                <Ban size={24} className="text-red-500" />
              )
            ) : (
              <CheckCircle2 size={24} className="text-violet-500" />
            )}
          </div>
          <div>
            <h5 className="font-semibold text-gray-900 dark:text-white">
              {confirmCopy().title}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {confirmCopy().message}
            </p>
          </div>

          {confirmAction === "BLACKLIST" && (
            <div className="text-left">
              <label className="form-label">
                Reason <span className="text-error">*</span>
              </label>
              <textarea
                className="input w-full resize-y"
                rows={3}
                placeholder="Why is this candidate being blacklisted?"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-center gap-3 pt-1">
            <Button variant="default" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              variant="solid"
              loading={acting}
              className={
                confirmCopy().danger
                  ? "bg-red-500 hover:bg-red-600 text-white border-red-500"
                  : ""
              }
              onClick={runAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Right-to-erasure (PDPA) */}
      {eraseTarget && (
        <CandidateErasureDialog
          candidateId={eraseTarget.id}
          candidateName={`${eraseTarget.firstName} ${eraseTarget.lastName}`}
          isOpen={true}
          onClose={() => setEraseTarget(null)}
          onErased={load}
        />
      )}

      {tour.visible && (
        <TourOverlay
          step={tour.step}
          stepIndex={tour.stepIndex}
          totalSteps={tour.totalSteps}
          onNext={tour.next}
          onPrev={tour.prev}
          onDismiss={tour.dismiss}
          nextStepTarget={tour.nextStep?.target}
        />
      )}
    </div>
  );
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={null}>
      <CandidatesPageInner />
    </Suspense>
  );
}
