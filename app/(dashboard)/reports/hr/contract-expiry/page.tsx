"use client";
import { useState } from "react";
import ReportPage from "@/components/reports/ReportPage";
import { usePermission } from "@/hooks/usePermission";

const COLS = [
  { header: "Emp Code",      field: "employeeCode" },
  { header: "Name",          field: "fullName" },
  { header: "Branch",        field: "branch" },
  { header: "Department",    field: "department" },
  { header: "Contract Type", field: "contractType" },
  { header: "Start Date",    field: "startDate" },
  { header: "End Date",      field: "endDate" },
  { header: "Days Left",     field: "daysRemaining", align: "right" as const, format: "number" as const },
];

export default function ContractExpiryPage() {
  usePermission("Reports.ContractExpiry.View");
  const [days, setDays] = useState(90);

  return (
    <ReportPage
      title="Contract Expiry Report"
      description="Employee contracts expiring within the selected number of days"
      permissionKey="Reports.ContractExpiry.View"
      endpoint="reports/contract-expiry"
      columns={COLS}
      params={{ withinDays: days }}
      filters={
        <div className="flex flex-col gap-1">
          <label className="form-label">Expiring within (days)</label>
          <input type="number" className="input w-28" value={days} min={7} max={365}
            onChange={e => setDays(Number(e.target.value))} />
        </div>
      }
    />
  );
}
