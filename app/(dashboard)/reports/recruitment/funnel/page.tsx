"use client";
import { useState } from "react";
import ReportPage, { ReportColumn } from "@/components/reports/ReportPage";
import { Permissions } from "@/lib/permissions";

const columns: ReportColumn[] = [
  { header: "Stage", field: "stage" },
  { header: "Reached", field: "reachedCount", align: "right", format: "number" },
  { header: "% of Applied", field: "pctOfApplied", align: "right", format: "pct" },
  { header: "Drop-off %", field: "dropOffPct", align: "right", format: "pct" },
];

export default function RecruitmentFunnelReportPage() {
  const [requisitionId, setRequisitionId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  return (
    <ReportPage
      title="Recruitment Funnel"
      description="Candidate progression through each pipeline stage"
      permissionKey={Permissions.Recruitment.Reports.Funnel.View}
      endpoint="recruitment-reports/funnel"
      columns={columns}
      params={{
        requisitionId: requisitionId || undefined,
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
              placeholder="All requisitions"
            />
          </div>
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-control" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-control" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </>
      }
    />
  );
}
