"use client";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui";
import { FileText, Sheet, FileDown, RefreshCw } from "lucide-react";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";

export interface ReportColumn {
  header: string;
  field: string;
  align?: "left" | "right" | "center";
  format?: "text" | "money" | "number" | "pct" | "date";
}

interface ReportPageProps {
  title: string;
  description: string;
  permissionKey: string;
  endpoint: string;
  columns: ReportColumn[];
  filters?: React.ReactNode;
  params: Record<string, string | number | null | undefined>;
}

function fmtCell(value: unknown, fmt?: string): string {
  if (value === null || value === undefined) return "";
  if (fmt === "money")  return "LKR " + Number(value).toLocaleString("en-LK", { minimumFractionDigits: 2 });
  if (fmt === "number") return Number(value).toLocaleString("en-LK");
  if (fmt === "pct")    return Number(value).toFixed(1) + "%";
  if (fmt === "date" && typeof value === "string") return value.split("T")[0];
  return String(value ?? "");
}

export default function ReportPage({ title, description, endpoint, columns, filters, params }: ReportPageProps) {
  const [rows, setRows]         = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading]   = useState(false);
  const [exporting, setExp]     = useState<string | null>(null);
  const initialized             = useRef(false);

  const buildQs = (extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
    });
    if (extra) Object.entries(extra).forEach(([k, v]) => p.set(k, v));
    return p.toString();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const qs = buildQs();
      const res = await api.get(`/${endpoint}${qs ? "?" + qs : ""}`);
      setRows(res.data ?? []);
    } catch {
      showError("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportReport = async (fmt: "pdf" | "excel" | "csv") => {
    setExp(fmt);
    try {
      const qs = buildQs({ format: fmt });
      const res = await api.get(`/${endpoint}?${qs}`, { responseType: "blob" });
      const mimeMap: Record<string, string> = {
        pdf:   "application/pdf",
        excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        csv:   "text/csv",
      };
      const ext = fmt === "excel" ? "xlsx" : fmt;
      const blob = new Blob([res.data], { type: mimeMap[fmt] });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, "_")}.${ext}`;
      link.click();
      showSuccess(`${fmt.toUpperCase()} downloaded`);
    } catch {
      showError("Export failed");
    } finally {
      setExp(null);
    }
  };

  const Spinner = ({ sm }: { sm?: boolean }) => (
    <span className={`inline-block border-2 border-t-transparent border-primary rounded-full animate-spin ${sm ? "w-3 h-3" : "w-4 h-4"}`} />
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="plain" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="plain" size="sm" onClick={() => exportReport("pdf")} disabled={!!exporting}>
            {exporting === "pdf" ? <Spinner sm /> : <FileText size={14} />}
            PDF
          </Button>
          <Button variant="plain" size="sm" onClick={() => exportReport("excel")} disabled={!!exporting}>
            {exporting === "excel" ? <Spinner sm /> : <Sheet size={14} />}
            Excel
          </Button>
          <Button variant="plain" size="sm" onClick={() => exportReport("csv")} disabled={!!exporting}>
            {exporting === "csv" ? <Spinner sm /> : <FileDown size={14} />}
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      {filters && (
        <div className="card">
          <div className="card-body">
            <div className="flex flex-wrap gap-3 items-end">
              {filters}
              <Button variant="solid" size="sm" onClick={loadData} disabled={loading}>
                {loading && <Spinner sm />}
                Run Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table-default table-hover w-full">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.field} className={c.align === "right" ? "text-right" : ""}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12">
                      <span className="inline-block w-6 h-6 border-2 border-t-transparent border-primary rounded-full animate-spin" />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-gray-400">
                      No data — adjust filters and click Run Report
                    </td>
                  </tr>
                ) : rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((c) => (
                      <td key={c.field} className={c.align === "right" ? "text-right tabular-nums" : ""}>
                        {fmtCell(row[c.field], c.format)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t dark:border-gray-700">
              {rows.length.toLocaleString()} record{rows.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
