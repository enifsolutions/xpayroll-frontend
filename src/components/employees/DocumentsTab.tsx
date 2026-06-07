"use client";
import { useEffect, useRef, useState } from "react";
import { PlusIcon, Pencil, Trash2, ExternalLink, Upload } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Input from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { showSuccess, showError } from "@/lib/toast";
import api from "@/lib/axios";
import { usePermission } from "@/hooks/usePermission";
import { Permissions } from "@/lib/permissions";
import {
  EmployeeDocument,
  DocumentForm,
  EMPTY_DOCUMENT,
} from "@/types/employee-extended.types";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function DocumentsTab({ employeeId }: { employeeId: string }) {
  const canManage = usePermission(Permissions.HR.Documents.Manage);
  const initialized = useRef(false);

  const [items, setItems] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EmployeeDocument | null>(null);
  const [form, setForm] = useState<DocumentForm>(EMPTY_DOCUMENT);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeDocument | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await api.get<EmployeeDocument[]>(
        `employee-documents/${employeeId}`,
      );
      setItems(res.data);
    } catch {
      showError("Load Failed", "Could not load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const f =
    (field: keyof DocumentForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_DOCUMENT);
    setFile(null);
    setError("");
    setDialogOpen(true);
  };

  const openEdit = (item: EmployeeDocument) => {
    setEditing(item);
    setForm({
      documentName: item.documentName,
      expiryDate: item.expiryDate ?? "",
      notes: item.notes ?? "",
    });
    setFile(null);
    setError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.documentName.trim()) {
      setError("Document name is required.");
      return;
    }
    if (!editing && !file) {
      setError("Please select a file to upload.");
      return;
    }
    setSaving(true);
    try {
      let fileUrl = editing?.fileUrl ?? "";
      let fileName = editing?.fileName ?? "";
      let fileSizeKb = editing?.fileSizeKb ?? 0;

      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "documents");
        const uploadRes = await api.post<{ url: string }>(
          "/files/upload-doc/documents",
          fd,
        );
        fileUrl = uploadRes.data.url;
        fileName = file.name;
        fileSizeKb = Math.round(file.size / 1024);
      }

      await api.post("employee-documents", {
        action: editing ? "UPDATE" : "ADD",
        id: editing?.id ?? null,
        employeeId,
        documentName: form.documentName.trim(),
        fileUrl,
        fileName,
        fileSizeKb,
        expiryDate: form.expiryDate || null,
        notes: form.notes.trim() || null,
        userId: 1,
      });
      setDialogOpen(false);
      await load();
      showSuccess(
        editing ? "Document Updated" : "Document Uploaded",
        form.documentName,
      );
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to save document.");
    } finally {
      setSaving(false);
    }
  };

  const promptDelete = (item: EmployeeDocument) => {
    setDeleteTarget(item);
    setConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.post("employee-documents", {
        action: "DELETE",
        id: deleteTarget.id,
        employeeId,
        userId: 1,
      });
      setConfirmOpen(false);
      setDeleteTarget(null);
      await load();
      showSuccess("Document Removed", deleteTarget.documentName);
    } catch {
      showError("Delete Failed", "Could not remove document.");
    } finally {
      setDeleting(false);
    }
  };

  const formatSize = (kb?: number) => {
    if (!kb) return "—";
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    const d = new Date(date);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h5 className="h5">Documents</h5>
          <p className="text-sm text-gray-500 mt-0.5">
            Uploaded employee documents and certificates.
          </p>
        </div>
        {canManage && (
          <Button variant="solid" icon={<Upload size={16} />} onClick={openAdd}>
            Upload Document
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No documents uploaded yet.
        </div>
      ) : (
        <table className="table-default table-hover w-full">
          <thead>
            <tr>
              <th>Document Name</th>
              <th>File</th>
              <th>Size</th>
              <th>Expiry Date</th>
              <th>Uploaded</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="font-medium heading-text">
                  {item.documentName}
                </td>
                <td>
                  <a
                    href={`/api/image-proxy?path=${encodeURIComponent(item.fileUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    <ExternalLink size={13} />
                    {item.fileName ?? "View"}
                  </a>
                </td>
                <td className="text-gray-500 text-sm">
                  {formatSize(item.fileSizeKb)}
                </td>
                <td>
                  {item.expiryDate ? (
                    <span
                      className={
                        isExpiringSoon(item.expiryDate)
                          ? "text-yellow-600 font-medium"
                          : "text-gray-500"
                      }
                    >
                      {item.expiryDate}
                      {isExpiringSoon(item.expiryDate) && (
                        <span className="ml-1 xp-badge xp-badge-warning text-xs">
                          Expiring
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="text-gray-500 text-sm">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    {canManage && (
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-primary transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        onClick={() => promptDelete(item)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onRequestClose={() => setDialogOpen(false)}
      >
        <div className="p-6 w-full max-w-md">
          <h5 className="h5 mb-5">
            {editing ? "Edit Document" : "Upload Document"}
          </h5>
          <div className="space-y-4">
            <Field label="Document Name" required>
              <Input
                value={form.documentName}
                onChange={f("documentName")}
                placeholder="National Identity Card"
              />
            </Field>

            {!editing && (
              <Field label="File" required>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {file ? (
                    <div>
                      <p className="text-sm font-medium heading-text">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {Math.round(file.size / 1024)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <Upload
                        size={20}
                        className="mx-auto text-gray-400 mb-1"
                      />
                      <p className="text-sm text-gray-400">
                        Click to select file
                      </p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            )}

            <Field label="Expiry Date">
              <Input
                type="date"
                value={form.expiryDate}
                onChange={f("expiryDate")}
              />
            </Field>
            <Field label="Notes">
              <textarea
                className="input w-full"
                rows={2}
                value={form.notes}
                onChange={f("notes")}
              />
            </Field>

            {error && <p className="text-error text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="plain" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="solid" loading={saving} onClick={handleSave}>
                {editing ? "Update" : "Upload"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title="Remove Document"
        message={deleteTarget ? `Remove "${deleteTarget.documentName}"?` : ""}
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
