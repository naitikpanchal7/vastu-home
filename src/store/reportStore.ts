// src/store/reportStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Report } from "@/lib/types";

interface ReportStore {
  reports: Report[];
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  deleteReport: (id: string) => void;
  getReportsByProject: (projectId: string) => Report[];
}

export const useReportStore = create<ReportStore>()(
  devtools(
    persist(
      (set, get) => ({
        reports: [],

        addReport: (report) =>
          set((s) => ({ reports: [...s.reports, report] })),

        updateReport: (id, updates) =>
          set((s) => ({
            reports: s.reports.map((r) =>
              r.id === id
                ? { ...r, ...updates, updatedAt: new Date().toISOString() }
                : r
            ),
          })),

        deleteReport: (id) =>
          set((s) => ({ reports: s.reports.filter((r) => r.id !== id) })),

        getReportsByProject: (projectId) =>
          get().reports.filter((r) => r.projectId === projectId),
      }),
      {
        name: "vastu-reports-store",
        partialize: (state) => ({
          reports: state.reports.map(({ pdfDataUrl, attachments, ...report }) => ({
            ...report,
            attachments: attachments?.map(({ dataUrl, ...attachment }) => attachment),
          })),
        }),
      }
    ),
    { name: "vastu-reports-store" }
  )
);
