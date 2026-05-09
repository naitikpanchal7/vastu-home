// src/components/reports/ReportBuilder.tsx
// Full-screen report builder overlay — preview-first, per-page notes, PDF generation
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { useCanvasStore } from "@/store/canvasStore";
import { useProjectStore } from "@/store/projectStore";
import { useReportStore } from "@/store/reportStore";
import { useUser } from "@/hooks/useUser";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { calculateZoneAreas, calculateCutAnalysis } from "@/lib/vastu/geometry";
import { cn } from "@/lib/utils";
import type {
  Report,
  ReportAttachment,
  ReportFloorSelection,
  ReportPageType,
  ReportPreset,
  ReportSupplementaryPosition,
  Floor,
} from "@/lib/types";
import {
  REPORT_PAGE_META,
  REPORT_PRESET_PAGES,
} from "@/lib/types";
import type { FloorPDFData, ReportDocumentData } from "./ReportDocument";
import { blobUrlToBase64, generateAndDownloadPDF, generatePDFDataUrl } from "./ReportDocument";
import { generateAllSnapshots } from "@/lib/vastu/canvasSnapshot";
import type { FloorSnapshots } from "@/lib/vastu/canvasSnapshot";

// ── Status colors / helpers ────────────────────────────────────────────────────
const PAGE_GROUP_ORDER = ["Floor Plan", "Analysis", "Summary"];

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

