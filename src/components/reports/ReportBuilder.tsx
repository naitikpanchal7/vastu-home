// src/components/reports/ReportBuilder.tsx
// Full-screen report builder overlay — preview-first, per-page notes, PDF generation
"use client";

import { useState, useMemo, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useProjectStore } from "@/store/projectStore";
import { useReportStore } from "@/store/reportStore";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { calculateZoneAreas, calculateCutAnalysis } from "@/lib/vastu/geometry";
import { cn } from "@/lib/utils";
import type {
  Report,
  ReportFloorSelection,
  ReportPageType,
  ReportPreset,
  Floor,
} from "@/lib/types";
import {
  REPORT_PAGE_META,
  REPORT_PRESET_PAGES,
} from "@/lib/types";
import type { FloorPDFData, ReportDocumentData } from "./ReportDocument";
import { blobUrlToBase64, generateAndDownloadPDF, generatePDFDataUrl } from "./ReportDocument";
import { generateAllSnapshots } from "@/lib/vastu/canvasSnapshot";

// ── Status colors / helpers ────────────────────────────────────────────────────
const PAGE_GROUP_ORDER = ["Floor Plan", "Analysis", "Summary"];

function statusColor(s: "good" | "warning" | "critical") {
  return s === "good" ? "#2a7a3a" : s === "warning" ? "#b87820" : "#c03030";
}

