"use client";
import { useEffect, useState, useRef } from "react";
import api from "@/lib/axios";

export interface PayrollRun { id: string; periodLabel: string; status: string; }

export function usePayrollRuns() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const init = useRef(false);
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    api.get("/payroll-runs").then(r => setRuns(r.data ?? [])).catch(() => {});
  }, []);
  return runs;
}
