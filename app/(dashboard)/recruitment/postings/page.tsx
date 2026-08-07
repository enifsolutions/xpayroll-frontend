"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  XCircle,
  CheckCircle2,
  Users,
  Eye,
  RefreshCw,
  Megaphone,
  Link2,
  Globe,
  Building2,
  X,
  Briefcase,
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

interface JobPosting {
  id: string;
  requisitionId: string;
  requisitionCode: string;
  title: string;
  publicSlug: string | null;
  description: string | null;
  requirements: string | null;
  responsibilities: string | null;
  isInternal: boolean;
  isExternal: boolean;
  showSalary: boolean;
  locationText: string | null;
  publishAt: string | null;
  expireAt: string | null;
  publishChannels: string[];
  status: string;
  viewCount: number;
  applicationCount: number;
  createdAt: string;
}

interface RequisitionOption {
  id: string;
  requisitionCode: string;
  title: string;
  status: string;
  requirements: string | null;
  responsibilities: string | null;
}

// Mirrors RequisitionRequirementsDto (GET /requisitions/{id}/requirements)
interface RequisitionSkillDto {
  id: string;
  skillId: string;
  skillName: string;
  category: string | null;
  isMandatory: boolean;
  minYears: number | null;
  weight: number;
  isAiSuggested: boolean;
  measurementType: string; // "Years" | "Level"
  proficiencyScaleId: string | null;
  minProficiencyLevelId: string | null;
  minProficiencyLevelName: string | null;
}

interface RequisitionCertificationDto {
  id: string;
  certificationId: string;
  certificationName: string;
  isMandatory: boolean;
}

interface RequisitionFieldDto {
  fieldOfStudyId: string;
  fieldOfStudyName: string;
}

interface RequisitionRequirementsDto {
  requisitionId: string;
  minEducationLevelId: string | null;
  minEducationLevelName: string | null;
  educationIsMandatory: boolean;
  acceptableFields: RequisitionFieldDto[];
  skills: RequisitionSkillDto[];
  certifications: RequisitionCertificationDto[];
}

interface PostingForm {
  requisitionId: string;
  title: string;
  publicSlug: string;
  description: string;
  requirements: string;
  responsibilities: string;
  isInternal: boolean;
  isExternal: boolean;
  showSalary: boolean;
  locationText: string;
  publishAt: string;
  expireAt: string;
  publishChannels: string[];
}

const EMPTY: PostingForm = {
  requisitionId: "",
  title: "",
  publicSlug: "",
  description: "",
  requirements: "",
  responsibilities: "",
  isInternal: true,
  isExternal: true,
  showSalary: false,
  locationText: "",
  publishAt: "",
  expireAt: "",
  publishChannels: [],
};

const STATUS_BADGE: Record<string, string> = {
  Draft: "xp-badge-neutral",
  Published: "xp-badge-success",
  Unpublished: "xp-badge-warning",
  Expired: "xp-badge-danger",
};

const PUBLISH_CHANNELS = [
  "LinkedIn",
  "Facebook",
  "Instagram",
  "Company Website",
  "Newspaper",
  "topjobs.lk",
  "Xpress Jobs",
  "WhatsApp",
  "Referral",
];

