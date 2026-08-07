"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import api from "@/lib/axios";
import { showSuccess, showError } from "@/lib/toast";

// Admin-triggered right-to-erasure (PDPA). Distinct from the regular
// Delete action — this wipes PII (name, contact, NIC, CV file + parsed
// CV data) but keeps the candidate row and application/pipeline records
// as anonymised statistics, rather than removing the row entirely.
export default function CandidateErasureDialog({
  candidateId,
  candidateName,
  isOpen,
  onClose,
  onErased,
}: {
  candidateId: string;
  candidateName: string;
  isOpen: boolean;
  onClose: () => void;
  onErased: () => void;
}) {
  const [reason, setReason] = useState("");
  const [erasing, setErasing] = useState(false);

  const handleErase = async () => {
    try {
      setErasing(true);
      await api.post(`candidates/${candidateId}/erase`, {
        reason: reason || null,
      });
      showSuccess(
        "Data erased",
        `${candidateName}'s personal data has been permanently removed.`,
      );
      onErased();
      onClose();
    } catch (err: any) {
      showError(
        "Erasure failed",
        err?.response?.data?.message ?? "Could not erase candidate data.",
      );
    } finally {
      setErasing(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      onRequestClose={onClose}
      width={440}
    >
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-red-100 dark:bg-red-900/30">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <div>
          <h5 className="font-semibold">Erase Candidate Data</h5>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This permanently deletes {candidateName}&apos;s name, contact
            details, NIC, CV file, and parsed CV data. Application/pipeline
            records are kept as anonymised statistics only. This cannot be
            undone.
          </p>
        </div>
        <textarea
          className="input w-full text-sm"
          rows={2}
          placeholder="Reason (optional, e.g. candidate requested deletion)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex justify-center gap-3 pt-1">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            loading={erasing}
            className="bg-red-500 hover:bg-red-600 text-white border-red-500"
            onClick={handleErase}
          >
            Erase Permanently
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
