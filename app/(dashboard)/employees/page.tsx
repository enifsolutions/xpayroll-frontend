'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, Trash2, X, Pencil, ExternalLink } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { showSuccess, showError } from '@/lib/toast';
import api from '@/lib/axios';
import {
  Employee, EmployeeForm, ContractForm, EmployeeContract,
  Branch, Department, Designation,
  EMPLOYMENT_TYPES, EMPLOYEE_STATUSES, GENDERS,
  PAYROLL_BASES, CONTRACT_TYPES, CURRENCIES,
  EMPTY_EMPLOYEE, EMPTY_CONTRACT, STATUS_COLORS,
} from './employee.types';

function Field({ label, required, children }: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}{required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 mt-6 first:mt-0">
      {title}
    </p>
  );
}

function WizardModal({ open, onClose, children }: {
  open: boolean; onClose: () => void; children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-[900px] max-w-[95vw] max-h-[92vh] flex flex-col">
        {children}
      </div>
    </div>
  );
}

type EditTab = 'details' | 'contract';

export default function EmployeesPage() {
  const router = useRouter();
  const initialized                         = useRef(false);
  const [items, setItems]                   = useState<Employee[]>([]);
  const [loading, setLoading]               = useState(true);
  const [statusFilter, setStatusFilter]     = useState('');

  // lookups
  const [branches, setBranches]             = useState<Branch[]>([]);
  const [departments, setDepartments]       = useState<Department[]>([]);
  const [designations, setDesignations]     = useState<Designation[]>([]);

  // add wizard
  const [wizardOpen, setWizardOpen]         = useState(false);
  const [wizardStep, setWizardStep]         = useState(1);
  const [wizardSaving, setWizardSaving]     = useState(false);
  const [wizardError, setWizardError]       = useState('');
  const [createdId, setCreatedId]           = useState<string | null>(null);
  const [form1, setForm1]                   = useState<EmployeeForm>(EMPTY_EMPLOYEE);
  const [form2, setForm2]                   = useState<ContractForm>(EMPTY_CONTRACT);

  // edit
  const [editOpen, setEditOpen]             = useState(false);
  const [editing, setEditing]               = useState<Employee | null>(null);
  const [editTab, setEditTab]               = useState<EditTab>('details');
  const [editForm, setEditForm]             = useState<EmployeeForm>(EMPTY_EMPLOYEE);
  const [editSaving, setEditSaving]         = useState(false);
  const [editError, setEditError]           = useState('');
  const [contract, setContract]             = useState<EmployeeContract | null>(null);
  const [contractForm, setContractForm]     = useState<ContractForm>(EMPTY_CONTRACT);
  const [contractSaving, setContractSaving] = useState(false);
  const [contractError, setContractError]   = useState('');

  // ── filtered departments by selected branch ───────────────────────────────
  const deptsByBranch = (branchId: string) =>
  !branchId
    ? departments
    : departments.filter(d => !d.branchId || String(d.branchId) === String(branchId));

  // ── load ──────────────────────────────────────────────────────────────────
  const load = async () => {
    try {
      setLoading(true);
      const [empRes, brRes, deptRes, desigRes] = await Promise.all([
        api.get<Employee[]>('/employees'),
        api.get<Branch[]>('/branches'),
        api.get<Department[]>('/department'),
        api.get<Designation[]>('/designation'),
      ]);
      setItems(empRes.data);
      setBranches(brRes.data.filter((b: any) => b.isActive).map((b: any) => ({ ...b, id: String(b.id) })));
      setDepartments(deptRes.data.filter((d: any) => d.isActive).map((d: any) => ({ ...d, id: String(d.id), branchId: d.branchId ? String(d.branchId) : null })));
      setDesignations(desigRes.data.filter((d: any) => d.isActive).map((d: any) => ({ ...d, id: String(d.id) })));
    } catch (err: any) {
      showError('Load failed', err?.response?.data?.error ?? 'Could not load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  // ── add wizard ─────────────────────────────────────────────────────────────
  const openWizard = () => {
    setWizardStep(1); setWizardError(''); setCreatedId(null);
    setForm1({ ...EMPTY_EMPLOYEE }); setForm2({ ...EMPTY_CONTRACT });
    setWizardOpen(true);
  };
  const closeWizard = () => setWizardOpen(false);

  const s1 = (field: keyof EmployeeForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm1(f => ({ ...f, [field]: e.target.value }));

  const s2 = (field: keyof ContractForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm2(f => ({ ...f, [field]: e.target.value }));

  const handleStep1Next = async () => {
    setWizardError('');
    if (!form1.employeeCode.trim()) { setWizardError('Employee code is required.'); return; }
    if (!form1.firstName.trim())    { setWizardError('First name is required.'); return; }
    if (!form1.lastName.trim())     { setWizardError('Last name is required.'); return; }
    if (!form1.joinDate)            { setWizardError('Join date is required.'); return; }
    setWizardSaving(true);
    try {
      await api.post('/employees/save', {
        action:            'ADD',
        employeeCode:      form1.employeeCode.trim(),
        firstName:         form1.firstName.trim(),
        lastName:          form1.lastName.trim(),
        middleName:        form1.middleName.trim()        || null,
        email:             form1.email.trim()             || null,
        personalEmail:     form1.personalEmail.trim()     || null,
        phoneNumber:       form1.phoneNumber.trim()       || null,
        nationalIdNumber:  form1.nationalIdNumber.trim()  || null,
        bankAccountNumber: form1.bankAccountNumber.trim() || null,
        bankName:          form1.bankName.trim()          || null,
        bankBranchCode:    form1.bankBranchCode.trim()    || null,
        dateOfBirth:       form1.dateOfBirth              || null,
        gender:            form1.gender                   || null,
        nationality:       form1.nationality.trim()       || null,
        address:           form1.address.trim()           || null,
        branchId:          form1.branchId                 || null,
        departmentId:      form1.departmentId             || null,
        designationId:     form1.designationId            || null,
        joinDate:          form1.joinDate,
        employmentType:    form1.employmentType,
        status:            form1.status,
        notes:             form1.notes.trim()             || null,
        userId: 1,
      });
      const res = await api.get<Employee[]>(`/employees?employeeCode=${form1.employeeCode.trim()}`);
      const created = res.data?.[0];
      if (!created) throw new Error('Employee saved but ID could not be retrieved.');
      setCreatedId(created.id);
      setForm2(f => ({ ...f, startDate: form1.joinDate }));
      setWizardStep(2);
    } catch (err: any) {
      setWizardError(err?.response?.data?.message ?? err?.message ?? 'Failed to save employee.');
    } finally {
      setWizardSaving(false);
    }
  };

  const handleStep2Save = async () => {
    setWizardError('');
    if (!form2.startDate) { setWizardError('Start date is required.'); return; }
    setWizardSaving(true);
    try {
      await api.post('/employees/contracts/save', {
        action:                   'ADD',
        employeeId:               createdId,
        designationId:            form1.designationId || null,
        contractType:             form2.contractType,
        payrollBasis:             form2.payrollBasis,
        basicSalary:              parseFloat(form2.basicSalary)            || 0,
        hourlyRate:               form2.hourlyRate ? parseFloat(form2.hourlyRate) : null,
        dailyRate:                form2.dailyRate  ? parseFloat(form2.dailyRate)  : null,
        allowances:               parseFloat(form2.allowances)             || 0,
        currency:                 form2.currency,
        absentDeductionAfterDays: parseInt(form2.absentDeductionAfterDays) || 0,
        lateDeductionPerMinute:   parseFloat(form2.lateDeductionPerMinute) || 0,
        overtimeRateMultiplier:   parseFloat(form2.overtimeRateMultiplier) || 1.5,
        startDate:                form2.startDate,
        endDate:                  form2.endDate || null,
        isActive:                 true,
        notes:                    form2.notes.trim() || null,
        userId: 1,
      });
      showSuccess('Employee added', form1.firstName + ' ' + form1.lastName);
      closeWizard();
      await load();
    } catch (err: any) {
      setWizardError(err?.response?.data?.message ?? err?.message ?? 'Failed to save contract.');
    } finally {
      setWizardSaving(false);
    }
  };

  // ── edit ──────────────────────────────────────────────────────────────────
  const openEdit = async (item: Employee) => {
    setEditing(item); setEditTab('details');
    setEditError(''); setContractError('');
    setEditForm({
      employeeCode:      item.employeeCode      ?? '',
      firstName:         item.firstName         ?? '',
      lastName:          item.lastName          ?? '',
      middleName:        item.middleName        ?? '',
      email:             item.email             ?? '',
      personalEmail:     item.personalEmail     ?? '',
      phoneNumber:       item.phoneNumber       ?? '',
      nationalIdNumber:  item.nationalIdNumber  ?? '',
      bankAccountNumber: item.bankAccountNumber ?? '',
      bankName:          item.bankName          ?? '',
      bankBranchCode:    item.bankBranchCode    ?? '',
      dateOfBirth:       item.dateOfBirth       ?? '',
      gender:            item.gender            ?? '',
      nationality:       item.nationality       ?? '',
      address:           item.address           ?? '',
      branchId:          item.branchId          ?? '',
      departmentId:      item.departmentId      ?? '',
      designationId:     item.designationId     ?? '',
      managerId:         item.managerId         ?? '',
      joinDate:          item.joinDate          ?? '',
      terminationDate:   item.terminationDate   ?? '',
      employmentType:    item.employmentType    ?? 'FullTime',
      status:            item.status            ?? 'Active',
      notes:             item.notes             ?? '',
    });
    try {
      const res = await api.get<EmployeeContract[]>(`/employees/contracts?employeeId=${item.id}&isActive=true`);
      const c = res.data?.[0] ?? null;
      setContract(c);
      setContractForm(c ? {
        contractType:             c.contractType,
        payrollBasis:             c.payrollBasis,
        basicSalary:              c.basicSalary.toString(),
        hourlyRate:               c.hourlyRate?.toString()  ?? '',
        dailyRate:                c.dailyRate?.toString()   ?? '',
        allowances:               c.allowances.toString(),
        currency:                 c.currency,
        absentDeductionAfterDays: c.absentDeductionAfterDays.toString(),
        lateDeductionPerMinute:   c.lateDeductionPerMinute.toString(),
        overtimeRateMultiplier:   c.overtimeRateMultiplier.toString(),
        startDate:                c.startDate,
        endDate:                  c.endDate ?? '',
        notes:                    c.notes   ?? '',
      } : { ...EMPTY_CONTRACT, startDate: item.joinDate });
    } catch {
      setContract(null);
      setContractForm({ ...EMPTY_CONTRACT, startDate: item.joinDate });
    }
    setEditOpen(true);
  };

  const ef = (field: keyof EmployeeForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(f => ({ ...f, [field]: e.target.value }));

  const cf = (field: keyof ContractForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setContractForm(f => ({ ...f, [field]: e.target.value }));

  const handleEditSave = async () => {
    setEditError('');
    if (!editForm.firstName.trim()) { setEditError('First name is required.'); return; }
    if (!editForm.lastName.trim())  { setEditError('Last name is required.'); return; }
    setEditSaving(true);
    try {
      await api.post('/employees/save', {
        action:            'UPDATE',
        id:                editing!.id,
        employeeCode:      editForm.employeeCode.trim()      || null,
        firstName:         editForm.firstName.trim(),
        lastName:          editForm.lastName.trim(),
        middleName:        editForm.middleName.trim()        || null,
        email:             editForm.email.trim()             || null,
        personalEmail:     editForm.personalEmail.trim()     || null,
        phoneNumber:       editForm.phoneNumber.trim()       || null,
        nationalIdNumber:  editForm.nationalIdNumber.trim()  || null,
        bankAccountNumber: editForm.bankAccountNumber.trim() || null,
        bankName:          editForm.bankName.trim()          || null,
        bankBranchCode:    editForm.bankBranchCode.trim()    || null,
        dateOfBirth:       editForm.dateOfBirth              || null,
        gender:            editForm.gender                   || null,
        nationality:       editForm.nationality.trim()       || null,
        address:           editForm.address.trim()           || null,
        branchId:          editForm.branchId                 || null,
        departmentId:      editForm.departmentId             || null,
        designationId:     editForm.designationId            || null,
        joinDate:          editForm.joinDate                 || null,
        terminationDate:   editForm.terminationDate          || null,
        employmentType:    editForm.employmentType,
        status:            editForm.status,
        notes:             editForm.notes.trim()             || null,
        userId: 1,
      });
      setEditOpen(false);
      await load();
      showSuccess('Employee updated', editForm.firstName + ' ' + editForm.lastName);
    } catch (err: any) {
      setEditError(err?.response?.data?.message ?? 'Failed to update employee.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleContractSave = async () => {
    setContractError('');
    if (!contractForm.startDate) { setContractError('Start date is required.'); return; }
    setContractSaving(true);
    try {
      await api.post('/employees/contracts/save', {
        action:                   contract ? 'UPDATE' : 'ADD',
        id:                       contract?.id ?? null,
        employeeId:               editing!.id,
        designationId:            editForm.designationId || null,
        contractType:             contractForm.contractType,
        payrollBasis:             contractForm.payrollBasis,
        basicSalary:              parseFloat(contractForm.basicSalary)            || 0,
        hourlyRate:               contractForm.hourlyRate ? parseFloat(contractForm.hourlyRate) : null,
        dailyRate:                contractForm.dailyRate  ? parseFloat(contractForm.dailyRate)  : null,
        allowances:               parseFloat(contractForm.allowances)             || 0,
        currency:                 contractForm.currency,
        absentDeductionAfterDays: parseInt(contractForm.absentDeductionAfterDays) || 0,
        lateDeductionPerMinute:   parseFloat(contractForm.lateDeductionPerMinute) || 0,
        overtimeRateMultiplier:   parseFloat(contractForm.overtimeRateMultiplier) || 1.5,
        startDate:                contractForm.startDate,
        endDate:                  contractForm.endDate || null,
        isActive:                 true,
        notes:                    contractForm.notes.trim() || null,
        userId: 1,
      });
      setEditOpen(false);
      await load();
      showSuccess('Contract updated', editForm.firstName + ' ' + editForm.lastName);
    } catch (err: any) {
      setContractError(err?.response?.data?.message ?? 'Failed to update contract.');
    } finally {
      setContractSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (item: Employee) => {
    if (!confirm(`Delete "${item.firstName} ${item.lastName}"?`)) return;
    try {
      await api.post('/employees/save', { action: 'DELETE', id: item.id, userId: 1 });
      await load();
      showSuccess('Employee deleted', item.firstName + ' ' + item.lastName);
    } catch (err: any) {
      showError('Delete failed', err?.response?.data?.error ?? 'Could not delete.');
    }
  };

  const filtered = statusFilter ? items.filter(e => e.status === statusFilter) : items;

  // ── reusable Employment section (used in both Add and Edit) ───────────────
  const EmploymentFields = ({
    f, onChange, isEdit = false,
  }: {
    f: EmployeeForm;
    onChange: (field: keyof EmployeeForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
    isEdit?: boolean;
  }) => (
    <>
      <div className="grid grid-cols-3 gap-x-6 gap-y-5">
        <Field label="Employee Code" required={!isEdit}><Input placeholder="EMP001" value={f.employeeCode} onChange={onChange('employeeCode')} /></Field>
        <Field label="Date of Joining" required={!isEdit}><Input type="date" value={f.joinDate} onChange={onChange('joinDate')} /></Field>
        <Field label="Work Email"><Input type="email" placeholder="work@company.lk" value={f.email} onChange={onChange('email')} /></Field>
        <Field label="Branch">
          <select className="input w-full" value={f.branchId} onChange={onChange('branchId')}>
            <option value="">— Select Branch —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select className="input w-full" value={f.departmentId} onChange={onChange('departmentId')}>
            <option value="">— Select Department —</option>
            {deptsByBranch(f.branchId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Designation">
          <select className="input w-full" value={f.designationId} onChange={onChange('designationId')}>
            <option value="">— Select Designation —</option>
            {designations.map(d => <option key={d.id} value={d.id}>{d.title}{d.level ? ` · ${d.level}` : ''}</option>)}
          </select>
        </Field>
        <Field label="Employment Type">
          <select className="input w-full" value={f.employmentType} onChange={onChange('employmentType')}>
            {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className="input w-full" value={f.status} onChange={onChange('status')}>
            {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        {isEdit && (
          <Field label="Termination Date"><Input type="date" value={f.terminationDate} onChange={onChange('terminationDate')} /></Field>
        )}
      </div>
    </>
  );

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="h3">Employees</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage employee records and contracts.</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="solid" icon={<PlusIcon size={16} />} onClick={openWizard}>Add Employee</Button>
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
                  <th>Code</th><th>Name</th><th>Department</th><th>Designation</th>
                  <th>Type</th><th>Status</th><th>Join Date</th>
                  <th className="text-right">Basic Salary</th>
                  <th className="w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">No employees found</td></tr>
                ) : filtered.map(item => (
                  <tr key={item.id}>
                    <td><code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{item.employeeCode}</code></td>
                    <td>
                      <div className="font-medium heading-text">{item.firstName} {item.lastName}</div>
                      {item.email && <div className="text-xs text-gray-400">{item.email}</div>}
                    </td>
                    <td className="text-gray-500">{item.departmentName ?? '—'}</td>
                    <td className="text-gray-500">{item.designationName ?? '—'}</td>
                    <td className="text-gray-500">{item.employmentType}</td>
                    <td><span className={`xp-badge ${STATUS_COLORS[item.status] ?? 'xp-badge-neutral'}`}>{item.status}</span></td>
                    <td className="text-gray-500">{item.joinDate}</td>
                    <td className="text-right font-medium heading-text">
                      {item.basicSalary.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => router.push(`/employees/${item.id}/overview`)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors" title="View Profile"><ExternalLink size={15} /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700 transition-colors" title="Edit"><Pencil size={15} /></button>
                        
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Add Wizard ─────────────────────────────────────────────────────── */}
      <WizardModal open={wizardOpen} onClose={closeWizard}>
        <div className="flex items-center gap-5 px-8 pt-7 pb-0 shrink-0">
          <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 ${wizardStep === 1 ? 'bg-primary text-white' : 'bg-emerald-500 text-white'}`}>{wizardStep > 1 ? '✓' : '1'}</div>
          <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all duration-500 ${wizardStep > 1 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 ${wizardStep === 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>2</div>
          <button onClick={closeWizard} className="ml-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"><X size={18} /></button>
        </div>

        {wizardStep === 1 && (
          <>
            <div className="px-8 pt-6 pb-2 shrink-0"><h5 className="h5">Employee Details</h5></div>
            <div className="flex-1 overflow-y-auto px-8 py-4">
              <Section title="Personal Information" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <Field label="First Name" required><Input placeholder="First name" value={form1.firstName} onChange={s1('firstName')} /></Field>
                <Field label="Middle Name"><Input placeholder="Middle name" value={form1.middleName} onChange={s1('middleName')} /></Field>
                <Field label="Last Name" required><Input placeholder="Last name" value={form1.lastName} onChange={s1('lastName')} /></Field>
                <Field label="Date of Birth"><Input type="date" value={form1.dateOfBirth} onChange={s1('dateOfBirth')} /></Field>
                <Field label="Gender">
                  <select className="input w-full" value={form1.gender} onChange={s1('gender')}>
                    <option value="">Select...</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Nationality"><Input placeholder="Sri Lankan" value={form1.nationality} onChange={s1('nationality')} /></Field>
                <Field label="National ID"><Input placeholder="987654321V" value={form1.nationalIdNumber} onChange={s1('nationalIdNumber')} /></Field>
                <Field label="Phone"><Input placeholder="+94 77 123 4567" value={form1.phoneNumber} onChange={s1('phoneNumber')} /></Field>
                <Field label="Personal Email"><Input type="email" placeholder="personal@gmail.com" value={form1.personalEmail} onChange={s1('personalEmail')} /></Field>
                <div className="col-span-3"><Field label="Address"><textarea className="input w-full" rows={2} placeholder="No. 12, Galle Road, Colombo 03" value={form1.address} onChange={s1('address')} /></Field></div>
              </div>

              <Section title="Employment" />
              <EmploymentFields f={form1} onChange={s1} />

              <Section title="Bank Details" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <Field label="Account Number"><Input placeholder="0012345678" value={form1.bankAccountNumber} onChange={s1('bankAccountNumber')} /></Field>
                <Field label="Bank Name"><Input placeholder="Commercial Bank" value={form1.bankName} onChange={s1('bankName')} /></Field>
                <Field label="Branch Code"><Input placeholder="001" value={form1.bankBranchCode} onChange={s1('bankBranchCode')} /></Field>
              </div>
              <div className="mt-5"><Field label="Notes"><textarea className="input w-full" rows={2} value={form1.notes} onChange={s1('notes')} /></Field></div>
            </div>
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700 shrink-0">
              {wizardError && <p className="text-error text-sm mb-3">{wizardError}</p>}
              <div className="flex justify-end gap-3">
                <Button variant="plain" onClick={closeWizard}>Cancel</Button>
                <Button variant="solid" loading={wizardSaving} onClick={handleStep1Next}>Next — Contract Details</Button>
              </div>
            </div>
          </>
        )}

        {wizardStep === 2 && (
          <>
            <div className="px-8 pt-6 pb-2 shrink-0"><h5 className="h5">Contract Details</h5></div>
            <div className="flex-1 overflow-y-auto px-8 py-4">
              <Section title="Contract" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <Field label="Contract Type">
                  <select className="input w-full" value={form2.contractType} onChange={s2('contractType')}>
                    {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Payroll Basis">
                  <select className="input w-full" value={form2.payrollBasis} onChange={s2('payrollBasis')}>
                    {PAYROLL_BASES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Currency">
                  <select className="input w-full" value={form2.currency} onChange={s2('currency')}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Start Date" required><Input type="date" value={form2.startDate} onChange={s2('startDate')} /></Field>
                <Field label="End Date"><Input type="date" value={form2.endDate} onChange={s2('endDate')} /></Field>
              </div>
              <Section title="Salary" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <Field label="Basic Salary"><Input type="number" placeholder="75000" value={form2.basicSalary} onChange={s2('basicSalary')} /></Field>
                <div>
                  <Field label="Total Allowances">
                    <Input type="number" placeholder="0" value={form2.allowances} onChange={s2('allowances')} />
                  </Field>
                  <p className="text-xs text-gray-400 mt-1">Fixed allowance total. Individual line items managed in Benefits tab.</p>
                </div>
                {form2.payrollBasis === 'Hourly' && <Field label="Hourly Rate"><Input type="number" placeholder="500" value={form2.hourlyRate} onChange={s2('hourlyRate')} /></Field>}
                {form2.payrollBasis === 'Daily'  && <Field label="Daily Rate"><Input type="number" placeholder="3000" value={form2.dailyRate} onChange={s2('dailyRate')} /></Field>}
              </div>
              <Section title="Deduction Rules" />
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                <Field label="Absent Deduct After (days)"><Input type="number" value={form2.absentDeductionAfterDays} onChange={s2('absentDeductionAfterDays')} /></Field>
                <Field label="Late Deduct / Minute"><Input type="number" step="0.01" value={form2.lateDeductionPerMinute} onChange={s2('lateDeductionPerMinute')} /></Field>
                <Field label="OT Rate Multiplier"><Input type="number" step="0.1" value={form2.overtimeRateMultiplier} onChange={s2('overtimeRateMultiplier')} /></Field>
              </div>
              <div className="mt-5"><Field label="Notes"><textarea className="input w-full" rows={2} value={form2.notes} onChange={s2('notes')} /></Field></div>
            </div>
            <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700 shrink-0">
              {wizardError && <p className="text-error text-sm mb-3">{wizardError}</p>}
              <div className="flex justify-between">
                <Button variant="plain" onClick={() => { setWizardStep(1); setWizardError(''); }}>← Back</Button>
                <div className="flex gap-3">
                  <Button variant="plain" onClick={closeWizard}>Cancel</Button>
                  <Button variant="solid" loading={wizardSaving} onClick={handleStep2Save}>Save Employee</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </WizardModal>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editing && (
        <WizardModal open={editOpen} onClose={() => setEditOpen(false)}>
          <div className="flex items-center justify-between px-8 pt-7 pb-0 shrink-0">
            <div>
              <h5 className="h5">{editing.firstName} {editing.lastName}</h5>
              <p className="text-xs text-gray-400 mt-0.5">{editing.employeeCode}</p>
            </div>
            <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X size={18} /></button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-8 pt-4 pb-0 shrink-0 border-b border-gray-100 dark:border-gray-700">
            {(['details', 'contract'] as EditTab[]).map(tab => (
              <button key={tab} onClick={() => setEditTab(tab)}
                className={`px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors
                  ${editTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                {tab === 'details' ? 'Employee Details' : 'Contract'}
              </button>
            ))}
          </div>

          {/* Details tab */}
          {editTab === 'details' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-4">
                <Section title="Personal Information" />
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="First Name" required><Input value={editForm.firstName} onChange={ef('firstName')} /></Field>
                  <Field label="Middle Name"><Input value={editForm.middleName} onChange={ef('middleName')} /></Field>
                  <Field label="Last Name" required><Input value={editForm.lastName} onChange={ef('lastName')} /></Field>
                  <Field label="Date of Birth"><Input type="date" value={editForm.dateOfBirth} onChange={ef('dateOfBirth')} /></Field>
                  <Field label="Gender">
                    <select className="input w-full" value={editForm.gender} onChange={ef('gender')}>
                      <option value="">Select...</option>
                      {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Nationality"><Input value={editForm.nationality} onChange={ef('nationality')} /></Field>
                  <Field label="National ID"><Input value={editForm.nationalIdNumber} onChange={ef('nationalIdNumber')} /></Field>
                  <Field label="Phone"><Input value={editForm.phoneNumber} onChange={ef('phoneNumber')} /></Field>
                  <Field label="Personal Email"><Input type="email" value={editForm.personalEmail} onChange={ef('personalEmail')} /></Field>
                  <div className="col-span-3"><Field label="Address"><textarea className="input w-full" rows={2} value={editForm.address} onChange={ef('address')} /></Field></div>
                </div>
                <Section title="Employment" />
                <EmploymentFields f={editForm} onChange={ef} isEdit />
                <Section title="Bank Details" />
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="Account Number"><Input value={editForm.bankAccountNumber} onChange={ef('bankAccountNumber')} /></Field>
                  <Field label="Bank Name"><Input value={editForm.bankName} onChange={ef('bankName')} /></Field>
                  <Field label="Branch Code"><Input value={editForm.bankBranchCode} onChange={ef('bankBranchCode')} /></Field>
                </div>
                <div className="mt-5"><Field label="Notes"><textarea className="input w-full" rows={2} value={editForm.notes} onChange={ef('notes')} /></Field></div>
              </div>
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700 shrink-0">
                {editError && <p className="text-error text-sm mb-3">{editError}</p>}
                <div className="flex justify-end gap-3">
                  <Button variant="plain" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button variant="solid" loading={editSaving} onClick={handleEditSave}>Update</Button>
                </div>
              </div>
            </>
          )}

          {/* Contract tab */}
          {editTab === 'contract' && (
            <>
              <div className="flex-1 overflow-y-auto px-8 py-4">
                {!contract && (
                  <div className="mb-4 px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
                    No active contract found. A new contract will be created.
                  </div>
                )}
                <Section title="Contract" />
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="Contract Type">
                    <select className="input w-full" value={contractForm.contractType} onChange={cf('contractType')}>
                      {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Payroll Basis">
                    <select className="input w-full" value={contractForm.payrollBasis} onChange={cf('payrollBasis')}>
                      {PAYROLL_BASES.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Currency">
                    <select className="input w-full" value={contractForm.currency} onChange={cf('currency')}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Start Date" required><Input type="date" value={contractForm.startDate} onChange={cf('startDate')} /></Field>
                  <Field label="End Date"><Input type="date" value={contractForm.endDate} onChange={cf('endDate')} /></Field>
                </div>
                <Section title="Salary" />
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="Basic Salary"><Input type="number" value={contractForm.basicSalary} onChange={cf('basicSalary')} /></Field>
                  <div>
                    <Field label="Total Allowances">
                      <Input type="number" value={contractForm.allowances} onChange={cf('allowances')} />
                    </Field>
                    <p className="text-xs text-gray-400 mt-1">Fixed total. Individual line items in Benefits tab.</p>
                  </div>
                  {contractForm.payrollBasis === 'Hourly' && <Field label="Hourly Rate"><Input type="number" value={contractForm.hourlyRate} onChange={cf('hourlyRate')} /></Field>}
                  {contractForm.payrollBasis === 'Daily'  && <Field label="Daily Rate"><Input type="number" value={contractForm.dailyRate} onChange={cf('dailyRate')} /></Field>}
                </div>
                <Section title="Deduction Rules" />
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="Absent Deduct After (days)"><Input type="number" value={contractForm.absentDeductionAfterDays} onChange={cf('absentDeductionAfterDays')} /></Field>
                  <Field label="Late Deduct / Minute"><Input type="number" step="0.01" value={contractForm.lateDeductionPerMinute} onChange={cf('lateDeductionPerMinute')} /></Field>
                  <Field label="OT Rate Multiplier"><Input type="number" step="0.1" value={contractForm.overtimeRateMultiplier} onChange={cf('overtimeRateMultiplier')} /></Field>
                </div>
                <div className="mt-5"><Field label="Notes"><textarea className="input w-full" rows={2} value={contractForm.notes} onChange={cf('notes')} /></Field></div>
              </div>
              <div className="px-8 py-5 border-t border-gray-100 dark:border-gray-700 shrink-0">
                {contractError && <p className="text-error text-sm mb-3">{contractError}</p>}
                <div className="flex justify-end gap-3">
                  <Button variant="plain" onClick={() => setEditOpen(false)}>Cancel</Button>
                  <Button variant="solid" loading={contractSaving} onClick={handleContractSave}>
                    {contract ? 'Update Contract' : 'Create Contract'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </WizardModal>
      )}
    </div>
  );
}