type PostingAction = "DELETE" | "PUBLISH" | "UNPUBLISH";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// Turns the requisition's structured requirement records into a readable
// draft for the posting's plain-text Requirements field. Deliberately
// omits internal-only fields (weight, isAiSuggested) that aren't
// candidate-facing.
function formatRequirementsSummary(dto: RequisitionRequirementsDto): string {
  const lines: string[] = [];

  const describeSkill = (s: RequisitionSkillDto) => {
    if (s.measurementType === "Level" && s.minProficiencyLevelName) {
      return `${s.skillName} (${s.minProficiencyLevelName}+)`;
    }
    if (s.measurementType === "Years" && s.minYears) {
      return `${s.skillName} (${s.minYears}+ yrs)`;
    }
    return s.skillName;
  };

  const mandatorySkills = dto.skills.filter((s) => s.isMandatory);
  const niceToHaveSkills = dto.skills.filter((s) => !s.isMandatory);

  if (mandatorySkills.length > 0) {
    lines.push("Must have:");
    mandatorySkills.forEach((s) => lines.push(`- ${describeSkill(s)}`));
  }

  if (niceToHaveSkills.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Nice to have:");
    niceToHaveSkills.forEach((s) => lines.push(`- ${describeSkill(s)}`));
  }

  if (dto.minEducationLevelName) {
    if (lines.length > 0) lines.push("");
    const fields =
      dto.acceptableFields.length > 0
        ? ` in ${dto.acceptableFields.map((f) => f.fieldOfStudyName).join(" or ")}`
        : "";
    const qualifier = dto.educationIsMandatory ? "required" : "preferred";
    lines.push(
      `Education: ${dto.minEducationLevelName}${fields} (${qualifier})`,
    );
  }

  if (dto.certifications.length > 0) {
    if (lines.length > 0) lines.push("");
    const mandatoryCerts = dto.certifications.filter((c) => c.isMandatory);
    const optionalCerts = dto.certifications.filter((c) => !c.isMandatory);
    if (mandatoryCerts.length > 0) {
      lines.push(
        `Certifications required: ${mandatoryCerts.map((c) => c.certificationName).join(", ")}`,
      );
    }
    if (optionalCerts.length > 0) {
      lines.push(
        `Certifications preferred: ${optionalCerts.map((c) => c.certificationName).join(", ")}`,
      );
    }
  }

  return lines.join("\n");
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

function JobPostingsPageInner() {
  useRequirePermission("Recruitment.Posting.View");

  const canManage = usePermission(Permissions.Recruitment.Posting.Create);
  const canEdit = usePermission(Permissions.Recruitment.Posting.Edit);
  const canPublish = usePermission(Permissions.Recruitment.Posting.Publish);
  const canUnpublish = usePermission(Permissions.Recruitment.Posting.Unpublish);

  const router = useRouter();
  const searchParams = useSearchParams();
  // Arriving from /recruitment/requisitions?...→ "View job postings" link.
  // When present, the list is pre-filtered to this requisition and the
  // Add dialog defaults to it.
  const requisitionIdParam = searchParams.get("requisitionId");

  const initialized = useRef(false);

  const [items, setItems] = useState<JobPosting[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JobPosting | null>(null);
  const [form, setForm] = useState<PostingForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [requirementsAutoFilled, setRequirementsAutoFilled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [confirmRow, setConfirmRow] = useState<JobPosting | null>(null);
  const [confirmAction, setConfirmAction] = useState<PostingAction | null>(
    null,
  );
  const [acting, setActing] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<JobPosting[]>("/job-postings");
      setItems(res.data ?? []);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load job postings.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRequisitions = async () => {
    try {
      const res = await api.get<RequisitionOption[]>("/requisitions");
      const eligible = (res.data ?? []).filter(
        (r) => r.status === "Approved" || r.status === "Open",
      );
      setRequisitions(eligible);
    } catch {
      // non-fatal — the picker just shows empty
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
    loadRequisitions();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      if (requisitionIdParam && p.requisitionId !== requisitionIdParam)
        return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.requisitionCode.toLowerCase().includes(q) &&
          !(p.locationText ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [items, search, statusFilter, requisitionIdParam]);

  const filteredRequisitionLabel = useMemo(() => {
    if (!requisitionIdParam) return null;
    const fromItems = items.find((p) => p.requisitionId === requisitionIdParam);
    if (fromItems) return fromItems.requisitionCode;
    const fromLookup = requisitions.find((r) => r.id === requisitionIdParam);
    return fromLookup?.requisitionCode ?? requisitionIdParam;
  }, [requisitionIdParam, items, requisitions]);

  const clearRequisitionFilter = () => {
    router.push("/recruitment/postings");
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      published: items.filter((p) => p.status === "Published").length,
      applications: items.reduce((sum, p) => sum + p.applicationCount, 0),
      views: items.reduce((sum, p) => sum + p.viewCount, 0),
    }),
    [items],
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, requisitionId: requisitionIdParam ?? "" });
    setSlugTouched(false);
    setRequirementsAutoFilled(false);
    setError("");
    setDialogOpen(true);

    // Reuses the same fetch+format path as manually picking a requisition
    // in the dropdown, so both entry points behave identically.
    if (requisitionIdParam) {
      handleRequisitionChange(requisitionIdParam);
    }
  };

  const openEdit = (p: JobPosting) => {
    setEditing(p);
    setForm({
      requisitionId: p.requisitionId,
      title: p.title ?? "",
      publicSlug: p.publicSlug ?? "",
      description: p.description ?? "",
      requirements: p.requirements ?? "",
      responsibilities: p.responsibilities ?? "",
      isInternal: p.isInternal,
      isExternal: p.isExternal,
      showSalary: p.showSalary,
      locationText: p.locationText ?? "",
      publishAt: p.publishAt ? p.publishAt.slice(0, 16) : "",
      expireAt: p.expireAt ? p.expireAt.slice(0, 16) : "",
      publishChannels: p.publishChannels ?? [],
    });
    setSlugTouched(true);
    setRequirementsAutoFilled(false);
    setError("");
    setDialogOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setForm((f) => ({
      ...f,
      title: value,
      publicSlug: slugTouched ? f.publicSlug : slugify(value),
    }));
  };

  // Guards against a stale fetch resolving after the user picks a
  // different requisition before the first request finishes.
  const requisitionFetchToken = useRef(0);

  // force=true bypasses the "don't overwrite existing text" guard — used
  // by the explicit "Regenerate" button so a recruiter can pull a fresh
  // copy after changing skills/education on the requisition itself.
  const handleRequisitionChange = async (
    requisitionId: string,
    force = false,
  ) => {
    const req = requisitions.find((r) => r.id === requisitionId);

    setForm((f) => ({
      ...f,
      requisitionId,
      // Responsibilities is still a plain text field on RequisitionDto
      // (unlike Requirements, which now lives in structured
      // skill/education/certification records) — safe to copy directly.
      responsibilities:
        !editing &&
        (force || !f.responsibilities.trim()) &&
        req?.responsibilities
          ? req.responsibilities
          : f.responsibilities,
    }));

    // Never overwrite on Edit, and never clobber text the recruiter
    // already started typing (unless explicitly regenerating).
    if (editing || !requisitionId) return;

    const token = ++requisitionFetchToken.current;
    try {
      const res = await api.get<RequisitionRequirementsDto>(
        `/requisitions/${requisitionId}/requirements`,
      );
      if (token !== requisitionFetchToken.current) return; // selection changed since

      const summary = formatRequirementsSummary(res.data);
      if (!summary) return;

      setForm((f) =>
        f.requisitionId === requisitionId && (force || !f.requirements.trim())
          ? { ...f, requirements: summary }
          : f,
      );
      setRequirementsAutoFilled(true);
    } catch {
      // Non-fatal — requisition may have no structured requirements yet.
      // The recruiter can still type Requirements manually.
    }
  };

  const toggleChannel = (channel: string) => {
    setForm((f) => ({
      ...f,
      publishChannels: f.publishChannels.includes(channel)
        ? f.publishChannels.filter((c) => c !== channel)
        : [...f.publishChannels, channel],
    }));
  };

  const handleSave = async () => {
    if (!form.requisitionId) {
      setError("Requisition is required.");
      return;
    }
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.isInternal && !form.isExternal) {
      setError("The posting must be visible internally, externally, or both.");
      return;
    }
    if (form.publicSlug && !/^[a-z0-9-]+$/.test(form.publicSlug)) {
      setError(
        "Public slug may contain only lowercase letters, numbers and hyphens.",
      );
      return;
    }
    if (
      form.publishAt &&
      form.expireAt &&
      new Date(form.expireAt) <= new Date(form.publishAt)
    ) {
      setError("Expiry must be after the publish date.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.post("/job-postings/save", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        requisitionId: form.requisitionId,
        title: form.title.trim(),
        publicSlug: form.publicSlug.trim() || null,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        responsibilities: form.responsibilities.trim() || null,
        isInternal: form.isInternal,
        isExternal: form.isExternal,
        showSalary: form.showSalary,
        locationText: form.locationText.trim() || null,
        publishAt: form.publishAt
          ? new Date(form.publishAt).toISOString()
          : null,
        expireAt: form.expireAt ? new Date(form.expireAt).toISOString() : null,
        publishChannels: form.publishChannels,
      });
      setDialogOpen(false);
      await load();
      showSuccess(editing ? "Posting updated" : "Posting created", form.title);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error;
      setError(msg ?? "Could not save job posting.");
    } finally {
      setSaving(false);
    }
  };

  const askConfirm = (p: JobPosting, action: PostingAction) => {
    setConfirmRow(p);
    setConfirmAction(action);
  };

  const closeConfirm = () => {
    setConfirmRow(null);
    setConfirmAction(null);
  };

  const runAction = async () => {
    if (!confirmRow || !confirmAction) return;
    setActing(true);
    try {
      await api.post("/job-postings/save", {
        action: confirmAction,
        id: confirmRow.id,
      });
      closeConfirm();
      await load();
      showSuccess("Posting updated", confirmRow.title);
    } catch (err: any) {
      showError(
        "Action failed",
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          "Could not complete the action.",
      );
    } finally {
      setActing(false);
    }
  };

  const confirmCopy = (): {
    title: string;
    message: string;
    danger: boolean;
  } => {
    const t = confirmRow?.title ?? "";
    switch (confirmAction) {
      case "DELETE":
        return {
          title: "Delete posting",
          message: `"${t}" will be soft-deleted. This cannot be undone.`,
          danger: true,
        };
      case "PUBLISH":
        return {
          title: "Publish posting",
          message: `"${t}" will go live and start accepting applications.`,
          danger: false,
        };
      case "UNPUBLISH":
        return {
          title: "Unpublish posting",
          message: `"${t}" will be taken down. It can be republished later.`,
          danger: false,
        };
      default:
        return { title: "", message: "", danger: false };
    }
  };

  const isEditable = (s: string) => s === "Draft" || s === "Unpublished";

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
            Job Postings
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Publish approved requisitions to your internal or public careers
            page
          </p>
        </div>
        {canManage && (
          <Button
            variant="solid"
            size="sm"
            icon={<Plus size={15} />}
            onClick={openAdd}
          >
            New Posting
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total"
          value={loading ? "—" : stats.total}
          sub="All postings"
          icon={Megaphone}
          color="bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
        />
        <KpiCard
          label="Published"
          value={loading ? "—" : stats.published}
          sub="Live right now"
          icon={Globe}
          color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
        />
        <KpiCard
          label="Applications"
          value={loading ? "—" : stats.applications}
          sub="Across all postings"
          icon={Users}
          color="bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
        />
        <KpiCard
          label="Views"
          value={loading ? "—" : stats.views}
          sub="Total page views"
          icon={Eye}
          color="bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
        />
      </div>

      {requisitionIdParam && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-900/20 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-violet-700 dark:text-violet-300">
            <Briefcase size={14} />
            <span>
              Showing postings for{" "}
              <span className="font-mono font-medium">
                {filteredRequisitionLabel}
              </span>
            </span>
          </div>
          <button
            onClick={clearRequisitionFilter}
            className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline"
          >
            <X size={13} />
            Clear filter
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="flex-1 max-w-xs">
              <Input
                placeholder="Search title, code or location…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 170 }}
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Unpublished">Unpublished</option>
              <option value="Expired">Expired</option>
            </select>

            <button
              onClick={load}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>

            <span className="text-sm text-gray-400 ml-auto whitespace-nowrap">
              {filtered.length} posting{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Megaphone size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No job postings found</p>
              {(search || statusFilter) && (
                <button
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                  }}
                  className="text-xs text-violet-500 hover:underline mt-1"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-default table-hover w-full">
                <thead>
                  <tr>
                    <th>Posting</th>
                    <th>Requisition</th>
                    <th>Visibility</th>
                    <th>Window</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Applicants</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-semibold text-gray-900 dark:text-white text-sm">
                          {p.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {p.locationText ?? "—"}
                        </p>
                      </td>

                      <td>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md">
                          {p.requisitionCode}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5">
                          {p.isInternal && (
                            <span
                              className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500"
                              title="Internal"
                            >
                              <Building2 size={13} />
                            </span>
                          )}
                          {p.isExternal && (
                            <span
                              className="p-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500"
                              title="External"
                            >
                              <Globe size={13} />
                            </span>
                          )}
                          {p.status === "Published" && p.publicSlug && (
                            <a
                              href={`/careers/${p.publicSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-500"
                              title="View public listing"
                            >
                              <Link2 size={13} />
                            </a>
                          )}
                        </div>
                        {p.publishChannels?.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-1 truncate max-w-[160px]">
                            {p.publishChannels.join(", ")}
                          </p>
                        )}
                      </td>

                      <td>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {dateFmt(p.publishAt)} – {dateFmt(p.expireAt)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`xp-badge ${STATUS_BADGE[p.status] ?? "xp-badge-neutral"}`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {p.viewCount}
                        </span>
                      </td>

                      <td>
                        {p.applicationCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-violet-500">
                            <Users size={13} />
                            {p.applicationCount}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">0</span>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {canPublish && isEditable(p.status) && (
                            <button
                              onClick={() => askConfirm(p, "PUBLISH")}
                              className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 transition-colors"
                              title="Publish"
                            >
                              <Send size={15} />
                            </button>
                          )}

                          {canUnpublish && p.status === "Published" && (
                            <button
                              onClick={() => askConfirm(p, "UNPUBLISH")}
                              className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-500 transition-colors"
                              title="Unpublish"
                            >
                              <XCircle size={15} />
                            </button>
                          )}

                          {canEdit && isEditable(p.status) && (
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={15} />
                            </button>
                          )}

                          {canManage && isEditable(p.status) && (
                            <button
                              onClick={() => askConfirm(p, "DELETE")}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
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
          {editing ? `Edit ${editing.title}` : "New Job Posting"}
        </h5>

        <div className="space-y-4">
          <div>
            <label className="form-label">
              Requisition <span className="text-error">*</span>
            </label>
            <select
              className="input w-full"
              value={form.requisitionId}
              disabled={!!editing}
              onChange={(e) => handleRequisitionChange(e.target.value)}
            >
              <option value="">— Select —</option>
              {requisitions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.requisitionCode} — {r.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">
              Title <span className="text-error">*</span>
            </label>
            <Input
              placeholder="e.g. Senior Payroll Analyst"
              value={form.title}
              onChange={(e) => handleTitleChange(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Public Slug</label>
              <Input
                placeholder="auto-generated-from-title"
                value={form.publicSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({
                    ...f,
                    publicSlug: slugify(e.target.value),
                  }));
                }}
              />
            </div>
            <div>
              <label className="form-label">Location</label>
              <Input
                placeholder="e.g. Colombo (Hybrid)"
                value={form.locationText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationText: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Publish At</label>
              <Input
                type="datetime-local"
                value={form.publishAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, publishAt: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="form-label">Expire At</label>
              <Input
                type="datetime-local"
                value={form.expireAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expireAt: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Internal
              </span>
              <Switcher
                checked={form.isInternal}
                onChange={(checked: boolean) =>
                  setForm((f) => ({ ...f, isInternal: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                External
              </span>
              <Switcher
                checked={form.isExternal}
                onChange={(checked: boolean) =>
                  setForm((f) => ({ ...f, isExternal: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                Show Salary
              </span>
              <Switcher
                checked={form.showSalary}
                onChange={(checked: boolean) =>
                  setForm((f) => ({ ...f, showSalary: checked }))
                }
              />
            </div>
          </div>

          {/* <div>
            <label className="form-label">Publish Channels</label>
            <div className="flex flex-wrap gap-2">
              {PUBLISH_CHANNELS.map((channel) => {
                const active = form.publishChannels.includes(channel);
                return (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "bg-violet-500 border-violet-500 text-white"
                        : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-300"
                    }`}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Where this posting will be distributed once published.
              Informational — doesn't trigger auto-posting.
            </p>
          </div> */}

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="input w-full resize-y"
              rows={3}
              placeholder="Role overview shown on the listing"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Requirements</label>
              {requirementsAutoFilled && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2 py-0.5 rounded-full">
                    Auto-filled from requisition
                  </span>
                  {form.requisitionId && (
                    <button
                      type="button"
                      onClick={() =>
                        handleRequisitionChange(form.requisitionId, true)
                      }
                      className="text-[11px] text-violet-500 hover:underline"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              )}
            </div>
            <textarea
              className="input w-full resize-y font-mono text-sm leading-relaxed"
              rows={8}
              placeholder="Qualifications a candidate must have — education, experience, certifications, skills"
              value={form.requirements}
              onChange={(e) => {
                setRequirementsAutoFilled(false);
                setForm((f) => ({ ...f, requirements: e.target.value }));
              }}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Pulled from the requisition's skills, education, and
              certifications when available. Edit freely — this is the
              candidate-facing copy.
            </p>
          </div>

          <div>
            <label className="form-label">Responsibilities</label>
            <textarea
              className="input w-full resize-y"
              rows={5}
              placeholder="Day-to-day duties for this role"
              value={form.responsibilities}
              onChange={(e) =>
                setForm((f) => ({ ...f, responsibilities: e.target.value }))
              }
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="default" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>
            {editing ? "Save Changes" : "Create"}
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
              <Trash2 size={24} className="text-red-500" />
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
    </div>
  );
}

export default function JobPostingsPage() {
  return (
    <Suspense fallback={null}>
      <JobPostingsPageInner />
    </Suspense>
  );
}
