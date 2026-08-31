"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Package } from "lucide-react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { showSuccess, showError } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/axios";
import type { Role, Permission } from "@/types/roles.types";
import navigationConfig, {
  getNavPermissionSections,
} from "@/configs/navigation.config";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  permissions: Permission[];
};

type FeatureGroup = {
  key: string;
  module: string;
  feature: string;
  label: string;
  permissions: Permission[];
};
type SectionGroup = { section: string; features: FeatureGroup[] };

const OTHER_SECTION = "Other";

// "PayslipExport" -> "Payslip Export", "TimeToHire" -> "Time To Hire".
// Acronyms like "HR" are left untouched (no lowercase->uppercase transition).
function prettifyPascal(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

// For compound feature names like "Reports.Funnel", the last segment is the
// specific, human-meaningful part - the leading "Reports." is redundant
// with the matrix section itself.
function baseFeatureLabel(feature: string): string {
  const segments = feature.split(".");
  return prettifyPascal(segments[segments.length - 1]);
}

// Reuse the exact icon each top-level nav group already uses - single
// source of truth stays in navigation.config.ts, we just read from it.
const sectionIcons: Record<string, React.ElementType> = Object.fromEntries(
  navigationConfig.map((item) => [item.label, item.icon]),
);
sectionIcons[OTHER_SECTION] = Package;

// module.feature (everything but the trailing action segment) -> nav group label.
// Built once per render from navigationConfig - single source of truth (Track B1).
function buildSectionMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const { label, keys } of getNavPermissionSections()) {
    for (const key of keys) {
      const parts = key.split(".");
      const moduleFeature = parts.slice(0, -1).join(".");
      map.set(moduleFeature, label);
    }
  }
  return map;
}

function groupPermissionsBySection(permissions: Permission[]): SectionGroup[] {
  const sectionMap = buildSectionMap();
  const sectionOrder = [
    ...getNavPermissionSections().map((s) => s.label),
    OTHER_SECTION,
  ];

  // Keyed by module+feature (not feature alone) - fixes the silent merge
  // where two different modules sharing the same feature name (e.g.
  // Payroll.Reports and Tax.Reports both have feature === "Reports")
  // used to collapse into one unlabeled block.
  const bySection = new Map<
    string,
    Map<string, { module: string; feature: string; permissions: Permission[] }>
  >();
  for (const p of permissions) {
    const moduleFeature = `${p.module}.${p.feature}`;
    const section = sectionMap.get(moduleFeature) ?? OTHER_SECTION;
    if (!bySection.has(section)) bySection.set(section, new Map());
    const featureMap = bySection.get(section)!;
    if (!featureMap.has(moduleFeature)) {
      featureMap.set(moduleFeature, {
        module: p.module,
        feature: p.feature,
        permissions: [],
      });
    }
    featureMap.get(moduleFeature)!.permissions.push(p);
  }

  return sectionOrder
    .filter((label) => bySection.has(label))
    .map((label) => {
      const entries = Array.from(bySection.get(label)!.values());

      // Disambiguate labels that collide within this section only - e.g.
      // Payroll.Reports and Tax.Reports both base-label to "Reports", so
      // within the "Reports" section they become "Payroll Reports" and
      // "Tax Reports". A feature with a unique base label elsewhere is
      // left short and clean.
      const baseLabels = entries.map((e) => baseFeatureLabel(e.feature));
      const counts = new Map<string, number>();
      baseLabels.forEach((b) => counts.set(b, (counts.get(b) ?? 0) + 1));

      const features: FeatureGroup[] = entries.map((e, i) => {
        const base = baseLabels[i];
        const collides = (counts.get(base) ?? 0) > 1;
        return {
          key: `${e.module}.${e.feature}`,
          module: e.module,
          feature: e.feature,
          label: collides ? `${prettifyPascal(e.module)} ${base}` : base,
          permissions: e.permissions,
        };
      });

      return { section: label, features };
    });
}