// ── Build zone rows for a floor ───────────────────────────────────────────────
function buildZoneRows(floor: Floor) {
  const cs = floor.canvasState;
  const hasPerimeter = cs.perimeterPoints.length >= 3;
  if (!hasPerimeter) {
    return VASTU_ZONES.map((z) => ({
      zone: z, pct: 6.25, status: "good" as const, hasCut: false, cutPct: 0,
    }));
  }
  const results = calculateZoneAreas(
    cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg,
    VASTU_ZONES, cs.cuts, cs.scale?.pixelsPerUnit
  );
  return VASTU_ZONES.map((z) => {
    const r = results.find((res) => res.zoneName === z.shortName);
    const pct = r?.pctOfTotal ?? 0;
    const cutPct = r?.cutPctOfZone ?? 0;
    const status: "good" | "warning" | "critical" =
      pct >= 5 && pct <= 7.5 ? "good" : pct < 3 ? "critical" : "warning";
    return { zone: z, pct, status, hasCut: r?.hasCut ?? false, cutPct };
  });
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReportBuilderProps {
  open: boolean;
  onClose: () => void;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReportBuilder({ open, onClose }: ReportBuilderProps) {
  const canvasStore = useCanvasStore();
  const projectStore = useProjectStore();
  const reportStore = useReportStore();

  // Gather all floors with current floor's live state merged in
  const allFloors = useMemo(() => canvasStore.getProjectFloors(), [
    canvasStore,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    canvasStore.floors,
    canvasStore.perimeterPoints,
    canvasStore.cuts,
    canvasStore.northDeg,
  ]);

  const consultantName = "Rajesh Sharma"; // TODO: from profile store in Phase 2

  // ── Report state ────────────────────────────────────────────────────────────
  const defaultReportName = useMemo(() => {
    const d = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    return `${canvasStore.projectName} — ${d}`;
  }, [canvasStore.projectName]);

  const [reportName, setReportName] = useState(defaultReportName);
  const [preset, setPreset] = useState<ReportPreset>("consultant-standard");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Per-floor selection state: floorId → { enabled, pages, pageNotes }
  const [floorSelections, setFloorSelections] = useState<
    Record<string, { enabled: boolean; pages: ReportPageType[]; pageNotes: Partial<Record<ReportPageType, string>> }>
  >(() => {
    const initial: Record<string, { enabled: boolean; pages: ReportPageType[]; pageNotes: Partial<Record<ReportPageType, string>> }> = {};
    for (const floor of allFloors) {
      const hasCuts = floor.canvasState.cuts.length > 0;
      const hasPerimeter = floor.canvasState.perimeterPoints.length >= 3;
      const presetPages = REPORT_PRESET_PAGES["consultant-standard"].filter(
        (p) => !REPORT_PAGE_META[p].requiresCuts || hasCuts
      );
      initial[floor.id] = {
        enabled: hasPerimeter,
        pages: hasPerimeter ? presetPages : [],
        pageNotes: {},
      };
    }
    return initial;
  });

  // Active floor for the settings panel
  const [activeFloorId, setActiveFloorId] = useState<string>(allFloors[0]?.id ?? "");
  // Which page's notes are expanded in preview
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const applyPreset = useCallback((p: ReportPreset) => {
    setPreset(p);
    if (p === "custom") return;
    setFloorSelections((prev) => {
      const next = { ...prev };
      for (const floor of allFloors) {
        const hasCuts = floor.canvasState.cuts.length > 0;
        const hasPerimeter = floor.canvasState.perimeterPoints.length >= 3;
        if (!hasPerimeter) continue;
        const pages = REPORT_PRESET_PAGES[p].filter(
          (pg) => !REPORT_PAGE_META[pg].requiresCuts || hasCuts
        );
        next[floor.id] = { ...next[floor.id], pages };
      }
      return next;
    });
  }, [allFloors]);

  const toggleFloor = (floorId: string) => {
    setFloorSelections((prev) => ({
      ...prev,
      [floorId]: { ...prev[floorId], enabled: !prev[floorId]?.enabled },
    }));
    setPreset("custom");
  };

  const togglePage = (floorId: string, page: ReportPageType) => {
    setFloorSelections((prev) => {
      const sel = prev[floorId];
      if (!sel) return prev;
      const has = sel.pages.includes(page);
      return {
        ...prev,
        [floorId]: { ...sel, pages: has ? sel.pages.filter((p) => p !== page) : [...sel.pages, page] },
      };
    });
    setPreset("custom");
  };

  const setPageNote = (floorId: string, page: ReportPageType, note: string) => {
    setFloorSelections((prev) => ({
      ...prev,
      [floorId]: {
        ...prev[floorId],
        pageNotes: { ...prev[floorId]?.pageNotes, [page]: note },
      },
    }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const selectedFloors = allFloors.filter(
    (f) => floorSelections[f.id]?.enabled && (floorSelections[f.id]?.pages.length ?? 0) > 0
  );

  const validationError = useMemo(() => {
    if (!reportName.trim()) return "Report name is required.";
    if (selectedFloors.length === 0) return "Select at least one floor with at least one page enabled.";
    const incompleteFloor = selectedFloors.find((f) => f.canvasState.perimeterPoints.length < 3);
    if (incompleteFloor) return `${incompleteFloor.name} has no perimeter drawn. Draw a perimeter first.`;
    return null;
  }, [reportName, selectedFloors]);

  // ── Computed page list for preview ───────────────────────────────────────────
  const previewPages = useMemo(() => {
    const pages: Array<{ key: string; floorId: string; floorName: string; pageType: ReportPageType; pageNum: number }> = [];
    let num = 3; // 1=cover, 2=toc
    for (const floor of allFloors) {
      const sel = floorSelections[floor.id];
      if (!sel?.enabled) continue;
      for (const page of sel.pages) {
        pages.push({ key: `${floor.id}-${page}`, floorId: floor.id, floorName: floor.name, pageType: page, pageNum: num });
        num++;
      }
    }
    return pages;
  }, [allFloors, floorSelections]);

  const totalPageCount = previewPages.length + 2; // +2 for cover + TOC

  // ── PDF generation ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (validationError) return;
    setGenerating(true);
    setError(null);
    try {
      // Build floor PDF data — generate canvas snapshots for each floor
      const floorPDFDataArray: FloorPDFData[] = [];
      for (const floor of selectedFloors) {
        const cs = floor.canvasState;

        // Convert blob URL to base64 (needed for PDF image embedding)
        const imageBase64 = floor.floorPlanImage
          ? await blobUrlToBase64(floor.floorPlanImage)
          : null;

        // Generate all overlay snapshots (chakra-16, chakra-8, perimeter, cuts)
        // These run in parallel — each returns a PNG data URL
        const snapshots = await generateAllSnapshots(floor, imageBase64);

        const zoneAnalysis = cs.perimeterPoints.length >= 3
          ? calculateZoneAreas(cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg, VASTU_ZONES, cs.cuts, cs.scale?.pixelsPerUnit)
          : [];

        const zoneRows = buildZoneRows(floor);

        const cutAnalysis = cs.perimeterPoints.length >= 3 && cs.cuts.length > 0
          ? calculateCutAnalysis(cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg, VASTU_ZONES, cs.cuts)
          : [];

        const sel = floorSelections[floor.id];
        floorPDFDataArray.push({
          floorId: floor.id,
          floorName: floor.name,
          floorOrder: floor.order,
          floorPlanImageBase64: imageBase64,
          snapshots: {
            planOnly:          snapshots.planOnly,
            planBrahma:        snapshots.planBrahma,
            planChakra:        snapshots.planChakra,
            planPerimeter:     snapshots.planPerimeter,
            planCutsOnly:      snapshots.planCutsOnly,
            planPerimeterCuts: snapshots.planPerimeterCuts,
            planFull:          snapshots.planFull,
            zoneLines16:       snapshots.zoneLines16,
            zoneLines8:        snapshots.zoneLines8,
            panchabhuta:       snapshots.panchabhuta,
          },
          northDeg: cs.northDeg,
          zoneAnalysis,
          zoneRows,
          cutAnalysis,
          hasCuts: cs.cuts.length > 0,
          scaleUnit: cs.scale?.unit ?? "ft",
          selectedPages: sel?.pages ?? [],
          pageNotes: sel?.pageNotes ?? {},
        });
      }

      const projectId = canvasStore.projectId ?? `proj-local-${Date.now()}`;
      const project = projectStore.projects.find((p) => p.id === projectId);

      const docData: ReportDocumentData = {
        reportName: reportName.trim(),
        projectName: canvasStore.projectName,
        clientName: canvasStore.clientName,
        propertyAddress: project?.propertyAddress ?? "",
        consultantName,
        date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        northDeg: canvasStore.northDeg,
        floors: floorPDFDataArray,
      };

      // Generate and download
      const filename = `${reportName.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-")}.pdf`;
      await generateAndDownloadPDF(docData, filename);

      // Save report to store
      const pdfDataUrl = await generatePDFDataUrl(docData);
      const now = new Date().toISOString();
      const floorSelectionsArr: ReportFloorSelection[] = allFloors
        .filter((f) => floorSelections[f.id]?.enabled)
        .map((f) => ({
          floorId: f.id,
          floorName: f.name,
          floorOrder: f.order,
          enabled: true,
          pages: floorSelections[f.id]?.pages ?? [],
          pageNotes: floorSelections[f.id]?.pageNotes ?? {},
        }));

      const report: Report = {
        id: `report-${Date.now()}`,
        projectId,
        projectName: canvasStore.projectName,
        clientName: canvasStore.clientName,
        propertyAddress: project?.propertyAddress ?? "",
        northDeg: canvasStore.northDeg,
        reportName: reportName.trim(),
        preset,
        floorSelections: floorSelectionsArr,
        status: "downloaded",
        createdAt: now,
        updatedAt: now,
        pdfDataUrl,
      };
      reportStore.addReport(report);

    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const activeFloor = allFloors.find((f) => f.id === activeFloorId);
  const activeSel = floorSelections[activeFloorId];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" style={{ fontFamily: "var(--font-dm-sans)" }}>

      {/* ── Header bar ── */}
      <div className="h-[52px] bg-bg-2 border-b border-[rgba(100,70,20,0.25)] flex items-center px-5 gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-gold-2 text-[14px]">⎙</span>
          <div>
            <div className="text-[11px] text-vastu-text-3 uppercase tracking-[1.5px]">Report Builder</div>
            <input
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              placeholder="Report name…"
              className="font-serif text-[15px] font-medium text-vastu-text bg-transparent border-none outline-none w-[320px] truncate placeholder:text-vastu-text-3"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Preset selector */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-vastu-text-3 uppercase tracking-[1px]">Preset</span>
          <div className="flex gap-1">
            {(["consultant-standard", "quick-summary"] as const).map((p) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={cn(
                  "text-[9px] px-2 py-[3px] rounded-[4px] border font-sans cursor-pointer transition-all",
                  preset === p
                    ? "bg-[rgba(100,70,20,0.2)] border-gold text-gold-2"
                    : "bg-transparent border-[rgba(100,70,20,0.2)] text-vastu-text-3 hover:border-gold-3 hover:text-vastu-text-2"
                )}
              >
                {p === "consultant-standard" ? "Standard" : "Quick"}
              </button>
            ))}
            {preset === "custom" && (
              <span className="text-[9px] px-2 py-[3px] rounded-[4px] border border-[rgba(100,70,20,0.2)] text-vastu-text-3 font-sans">
                Custom
              </span>
            )}
          </div>
        </div>

        <div className="w-px h-4 bg-[rgba(100,70,20,0.2)]" />

        <div className="flex items-center gap-2">
          <span className="text-[9px] text-vastu-text-3">
            {totalPageCount} page{totalPageCount !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="w-px h-4 bg-[rgba(100,70,20,0.2)]" />

        <button
          onClick={onClose}
          className="text-[10px] px-3 py-[5px] rounded-md bg-transparent border border-[rgba(100,70,20,0.2)] text-vastu-text-2 hover:border-gold-3 hover:text-vastu-text cursor-pointer font-sans transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={handleGenerate}
          disabled={!!validationError || generating}
          className={cn(
            "text-[10px] px-4 py-[5px] rounded-md font-sans font-medium transition-all cursor-pointer",
            validationError || generating
              ? "bg-[rgba(100,70,20,0.15)] text-vastu-text-3 cursor-not-allowed border border-[rgba(100,70,20,0.1)]"
              : "bg-gold text-bg hover:bg-gold-2 border border-transparent"
          )}
          title={validationError ?? undefined}
        >
          {generating ? "⏳ Generating…" : "⎙ Generate PDF"}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── LEFT: Configuration panel ── */}
        <div className="w-[300px] flex-shrink-0 bg-bg-2 border-r border-[rgba(100,70,20,0.20)] flex flex-col overflow-hidden">

          {/* Floor tabs */}
          <div className="border-b border-[rgba(100,70,20,0.15)] flex overflow-x-auto flex-shrink-0">
            {allFloors.map((floor) => {
              const sel = floorSelections[floor.id];
              const hasPerimeter = floor.canvasState.perimeterPoints.length >= 3;
              const isActive = floor.id === activeFloorId;
              const enabledPages = sel?.pages.length ?? 0;
              return (
                <button
                  key={floor.id}
                  onClick={() => setActiveFloorId(floor.id)}
                  className={cn(
                    "flex items-center gap-[5px] px-3 py-[7px] text-[10px] font-mono flex-shrink-0 cursor-pointer border-b-2 transition-all",
                    isActive
                      ? "border-gold text-gold-2 bg-[rgba(100,70,20,0.08)]"
                      : "border-transparent text-vastu-text-3 hover:text-vastu-text-2 hover:bg-[rgba(100,70,20,0.05)]"
                  )}
                >
                  <span className={cn("w-[5px] h-[5px] rounded-full flex-shrink-0", sel?.enabled && hasPerimeter ? "bg-gold" : "bg-[rgba(100,70,20,0.3)]")} />
                  {floor.name}
                  {enabledPages > 0 && (
                    <span className="text-[7px] px-[4px] py-[1px] rounded-full bg-[rgba(100,70,20,0.2)] text-gold-3">{enabledPages}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Floor configuration */}
          <div className="flex-1 overflow-y-auto">
            {activeFloor && activeSel ? (
              <FloorConfigurator
                floor={activeFloor}
                selection={activeSel}
                onToggleFloor={() => toggleFloor(activeFloor.id)}
                onTogglePage={(page) => togglePage(activeFloor.id, page)}
              />
            ) : (
              <div className="p-4 text-[10px] text-vastu-text-3">No floors available.</div>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="px-4 py-3 border-t border-[rgba(100,70,20,0.15)] bg-[rgba(200,60,40,0.07)]">
              <p className="text-[9px] text-red-400 leading-relaxed">{validationError}</p>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 border-t border-[rgba(200,60,40,0.2)] bg-[rgba(200,60,40,0.07)]">
              <p className="text-[9px] text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Preview panel ── */}
        <div className="flex-1 bg-bg overflow-y-auto">
          <div className="px-6 py-4 max-w-[780px] mx-auto">
            <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1.5px] mb-4">
              Report Preview — {totalPageCount} page{totalPageCount !== 1 ? "s" : ""}
            </div>

            {/* Cover page card */}
            <PagePreviewCard
              pageNum={1}
              label="Cover Page"
              floorName=""
              color="gold"
            >
              <div className="flex flex-col gap-1">
                <div className="font-serif text-[13px] text-gold-2 truncate">{reportName || "Untitled Report"}</div>
                <div className="text-[9px] text-vastu-text-3">{canvasStore.projectName}</div>
                <div className="text-[9px] text-vastu-text-3">{canvasStore.clientName || "—"}</div>
                <div className="text-[8px] text-vastu-text-3 mt-1">
                  {totalPageCount} pages · N: {canvasStore.northDeg.toFixed(1)}°
                </div>
              </div>
            </PagePreviewCard>

            {/* Table of Contents card (always page 2) */}
            <PagePreviewCard
              pageNum={2}
              label="Table of Contents"
              floorName=""
              color="gold"
            >
              <div className="flex flex-col gap-1">
                <p className="text-[9px] text-vastu-text-3 leading-relaxed">Auto-generated — lists all selected pages with accurate page numbers.</p>
                <div className="text-[8px] text-vastu-text-3 mt-1">{previewPages.length} content pages listed</div>
              </div>
            </PagePreviewCard>

            {/* Per-page cards */}
            {previewPages.map(({ key, floorId, floorName, pageType, pageNum }) => {
              const floor = allFloors.find((f) => f.id === floorId);
              const sel = floorSelections[floorId];
              const noteKey = key;
              const noteExpanded = expandedNotes === noteKey;
              const currentNote = sel?.pageNotes[pageType] ?? "";
              const hasCuts = floor?.canvasState.cuts.length ? floor.canvasState.cuts.length > 0 : false;
              const meta = REPORT_PAGE_META[pageType];

              return (
                <PagePreviewCard
                  key={key}
                  pageNum={pageNum}
                  label={meta.label}
                  floorName={floorName}
                  color={meta.group === "Analysis" ? "blue" : "neutral"}
                >
                  <div className="flex flex-col gap-2">
                    <p className="text-[9px] text-vastu-text-3 leading-relaxed">{meta.description}</p>

                    {/* Inline mini-preview for analysis pages */}
                    {pageType === "16-zone" && floor && (
                      <MiniZonePreview floor={floor} />
                    )}
                    {(pageType === "bar-graph-16" || pageType === "bar-graph-8") && floor && (
                      <MiniBarPreview floor={floor} />
                    )}
                    {(pageType === "cut-analysis" || pageType === "plan-cuts-only") && (
                      <div className={cn("text-[8px] px-2 py-1 rounded-[3px]", hasCuts ? "bg-[rgba(200,60,40,0.1)] text-red-400" : "bg-[rgba(100,70,20,0.07)] text-vastu-text-3")}>
                        {hasCuts ? `${floor?.canvasState.cuts.length} cut${(floor?.canvasState.cuts.length ?? 0) > 1 ? "s" : ""} detected` : "No cuts — page will show empty state"}
                      </div>
                    )}

                    {/* Notes toggle */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() => setExpandedNotes(noteExpanded ? null : noteKey)}
                        className="text-[8px] text-vastu-text-3 hover:text-gold-2 cursor-pointer bg-transparent border-none flex items-center gap-1 transition-colors"
                      >
                        <span>{noteExpanded ? "▾" : "▸"}</span>
                        {currentNote ? "Edit notes" : "Add notes for this page"}
                      </button>
                      {currentNote && (
                        <span className="text-[7px] px-[5px] py-[1px] rounded-full bg-[rgba(100,70,20,0.15)] text-gold-3">
                          has notes
                        </span>
                      )}
                    </div>

                    {noteExpanded && (
                      <textarea
                        value={currentNote}
                        onChange={(e) => setPageNote(floorId, pageType, e.target.value)}
                        placeholder="Optional page footer notes…"
                        rows={2}
                        className="w-full px-2 py-[5px] bg-bg-4 border border-[rgba(100,70,20,0.15)] rounded-[4px] text-vastu-text-2 font-sans text-[10px] outline-none resize-none focus:border-gold-3 leading-relaxed"
                      />
                    )}
                  </div>
                </PagePreviewCard>
              );
            })}

            {previewPages.length === 0 && (
              <div className="text-center py-12 text-vastu-text-3 text-[11px]">
                Enable floors and select pages on the left to preview your report.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Floor configurator (left panel body) ──────────────────────────────────────
interface FloorConfiguratorProps {
  floor: Floor;
  selection: { enabled: boolean; pages: ReportPageType[]; pageNotes: Partial<Record<ReportPageType, string>> };
  onToggleFloor: () => void;
  onTogglePage: (page: ReportPageType) => void;
}

function FloorConfigurator({ floor, selection, onToggleFloor, onTogglePage }: FloorConfiguratorProps) {
  const hasPerimeter = floor.canvasState.perimeterPoints.length >= 3;
  const hasCuts = floor.canvasState.cuts.length > 0;
  const cs = floor.canvasState;

  // Zone rows for inline status
  const zoneRows = useMemo(() => buildZoneRows(floor), [floor]);
  const goodCount = zoneRows.filter((r) => r.status === "good").length;
  const critCount = zoneRows.filter((r) => r.status === "critical").length;

  const allPageTypes = Object.keys(REPORT_PAGE_META) as ReportPageType[];

  return (
    <div className="p-3">
      {/* Floor info */}
      <div className="bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-[6px] p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-vastu-text-2 font-medium">{floor.name}</span>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[8px] text-vastu-text-3">Include</span>
            <div
              onClick={onToggleFloor}
              className={cn(
                "w-7 h-4 rounded-full relative transition-colors cursor-pointer",
                selection.enabled ? "bg-gold" : "bg-[rgba(100,70,20,0.25)]"
              )}
            >
              <div className={cn(
                "w-3 h-3 bg-white rounded-full absolute top-[2px] transition-all",
                selection.enabled ? "left-[14px]" : "left-[2px]"
              )} />
            </div>
          </label>
        </div>
        {!hasPerimeter ? (
          <p className="text-[8px] text-vastu-text-3 italic">No perimeter drawn — draw perimeter to enable this floor.</p>
        ) : (
          <div className="flex gap-3 text-[8px] text-vastu-text-3">
            <span>N: <strong className="text-gold-2 font-mono">{cs.northDeg.toFixed(1)}°</strong></span>
            <span className="text-green-500">{goodCount} good</span>
            {critCount > 0 && <span className="text-red-400">{critCount} critical</span>}
            {hasCuts && <span className="text-amber-400">{cs.cuts.length} cuts</span>}
          </div>
        )}
      </div>

      {/* Page toggles */}
      {!hasPerimeter ? null : (
        <>
          {PAGE_GROUP_ORDER.map((group) => {
            const groupPages = allPageTypes.filter((p) => REPORT_PAGE_META[p].group === group);
            return (
              <div key={group} className="mb-4">
                <div className="text-[7px] text-vastu-text-3 uppercase tracking-[1.5px] mb-2 pb-1 border-b border-[rgba(100,70,20,0.12)]">
                  {group}
                </div>
                <div className="flex flex-col gap-[3px]">
                  {groupPages.map((page) => {
                    const meta = REPORT_PAGE_META[page];
                    const checked = selection.pages.includes(page);
                    const disabled = !selection.enabled || (meta.requiresCuts && !hasCuts);
                    return (
                      <label
                        key={page}
                        className={cn(
                          "flex items-start gap-2 px-2 py-[5px] rounded-[4px] cursor-pointer transition-colors",
                          disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-[rgba(100,70,20,0.06)]"
                        )}
                        title={meta.requiresCuts && !hasCuts ? "No cuts present — this page will be disabled" : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => !disabled && onTogglePage(page)}
                          className="mt-[2px] accent-gold cursor-pointer flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-[10px] text-vastu-text-2 leading-tight">
                            {meta.label}
                            {meta.requiresCuts && !hasCuts && (
                              <span className="ml-1 text-[7px] text-vastu-text-3">(no cuts)</span>
                            )}
                          </div>
                          <div className="text-[8px] text-vastu-text-3 leading-snug mt-[1px]">{meta.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Quick select all / none */}
          <div className="flex gap-2 mt-1 pt-3 border-t border-[rgba(100,70,20,0.12)]">
            <button
              onClick={() => {
                const available = (Object.keys(REPORT_PAGE_META) as ReportPageType[]).filter(
                  (p) => !REPORT_PAGE_META[p]?.requiresCuts || hasCuts
                );
                available.forEach((p) => { if (!selection.pages.includes(p)) onTogglePage(p); });
              }}
              className="text-[8px] text-vastu-text-3 hover:text-gold-2 cursor-pointer bg-transparent border-none transition-colors"
            >
              Select all
            </button>
            <span className="text-vastu-text-3 text-[8px]">·</span>
            <button
              onClick={() => { selection.pages.forEach((p) => onTogglePage(p)); }}
              className="text-[8px] text-vastu-text-3 hover:text-gold-2 cursor-pointer bg-transparent border-none transition-colors"
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page preview card ─────────────────────────────────────────────────────────
function PagePreviewCard({
  pageNum, label, floorName, color = "neutral", children,
}: {
  pageNum: number;
  label: string;
  floorName: string;
  color?: "gold" | "blue" | "neutral";
  children: React.ReactNode;
}) {
  const accent = color === "gold" ? "#c8af78" : color === "blue" ? "#4a90c4" : "#706050";
  return (
    <div className="bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-[7px] p-4 mb-3 flex gap-4">
      {/* Page number */}
      <div
        className="w-[30px] h-[30px] rounded-[5px] flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0"
        style={{ background: accent + "22", color: accent, border: `1px solid ${accent}44` }}
      >
        {pageNum}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-vastu-text font-medium">{label}</span>
          {floorName && (
            <span className="text-[8px] px-2 py-[1px] rounded-full bg-[rgba(100,70,20,0.12)] text-vastu-text-3">{floorName}</span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Mini zone preview (for 16-zone card) ─────────────────────────────────────
function MiniZonePreview({ floor }: { floor: Floor }) {
  const rows = useMemo(() => buildZoneRows(floor), [floor]);
  const maxPct = Math.max(...rows.map((r) => r.pct), 10);
  return (
    <div className="flex items-end gap-[2px] h-[28px] mt-1">
      {rows.map(({ zone, pct, status }) => (
        <div
          key={zone.shortName}
          className="flex-1 rounded-t-[1px] min-w-0 transition-all"
          style={{
            height: `${Math.max((pct / maxPct) * 100, 4)}%`,
            background: status === "good" ? zone.color : status === "warning" ? "#c8a028" : "#c04040",
            opacity: 0.75,
          }}
        />
      ))}
    </div>
  );
}

// ── Mini bar preview (for bar-graph card) ────────────────────────────────────
function MiniBarPreview({ floor }: { floor: Floor }) {
  const rows = useMemo(() => buildZoneRows(floor), [floor]);
  const good = rows.filter((r) => r.status === "good").length;
  const warn = rows.filter((r) => r.status === "warning").length;
  const crit = rows.filter((r) => r.status === "critical").length;
  return (
    <div className="flex items-center gap-3 text-[8px] mt-1">
      <span className="text-green-500">{good} good</span>
      <span className="text-amber-400">{warn} warning</span>
      {crit > 0 && <span className="text-red-400">{crit} critical</span>}
      <span className="text-vastu-text-3">· ideal 6.25% per zone</span>
    </div>
  );
}
