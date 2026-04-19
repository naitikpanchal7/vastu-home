// src/app/reports/page.tsx — Report history list
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useReportStore } from "@/store/reportStore";
import { useCanvasStore } from "@/store/canvasStore";
import ReportBuilder from "@/components/reports/ReportBuilder";
import type { Report, ReportStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<ReportStatus, { bg: string; text: string; label: string }> = {
  draft:      { bg: "rgba(100,70,20,0.15)",  text: "#a08050",  label: "Draft" },
  generating: { bg: "rgba(74,144,226,0.15)", text: "#4a90e2",  label: "Generating" },
  generated:  { bg: "rgba(42,122,58,0.15)",  text: "#2a7a3a",  label: "Ready" },
  downloaded: { bg: "rgba(42,122,58,0.15)",  text: "#2a7a3a",  label: "Downloaded" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function ReportsPage() {
  const router = useRouter();
  const reportStore = useReportStore();
  const canvasStore = useCanvasStore();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reportStore.reports
      .filter((r) => {
        const q = search.toLowerCase();
        return (
          (statusFilter === "all" || r.status === statusFilter) &&
          (r.reportName.toLowerCase().includes(q) ||
           r.projectName.toLowerCase().includes(q) ||
           r.clientName.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reportStore.reports, search, statusFilter]);

  const handleDownload = (report: Report) => {
    if (!report.pdfDataUrl) return;
    const a = document.createElement("a");
    a.href = report.pdfDataUrl;
    a.download = `${report.reportName.replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-")}.pdf`;
    a.click();
    reportStore.updateReport(report.id, { status: "downloaded" });
  };

  const handleDelete = (id: string) => {
    reportStore.deleteReport(id);
    setDeleteConfirm(null);
  };

  // Count by status
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reportStore.reports.length };
    for (const r of reportStore.reports) {
      c[r.status] = (c[r.status] ?? 0) + 1;
    }
    return c;
  }, [reportStore.reports]);

  const totalPages = (r: Report) =>
    1 + r.floorSelections.reduce((sum, f) => sum + (f.enabled ? f.pages.length : 0), 0);

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden min-h-0">
        {/* Page header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-[rgba(100,70,20,0.15)] flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1.5px] mb-1">Account</div>
            <h1 className="font-serif text-[22px] font-semibold text-gold-2">Reports</h1>
            <p className="text-[10px] text-vastu-text-3 mt-[2px]">
              Download and manage all generated Vastu analysis reports.
            </p>
          </div>
          <button
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-2 text-[11px] px-4 py-[7px] bg-gold text-bg rounded-md font-sans font-medium hover:bg-gold-2 transition-colors cursor-pointer"
          >
            <span>⎙</span>
            New Report
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-[rgba(100,70,20,0.10)] flex-shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports, projects, clients…"
            className="px-3 py-[5px] bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-md text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3 w-[240px]"
          />
          <div className="flex items-center gap-1">
            {(["all", "generated", "downloaded", "draft"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "text-[9px] px-[9px] py-[4px] rounded-full font-sans transition-all cursor-pointer border",
                  statusFilter === s
                    ? "bg-[rgba(100,70,20,0.18)] border-gold text-gold-2"
                    : "bg-transparent border-[rgba(100,70,20,0.15)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2"
                )}
              >
                {s === "all" ? "All" : STATUS_STYLES[s as ReportStatus].label}
                {counts[s] !== undefined && (
                  <span className="ml-1 opacity-70">({counts[s]})</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <span className="text-[9px] text-vastu-text-3 font-mono">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Report list */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
              <div className="text-[36px] opacity-20">⎙</div>
              <div>
                <p className="text-[13px] text-vastu-text-2 font-medium mb-1">No reports yet</p>
                <p className="text-[10px] text-vastu-text-3">
                  {search || statusFilter !== "all"
                    ? "No reports match your filter."
                    : "Create your first report from the Canvas Export button or click New Report above."}
                </p>
              </div>
              <button
                onClick={() => setBuilderOpen(true)}
                className="text-[10px] px-4 py-[6px] bg-gold text-bg rounded-md font-sans hover:bg-gold-2 transition-colors cursor-pointer"
              >
                ⎙ New Report
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((report) => {
                const ss = STATUS_STYLES[report.status];
                const pages = totalPages(report);
                const floors = report.floorSelections.filter((f) => f.enabled);
                const isDeleting = deleteConfirm === report.id;
                return (
                  <div
                    key={report.id}
                    className="bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-[7px] px-4 py-3 flex items-center gap-4 hover:border-[rgba(100,70,20,0.3)] transition-colors"
                  >
                    {/* Icon */}
                    <div className="w-[34px] h-[34px] bg-[rgba(100,70,20,0.12)] rounded-[6px] flex items-center justify-center text-[14px] flex-shrink-0 text-gold-3">
                      ⎙
                    </div>

                    {/* Report info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-[2px]">
                        <span className="text-[12px] text-vastu-text font-medium truncate">{report.reportName}</span>
                        <span
                          className="text-[7px] px-[6px] py-[2px] rounded-full font-medium uppercase flex-shrink-0"
                          style={{ background: ss.bg, color: ss.text }}
                        >
                          {ss.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] text-vastu-text-3">
                        <span>{report.projectName}</span>
                        {report.clientName && <><span>·</span><span>{report.clientName}</span></>}
                        <span>·</span>
                        <span className="font-mono">{pages} page{pages !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>{floors.length} floor{floors.length !== 1 ? "s" : ""}</span>
                        <span>·</span>
                        <span>N: {report.northDeg.toFixed(1)}°</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="text-[9px] text-vastu-text-3 text-right flex-shrink-0 min-w-[70px]">
                      {formatDate(report.createdAt)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {report.pdfDataUrl && (
                        <button
                          onClick={() => handleDownload(report)}
                          className="text-[9px] px-3 py-[4px] bg-gold text-bg rounded-md font-sans hover:bg-gold-2 transition-colors cursor-pointer"
                        >
                          ↓ Download
                        </button>
                      )}
                      <button
                        onClick={() => setBuilderOpen(true)}
                        title="Create variant of this report"
                        className="text-[9px] px-2 py-[4px] bg-transparent border border-[rgba(100,70,20,0.2)] text-vastu-text-3 rounded-md hover:border-gold-3 hover:text-vastu-text-2 cursor-pointer font-sans transition-colors"
                      >
                        ⎙ Variant
                      </button>
                      {isDeleting ? (
                        <>
                          <button
                            onClick={() => handleDelete(report.id)}
                            className="text-[9px] px-2 py-[4px] bg-[rgba(200,60,40,0.15)] border border-[rgba(200,60,40,0.3)] text-red-400 rounded-md cursor-pointer font-sans hover:bg-[rgba(200,60,40,0.25)] transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-[9px] px-2 py-[4px] bg-transparent border border-[rgba(100,70,20,0.15)] text-vastu-text-3 rounded-md cursor-pointer font-sans"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(report.id)}
                          className="text-[10px] text-vastu-text-3 hover:text-red-400 cursor-pointer bg-transparent border-none transition-colors px-1"
                          title="Delete report"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Report Builder overlay */}
      <ReportBuilder open={builderOpen} onClose={() => setBuilderOpen(false)} />
    </AppShell>
  );
}
