"use client";
import { Employee } from "@/app/(dashboard)/master/employees/employee.types";
import {
  EmployeeDependent,
  EmployeeTransport,
  EmployeeDocument,
  EmployeeQualification,
} from "@/types/employee-extended.types";

interface Props {
  employee: Employee;
  dependents: EmployeeDependent[];
  transport: EmployeeTransport | null;
  documents: EmployeeDocument[];
  qualifications: EmployeeQualification[];
}

interface Section {
  label: string;
  weight: number;
  done: boolean;
}

export default function ProfileCompletion({
  employee,
  dependents,
  transport,
  documents,
  qualifications,
}: Props) {
  const sections: Section[] = [
    {
      label: "Basic Info",
      weight: 20,
      done: !!(
        employee.firstName &&
        employee.lastName &&
        employee.email &&
        employee.phoneNumber &&
        employee.dateOfBirth &&
        employee.gender
      ),
    },
    {
      label: "Employment",
      weight: 15,
      done: !!(
        employee.branchId &&
        employee.departmentId &&
        employee.designationId &&
        employee.joinDate &&
        employee.employmentType
      ),
    },
    {
      label: "Bank Details",
      weight: 10,
      done: !!(employee.bankAccountNumber && employee.bankBranchId),
    },
    {
      label: "TIN Number",
      weight: 5,
      done: !!(employee as any).tinNumber,
    },
    {
      label: "Profile Photo",
      weight: 5,
      done: !!employee.profilePictureUrl,
    },
    {
      label: "Crew / Group",
      weight: 5,
      done: !!(employee as any).crew || !!(employee as any).groupName,
    },
    {
      label: "Dependents",
      weight: 10,
      done: dependents.length > 0,
    },
    {
      label: "Transport",
      weight: 10,
      done: transport !== null,
    },
    {
      label: "Documents",
      weight: 10,
      done: documents.length > 0,
    },
    {
      label: "Qualifications",
      weight: 10,
      done: qualifications.length > 0,
    },
  ];

  const total = sections.reduce((s, x) => s + x.weight, 0);
  const earned = sections
    .filter((x) => x.done)
    .reduce((s, x) => s + x.weight, 0);
  const pct = Math.round((earned / total) * 100);

  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-primary" : "bg-yellow-500";
  const textColor =
    pct >= 80
      ? "text-emerald-600"
      : pct >= 50
        ? "text-primary"
        : "text-yellow-600";

  return (
    <div className="card mb-6">
      <div className="card-body">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Profile Completion
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Complete all sections for full payroll readiness
            </p>
          </div>
          <span className={`text-2xl font-bold ${textColor}`}>{pct}%</span>
        </div>

        {/* Overall bar */}
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4">
          <div
            className={`h-full rounded-full ${color} transition-all duration-700`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Section grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {sections.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs
              ${
                s.done
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-gray-50 dark:bg-gray-800 text-gray-400"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold
                ${s.done ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
              >
                {s.done ? "✓" : ""}
              </span>
              <span className="truncate">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
