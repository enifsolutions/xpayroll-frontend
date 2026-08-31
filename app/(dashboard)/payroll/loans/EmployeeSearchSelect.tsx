"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
}

interface Props {
  employees: EmployeeOption[];
  value: string;
  onChange: (id: string) => void;
  excludeIds?: string[];
  placeholder?: string;
  hasError?: boolean;
}

function label(e: EmployeeOption) {
  return `${e.employeeCode} — ${e.firstName} ${e.lastName}`;
}

export default function EmployeeSearchSelect({
  employees,
  value,
  onChange,
  excludeIds = [],
  placeholder = "Search by name or code…",
  hasError,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = employees.find((e) => e.id === value) ?? null;

  useEffect(() => {
    // Keep the displayed text in sync when value changes externally
    // (e.g. loan type change resets guarantor selections).
    if (!open) setQuery(selected ? label(selected) : "");
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(selected ? label(selected) : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected]);

  const filtered = employees
    .filter((e) => !excludeIds.includes(e.id))
    .filter((e) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        e.employeeCode.toLowerCase().includes(q) ||
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          className="input w-full pl-8 pr-8"
          style={{ border: hasError ? "1px solid #f87171" : undefined }}
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(""); // typing invalidates the prior selection until re-picked
            setOpen(true);
          }}
        />
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No matches</div>
          ) : (
            filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                onMouseDown={(ev) => {
                  ev.preventDefault(); // fires before the input's blur
                  onChange(e.id);
                  setQuery(label(e));
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 ${
                  e.id === value ? "bg-violet-50 dark:bg-violet-900/20" : ""
                }`}
              >
                <span className="font-mono text-xs text-gray-400 mr-2">
                  {e.employeeCode}
                </span>
                {e.firstName} {e.lastName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
