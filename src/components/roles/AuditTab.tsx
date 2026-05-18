"use client";

import { useEffect, useRef, useState } from "react";
import { showError } from "@/lib/toast";
import api from "@/lib/axios";

type AuditEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  beforeSnapshot: string | null;
  afterSnapshot: string | null;
  changedByName: string | null;
  changedById: string;
  changedAt: string;
};

const ACTION_BADGE: Record<string, string> = {
  CREATE: "xp-badge xp-badge-success",
  UPDATE: "xp-badge xp-badge-info",
  DELETE: "xp-badge xp-badge-danger",
  GRANT: "xp-badge xp-badge-warning",
  REVOKE: "xp-badge xp-badge-danger",
};

const ENTITY_BADGE: Record<string, string> = {
  Role: "xp-badge xp-badge-info",
  Permission: "xp-badge xp-badge-warning",
  UserOverride: "xp-badge xp-badge-neutral",
};

// ── Human-readable snapshot diff ─────────────────────────

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  name: "Name",
  description: "Description",
  role_id: "Role",
  roleId: "Role",
  permission_id: "Permission",
  permissionId: "Permission",
  is_granted: "Access",
  isGranted: "Access",
  reason: "Reason",
};

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (key === "isGranted" || key === "is_granted")
    return value ? "Granted" : "Denied";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function parseSnapshot(s: string | null): Record<string, any> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function SnapshotDiff({
  before,
  after,
}: {
  before: string | null;
  after: string | null;
}) {
  const beforeData = parseSnapshot(before);
  const afterData = parseSnapshot(after);

  const keys = Array.from(
    new Set([
      ...Object.keys(beforeData ?? {}),
      ...Object.keys(afterData ?? {}),
    ]),
  );

  if (keys.length === 0) return null;

  const hasBefore = beforeData !== null;
  const hasAfter = afterData !== null;
  const cols = hasBefore && hasAfter ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm max-w-xl">
      {/* Column headers */}
      <div
        className={`grid ${cols} bg-gray-100 dark:bg-gray-700 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400`}
      >
        <div className="px-4 py-2">Field</div>
        {hasBefore && (
          <div className="px-4 py-2 border-l border-gray-200 dark:border-gray-600">
            Previous
          </div>
        )}
        {hasAfter && (
          <div className="px-4 py-2 border-l border-gray-200 dark:border-gray-600">
            After
          </div>
        )}
      </div>

      {/* Rows */}
      {keys.map((key, i) => {
        const bVal = beforeData?.[key] ?? null;
        const aVal = afterData?.[key] ?? null;
        const changed = hasBefore && hasAfter && String(bVal) !== String(aVal);

        return (
          <div
            key={key}
            className={`grid ${cols} ${
              changed
                ? "bg-amber-50 dark:bg-amber-900/10"
                : i % 2 === 0
                  ? "bg-white dark:bg-gray-900"
                  : "bg-gray-50 dark:bg-gray-800"
            }`}
          >
            <div className="px-4 py-2.5 font-medium text-gray-600 dark:text-gray-400">
              {FIELD_LABELS[key] ?? key}
            </div>
            {hasBefore && (
              <div
                className={`px-4 py-2.5 border-l border-gray-100 dark:border-gray-700 ${
                  changed
                    ? "text-red-400 line-through opacity-70"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {formatValue(key, bVal)}
              </div>
            )}
            {hasAfter && (
              <div
                className={`px-4 py-2.5 border-l border-gray-100 dark:border-gray-700 ${
                  changed
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {formatValue(key, aVal)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const initialized = useRef(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/roles/audit", {
        params: { entityType: entityType || undefined, limit: 100 },
      });
      setEntries(res.data.map((e: any) => ({ ...e, id: String(e.id) })));
    } catch {
      showError("Load Failed", "Could not load audit log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, []);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <select
          className="input w-48"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="Role">Role</option>
          <option value="Permission">Permission</option>
          <option value="UserOverride">User Override</option>
        </select>
        <button
          onClick={load}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Refresh
        </button>
        <span className="text-xs text-gray-400 ml-auto">
          {entries.length} entries
        </span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-10">
          No audit entries yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-default table-hover w-full">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Changed By</th>
                <th className="text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <>
                  <tr key={entry.id}>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {fmt(entry.changedAt)}
                    </td>
                    <td>
                      <span
                        className={
                          ENTITY_BADGE[entry.entityType] ??
                          "xp-badge xp-badge-neutral"
                        }
                      >
                        {entry.entityType}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          ACTION_BADGE[entry.action] ??
                          "xp-badge xp-badge-neutral"
                        }
                      >
                        {entry.action}
                      </span>
                    </td>
                    <td className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      #{entry.entityId}
                    </td>
                    <td className="text-sm">{entry.changedByName ?? "—"}</td>
                    <td className="text-center">
                      {(entry.beforeSnapshot || entry.afterSnapshot) && (
                        <button
                          onClick={() =>
                            setExpanded(expanded === entry.id ? null : entry.id)
                          }
                          className="text-xs text-primary hover:underline"
                        >
                          {expanded === entry.id ? "Hide" : "View"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr
                      key={`${entry.id}-detail`}
                      className="bg-gray-50 dark:bg-gray-800"
                    >
                      <td colSpan={6} className="px-6 py-4">
                        <SnapshotDiff
                          before={entry.beforeSnapshot}
                          after={entry.afterSnapshot}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
