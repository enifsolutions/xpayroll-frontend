#!/usr/bin/env python3
"""
XpayRoll — Patch employees page.tsx to add Leave Template to wizard
Run from: /Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend
"""
import os

BASE = "/Users/gayansaranga/My Files/XpayRoll/xpayroll-frontend"
path = os.path.join(BASE, "app/(dashboard)/employees/page.tsx")

with open(path, "r", encoding="utf-8") as f:
    src = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add LeaveTemplateOption interface after existing imports
# ─────────────────────────────────────────────────────────────────────────────
old = "import { Permissions } from '@/lib/permissions';"
new = """import { Permissions } from '@/lib/permissions';

interface LeaveTemplateOption {
  id: string;
  name: string;
  code: string;
}"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add leaveTemplateId to EmployeeForm type — add after groupId in EmploymentFields props
#    Actually we store it separately in form1 state, not in EmployeeForm
#    So we add it as a separate state variable
# ─────────────────────────────────────────────────────────────────────────────
old = "  const [createdId, setCreatedId] = useState<string | null>(null);"
new = """  const [createdId, setCreatedId] = useState<string | null>(null);
  const [leaveTemplates, setLeaveTemplates] = useState<LeaveTemplateOption[]>([]);
  const [wizardLeaveTemplateId, setWizardLeaveTemplateId] = useState("");"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Load leave templates when component mounts — add inside useEffect load()
# ─────────────────────────────────────────────────────────────────────────────
old = """      const [empRes, brRes, deptRes, desigRes, crewRes, groupRes, bankRes] =
        await Promise.all([
          api.get<Employee[]>("/employees"),
          api.get<Branch[]>("/branches"),
          api.get<Department[]>("/departments"),
          api.get<Designation[]>("/designations"),
          api.get<CrewOption[]>("/crews?isActive=true"),
          api.get<GroupOption[]>("/groups?isActive=true"),
          api.get<BankBranchOption[]>("/bank-branches?isActive=true"),
        ]);"""
new = """      const [empRes, brRes, deptRes, desigRes, crewRes, groupRes, bankRes, ltRes] =
        await Promise.all([
          api.get<Employee[]>("/employees"),
          api.get<Branch[]>("/branches"),
          api.get<Department[]>("/departments"),
          api.get<Designation[]>("/designations"),
          api.get<CrewOption[]>("/crews?isActive=true"),
          api.get<GroupOption[]>("/groups?isActive=true"),
          api.get<BankBranchOption[]>("/bank-branches?isActive=true"),
          api.get<LeaveTemplateOption[]>("/LeaveTemplate"),
        ]);"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Set leave templates after load
# ─────────────────────────────────────────────────────────────────────────────
old = "      setBankBranches(bankRes.data);"
new = """      setBankBranches(bankRes.data);
      setLeaveTemplates(
        (ltRes.data as any[])
          .filter((t: any) => t.isActive)
          .map((t: any) => ({ id: String(t.id), name: t.name, code: t.code }))
      );"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Reset wizardLeaveTemplateId when wizard opens
# ─────────────────────────────────────────────────────────────────────────────
old = """  const openWizard = () => {
    setWizardStep(1);
    setWizardError("");
    setCreatedId(null);
    setForm1({ ...EMPTY_EMPLOYEE });
    setForm2({ ...EMPTY_CONTRACT });
    setWizardOpen(true);
  };"""
new = """  const openWizard = () => {
    setWizardStep(1);
    setWizardError("");
    setCreatedId(null);
    setWizardLeaveTemplateId("");
    setForm1({ ...EMPTY_EMPLOYEE });
    setForm2({ ...EMPTY_CONTRACT });
    setWizardOpen(true);
  };"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 6. Add leave template validation in handleStep1Next
# ─────────────────────────────────────────────────────────────────────────────
old = """    if (!form1.joinDate) {
      setWizardError("Join date is required.");
      return;
    }
    setWizardSaving(true);"""
new = """    if (!form1.joinDate) {
      setWizardError("Join date is required.");
      return;
    }
    if (!wizardLeaveTemplateId) {
      setWizardError("Leave template is required.");
      return;
    }
    setWizardSaving(true);"""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Add leaveTemplateId to the save API call in handleStep1Next
# ─────────────────────────────────────────────────────────────────────────────
old = """        crewId: form1.crewId || null,
        groupId: form1.groupId || null,
        userId: 1,
      });
      const res = await api.get<Employee[]>("""
new = """        crewId: form1.crewId || null,
        groupId: form1.groupId || null,
        leaveTemplateId: wizardLeaveTemplateId,
        userId: 1,
      });
      const res = await api.get<Employee[]>("""
src = src.replace(old, new, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 8. Add Leave Template field inside the Employment section of wizard Step 1
#    Insert after the EmploymentFields component usage
# ─────────────────────────────────────────────────────────────────────────────
old = """              <EmploymentFields
                f={form1}
                onChange={s1}
                branches={branches}
                departments={departments}
                designations={designations}
                deptsByBranch={deptsByBranch}
                crews={crews}
                groups={groups}
              />
              <Section title="Bank Details" />"""
new = """              <EmploymentFields
                f={form1}
                onChange={s1}
                branches={branches}
                departments={departments}
                designations={designations}
                deptsByBranch={deptsByBranch}
                crews={crews}
                groups={groups}
              />

              {/* Leave Template — mandatory, assigned once at onboarding */}
              <div className="mt-5">
                <Field label="Leave Template" required>
                  <select
                    style={{
                      height: "40px",
                      width: "100%",
                      borderRadius: "10px",
                      border: wizardLeaveTemplateId ? "1px solid #e5e7eb" : "1px solid #fca5a5",
                      backgroundColor: "#f3f4f6",
                      padding: "0 12px",
                      fontSize: "14px",
                      color: wizardLeaveTemplateId ? "#1f2937" : "#6b7280",
                      outline: "none",
                      appearance: "auto",
                    }}
                    value={wizardLeaveTemplateId}
                    onChange={(e) => setWizardLeaveTemplateId(e.target.value)}
                  >
                    <option value="">— Select leave template —</option>
                    {leaveTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                  {wizardLeaveTemplateId && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠ This template seeds leave balances and cannot be changed after saving.
                    </p>
                  )}
                  {leaveTemplates.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No active leave templates found. Please create one in Master Data first.
                    </p>
                  )}
                </Field>
              </div>

              <Section title="Bank Details" />"""
src = src.replace(old, new, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("page.tsx patched successfully.")
print("Leave Template dropdown added to Employment section of wizard.")