// Legacy prefix-based grouping - kept only as a documented rollback path
// (Track B rollback posture). Not called anywhere; delete once Track B is
// verified in production for a full release cycle.
// function groupPermissions_LEGACY(permissions: Permission[]) {
//   const map = new Map<string, Map<string, Permission[]>>();
//   for (const p of permissions) {
//     if (!map.has(p.module)) map.set(p.module, new Map());
//     const fm = map.get(p.module)!;
//     if (!fm.has(p.feature)) fm.set(p.feature, []);
//     fm.get(p.feature)!.push(p);
//   }
//   return Array.from(map.entries()).map(([module, fm]) => ({
//     module,
//     features: Array.from(fm.entries()).map(([feature, perms]) => ({
//       feature,
//       permissions: perms,
//     })),
//   }));
// }

export default function PermissionMatrixDialog({
  isOpen,
  onClose,
  role,
  permissions,
}: Props) {
  const userId = useAuthStore((s) => s.user?.userId);

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const isReadOnly = role.isLocked;

  const sections = useMemo(
    () => groupPermissionsBySection(permissions),
    [permissions],
  );

  // Track B3 verification: every permission must land in exactly one
  // section (its own group or Other) - nothing lost to grouping.
  if (process.env.NODE_ENV !== "production") {
    const totalGrouped = sections.reduce(
      (sum, s) =>
        sum + s.features.reduce((s2, f) => s2 + f.permissions.length, 0),
      0,
    );
    if (totalGrouped !== permissions.length) {
      console.warn(
        `[PermissionMatrix] grouping mismatch: grouped ${totalGrouped}, total ${permissions.length}. ` +
          `Some permission is being counted more than once or dropped - check buildSectionMap().`,
      );
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSearch("");
    api
      .get(`/roles/${role.id}/permissions`)
      .then((res) =>
        setChecked(new Set(res.data.map((r: any) => String(r.permissionId)))),
      )
      .catch(() => showError("Load Failed", "Could not load role permissions."))
      .finally(() => setLoading(false));
  }, [isOpen, role.id]);

  // Default the active section to the first one that actually has
  // permissions, once sections are known (guards against a stale/empty key).
  useEffect(() => {
    if (sections.length === 0) return;
    if (!activeSection || !sections.some((s) => s.section === activeSection)) {
      setActiveSection(sections[0].section);
    }
  }, [sections, activeSection]);

  const matchesSearch = (text: string) =>
    text.toLowerCase().includes(search.trim().toLowerCase());

  // Sidebar filtering: a category stays visible if its own label matches,
  // or any feature/permission name inside it matches.
  const visibleSections = useMemo(() => {
    if (!search.trim()) return sections;
    return sections.filter((s) => {
      if (matchesSearch(s.section)) return true;
      return s.features.some(
        (f) =>
          matchesSearch(f.feature) ||
          matchesSearch(f.label) ||
          f.permissions.some((p) => matchesSearch(p.displayName)),
      );
    });
  }, [sections, search]);

  useEffect(() => {
    if (visibleSections.length === 0) return;
    if (!visibleSections.some((s) => s.section === activeSection)) {
      setActiveSection(visibleSections[0].section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections]);

  const currentSection = sections.find((s) => s.section === activeSection);

  const toggle = (id: string) => {
    if (isReadOnly) return;
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleIds = (ids: string[]) => {
    if (isReadOnly) return;
    const allChecked = ids.length > 0 && ids.every((id) => checked.has(id));
    setChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    if (isReadOnly) return;
    const allChecked = permissions.every((p) => checked.has(p.id));
    setChecked(allChecked ? new Set() : new Set(permissions.map((p) => p.id)));
  };

  const handleSave = async () => {
    if (!userId) {
      showError("Session Error", "Please refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/roles/${role.id}/permissions/save`, {
        roleId: role.id,
        permissionIds: Array.from(checked),
        userId,
      });
      showSuccess("Saved", "Permissions updated successfully.");
      onClose();
    } catch (e: any) {
      showError(
        "Save Failed",
        e?.response?.data?.detail ?? "Could not save permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sectionIds = (section: SectionGroup) =>
    section.features.flatMap((f) => f.permissions.map((p) => p.id));

  const idsForAction = (section: SectionGroup, actionName: string) =>
    section.features
      .flatMap((f) => f.permissions)
      .filter((p) => p.action === actionName)
      .map((p) => p.id);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={1280} height="85vh">
      <div className="flex flex-col h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h5 className="h5">Permissions — {role.name}</h5>
            <p className="text-xs text-gray-500 mt-0.5">
              {isReadOnly
                ? "System role — permissions are read-only"
                : `${checked.size} of ${permissions.length} permissions selected`}
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-primary hover:underline"
            >
              {permissions.every((p) => checked.has(p.id))
                ? "Deselect all"
                : "Select all"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : sections.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-16">
            No permissions seeded yet.
          </p>
        ) : (
          <div className="flex flex-1 min-h-0">
            {/* Sidebar */}
            <div className="w-72 shrink-0 border-r border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="p-3">
                <div className="relative">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search categories…"
                    className="pl-8 text-sm"
                  />
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
                {visibleSections.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 px-2">
                    No categories match "{search}"
                  </p>
                ) : (
                  visibleSections.map((section) => {
                    const ids = sectionIds(section);
                    const checkedCount = ids.filter((id) =>
                      checked.has(id),
                    ).length;
                    const Icon = sectionIcons[section.section] ?? Package;
                    const isActive = section.section === activeSection;
                    return (
                      <button
                        key={section.section}
                        onClick={() => setActiveSection(section.section)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="flex-1 text-left truncate">
                          {section.section}
                        </span>
                        <span className="xp-badge xp-badge-neutral text-xs shrink-0">
                          {checkedCount} / {ids.length}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Content pane */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {currentSection && (
                <>
                  {/* Category header */}
                  <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                    {(() => {
                      const Icon =
                        sectionIcons[currentSection.section] ?? Package;
                      return (
                        <Icon size={20} className="text-primary shrink-0" />
                      );
                    })()}
                    <h6 className="font-bold text-base heading-text">
                      {currentSection.section}
                    </h6>

                    <div className="flex items-center gap-4 ml-6">
                      {(() => {
                        const viewIds = idsForAction(currentSection, "View");
                        const viewChecked =
                          viewIds.length > 0 &&
                          viewIds.every((id) => checked.has(id));
                        return (
                          <label
                            className={`flex items-center gap-2 text-sm ${
                              viewIds.length === 0 || isReadOnly
                                ? "text-gray-300 cursor-default"
                                : "text-gray-600 dark:text-gray-300 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={viewChecked}
                              disabled={viewIds.length === 0 || isReadOnly}
                              onChange={() => toggleIds(viewIds)}
                              className="rounded"
                            />
                            View Access
                          </label>
                        );
                      })()}
                      {(() => {
                        const manageIds = idsForAction(
                          currentSection,
                          "Manage",
                        );
                        const manageChecked =
                          manageIds.length > 0 &&
                          manageIds.every((id) => checked.has(id));
                        return (
                          <label
                            className={`flex items-center gap-2 text-sm ${
                              manageIds.length === 0 || isReadOnly
                                ? "text-gray-300 cursor-default"
                                : "text-gray-600 dark:text-gray-300 cursor-pointer"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={manageChecked}
                              disabled={manageIds.length === 0 || isReadOnly}
                              onChange={() => toggleIds(manageIds)}
                              className="rounded"
                            />
                            Manage Access
                          </label>
                        );
                      })()}
                    </div>

                    {!isReadOnly && (
                      <div className="ml-auto">
                        <Button
                          variant="solid"
                          size="sm"
                          onClick={() => toggleIds(sectionIds(currentSection))}
                        >
                          {sectionIds(currentSection).every((id) =>
                            checked.has(id),
                          )
                            ? "Deselect Section"
                            : "Select Section"}
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="divide-y divide-gray-100 dark:divide-gray-700 px-5">
                    {currentSection.features.map((fg) => {
                      const actionNames = new Set(
                        fg.permissions.map((p) => p.action),
                      );
                      const isSimpleViewManagePair =
                        actionNames.size === 2 &&
                        actionNames.has("View") &&
                        actionNames.has("Manage");

                      return (
                        <div key={fg.key} className="py-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2.5">
                            {fg.label}
                          </p>

                          {isSimpleViewManagePair ? (
                            <div className="grid grid-cols-2 gap-x-4">
                              {["Manage", "View"].map((actionName) => {
                                const perm = fg.permissions.find(
                                  (p) => p.action === actionName,
                                )!;
                                return (
                                  <label
                                    key={perm.id}
                                    className={`flex items-center gap-2 text-sm ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked.has(perm.id)}
                                      onChange={() => toggle(perm.id)}
                                      disabled={isReadOnly}
                                      className="rounded"
                                    />
                                    <span
                                      className={
                                        checked.has(perm.id)
                                          ? "text-gray-800 dark:text-gray-200"
                                          : "text-gray-400"
                                      }
                                    >
                                      {perm.displayName}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                              {fg.permissions.map((perm) => (
                                <label
                                  key={perm.id}
                                  className={`flex items-center gap-2 text-sm ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked.has(perm.id)}
                                    onChange={() => toggle(perm.id)}
                                    disabled={isReadOnly}
                                    className="rounded"
                                  />
                                  <span
                                    className={
                                      checked.has(perm.id)
                                        ? "text-gray-800 dark:text-gray-200"
                                        : "text-gray-400"
                                    }
                                  >
                                    {perm.displayName}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <Button variant="plain" onClick={onClose}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button variant="solid" onClick={handleSave} loading={saving}>
              {saving ? "Saving…" : "Save Permissions"}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import Dialog from "@/components/ui/Dialog";
// import Button from "@/components/ui/Button";
// import { showSuccess, showError } from "@/lib/toast";
// import { useAuthStore } from "@/store/authStore";
// import api from "@/lib/axios";
// import type { Role, Permission } from "@/types/roles.types";

// type Props = {
//   isOpen: boolean;
//   onClose: () => void;
//   role: Role;
//   permissions: Permission[];
// };

// type ModuleGroup = {
//   module: string;
//   features: { feature: string; permissions: Permission[] }[];
// };

// function groupPermissions(permissions: Permission[]): ModuleGroup[] {
//   const map = new Map<string, Map<string, Permission[]>>();
//   for (const p of permissions) {
//     if (!map.has(p.module)) map.set(p.module, new Map());
//     const fm = map.get(p.module)!;
//     if (!fm.has(p.feature)) fm.set(p.feature, []);
//     fm.get(p.feature)!.push(p);
//   }
//   return Array.from(map.entries()).map(([module, fm]) => ({
//     module,
//     features: Array.from(fm.entries()).map(([feature, perms]) => ({
//       feature,
//       permissions: perms,
//     })),
//   }));
// }

// export default function PermissionMatrixDialog({
//   isOpen,
//   onClose,
//   role,
//   permissions,
// }: Props) {
//   const userId = useAuthStore((s) => s.user?.userId);

//   const [checked, setChecked] = useState<Set<string>>(new Set());
//   const [loading, setLoading] = useState(false);
//   const [saving, setSaving] = useState(false);
//   const isReadOnly = role.isLocked;

//   const groups = groupPermissions(permissions);

//   useEffect(() => {
//     if (!isOpen) return;
//     setLoading(true);
//     api
//       .get(`/roles/${role.id}/permissions`)
//       .then((res) =>
//         setChecked(new Set(res.data.map((r: any) => String(r.permissionId)))),
//       )
//       .catch(() => showError("Load Failed", "Could not load role permissions."))
//       .finally(() => setLoading(false));
//   }, [isOpen, role.id]);

//   const toggle = (id: string) => {
//     if (isReadOnly) return;
//     setChecked((prev) => {
//       const next = new Set(prev);
//       next.has(id) ? next.delete(id) : next.add(id);
//       return next;
//     });
//   };

//   const toggleModule = (module: string) => {
//     if (isReadOnly) return;
//     const ids = permissions.filter((p) => p.module === module).map((p) => p.id);
//     const allChecked = ids.every((id) => checked.has(id));
//     setChecked((prev) => {
//       const next = new Set(prev);
//       ids.forEach((id) => (allChecked ? next.delete(id) : next.add(id)));
//       return next;
//     });
//   };

//   const toggleAll = () => {
//     if (isReadOnly) return;
//     const allChecked = permissions.every((p) => checked.has(p.id));
//     setChecked(allChecked ? new Set() : new Set(permissions.map((p) => p.id)));
//   };

//   const handleSave = async () => {
//     if (!userId) {
//       showError("Session Error", "Please refresh and try again.");
//       return;
//     }
//     setSaving(true);
//     try {
//       await api.post(`/roles/${role.id}/permissions/save`, {
//         roleId: role.id,
//         permissionIds: Array.from(checked),
//         userId,
//       });
//       showSuccess("Saved", "Permissions updated successfully.");
//       onClose();
//     } catch (e: any) {
//       showError(
//         "Save Failed",
//         e?.response?.data?.detail ?? "Could not save permissions.",
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <Dialog isOpen={isOpen} onClose={onClose} className="max-w-3xl w-full">
//       <div className="flex flex-col max-h-[85vh]">
//         {/* Header */}
//         <div className="p-5 border-b border-gray-100 dark:border-gray-700">
//           <div className="flex items-center justify-between">
//             <div>
//               <h5 className="h5">Permissions — {role.name}</h5>
//               <p className="text-xs text-gray-500 mt-0.5">
//                 {isReadOnly
//                   ? "System role — permissions are read-only"
//                   : `${checked.size} of ${permissions.length} permissions selected`}
//               </p>
//             </div>
//             {!isReadOnly && (
//               <button
//                 onClick={toggleAll}
//                 className="text-xs text-primary hover:underline"
//               >
//                 {permissions.every((p) => checked.has(p.id))
//                   ? "Deselect all"
//                   : "Select all"}
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Body */}
//         <div className="overflow-y-auto flex-1 p-5 space-y-4">
//           {loading ? (
//             <div className="flex justify-center py-10">
//               <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
//             </div>
//           ) : groups.length === 0 ? (
//             <p className="text-center text-sm text-gray-400 py-10">
//               No permissions seeded yet.
//             </p>
//           ) : (
//             groups.map((group) => {
//               const moduleIds = permissions
//                 .filter((p) => p.module === group.module)
//                 .map((p) => p.id);
//               const allChecked = moduleIds.every((id) => checked.has(id));
//               const someChecked =
//                 moduleIds.some((id) => checked.has(id)) && !allChecked;
//               return (
//                 <div
//                   key={group.module}
//                   className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
//                 >
//                   {/* Module header */}
//                   <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
//                     <input
//                       type="checkbox"
//                       checked={allChecked}
//                       ref={(el) => {
//                         if (el) el.indeterminate = someChecked;
//                       }}
//                       onChange={() => toggleModule(group.module)}
//                       disabled={isReadOnly}
//                       className="rounded"
//                     />
//                     <span className="font-semibold text-sm heading-text">
//                       {group.module}
//                     </span>
//                     <span className="xp-badge xp-badge-neutral text-xs ml-auto">
//                       {moduleIds.filter((id) => checked.has(id)).length} /{" "}
//                       {moduleIds.length}
//                     </span>
//                   </div>
//                   {/* Features */}
//                   <div className="divide-y divide-gray-100 dark:divide-gray-700">
//                     {group.features.map((fg) => (
//                       <div key={fg.feature} className="px-4 py-3">
//                         <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
//                           {fg.feature}
//                         </p>
//                         <div className="grid grid-cols-2 gap-y-2 gap-x-4">
//                           {fg.permissions.map((perm) => (
//                             <label
//                               key={perm.id}
//                               className={`flex items-center gap-2 text-sm ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
//                             >
//                               <input
//                                 type="checkbox"
//                                 checked={checked.has(perm.id)}
//                                 onChange={() => toggle(perm.id)}
//                                 disabled={isReadOnly}
//                                 className="rounded"
//                               />
//                               <span
//                                 className={
//                                   checked.has(perm.id)
//                                     ? "text-gray-800 dark:text-gray-200"
//                                     : "text-gray-400"
//                                 }
//                               >
//                                 {perm.displayName}
//                               </span>
//                             </label>
//                           ))}
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })
//           )}
//         </div>

//         {/* Footer */}
//         <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
//           <Button variant="plain" onClick={onClose}>
//             {isReadOnly ? "Close" : "Cancel"}
//           </Button>
//           {!isReadOnly && (
//             <Button variant="solid" onClick={handleSave} loading={saving}>
//               {saving ? "Saving…" : "Save Permissions"}
//             </Button>
//           )}
//         </div>
//       </div>
//     </Dialog>
//   );
// }