function makeDefaultSelection(floor: Floor) {
  const hasCuts = (floor.canvasState?.cuts?.length ?? 0) > 0;
  const hasPerimeter = (floor.canvasState?.perimeterPoints?.length ?? 0) >= 3;
  const presetPages = REPORT_PRESET_PAGES["consultant-standard"].filter(
    (p) => !REPORT_PAGE_META[p].requiresCuts || hasCuts
  );

  return {
    enabled: hasPerimeter,
    pages: hasPerimeter ? presetPages : [],
    pageNotes: {},
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function isSummaryPage(page: ReportPageType): boolean {
  return page === "ai-summary" || page === "consultant-summary";
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReportBuilderProps {
  open: boolean;
  onClose: () => void;
  /** Pre-populate builder from a previously saved draft report */
  initialReport?: Report;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ReportBuilder({ open, onClose, initialReport }: ReportBuilderProps) {
  const canvasStore = useCanvasStore();
  const projectStore = useProjectStore();
  const reportStore = useReportStore();
  const { user, profile } = useUser();

  // Gather all floors with current floor's live state merged in
  const allFloors = useMemo(() => canvasStore.getProjectFloors(), [
    canvasStore,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    canvasStore.floors,
    canvasStore.perimeterPoints,
    canvasStore.cuts,
    canvasStore.northDeg,
  ]);

  const initialReportFloorId = initialReport?.floorSelections.find((floorSelection) => floorSelection.enabled)?.floorId;
  const initialActiveFloorId = initialReportFloorId ?? canvasStore.currentFloorId ?? allFloors[0]?.id ?? "";
  const initialActiveFloor = allFloors.find((floor) => floor.id === initialActiveFloorId) ?? allFloors[0];

  const consultantName = profile?.full_name || profile?.email || "Consultant";

  // Stable ID for this report — generated once per open so attachments uploaded
  // before PDF generation share the same storage prefix as the final PDF.
  const [reportId, setReportId] = useState<string>(() => initialReport?.id ?? crypto.randomUUID());

  // ── Report state ────────────────────────────────────────────────────────────
  const defaultReportName = useMemo(() => {
    if (initialReport) return initialReport.reportName;
    const d = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const floorLabel = initialActiveFloor?.name ?? "Floor";
    return `${canvasStore.projectName} — ${floorLabel} — ${d}`;
  }, [canvasStore.projectName, initialReport, initialActiveFloor]);

  const [reportName, setReportName] = useState(defaultReportName);
  const [isNameCustomized, setIsNameCustomized] = useState(!!initialReport);
  const [preset, setPreset] = useState<ReportPreset>(initialReport?.preset ?? "consultant-standard");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorAttachments, setFloorAttachments] = useState<Record<string, ReportAttachment[]>>(() => {
    const initial: Record<string, ReportAttachment[]> = {};
    for (const floor of allFloors) {
      const savedSel = initialReport?.floorSelections.find((s) => s.floorId === floor.id);
      initial[floor.id] = savedSel?.attachments ?? [];
    }
    return initial;
  });
  const [attachmentPosition, setAttachmentPosition] = useState<ReportSupplementaryPosition>("after-intro");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Per-floor selection state: floorId → { enabled, pages, pageNotes }
  const [floorSelections, setFloorSelections] = useState<
    Record<string, { enabled: boolean; pages: ReportPageType[]; pageNotes: Partial<Record<ReportPageType, string>> }>
  >(() => {
    const initial: Record<string, { enabled: boolean; pages: ReportPageType[]; pageNotes: Partial<Record<ReportPageType, string>> }> = {};
    for (const floor of allFloors) {
      // Restore from initialReport if available
      const savedSel = initialReport?.floorSelections.find((s) => s.floorId === floor.id);
      if (savedSel) {
        initial[floor.id] = {
          enabled: savedSel.enabled,
          pages: savedSel.pages,
          pageNotes: savedSel.pageNotes,
        };
        continue;
      }
      initial[floor.id] = makeDefaultSelection(floor);
    }
    return initial;
  });

  useEffect(() => {
    setFloorAttachments((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const floor of allFloors) {
        if (!next[floor.id]) { next[floor.id] = []; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [allFloors]);

  useEffect(() => {
    setFloorSelections((prev) => {
      let changed = false;
      const next = { ...prev };

      for (const floor of allFloors) {
        const existing = next[floor.id];
        if (!existing) {
          next[floor.id] = makeDefaultSelection(floor);
          changed = true;
          continue;
        }

        if (!Array.isArray(existing.pages)) {
          next[floor.id] = {
            ...existing,
            pages: [],
            pageNotes: existing.pageNotes ?? {},
          };
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [allFloors]);

  useEffect(() => {
    if (!open) return;
    setReportId(initialReport?.id ?? crypto.randomUUID());
    if (initialReport) {
      setReportName(initialReport.reportName);
      setIsNameCustomized(true);
    } else {
      const restoredId = canvasStore.currentFloorId ?? allFloors[0]?.id ?? "";
      const floor = allFloors.find((f) => f.id === restoredId) ?? allFloors[0];
      const d = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      setReportName(`${canvasStore.projectName} — ${floor?.name ?? "Floor"} — ${d}`);
      setIsNameCustomized(false);
    }
    setPreset(initialReport?.preset ?? "consultant-standard");
    const restoredFloorId = initialReportFloorId ?? canvasStore.currentFloorId ?? allFloors[0]?.id ?? "";
    setFloorAttachments(() => {
      const next: Record<string, ReportAttachment[]> = {};
      for (const floor of allFloors) {
        const savedSel = initialReport?.floorSelections.find((s) => s.floorId === floor.id);
        next[floor.id] = savedSel?.attachments ?? [];
      }
      return next;
    });
    setActiveFloorId(restoredFloorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialReport, canvasStore.currentFloorId, canvasStore.projectName]);

  // Keep new reports in sync with whichever floor is active on canvas.
  // If floors are added/removed, recover to the current canvas floor or first available.
  useEffect(() => {
    if (!open) return;
    if (initialReport) return;

    setActiveFloorId((prev) => {
      const preferred = canvasStore.currentFloorId;
      if (preferred && allFloors.some((floor) => floor.id === preferred)) return preferred;
      if (prev && allFloors.some((floor) => floor.id === prev)) return prev;
      return allFloors[0]?.id ?? "";
    });
  }, [open, initialReport, canvasStore.currentFloorId, allFloors]);

  // Active floor for the settings panel and report scope
  const [activeFloorId, setActiveFloorId] = useState<string>(initialActiveFloorId);
  // Which page's notes are expanded in preview
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"visual" | "list">("visual");

  const activeFloor = useMemo(
    () => allFloors.find((floor) => floor.id === activeFloorId) ?? allFloors[0] ?? null,
    [allFloors, activeFloorId]
  );
  const activeSelection = activeFloor ? floorSelections[activeFloor.id] : undefined;

  // Auto-update report name when floor changes, unless user has customized it
  useEffect(() => {
    if (!open || isNameCustomized || !activeFloor) return;
    const d = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    setReportName(`${canvasStore.projectName} — ${activeFloor.name} — ${d}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFloor?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const applyPreset = useCallback((p: ReportPreset) => {
    setPreset(p);
    if (p === "custom") return;
    if (!activeFloor) return;
    setFloorSelections((prev) => {
      const next = { ...prev };
      const hasCuts = activeFloor.canvasState.cuts.length > 0;
      const hasPerimeter = activeFloor.canvasState.perimeterPoints.length >= 3;
      if (!hasPerimeter) return next;
      const pages = REPORT_PRESET_PAGES[p].filter(
        (pg) => !REPORT_PAGE_META[pg].requiresCuts || hasCuts
      );
      next[activeFloor.id] = { ...next[activeFloor.id], enabled: true, pages };
      return next;
    });
  }, [activeFloor]);

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

  const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif",
  ]);
  const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB per image

  const handleAttachmentUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0 || !activeFloorId) return;

    const rejected: string[] = [];
    const accepted = Array.from(files).filter((file) => {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        rejected.push(`${file.name} — only JPEG, PNG, WEBP, GIF or HEIC images are allowed`);
        return false;
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        rejected.push(`${file.name} — exceeds 10 MB limit`);
        return false;
      }
      return true;
    });
    if (rejected.length > 0) {
      setError(rejected.join("\n"));
      if (accepted.length === 0) return;
    }

    const supabase = createSupabaseClient();
    const nextAttachments = await Promise.all(
      accepted.map(async (file) => {
        const attachmentId = `attachment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const dataUrl = await readFileAsDataUrl(file);
        let storagePath: string | undefined;

        // Upload to Supabase Storage if the user is authenticated
        if (user?.id) {
          const ext = file.name.split(".").pop() ?? "bin";
          const path = `${user.id}/${reportId}/${attachmentId}.${ext}`;
          // Convert dataUrl to blob for upload
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const { error } = await supabase.storage
            .from("report-attachments")
            .upload(path, blob, { contentType: file.type || "application/octet-stream", upsert: true });
          if (!error) storagePath = path;
        }

        return {
          id: attachmentId,
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          position: attachmentPosition,
          dataUrl,
          storagePath,
        };
      })
    );
    setFloorAttachments((prev) => ({
      ...prev,
      [activeFloorId]: [...(prev[activeFloorId] ?? []), ...nextAttachments],
    }));
  }, [attachmentPosition, activeFloorId, user?.id, reportId]);

  const removeAttachment = (id: string) => {
    if (!activeFloorId) return;
    setFloorAttachments((prev) => ({
      ...prev,
      [activeFloorId]: (prev[activeFloorId] ?? []).filter((a) => a.id !== id),
    }));
  };

  // Active floor's supplementary attachments (fresh per floor)
  const attachments = activeFloorId ? (floorAttachments[activeFloorId] ?? []) : [];

  // ── Validation ───────────────────────────────────────────────────────────────
  const activePages = Array.isArray(activeSelection?.pages) ? activeSelection.pages : [];
  const selectedFloors = activeFloor && activeSelection?.enabled && activePages.length > 0 ? [activeFloor] : [];

  const reportPagePlan = useMemo(() => {
    const pages: Array<
      | { kind: "attachment"; id: string; name: string; position: ReportSupplementaryPosition; pageNum: number }
      | { kind: "floor"; id: string; pageType: ReportPageType; label: string; pageNum: number }
    > = [];
    let pageNum = 3; // 1=cover, 2=toc

    const topAttachments = attachments.filter((attachment) => attachment.position === "after-intro");
    const bottomAttachments = attachments.filter((attachment) => attachment.position === "before-summary");
    const contentPages = activePages.filter((page) => !isSummaryPage(page));
    const summaryPages = activePages.filter((page) => isSummaryPage(page));

    for (const attachment of topAttachments) {
      pages.push({ kind: "attachment", id: attachment.id, name: attachment.name, position: attachment.position, pageNum });
      pageNum++;
    }

    if (activeFloor) {
      for (const pageType of contentPages) {
        pages.push({ kind: "floor", id: `${activeFloor.id}-${pageType}`, pageType, label: REPORT_PAGE_META[pageType].label, pageNum });
        pageNum++;
      }
    }

    for (const attachment of bottomAttachments) {
      pages.push({ kind: "attachment", id: attachment.id, name: attachment.name, position: attachment.position, pageNum });
      pageNum++;
    }

    if (activeFloor) {
      for (const pageType of summaryPages) {
        pages.push({ kind: "floor", id: `${activeFloor.id}-${pageType}`, pageType, label: REPORT_PAGE_META[pageType].label, pageNum });
        pageNum++;
      }
    }

    return pages;
  }, [attachments, activeFloor, activePages]);

  const validationError = useMemo(() => {
    if (!reportName.trim()) return "Report name is required.";
    if (selectedFloors.length === 0) return "Select at least one floor with at least one page enabled.";
    const incompleteFloor = selectedFloors.find((f) => f.canvasState.perimeterPoints.length < 3);
    if (incompleteFloor) return `${incompleteFloor.name} has no perimeter drawn. Draw a perimeter first.`;
    return null;
  }, [reportName, selectedFloors]);

  // ── Computed page list for preview ───────────────────────────────────────────
  const totalPageCount = reportPagePlan.length + 2; // +2 for cover + TOC

  // ── PDF generation ──────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (validationError) return;
    setGenerating(true);
    setError(null);
    try {
      if (selectedFloors.length === 0) {
        throw new Error("No floors selected for report generation.");
      }

      // Build floor PDF data — loop through all enabled floors
      const floorPDFDataArray: FloorPDFData[] = [];
      for (const floor of selectedFloors) {
        const cs = floor.canvasState;
        const floorSel = floorSelections[floor.id];

        // Convert blob URL to base64 (needed for PDF image embedding)
        const imageBase64 = floor.floorPlanImage
          ? await blobUrlToBase64(floor.floorPlanImage)
          : null;

        // Generate all overlay snapshots — bail after 30 s so the button never freezes forever
        const snapshots = await Promise.race([
          generateAllSnapshots(floor, imageBase64),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Snapshot timed out for ${floor.name}. Please try again.`)), 30_000)
          ),
        ]);

        const zoneAnalysis = cs.perimeterPoints.length >= 3
          ? calculateZoneAreas(cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg, VASTU_ZONES, cs.cuts, cs.scale?.pixelsPerUnit)
          : [];

        const zoneRows = buildZoneRows(floor);

        const cutAnalysis = cs.perimeterPoints.length >= 3 && cs.cuts.length > 0
          ? calculateCutAnalysis(cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg, VASTU_ZONES, cs.cuts)
          : [];

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
          selectedPages: floorSel?.pages ?? [],
          pageNotes: floorSel?.pageNotes ?? {},
          consultantSummary: floor.consultantSummary ?? "",
          consultantActions: floor.consultantActions ?? "",
        });
      }

      const projectId = canvasStore.projectId ?? `proj-local-${Date.now()}`;
      const project = projectStore.projects.find((p) => p.id === projectId);

      // logo_url is stored as a base64 data URL — pass directly, no fetch needed
      const consultantLogoBase64 = profile?.logo_url ?? null;

      const docData: ReportDocumentData = {
        reportName: reportName.trim(),
        projectName: canvasStore.projectName,
        clientName: canvasStore.clientName,
        propertyAddress: project?.propertyAddress ?? "",
        consultantName,
        consultantLogoBase64,
        date: new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        northDeg: canvasStore.northDeg,
        floors: floorPDFDataArray,
        totalProjectFloors: allFloors.length,
        attachments: selectedFloors.flatMap((f) => floorAttachments[f.id] ?? []),
      };

      // Generate PDF data URL (used for immediate download + storage upload)
      const pdfDataUrl = await generatePDFDataUrl(docData);

      // Trigger browser download immediately
      const filename = `${reportName.trim().replace(/[^a-z0-9\-_ ]/gi, "").replace(/\s+/g, "-")}.pdf`;
      await generateAndDownloadPDF(docData, filename);

      // Upload PDF to Supabase Storage so it can be re-downloaded later without the builder
      let pdfStoragePath: string | undefined;
      if (user?.id) {
        const supabase = createSupabaseClient();
        const path = `${user.id}/${reportId}.pdf`;
        const pdfBlob = await fetch(pdfDataUrl).then((r) => r.blob());
        const { error: uploadErr } = await supabase.storage
          .from("report-exports")
          .upload(path, pdfBlob, { contentType: "application/pdf", upsert: true });
        if (!uploadErr) pdfStoragePath = path;
        else console.warn("PDF storage upload failed:", uploadErr);
      }

      const now = new Date().toISOString();
      const floorSelectionsArr: ReportFloorSelection[] = selectedFloors
        .map((f) => ({
          floorId: f.id,
          floorName: f.name,
          floorOrder: f.order,
          enabled: true,
          pages: floorSelections[f.id]?.pages ?? [],
          pageNotes: floorSelections[f.id]?.pageNotes ?? {},
          attachments: floorAttachments[f.id] ?? [],
        }));

      const report: Report = {
        id: reportId,
        projectId,
        projectName: canvasStore.projectName,
        clientName: canvasStore.clientName,
        propertyAddress: project?.propertyAddress ?? "",
        northDeg: canvasStore.northDeg,
        reportName: reportName.trim(),
        preset,
        floorSelections: floorSelectionsArr,
        status: "downloaded",
        createdAt: initialReport?.createdAt ?? now,
        updatedAt: now,
        pdfDataUrl,
        pdfStoragePath,
      };
      if (initialReport) {
        reportStore.updateReport(initialReport.id, report);
      } else {
        reportStore.addReport(report);
      }

      // Persist to DB if real project
      if (projectId && !projectId.startsWith("proj-")) {
        const isNew = !initialReport;
        try {
          const res = await fetch(isNew ? "/api/reports" : `/api/reports/${report.id}`, {
            method: isNew ? "POST" : "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id:              report.id,
              projectId:       report.projectId,
              reportName:      report.reportName,
              preset:          report.preset,
              floorSelections: report.floorSelections,
              status:          "downloaded",
              pdfStoragePath:  report.pdfStoragePath,
            }),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.warn("Report DB save failed:", body);
            setError("Report downloaded. Could not save to database — it will be available locally only.");
          }
        } catch (networkErr) {
          console.warn("Report DB save network error:", networkErr);
          setError("Report downloaded. Server unreachable — saved locally only.");
        }
      }

      onClose();

    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  const activeSel = activeFloor ? floorSelections[activeFloor.id] : undefined;

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
              onChange={(e) => { setReportName(e.target.value); setIsNameCustomized(true); }}
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

        {/* Generate & Download PDF */}
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
          {generating ? "⏳ Generating…" : "⎙ Generate & Download"}
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
                  onClick={() => {
                    setActiveFloorId(floor.id);
                    if (floor.canvasState.perimeterPoints.length >= 3 && !floorSelections[floor.id]?.enabled) {
                      toggleFloor(floor.id);
                    }
                  }}
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

            {/* Header: title + visual/list toggle */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-[8px] text-vastu-text-3 uppercase tracking-[1.5px]">
                Report Preview — {activeFloor ? activeFloor.name : "No floor"} — {totalPageCount} page{totalPageCount !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-[2px] bg-bg-3 rounded-[5px] p-[3px] border border-[rgba(100,70,20,0.15)]">
                {(["visual", "list"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPreviewMode(mode)}
                    className={cn(
                      "text-[8px] px-[10px] py-[3px] rounded-[3px] transition-all cursor-pointer font-sans",
                      previewMode === mode
                        ? "bg-[rgba(100,70,20,0.2)] text-gold-2"
                        : "text-vastu-text-3 hover:text-vastu-text-2"
                    )}
                  >
                    {mode === "visual" ? "⊡ Visual" : "≡ List"}
                  </button>
                ))}
              </div>
            </div>

            {/* Supplementary pages — shown in both modes */}
            <div className="bg-bg-3 border border-[rgba(100,70,20,0.15)] rounded-[8px] p-4 mb-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[10px] text-vastu-text font-medium">Supplementary Pages</div>
                  <div className="text-[8px] text-vastu-text-3">Insert consultant files after the intro or before the summary pages.</div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={attachmentPosition}
                    onChange={(e) => setAttachmentPosition(e.target.value as ReportSupplementaryPosition)}
                    className="px-2 py-[5px] bg-bg-4 border border-[rgba(100,70,20,0.15)] rounded-md text-vastu-text-2 font-sans text-[10px] outline-none"
                  >
                    <option value="after-intro">After intro</option>
                    <option value="before-summary">Before summary</option>
                  </select>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] px-3 py-[5px] bg-gold text-bg rounded-md font-sans font-medium hover:bg-gold-2 transition-colors cursor-pointer"
                  >
                    Add files
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                onChange={(e) => {
                  void handleAttachmentUpload(e.target.files);
                  e.currentTarget.value = "";
                }}
                className="hidden"
              />
              {attachments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 rounded-[6px] border border-[rgba(100,70,20,0.12)] bg-bg-2 px-3 py-2">
                      <div className={cn("w-[8px] h-[32px] rounded-[3px]", attachment.position === "after-intro" ? "bg-gold" : "bg-saffron")} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-vastu-text font-medium truncate">{attachment.name}</div>
                        <div className="text-[8px] text-vastu-text-3">
                          {attachment.position === "after-intro" ? "After intro" : "Before summary"} · {attachment.mimeType || "file"} · {Math.round(attachment.sizeBytes / 1024)} KB
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="text-[10px] px-2 py-[4px] rounded-md border border-[rgba(100,70,20,0.15)] text-vastu-text-3 hover:text-red-400 hover:border-red-400/30 transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[9px] text-vastu-text-3 border border-dashed border-[rgba(100,70,20,0.15)] rounded-[6px] px-3 py-4 text-center">
                  No supplementary pages added yet.
                </div>
              )}
            </div>

            {previewMode === "visual" ? (
              /* ── Visual mode: A4 page thumbnails ── */
              reportPagePlan.length === 0 && activePages.length === 0 ? (
                <div className="text-center py-12 text-vastu-text-3 text-[11px]">
                  Enable floors and select pages on the left to preview your report.
                </div>
              ) : (
                <VisualPageGrid
                  reportName={reportName}
                  projectName={canvasStore.projectName}
                  clientName={canvasStore.clientName}
                  consultantName={consultantName}
                  northDeg={canvasStore.northDeg}
                  totalPageCount={totalPageCount}
                  reportPagePlan={reportPagePlan}
                  activeFloor={activeFloor}
                />
              )
            ) : (
              /* ── List mode: page metadata cards ── */
              <>
                <PagePreviewCard pageNum={1} label="Cover Page" floorName="" color="gold">
                  <div className="flex flex-col gap-1">
                    <div className="font-serif text-[13px] text-gold-2 truncate">{reportName || "Untitled Report"}</div>
                    <div className="text-[9px] text-vastu-text-3">{canvasStore.projectName}</div>
                    <div className="text-[9px] text-vastu-text-3">{canvasStore.clientName || "—"}</div>
                    {activeFloor && <div className="text-[9px] text-vastu-text-3">{activeFloor.name} report</div>}
                    <div className="text-[8px] text-vastu-text-3 mt-1">
                      {totalPageCount} pages · N: {canvasStore.northDeg.toFixed(1)}°
                    </div>
                  </div>
                </PagePreviewCard>

                <PagePreviewCard pageNum={2} label="Table of Contents" floorName="" color="gold">
                  <div className="flex flex-col gap-1">
                    <p className="text-[9px] text-vastu-text-3 leading-relaxed">Auto-generated — lists all selected pages with accurate page numbers.</p>
                    <div className="text-[8px] text-vastu-text-3 mt-1">{reportPagePlan.length} content pages listed</div>
                  </div>
                </PagePreviewCard>

                {reportPagePlan.map((entry) => {
                  if (entry.kind === "attachment") {
                    return (
                      <PagePreviewCard key={entry.id} pageNum={entry.pageNum} label="Supplementary Insert" floorName="" color={entry.position === "after-intro" ? "gold" : "blue"}>
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] text-vastu-text font-medium truncate">{entry.name}</div>
                          <div className="text-[9px] text-vastu-text-3">{entry.position === "after-intro" ? "After intro" : "Before summary"}</div>
                        </div>
                      </PagePreviewCard>
                    );
                  }
                  const floor = activeFloor ?? allFloors.find((f) => `${f.id}-${entry.pageType}` === entry.id);
                  const sel = floor ? floorSelections[floor.id] : undefined;
                  const noteKey = entry.id;
                  const noteExpanded = expandedNotes === noteKey;
                  const currentNote = sel?.pageNotes[entry.pageType] ?? "";
                  const hasCuts = floor?.canvasState.cuts.length ? floor.canvasState.cuts.length > 0 : false;
                  const meta = REPORT_PAGE_META[entry.pageType];
                  return (
                    <PagePreviewCard key={entry.id} pageNum={entry.pageNum} label={meta.label} floorName={floor?.name ?? activeFloor?.name ?? ""} color={meta.group === "Analysis" ? "blue" : "neutral"}>
                      <div className="flex flex-col gap-2">
                        <p className="text-[9px] text-vastu-text-3 leading-relaxed">{meta.description}</p>
                        {entry.pageType === "16-zone" && floor && <MiniZonePreview floor={floor} />}
                        {(entry.pageType === "bar-graph-16" || entry.pageType === "bar-graph-8") && floor && <MiniBarPreview floor={floor} />}
                        {(entry.pageType === "cut-analysis" || entry.pageType === "plan-cuts-only") && (
                          <div className={cn("text-[8px] px-2 py-1 rounded-[3px]", hasCuts ? "bg-[rgba(200,60,40,0.1)] text-red-400" : "bg-[rgba(100,70,20,0.07)] text-vastu-text-3")}>
                            {hasCuts ? `${floor?.canvasState.cuts.length} cut${(floor?.canvasState.cuts.length ?? 0) > 1 ? "s" : ""} detected` : "No cuts — page will show empty state"}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setExpandedNotes(noteExpanded ? null : noteKey)}
                            className="text-[8px] text-vastu-text-3 hover:text-gold-2 cursor-pointer bg-transparent border-none flex items-center gap-1 transition-colors"
                          >
                            <span>{noteExpanded ? "▾" : "▸"}</span>
                            {currentNote ? "Edit notes" : "Add notes for this page"}
                          </button>
                          {currentNote && (
                            <span className="text-[7px] px-[5px] py-[1px] rounded-full bg-[rgba(100,70,20,0.15)] text-gold-3">has notes</span>
                          )}
                        </div>
                        {noteExpanded && (
                          <textarea
                            value={currentNote}
                            onChange={(e) => setPageNote(floor?.id ?? activeFloor?.id ?? "", entry.pageType, e.target.value)}
                            placeholder="Optional page footer notes…"
                            rows={2}
                            className="w-full px-2 py-[5px] bg-bg-4 border border-[rgba(100,70,20,0.15)] rounded-[4px] text-vastu-text-2 font-sans text-[10px] outline-none resize-none focus:border-gold-3 leading-relaxed"
                          />
                        )}
                      </div>
                    </PagePreviewCard>
                  );
                })}

                {reportPagePlan.length === 0 && (
                  <div className="text-center py-12 text-vastu-text-3 text-[11px]">
                    Enable floors, select pages on the left, or add supplementary files to preview your report.
                  </div>
                )}
              </>
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
            {hasCuts && <span className="text-vastu-text-3">{cs.cuts.length} cut{cs.cuts.length !== 1 ? "s" : ""}</span>}
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
                    const isComingSoon = page === "ai-summary";
                    const checked = selection.pages.includes(page);
                    const disabled = isComingSoon || !selection.enabled || (meta.requiresCuts && !hasCuts);
                    return (
                      <label
                        key={page}
                        className={cn(
                          "flex items-start gap-2 px-2 py-[5px] rounded-[4px] transition-colors",
                          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-[rgba(100,70,20,0.06)]"
                        )}
                        title={
                          isComingSoon ? "Coming soon" :
                          meta.requiresCuts && !hasCuts ? "No cuts present — this page will be disabled" :
                          undefined
                        }
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
                            {isComingSoon && (
                              <span className="ml-1 text-[7px] bg-[rgba(100,70,20,0.25)] text-vastu-text-3 px-[4px] py-[1px] rounded-full uppercase tracking-[0.5px]">Soon</span>
                            )}
                            {!isComingSoon && meta.requiresCuts && !hasCuts && (
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

// ── PDF colour palette (matches ReportDocument.tsx) ───────────────────────────
const PDF = {
  bg:     "#fdfaf5",
  bg2:    "#f5f0e8",
  gold:   "#b8922a",
  gDark:  "#8a6a1a",
  text:   "#1a1410",
  text2:  "#4a3a28",
  text3:  "#8a7a60",
  border: "#d4bc88",
  red:    "#e05050",
  amber:  "#c8a028",
} as const;

// ── Visual page grid ──────────────────────────────────────────────────────────
type PagePlanEntry =
  | { kind: "attachment"; id: string; name: string; position: ReportSupplementaryPosition; pageNum: number }
  | { kind: "floor"; id: string; pageType: ReportPageType; label: string; pageNum: number };

// Maps ReportPageType → the correct FloorSnapshots key
const SNAPSHOT_KEY_MAP: Partial<Record<ReportPageType, keyof FloorSnapshots>> = {
  "plan-only":          "planOnly",
  "plan-with-brahma":   "planBrahma",
  "plan-with-chakra":   "planChakra",
  "plan-perimeter-only":"planPerimeter",
  "plan-cuts-only":     "planCutsOnly",
  "plan-perimeter-cuts":"planPerimeterCuts",
  "plan-full":          "planFull",
  "16zone-lines":       "zoneLines16",
  "8zone-lines":        "zoneLines8",
  "panchabhuta":        "panchabhuta",
};

function VisualPageGrid({
  reportName, projectName, clientName, consultantName, northDeg,
  totalPageCount, reportPagePlan, activeFloor,
}: {
  reportName: string;
  projectName: string;
  clientName: string;
  consultantName: string;
  northDeg: number;
  totalPageCount: number;
  reportPagePlan: PagePlanEntry[];
  activeFloor: Floor | null;
}) {
  const [snapshots, setSnapshots] = useState<FloorSnapshots | null>(null);
  const [snapsLoading, setSnapsLoading] = useState(false);

  // Generate real canvas snapshots whenever the active floor changes
  useEffect(() => {
    if (!activeFloor) { setSnapshots(null); return; }
    let cancelled = false;
    setSnapsLoading(true);
    setSnapshots(null);

    (async () => {
      const imageBase64 = activeFloor.floorPlanImage
        ? await blobUrlToBase64(activeFloor.floorPlanImage).catch(() => null)
        : null;
      const snaps = await generateAllSnapshots(activeFloor, imageBase64);
      if (!cancelled) { setSnapshots(snaps); setSnapsLoading(false); }
    })().catch(() => setSnapsLoading(false));

    return () => { cancelled = true; };
  }, [activeFloor]);

  return (
    <div>
      {snapsLoading && (
        <div className="flex items-center gap-2 mb-4 text-[9px] text-vastu-text-3 font-mono">
          <span className="animate-spin inline-block">⟳</span>
          Rendering canvas snapshots…
        </div>
      )}
      <div className="grid grid-cols-2 gap-5">
        {/* Cover */}
        <PageThumbnailShell pageNum={1} label="Cover Page">
          <CoverPageContent
            reportName={reportName} projectName={projectName}
            clientName={clientName} consultantName={consultantName}
            northDeg={northDeg} totalPageCount={totalPageCount}
          />
        </PageThumbnailShell>

        {/* TOC */}
        <PageThumbnailShell pageNum={2} label="Table of Contents">
          <TOCPageContent reportPagePlan={reportPagePlan} />
        </PageThumbnailShell>

        {/* Content pages */}
        {reportPagePlan.map((entry) => {
          if (entry.kind === "attachment") {
            return (
              <PageThumbnailShell key={entry.id} pageNum={entry.pageNum} label={entry.name}>
                <AttachmentPageContent name={entry.name} />
              </PageThumbnailShell>
            );
          }
          const snapKey = SNAPSHOT_KEY_MAP[entry.pageType];
          const snapshotUrl = snapKey && snapshots ? snapshots[snapKey] : null;
          return (
            <PageThumbnailShell key={entry.id} pageNum={entry.pageNum} label={REPORT_PAGE_META[entry.pageType].label}>
              <FloorPageContent pageType={entry.pageType} floor={activeFloor} snapshotUrl={snapshotUrl ?? null} />
            </PageThumbnailShell>
          );
        })}
      </div>
    </div>
  );
}

// ── A4-proportioned thumbnail shell ──────────────────────────────────────────
function PageThumbnailShell({ pageNum, label, children }: { pageNum: number; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {/* A4 aspect ratio (210:297 ≈ 1:1.414) */}
      <div style={{ position: "relative", paddingTop: "141.4%" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: PDF.bg, border: `1px solid ${PDF.border}`,
          borderRadius: 4, overflow: "hidden",
          display: "flex", flexDirection: "column",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}>
          {/* Gold top bar */}
          <div style={{ height: 4, background: PDF.gold, flexShrink: 0 }} />
          {/* Content area */}
          <div style={{ flex: 1, padding: "8px 9px 18px", overflow: "hidden", position: "relative" }}>
            {children}
          </div>
          {/* Footer */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 16,
            borderTop: `0.5px solid ${PDF.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 9px", background: PDF.bg,
          }}>
            <span style={{ fontSize: 5, color: PDF.text3, fontFamily: "sans-serif" }}>vastu@home</span>
            <span style={{ fontSize: 5, color: PDF.text3, fontFamily: "monospace" }}>{pageNum}</span>
          </div>
        </div>
      </div>
      {/* Label below */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[8px] px-[5px] py-[1px] rounded-[3px]"
          style={{ background: "rgba(184,146,42,0.13)", color: "#c8af78", border: "1px solid rgba(184,146,42,0.22)" }}>
          {pageNum}
        </span>
        <span className="text-[9px] text-vastu-text-2 truncate">{label}</span>
      </div>
    </div>
  );
}

// ── Cover page content ────────────────────────────────────────────────────────
function CoverPageContent({ reportName, projectName, clientName, consultantName, northDeg, totalPageCount }: {
  reportName: string; projectName: string; clientName: string;
  consultantName: string; northDeg: number; totalPageCount: number;
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo placeholder */}
      <div style={{ width: 22, height: 14, background: PDF.bg2, border: `1px solid ${PDF.border}`, borderRadius: 2, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 4.5, color: PDF.text3, fontFamily: "sans-serif" }}>LOGO</span>
      </div>
      <div style={{ height: 1.5, background: PDF.gold, marginBottom: 5 }} />
      <div style={{ fontSize: 4.5, color: PDF.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, fontFamily: "sans-serif" }}>
        Vastu Analysis Report
      </div>
      <div style={{ fontSize: 9, color: PDF.gDark, fontFamily: "serif", fontWeight: "bold", lineHeight: 1.2, marginBottom: 3 }}>
        {reportName || "Untitled Report"}
      </div>
      <div style={{ height: 0.5, background: PDF.border, margin: "4px 0" }} />
      <div style={{ fontSize: 5.5, color: PDF.text2, fontFamily: "sans-serif", lineHeight: 1.9 }}>
        <div>{projectName}</div>
        <div style={{ color: PDF.text3 }}>{clientName || "—"}</div>
        <div style={{ color: PDF.text3 }}>{consultantName}</div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 4.5, color: PDF.text3, fontFamily: "monospace" }}>
        N: {northDeg.toFixed(1)}° · {totalPageCount} pages
      </div>
    </div>
  );
}

// ── TOC content ───────────────────────────────────────────────────────────────
function TOCPageContent({ reportPagePlan }: { reportPagePlan: PagePlanEntry[] }) {
  const entries = [
    { label: "Cover Page", pageNum: 1 },
    { label: "Table of Contents", pageNum: 2 },
    ...reportPagePlan.slice(0, 10).map((e) => ({
      label: e.kind === "attachment" ? (e.name ?? "Supplementary") : REPORT_PAGE_META[e.pageType].label,
      pageNum: e.pageNum,
    })),
  ];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5.5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 4 }}>
        Table of Contents
      </div>
      <div style={{ height: 1, background: PDF.gold, marginBottom: 5 }} />
      {entries.map((e, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3.5 }}>
          <span style={{ fontSize: 5, color: PDF.text2, fontFamily: "sans-serif", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", paddingRight: 4 }}>
            {e.label}
          </span>
          <span style={{ fontSize: 5, color: PDF.text3, fontFamily: "monospace", flexShrink: 0 }}>{e.pageNum}</span>
        </div>
      ))}
      {reportPagePlan.length > 10 && (
        <div style={{ fontSize: 4.5, color: PDF.text3, fontFamily: "sans-serif", marginTop: 2 }}>+{reportPagePlan.length - 10} more…</div>
      )}
    </div>
  );
}

// ── Floor page dispatcher ─────────────────────────────────────────────────────
const PLAN_PAGES = new Set(["plan-only","plan-with-brahma","plan-with-chakra","plan-perimeter-only","plan-cuts-only","plan-perimeter-cuts","plan-full","16zone-lines","8zone-lines","panchabhuta"]);

function FloorPageContent({ pageType, floor, snapshotUrl }: { pageType: ReportPageType; floor: Floor | null; snapshotUrl: string | null }) {
  if (PLAN_PAGES.has(pageType)) return <PlanPageContent pageType={pageType} floor={floor} snapshotUrl={snapshotUrl} />;
  if (pageType === "16-zone" || pageType === "8-zone") return <ZoneTableContent pageType={pageType} floor={floor} />;
  if (pageType === "bar-graph-16" || pageType === "bar-graph-8") return <BarGraphContent pageType={pageType} floor={floor} />;
  if (pageType === "cut-analysis") return <CutAnalysisContent floor={floor} />;
  if (pageType === "ai-summary" || pageType === "consultant-summary") return <SummaryContent pageType={pageType} floor={floor} />;
  const meta = REPORT_PAGE_META[pageType];
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>{meta.label}</div>
      <div style={{ height: 0.5, background: PDF.border, marginBottom: 4 }} />
      <div style={{ fontSize: 5, color: PDF.text3, fontFamily: "sans-serif" }}>{meta.description}</div>
    </div>
  );
}

// ── Plan page thumbnail — shows the real rendered canvas snapshot ─────────────
function PlanPageContent({ pageType, floor, snapshotUrl }: { pageType: ReportPageType; floor: Floor | null; snapshotUrl: string | null }) {
  const meta = REPORT_PAGE_META[pageType];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>{meta.label}</div>
      <div style={{ height: 0.5, background: PDF.border, marginBottom: 4 }} />
      {/* Canvas snapshot image — fills the available space */}
      <div style={{ flex: 1, background: PDF.bg2, border: `1px solid ${PDF.border}`, borderRadius: 2, overflow: "hidden", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {snapshotUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={snapshotUrl} alt={meta.label} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, color: PDF.border, lineHeight: 1 }}>⟳</div>
            <div style={{ fontSize: 4.5, color: PDF.text3, marginTop: 2, fontFamily: "sans-serif" }}>
              {floor?.canvasState.perimeterPoints.length ?? 0 >= 3 ? "Rendering…" : "No perimeter"}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 4.5, color: PDF.text3, fontFamily: "sans-serif" }}>{meta.description}</div>
    </div>
  );
}

// ── Zone table thumbnail ──────────────────────────────────────────────────────
function ZoneTableContent({ pageType, floor }: { pageType: "16-zone" | "8-zone"; floor: Floor | null }) {
  const meta = REPORT_PAGE_META[pageType];
  const count = pageType === "16-zone" ? 16 : 8;
  const allRows = useMemo(() => (floor ? buildZoneRows(floor) : []), [floor]);
  const rows = count === 8 ? allRows.filter((_, i) => i % 2 === 0) : allRows;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>{meta.label}</div>
      <div style={{ height: 0.5, background: PDF.border, marginBottom: 4 }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, paddingBottom: 2, borderBottom: `0.5px solid ${PDF.border}` }}>
        <span style={{ fontSize: 4, color: PDF.text3, fontFamily: "sans-serif", letterSpacing: 0.5 }}>ZONE</span>
        <span style={{ fontSize: 4, color: PDF.text3, fontFamily: "sans-serif", letterSpacing: 0.5 }}>%</span>
      </div>
      {rows.length > 0 ? rows.slice(0, 10).map(({ zone, pct }) => (
        <div key={zone.shortName} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
          <div style={{ width: 4, height: 4, borderRadius: 1, background: zone.color, flexShrink: 0 }} />
          <span style={{ fontSize: 4, color: PDF.text2, fontFamily: "monospace", flexShrink: 0, width: 13 }}>{zone.shortName}</span>
          <div style={{ flex: 1, height: 3, background: PDF.bg2, borderRadius: 1, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.min((pct / 12.5) * 100, 100)}%`, background: zone.color, borderRadius: 1 }} />
          </div>
          <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "monospace", flexShrink: 0, width: 14, textAlign: "right" }}>{pct.toFixed(2)}%</span>
        </div>
      )) : Array.from({ length: Math.min(count, 10) }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
          <div style={{ width: 4, height: 4, borderRadius: 1, background: `hsl(${i * (360 / count)},40%,55%)`, flexShrink: 0 }} />
          <div style={{ width: 13, height: 3, background: PDF.bg2, borderRadius: 1 }} />
          <div style={{ flex: 1, height: 3, background: PDF.bg2, borderRadius: 1 }}>
            <div style={{ height: "100%", width: `${50 + Math.sin(i) * 30}%`, background: PDF.border, borderRadius: 1 }} />
          </div>
        </div>
      ))}
      {rows.length > 10 && <div style={{ fontSize: 4, color: PDF.text3, fontFamily: "sans-serif", marginTop: 2 }}>+{rows.length - 10} more zones</div>}
    </div>
  );
}

// ── Bar graph thumbnail ───────────────────────────────────────────────────────
function BarGraphContent({ pageType, floor }: { pageType: "bar-graph-16" | "bar-graph-8"; floor: Floor | null }) {
  const meta = REPORT_PAGE_META[pageType];
  const count = pageType === "bar-graph-16" ? 16 : 8;
  const allRows = useMemo(() => (floor ? buildZoneRows(floor) : []), [floor]);
  const rows = count === 8 ? allRows.filter((_, i) => i % 2 === 0) : allRows;
  const maxPct = Math.max(...rows.map((r) => r.pct), 10);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>{meta.label}</div>
      <div style={{ height: 0.5, background: PDF.border, marginBottom: 3 }} />
      <div style={{ fontSize: 4, color: PDF.text3, fontFamily: "sans-serif", marginBottom: 3 }}>Ideal: 6.25% per zone</div>
      {/* Ideal reference line */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {rows.length > 0 ? rows.slice(0, count).map(({ zone, pct }) => (
          <div key={zone.shortName} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "monospace", width: 11, textAlign: "right", flexShrink: 0 }}>{zone.shortName}</span>
            <div style={{ flex: 1, height: 3.5, background: PDF.bg2, borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(pct / maxPct) * 100}%`, background: zone.color, borderRadius: 1, opacity: 0.85 }} />
            </div>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "monospace", width: 14, textAlign: "right", flexShrink: 0 }}>{pct.toFixed(2)}%</span>
          </div>
        )) : Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <div style={{ width: 11, height: 3.5, background: PDF.bg2, borderRadius: 1 }} />
            <div style={{ flex: 1, height: 3.5, background: PDF.bg2, borderRadius: 1, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${40 + Math.abs(Math.sin(i * 1.5)) * 50}%`, background: PDF.border, borderRadius: 1, opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cut analysis thumbnail — real data from calculateCutAnalysis ──────────────
function CutAnalysisContent({ floor }: { floor: Floor | null }) {
  const cuts = useMemo(() => {
    const cs = floor?.canvasState;
    if (!cs || cs.perimeterPoints.length < 3 || cs.cuts.length === 0) return [];
    return calculateCutAnalysis(
      cs.perimeterPoints, cs.brahmaX, cs.brahmaY, cs.northDeg,
      VASTU_ZONES, cs.cuts
    );
  }, [floor]);

  const SEV_COLOR = { mild: "#c8a028", moderate: "#e87820", severe: PDF.red } as const;
  const mild     = cuts.filter(c => c.severity === "mild").length;
  const moderate = cuts.filter(c => c.severity === "moderate").length;
  const severe   = cuts.filter(c => c.severity === "severe").length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>Cut Analysis</div>
      <div style={{ height: 0.5, background: PDF.gold, marginBottom: 4 }} />

      {cuts.length === 0 ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 3 }}>
          <div style={{ fontSize: 14, color: PDF.border }}>○</div>
          <div style={{ fontSize: 4.5, color: PDF.text3, fontFamily: "sans-serif" }}>No cuts present</div>
        </div>
      ) : (
        <>
          {/* Summary stat chips */}
          <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
            {([
              ["Total", cuts.length, PDF.gold],
              ["Mild", mild, SEV_COLOR.mild],
              ["Mod.", moderate, SEV_COLOR.moderate],
              ["Sev.", severe, SEV_COLOR.severe],
            ] as const).map(([label, val, color]) => (
              <div key={label} style={{ flex: 1, background: PDF.bg2, border: `0.5px solid ${PDF.border}`, borderRadius: 2, padding: "2px 0", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: color as string, fontFamily: "monospace", fontWeight: "bold", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", marginTop: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Table header */}
          <div style={{ display: "flex", gap: 2, paddingBottom: 2, marginBottom: 2, borderBottom: `0.5px solid ${PDF.border}` }}>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", width: 22, flexShrink: 0 }}>Cut</span>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", width: 14, flexShrink: 0 }}>Zone</span>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", flex: 1, textAlign: "right" }}>%Floor</span>
            <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", width: 22, textAlign: "right", flexShrink: 0 }}>Sev.</span>
          </div>

          {/* Cut rows */}
          <div style={{ flex: 1, overflowY: "hidden" }}>
            {cuts.map((cut) => {
              const sc = SEV_COLOR[cut.severity];
              return (
                <div key={cut.id} style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 2.5, paddingBottom: 2, borderBottom: `0.5px solid ${PDF.bg2}` }}>
                  <span style={{ fontSize: 4, color: PDF.text2, fontFamily: "monospace", width: 22, flexShrink: 0, overflow: "hidden", whiteSpace: "nowrap" }}>{cut.label}</span>
                  <div style={{ width: 14, flexShrink: 0, background: PDF.bg2, borderRadius: 1, padding: "1px 2px" }}>
                    <span style={{ fontSize: 3.5, color: PDF.gold, fontFamily: "monospace" }}>{cut.primaryZone}</span>
                  </div>
                  <span style={{ fontSize: 4, color: sc, fontFamily: "monospace", flex: 1, textAlign: "right", fontWeight: "bold" }}>{cut.pctOfFloor.toFixed(2)}%</span>
                  <div style={{ width: 22, flexShrink: 0, background: sc + "22", borderRadius: 1, padding: "1px 2px", textAlign: "center" }}>
                    <span style={{ fontSize: 3.5, color: sc, fontFamily: "sans-serif", textTransform: "uppercase", fontWeight: "bold" }}>{cut.severity}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Severity legend */}
          <div style={{ display: "flex", gap: 5, marginTop: 3, paddingTop: 3, borderTop: `0.5px solid ${PDF.border}` }}>
            {(["mild", "moderate", "severe"] as const).map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <div style={{ width: 4, height: 4, background: SEV_COLOR[s], borderRadius: 1 }} />
                <span style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif" }}>{s}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Summary thumbnail ─────────────────────────────────────────────────────────
function SummaryContent({ pageType, floor }: { pageType: "ai-summary" | "consultant-summary"; floor: Floor | null }) {
  const meta = REPORT_PAGE_META[pageType];
  const isAI = pageType === "ai-summary";

  const summaryText = (!isAI && floor?.consultantSummary?.trim()) || "";
  const actionLines = (!isAI && floor?.consultantActions)
    ? floor.consultantActions.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];
  const hasContent = summaryText.length > 0 || actionLines.length > 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 5, color: PDF.gold, letterSpacing: 1, textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 3 }}>{meta.label}</div>
      <div style={{ height: 0.5, background: PDF.border, marginBottom: 5 }} />

      {/* Recommendations section */}
      <div style={{ fontSize: 4, color: PDF.gold, fontFamily: "sans-serif", marginBottom: 2, letterSpacing: 0.5, textTransform: "uppercase" }}>
        Consultant Recommendations
      </div>
      {summaryText ? (
        <div style={{ fontSize: 4, color: PDF.text, fontFamily: "sans-serif", lineHeight: 1.6, marginBottom: 6, overflow: "hidden", maxHeight: 28 }}>
          {summaryText}
        </div>
      ) : (
        Array.from({ length: isAI ? 8 : 4 }).map((_, i) => (
          <div key={i} style={{ height: 3, background: i === 0 ? "rgba(184,146,42,0.18)" : PDF.bg2, borderRadius: 1, marginBottom: 2.5, width: i % 3 === 2 ? "68%" : "100%" }} />
        ))
      )}

      {/* Recommended actions section */}
      {!isAI && (
        <div style={{ marginTop: 4, padding: "4px 5px", border: `0.5px solid ${PDF.border}`, borderRadius: 2 }}>
          <div style={{ fontSize: 4, color: PDF.gold, fontFamily: "sans-serif", marginBottom: 3, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Recommended Actions
          </div>
          {actionLines.length > 0 ? (
            actionLines.slice(0, 4).map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 3, marginBottom: 2.5 }}>
                <div style={{ width: 3, height: 3, background: PDF.gold, borderRadius: "50%", flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: 4, color: PDF.text, fontFamily: "sans-serif", lineHeight: 1.4, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "90%" }}>
                  {line}
                </div>
              </div>
            ))
          ) : (
            [1, 2, 3].map((n) => (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2.5 }}>
                <div style={{ width: 3, height: 3, background: PDF.gold, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, height: 2, background: PDF.bg2, borderRadius: 1 }} />
              </div>
            ))
          )}
          {actionLines.length > 4 && (
            <div style={{ fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", marginTop: 1 }}>
              +{actionLines.length - 4} more
            </div>
          )}
        </div>
      )}

      {!isAI && !hasContent && (
        <div style={{ marginTop: 4, fontSize: 3.5, color: PDF.text3, fontFamily: "sans-serif", fontStyle: "italic" }}>
          Write in the Summary panel →
        </div>
      )}
    </div>
  );
}

// ── Attachment thumbnail ──────────────────────────────────────────────────────
function AttachmentPageContent({ name }: { name: string }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 20, color: PDF.border, marginBottom: 5, lineHeight: 1 }}>⎗</div>
      <div style={{ fontSize: 5, color: PDF.text3, fontFamily: "sans-serif", textAlign: "center", maxWidth: "80%", wordBreak: "break-word" }}>{name}</div>
      <div style={{ marginTop: 5, padding: "2px 6px", background: `${PDF.gold}22`, borderRadius: 2, border: `0.5px solid ${PDF.gold}44` }}>
        <span style={{ fontSize: 4, color: PDF.gold, fontFamily: "sans-serif" }}>Supplementary</span>
      </div>
    </div>
  );
}
