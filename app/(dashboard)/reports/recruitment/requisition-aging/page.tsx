"use client";
import { useState } from "react";
import ReportPage, { ReportColumn } from "@/components/reports/ReportPage";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";

const columns: ReportColumn[] = [
  { header: "Req. Code", field: "requisitionCode" },
  { header: "Title", field: "title" },
  { header: "Department", field: "department" },
  { header: "Branch", field: "branch" },
  { header: "Status", field: "status" },
  { header: "Created", field: "createdDate", format: "date" },
  { header: "Opened", field: "openedDate", format: "date" },
  { header: "Days Open", field: "daysOpen", align: "right", format: "number" },
  { header: "Headcount", field: "headcount", align: "right", format: "number" },
  {
    header: "Filled",
    field: "headcountFilled",
    align: "right",
    format: "number",
  },
  {
    header: "Remaining",
    field: "headcountRemaining",
    align: "right",
    format: "number",
  },
  { header: "Target Start", field: "targetStartDate", format: "date" },
];

export default function RequisitionAgingReportPage() {
  useRequirePermission(Permissions.Recruitment.Reports.RequisitionAging.View);

  const [includeClosed, setIncludeClosed] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");

  return (
    <ReportPage
      title="Requisition Aging"
      description="How long open requisitions have been unfilled"
      permissionKey={Permissions.Recruitment.Reports.RequisitionAging.View}
      endpoint="recruitment-reports/requisition-aging"
      columns={columns}
      params={{
        includeClosed: includeClosed ? "true" : "false",
        departmentId: departmentId || undefined,
        branchId: branchId || undefined,
      }}
      filters={
        <>
          <div>
            <label className="form-label">Department ID</label>
            <input
              className="form-control"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              placeholder="All"
            />
          </div>
          <div>
            <label className="form-label">Branch ID</label>
            <input
              className="form-control"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              placeholder="All"
            />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input
              type="checkbox"
              id="includeClosed"
              checked={includeClosed}
              onChange={(e) => setIncludeClosed(e.target.checked)}
            />
            <label htmlFor="includeClosed" className="form-label mb-0">
              Include closed / cancelled / rejected
            </label>
          </div>
        </>
      }
    />
  );
}
