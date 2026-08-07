"use client";

import { FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import api from "@/lib/axios";
import { showError } from "@/lib/toast";

// Downloads the static AI Transparency & Bias Mitigation compliance document.
// Follows the same blob-download pattern as downloadOfferPdf in
// ApplicationOffer.tsx — proxied through the API, not a direct static link.
export default function DownloadComplianceDocLink({
  label = "AI Transparency & Bias Statement",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await api.get("/compliance/ai-transparency-document", {
        responseType: "blob",
      });
      const url = URL.createObjectURL(
        new Blob([res.data], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "XpayRoll_Recruitment_AI_Transparency_Bias_Statement.docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError(
        "Download failed",
        "Could not download the compliance document.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center gap-1.5 text-xs text-violet-500 hover:underline disabled:opacity-50 ${className}`}
    >
      {downloading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <FileText size={12} />
      )}
      {downloading ? "Downloading…" : label}
    </button>
  );
}
