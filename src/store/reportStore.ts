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
          set((s) => {
            // Skip if a report with this ID already exists (prevents duplicates from
            // concurrent fetches, React StrictMode double-invocation, or re-navigation).
            if (s.reports.some((r) => r.id === report.id)) return s;
            return { reports: [...s.reports, report] };
          }),

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
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          // Deduplicate any reports that were double-written in a previous session
          // before the addReport idempotency guard was in place.
          const seen = new Set<string>();
          state.reports = state.reports.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
        },
      }
    ),
    { name: "vastu-reports-store" }
  )
);
