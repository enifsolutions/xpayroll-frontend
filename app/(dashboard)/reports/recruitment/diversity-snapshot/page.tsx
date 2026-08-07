"use client";
import { useState } from "react";
import ReportPage, { ReportColumn } from "@/components/reports/ReportPage";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";

const columns: ReportColumn[] = [
  { header: "Department", field: "department" },
  { header: "Stage", field: "stage" },
  { header: "Male", field: "male", align: "right", format: "number" },
  { header: "Female", field: "female", align: "right", format: "number" },
  { header: "Other", field: "other", align: "right", format: "number" },
  {
    header: "Prefer Not To Say",
    field: "preferNotToSay",
    align: "right",
    format: "number",
  },
  { header: "Total", field: "total", align: "right", format: "number" },
];

export default function DiversitySnapshotReportPage() {
  useRequirePermission(Permissions.Recruitment.Reports.DiversitySnapshot.View);

  const [requisitionId, setRequisitionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  return (
    <ReportPage
      title="Diversity Snapshot"
      description="Aggregated gender counts by department and stage. Groups below 3 people are blank to protect individual privacy."
      permissionKey={Permissions.Recruitment.Reports.DiversitySnapshot.View}
      endpoint="recruitment-reports/diversity-snapshot"
      columns={columns}
      params={{
        requisitionId: requisitionId || undefined,
        departmentId: departmentId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }}
      filters={
        <>
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
        </>
      }
    />
  );
}
