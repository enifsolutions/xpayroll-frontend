'use client'

import { useState, useEffect } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { showError, showSuccess } from '@/lib/toast'
import api from '@/lib/axios'
import { Employee, EMPLOYMENT_TYPES, EMPLOYEE_STATUSES, GENDERS } from './employee.types'

interface Props {
  open: boolean
  employee: Employee
  onClose: () => void
  onSaved: () => void
}

export default function EditEmployeeDialog({ open, employee, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    employeeCode: '',
    firstName: '', lastName: '', middleName: '',
    email: '', personalEmail: '', phoneNumber: '',
    nationalIdNumber: '', bankAccountNumber: '', bankName: '', bankBranchCode: '',
    dateOfBirth: '', gender: '', nationality: '', address: '',
    joinDate: '', terminationDate: '',
    employmentType: '', status: '', notes: '',
  })

  useEffect(() => {
    if (!employee) return
    setError('')
    setForm({
      employeeCode:      employee.employeeCode      ?? '',
      firstName:         employee.firstName         ?? '',
      lastName:          employee.lastName          ?? '',
      middleName:        employee.middleName        ?? '',
      email:             employee.email             ?? '',
      personalEmail:     employee.personalEmail     ?? '',
      phoneNumber:       employee.phoneNumber       ?? '',
      nationalIdNumber:  employee.nationalIdNumber  ?? '',
      bankAccountNumber: employee.bankAccountNumber ?? '',
      bankName:          employee.bankName          ?? '',
      bankBranchCode:    employee.bankBranchCode    ?? '',
      dateOfBirth:       employee.dateOfBirth       ?? '',
      gender:            employee.gender            ?? '',
      nationality:       employee.nationality       ?? '',
      address:           employee.address           ?? '',
      joinDate:          employee.joinDate          ?? '',
      terminationDate:   employee.terminationDate   ?? '',
      employmentType:    employee.employmentType    ?? 'FullTime',
      status:            employee.status            ?? 'Active',
      notes:             employee.notes             ?? '',
    })
  }, [employee])

  const f = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }))

  const handleSave = async () => {
    setError('')
    if (!form.firstName.trim()) { setError('First name is required.'); return }
    if (!form.lastName.trim())  { setError('Last name is required.'); return }

    setSaving(true)
    try {
      await api.post('/employees/save', {
        action: 'UPDATE',
        id:                employee.id,
        employeeCode:      form.employeeCode      || null,
        firstName:         form.firstName,
        lastName:          form.lastName,
        middleName:        form.middleName        || null,
        email:             form.email             || null,
        personalEmail:     form.personalEmail     || null,
        phoneNumber:       form.phoneNumber       || null,
        nationalIdNumber:  form.nationalIdNumber  || null,
        bankAccountNumber: form.bankAccountNumber || null,
        bankName:          form.bankName          || null,
        bankBranchCode:    form.bankBranchCode    || null,
        dateOfBirth:       form.dateOfBirth       || null,
        gender:            form.gender            || null,
        nationality:       form.nationality       || null,
        address:           form.address           || null,
        joinDate:          form.joinDate          || null,
        terminationDate:   form.terminationDate   || null,
        employmentType:    form.employmentType,
        status:            form.status,
        notes:             form.notes             || null,
        userId: 1,
      })
      showSuccess('Employee updated.')
      onSaved()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Failed to update employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog isOpen={open} onClose={onClose} onRequestClose={onClose}>
      <div className="p-6 w-full max-w-2xl">
        <h5 className="font-semibold text-base mb-4">
          Edit Employee — {employee.firstName} {employee.lastName}
        </h5>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee Code</label>
              <Input value={form.employeeCode} onChange={f('employeeCode')} />
            </div>
            <div>
              <label className="form-label">Join Date</label>
              <Input type="date" value={form.joinDate} onChange={f('joinDate')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">First Name <span className="text-red-500">*</span></label>
              <Input value={form.firstName} onChange={f('firstName')} />
            </div>
            <div>
              <label className="form-label">Middle Name</label>
              <Input value={form.middleName} onChange={f('middleName')} />
            </div>
            <div>
              <label className="form-label">Last Name <span className="text-red-500">*</span></label>
              <Input value={form.lastName} onChange={f('lastName')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Work Email</label>
              <Input type="email" value={form.email} onChange={f('email')} />
            </div>
            <div>
              <label className="form-label">Personal Email</label>
              <Input type="email" value={form.personalEmail} onChange={f('personalEmail')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Phone Number</label>
              <Input value={form.phoneNumber} onChange={f('phoneNumber')} />
            </div>
            <div>
              <label className="form-label">National ID</label>
              <Input value={form.nationalIdNumber} onChange={f('nationalIdNumber')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="form-label">Date of Birth</label>
              <Input type="date" value={form.dateOfBirth} onChange={f('dateOfBirth')} />
            </div>
            <div>
              <label className="form-label">Gender</label>
              <select className="input w-full" value={form.gender} onChange={f('gender')}>
                <option value="">— Select —</option>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Nationality</label>
              <Input value={form.nationality} onChange={f('nationality')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employment Type</label>
              <select className="input w-full" value={form.employmentType} onChange={f('employmentType')}>
                {EMPLOYMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select className="input w-full" value={form.status} onChange={f('status')}>
                {EMPLOYEE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Termination Date</label>
            <Input type="date" value={form.terminationDate} onChange={f('terminationDate')} />
          </div>

          <div>
            <label className="form-label">Address</label>
            <textarea className="input w-full" rows={2} value={form.address} onChange={f('address')} />
          </div>

          <fieldset className="border border-gray-200 rounded-lg p-4">
            <legend className="text-xs font-semibold text-gray-500 px-2">Bank Details</legend>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="form-label">Account Number</label>
                <Input value={form.bankAccountNumber} onChange={f('bankAccountNumber')} />
              </div>
              <div>
                <label className="form-label">Bank Name</label>
                <Input value={form.bankName} onChange={f('bankName')} />
              </div>
              <div>
                <label className="form-label">Branch Code</label>
                <Input value={form.bankBranchCode} onChange={f('bankBranchCode')} />
              </div>
            </div>
          </fieldset>

          <div>
            <label className="form-label">Notes</label>
            <textarea className="input w-full" rows={2} value={form.notes} onChange={f('notes')} />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="plain" onClick={onClose}>Cancel</Button>
          <Button variant="solid" loading={saving} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  )
}
