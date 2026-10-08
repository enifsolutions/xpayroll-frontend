"use client";

import { useEffect, useState } from "react";
import axios from "@/lib/axios";
import { showError, showSuccess } from "@/lib/toast";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import Switcher from "@/components/ui/Switcher";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface CategoryFull {
  id: string;
  name: string;
  defaultSeverity: string;
  forceConfidential: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

const EMPTY_FORM = {
  isAnonymous: false,
  employeeId: "",
  categoryId: "",
  subject: "",
  description: "",
  isConfidential: false,
};

export default function RecordGrievanceDialog({
  isOpen,
  onClose,
  onDone,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [empSearch, setEmpSearch] = useState("");

  const [categories, setCategories] = useState<CategoryFull[]>([]);
  const [allowAnonymous, setAllowAnonymous] = useState(true);
  const [loadingStatic, setLoadingStatic] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setEmpSearch("");
    loadStaticData();
  }, [isOpen]);

  async function loadStaticData() {
    setLoadingStatic(true);
    try {
      const [empRes, catRes, policyRes] = await Promise.all([
        axios.get("/employees", { params: { status: "Active" } }),
        axios.get("/grievance-config/categories", {
          params: { activeOnly: true },
        }),
        axios.get("/grievance-config/policy"),
      ]);
      setEmployees(
        empRes.data.map((e: any) => ({
          id: String(e.id),
          firstName: e.firstName,
          lastName: e.lastName,
          employeeCode: e.employeeCode,
        })),
      );
      setCategories(
        catRes.data.map((c: any) => ({
          id: String(c.id),
          name: c.name,
          defaultSeverity: c.defaultSeverity,
          forceConfidential: c.forceConfidential,
        })),
      );
      setAllowAnonymous(!!policyRes.data.allowAnonymous);
    } catch (err: any) {
      showError(
        "Load failed",
        err?.response?.data?.error ?? "Could not load form data.",
      );
    } finally {
      setLoadingStatic(false);
    }
  }

  const selectedEmployee = employees.find((e) => e.id === form.employeeId);
  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  const filteredEmployees = employees.filter(
    (e) =>
      empSearch === "" ||
      e.employeeCode.toLowerCase().includes(empSearch.toLowerCase()) ||
      `${e.firstName} ${e.lastName}`
        .toLowerCase()
        .includes(empSearch.toLowerCase()),
  );

  function set<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  }

  // Force-confidential overrides upward only, mirroring the SP: once a
  // category with forceConfidential is picked, the checkbox is pinned ON
  // and can't be unchecked here — it can still be checked manually for a
  // category that doesn't force it.
  useEffect(() => {
    if (selectedCategory?.forceConfidential) {
      setForm((f) => ({ ...f, isConfidential: true }));
    }
  }, [selectedCategory?.forceConfidential]);

  function toggleAnonymous(v: boolean) {
    setForm((f) => ({
      ...f,
      isAnonymous: v,
      employeeId: v ? "" : f.employeeId,
    }));
    setEmpSearch("");
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.isAnonymous && !form.employeeId)
      e.employeeId = "Employee is required, or mark this as anonymous.";
    if (!form.categoryId) e.categoryId = "Category is required.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.description.trim()) e.description = "Description is required.";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setSaving(true);
    try {
      await axios.post("/grievances/save", {
        employeeId: form.isAnonymous ? null : form.employeeId,
        categoryId: form.categoryId,
        subject: form.subject.trim(),
        description: form.description.trim(),
        isConfidential: form.isConfidential,
        isAnonymous: form.isAnonymous,
        assignedTo: null,
      });
      showSuccess(
        "Grievance recorded",
        "The case has been logged successfully.",
      );
      onDone();
    } catch (err: any) {
      showError(
        "Save failed",
        err?.response?.data?.message ??
          err?.response?.data?.error ??
          "Could not record this grievance.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} onRequestClose={onClose}>
      <div className="p-6 pb-4">
        <h4 className="font-bold heading-text mb-1">Record Grievance</h4>
        <p className="text-sm text-gray-500">
          Log a grievance on behalf of an employee, or record it anonymously.
        </p>
      </div>

      <div className="px-6 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {loadingStatic ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {allowAnonymous && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/40 px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium">Anonymous Submission</p>
                  <p className="text-xs text-gray-500">
                    No identity is captured anywhere, including the audit trail.
                  </p>
                </div>
                <Switcher
                  checked={form.isAnonymous}
                  onChange={toggleAnonymous}
                />
              </div>
            )}

            {!form.isAnonymous && (
              <div>
                <label className="form-label">
                  Employee <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search by name or code..."
                    value={empSearch}
                    onChange={(e) => {
                      setEmpSearch(e.target.value);
                      if (form.employeeId) set("employeeId", "");
                    }}
                  />
                  {form.employeeId && selectedEmployee && (
                    <div className="mt-1 text-sm text-primary font-medium">
                      ✓ {selectedEmployee.firstName} {selectedEmployee.lastName}{" "}
                      ({selectedEmployee.employeeCode})
                    </div>
                  )}
                  {empSearch && !form.employeeId && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-sm text-gray-400">
                          No employees found
                        </div>
                      ) : (
                        filteredEmployees.slice(0, 10).map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                            onClick={() => {
                              set("employeeId", e.id);
                              setEmpSearch(`${e.firstName} ${e.lastName}`);
                            }}
                          >
                            {e.firstName} {e.lastName}{" "}
                            <span className="text-gray-400">
                              ({e.employeeCode})
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {errors.employeeId && (
                  <p className="text-xs text-rose-500 mt-1">
                    {errors.employeeId}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="form-label">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                className="select w-full"
                value={form.categoryId}
                onChange={(e) => set("categoryId", e.target.value)}
              >
                <option value="">— Select a category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.categoryId}
                </p>
              )}
              {selectedCategory && (
                <p className="text-xs text-gray-400 mt-1">
                  Default severity:{" "}
                  <span className="font-medium">
                    {selectedCategory.defaultSeverity}
                  </span>
                  {selectedCategory.forceConfidential &&
                    " — this category always treats cases as confidential."}
                </p>
              )}
            </div>

            <div>
              <label className="form-label">
                Subject <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                placeholder="Short summary of the grievance"
              />
              {errors.subject && (
                <p className="text-xs text-rose-500 mt-1">{errors.subject}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="input w-full resize-none"
                rows={4}
                placeholder="Full details of what happened…"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
              {errors.description && (
                <p className="text-xs text-rose-500 mt-1">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800/40 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium">Mark as Confidential</p>
                <p className="text-xs text-gray-500">
                  {selectedCategory?.forceConfidential
                    ? "Locked on — this category always forces confidentiality."
                    : "Restricts visibility to the assignee and holders of ViewConfidential."}
                </p>
              </div>
              <Switcher
                checked={form.isConfidential}
                onChange={(v) => set("isConfidential", v)}
                disabled={selectedCategory?.forceConfidential}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-6 py-4">
        <button className="btn btn-default" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <Button
          variant="solid"
          color="primary"
          loading={saving}
          onClick={handleSave}
          disabled={loadingStatic}
        >
          Record Grievance
        </Button>
      </div>
    </Dialog>
  );
}
