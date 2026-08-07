"use client";
import { useState } from "react";
import ReportPage, { ReportColumn } from "@/components/reports/ReportPage";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";

const columns: ReportColumn[] = [
  { header: "Candidate", field: "candidateName" },
  { header: "Requisition", field: "requisitionCode" },
  { header: "Department", field: "department" },
  { header: "Branch", field: "branch" },
  { header: "Applied Date", field: "appliedDate", format: "date" },
  { header: "Hired Date", field: "hiredDate", format: "date" },
  {
    header: "Days to Hire",
    field: "daysToHire",
    align: "right",
    format: "number",
  },
];

export default function TimeToHireReportPage() {
  useRequirePermission(Permissions.Recruitment.Reports.TimeToHire.View);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requisitionId, setRequisitionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  return (
    <ReportPage
      title="Time to Hire"
      description="Days from application to hire, one row per hired candidate"
      permissionKey={Permissions.Recruitment.Reports.TimeToHire.View}
      endpoint="recruitment-reports/time-to-hire"
      columns={columns}
      params={{
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        requisitionId: requisitionId || undefined,
        departmentId: departmentId || undefined,
      }}
      filters={
        <>
          <div>
            <label className="form-label">From</label>
            <input
              type="date"
              className="form-control"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">To</label>
            <input
              type="date"
              className="form-control"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Requisition ID</label>
            <input
              className="form-control"
              value={requisitionId}
              onChange={(e) => setRequisitionId(e.target.value)}
              placeholder="All"
            />
          </div>
          <div>
            <label className="form-label">Department ID</label>
            <input
              className="form-control"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              placeholder="All"
            />
          </div>
        </>
      }
    />
  );
}
