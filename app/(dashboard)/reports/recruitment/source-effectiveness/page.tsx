"use client";
import { useState } from "react";
import ReportPage, { ReportColumn } from "@/components/reports/ReportPage";
import { Permissions } from "@/lib/permissions";
import { useRequirePermission } from "@/hooks/useRequirePermission";

const columns: ReportColumn[] = [
  { header: "Source", field: "source" },
  {
    header: "Applications",
    field: "applications",
    align: "right",
    format: "number",
  },
  {
    header: "Interviewed",
    field: "interviewed",
    align: "right",
    format: "number",
  },
  { header: "Offered", field: "offered", align: "right", format: "number" },
  { header: "Hired", field: "hired", align: "right", format: "number" },
  {
    header: "Conversion %",
    field: "conversionPct",
    align: "right",
    format: "pct",
  },
];

export default function SourceEffectivenessReportPage() {
  useRequirePermission(
    Permissions.Recruitment.Reports.SourceEffectiveness.View,
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [requisitionId, setRequisitionId] = useState("");

  return (
    <ReportPage
      title="Source Effectiveness"
      description="Applications, interviews, offers, and hires broken down by candidate source"
      permissionKey={Permissions.Recruitment.Reports.SourceEffectiveness.View}
      endpoint="recruitment-reports/source-effectiveness"
      columns={columns}
      params={{
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        requisitionId: requisitionId || undefined,
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
              placeholder="All requisitions"
            />
          </div>
        </>
      }
    />
  );
}
