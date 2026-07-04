"use client";
import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { parseCv, CvParseResult } from "@/lib/api/cvParser";
import { showSuccess, showError } from "@/lib/toast";

interface Props {
  onParsed: (result: CvParseResult) => void;
}

export default function CvUploadButton({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      showError(
        "Invalid file",
        "Please upload a PDF CV. Convert Word docs to PDF first.",
      );
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showError("File too large", "CV file must be under 10MB.");
      return;
    }

    setLoading(true);
    try {
      const result = await parseCv(file);
      onParsed(result);
      showSuccess(
        "CV parsed",
        "Review the auto-filled details before continuing.",
      );
    } catch (err: any) {
      showError(
        "Parse failed",
        err?.response?.data?.message ?? "Could not parse this CV.",
      );
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="plain"
        size="sm"
        icon={
          loading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Upload size={14} />
          )
        }
        onClick={() => inputRef.current?.click()}
        disabled={loading}
      >
        {loading ? "Parsing…" : "Auto-fill from CV"}
      </Button>
    </>
  );
}
