"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Table2,
  Mail,
  FileSpreadsheet,
  Building2,
  ChevronDown,
} from "lucide-react";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";

interface Props {
  payrollRunId: string;
  periodLabel: string;
  /** Pass payslipId for single-row actions, omit for run-level actions */
  payslipId?: string;
  mode: "run" | "single";
}

export default function PayslipExportMenu({
  payrollRunId,
  periodLabel,
  payslipId,
  mode,
}: Props) {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const canPdf = usePermission(Permissions.PayslipExport.ExportPdf);
  const canBulkPdf = usePermission(Permissions.PayslipExport.ExportBulkPdf);
  const canExcel = usePermission(Permissions.PayslipExport.ExportExcel);
  const canCsv = usePermission(Permissions.PayslipExport.ExportCsv);
  const canBankLetter = usePermission(
    Permissions.PayslipExport.ExportBankLetter,
  );
  const canEmail = usePermission(Permissions.PayslipExport.EmailPayslip);
  const canBulkEmail = usePermission(Permissions.PayslipExport.BulkEmail);

  const download = (url: string, filename: string) => {
    api
      .get(url, { responseType: "blob" })
      .then((res) => {
        const objectUrl = URL.createObjectURL(res.data);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(objectUrl);
      })
      .catch(() => showError("Download failed"));
  };

  const sendEmail = async (url: string) => {
    try {
      setSending(true);
      await api.post(url);
      showSuccess("Email sent successfully");
    } catch {
      showError("Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const actions = [
    ...(mode === "single" && canPdf
      ? [
          {
            label: "Download PDF",
            icon: <FileText size={15} />,
            onClick: () =>
              download(
                `payslip-export/pdf/${payrollRunId}/${payslipId}`,
                `Payslip_${periodLabel}.pdf`,
              ),
          },
        ]
      : []),
    ...(mode === "run" && canBulkPdf
      ? [
          {
            label: "Download All PDFs (Merged)",
            icon: <FileText size={15} />,
            onClick: () =>
              download(
                `payslip-export/pdf-bulk/${payrollRunId}`,
                `Payroll_${periodLabel}_All.pdf`,
              ),
          },
        ]
      : []),
    ...(mode === "run" && canExcel
      ? [
          {
            label: "Export Excel",
            icon: <FileSpreadsheet size={15} />,
            onClick: () =>
              download(
                `payslip-export/excel/${payrollRunId}`,
                `Payroll_${periodLabel}.xlsx`,
              ),
          },
        ]
      : []),
    ...(mode === "run" && canCsv
      ? [
          {
            label: "Export CSV",
            icon: <Table2 size={15} />,
            onClick: () =>
              download(
                `payslip-export/csv/${payrollRunId}`,
                `Payroll_${periodLabel}.csv`,
              ),
          },
        ]
      : []),
    ...(mode === "run" && canBankLetter
      ? [
          {
            label: "Bank Transfer Letter",
            icon: <Building2 size={15} />,
            onClick: () =>
              download(
                `payslip-export/bank-letter/${payrollRunId}`,
                `BankLetter_${periodLabel}.pdf`,
              ),
          },
        ]
      : []),
    ...(mode === "single" && canEmail
      ? [
          {
            label: sending ? "Sending…" : "Email to Employee",
            icon: <Mail size={15} />,
            onClick: () =>
              sendEmail(`payslip-export/email/${payrollRunId}/${payslipId}`),
          },
        ]
      : []),
    ...(mode === "run" && canBulkEmail
      ? [
          {
            label: sending ? "Sending…" : "Bulk Email All",
            icon: <Mail size={15} />,
            onClick: () =>
              sendEmail(`payslip-export/bulk-email/${payrollRunId}`),
          },
        ]
      : []),
  ];

  if (!actions.length) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        <Download size={15} />
        Export
        <ChevronDown
          size={13}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 min-w-[200px] rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-900 dark:border-gray-700">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  a.onClick();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 first:rounded-t-lg last:rounded-b-lg"
              >
                <span className="text-gray-500">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
