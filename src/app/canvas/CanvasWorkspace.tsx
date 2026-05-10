"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { useProjectStore } from "@/store/projectStore";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import VastuCanvas from "@/components/canvas/VastuCanvas";
import RightPanel from "@/components/panels/RightPanel";
import AnalysisPanel from "@/components/panels/AnalysisPanel";
import ChatPanel from "@/components/panels/ChatPanel";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { CanvasTool } from "@/store/canvasStore";
import type { Floor, Project, Report } from "@/lib/types";
import ReportBuilder from "@/components/reports/ReportBuilder";
import { useReportStore } from "@/store/reportStore";
import { useUser } from "@/hooks/useUser";

interface ExportModalState { open: boolean }

export default function CanvasWorkspace() {
  const store = useCanvasStore();
  const projectStore = useProjectStore();
  const reportStore = useReportStore();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { subscription } = useUser();
  const [exportModal, setExportModal] = useState<ExportModalState>({ open: false });
  const fullPanel = (searchParams.get("panel") as "analysis" | "ai" | null) ?? null;
  const [leftExpanded, setLeftExpanded] = useState(false);

  const closePanel = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("panel");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [northDraft, setNorthDraft] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const autoCreatedRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef    = useRef(false);
  const pendingSaveRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageFetchedForRef  = useRef<string | null>(null); // tracks which floorId we've already re-fetched for
  const uploadGenRef        = useRef(0);                   // incremented on each new import or Remove, so stale upload callbacks are ignored
  const pendingImageRef     = useRef<File | null>(null);   // image imported before DB project existed — uploaded once auto-create completes

  // True when projectId is a real DB UUID (not a local `proj-xxx` ID)
  const isDbProject = useCallback(
    (pid: string | null) => !!pid && !pid.startsWith("proj-"),
    []
  );

  const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

  // Upload a File to storage and update the floor's image URL in the store.
  // Captures the current generation so that if the user imports another image
  // or clicks Remove while this upload is in flight, the callback is ignored.
  const uploadFloorImage = useCallback(
    async (file: File, pid: string, floorId: string) => {
      if (file.size > MAX_IMAGE_BYTES) {
        showToast("Image too large — maximum size is 10 MB");
        return;
      }
      const gen = uploadGenRef.current;
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`/api/projects/${pid}/floors/${floorId}/image`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { data } = await res.json();
        if (data?.url && uploadGenRef.current === gen) store.setFloorPlanImage(data.url);
      } catch {
        showToast("Image upload failed — showing locally only. Refresh may lose the image.");
      }
    },
    [store, showToast]
  );

  const {
    currentTool, northDeg, projectName, clientName, projectId,
    chakraVisible, notes, undoStack,
    setTool, setNorth, toggleChakra, setChakraOpacity, chakraOpacity,
    setNotes, undo, perimeterPoints, perimeterComplete, resetPerimeter,
    floorPlanImage, setFloorPlanImage, cuts, clearCuts,
    floors, currentFloorId, addFloor, switchFloor, deleteFloor, renameFloor,
    zoneMode, setZoneMode,
    perimeterVisible, cutsVisible, togglePerimeterVisible, toggleCutsVisible,
    consultantSummary, consultantActions,
    brahmaX, brahmaY, zoomLevel, panX, panY,
  } = store;

  // Remove the floor plan image: clear the store, delete from storage, and null the DB path.
  const removeFloorImage = useCallback(() => {
    uploadGenRef.current++;
    pendingImageRef.current = null;
    setFloorPlanImage(null);
    const pid = store.projectId;
    const fid = store.currentFloorId;
    if (isDbProject(pid)) {
      fetch(`/api/projects/${pid}/floors/${fid}/image`, { method: "DELETE" }).catch(() => {});
    }
  }, [store, isDbProject, setFloorPlanImage]);

  // Sync floors to projectStore in-memory (for report builder etc.)
  const persistFloors = useCallback(() => {
    const pid = store.projectId;
    if (pid) projectStore.updateProject(pid, { floors: store.getProjectFloors() });
  }, [store, projectStore]);

  // Re-fetch the floor plan image URL from the DB whenever the store rehydrates
  // without one (floorPlanImage is excluded from localStorage persist).
  // This covers /canvas direct navigation and any other route that doesn't call loadCanvasState.
  useEffect(() => {
    const pid = store.projectId;
    const fid = store.currentFloorId;
    if (!isDbProject(pid)) return;
    if (fid.startsWith("floor-")) return;
    if (imageFetchedForRef.current === fid) return; // already tried for this floor
    imageFetchedForRef.current = fid; // mark floor as checked before the null check so
    if (store.floorPlanImage) return; // Remove doesn't trigger a re-fetch from DB

    fetch(`/api/projects/${pid}/floors/${fid}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (data?.floor_plan_image_url) store.setFloorPlanImage(data.floor_plan_image_url);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.projectId, store.currentFloorId, store.floorPlanImage]);

  // Auto-create project when user starts drawing (first perimeter point)
  useEffect(() => {
    if (perimeterPoints.length === 1 && !projectId && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      const name = projectName || "Untitled Project";

      // Try creating in DB first; fall back to local on failure
      fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientName: clientName || "", propertyType: "Residential" }),
      })
        .then((r) => r.json())
        .then(({ data }) => {
          if (data?.id) {
            const project: Project = {
              id: data.id,
              consultantId: data.consultant_id ?? "local",
              name: data.name,
              clientName: data.client_name ?? "",
              propertyType: "Residential",
              status: "draft",
              createdAt: data.created_at ?? new Date().toISOString(),
              updatedAt: data.updated_at ?? new Date().toISOString(),
            };
            projectStore.addProject(project);
            store.setProjectId(data.id);
            // Replace the order-0 local floor ID with the real DB UUID.
            // Must use order-0 specifically — using currentFloorId would wrongly
            // reassign the DB UUID to whichever floor the user happens to be on,
            // causing reconciliation to delete the real Floor 1.
            if (data.floors?.[0]) {
              const dbFloor = data.floors[0];
              const liveFloors = useCanvasStore.getState().floors;
              const floor1 = liveFloors.find((f) => f.order === 0 && f.id.startsWith("floor-"));
              store.replaceFloorId(floor1?.id ?? store.currentFloorId, dbFloor.id);
            }
          }
        })
        .catch(() => {
          // Offline fallback — local only
          const now = new Date().toISOString();
          const id = `proj-${Date.now()}`;
          projectStore.addProject({ id, consultantId: "local", name, clientName: clientName || "", propertyType: "Residential", status: "draft", createdAt: now, updatedAt: now });
          store.setProjectId(id);
        });
    }
  }, [perimeterPoints.length, projectId, projectName, clientName, projectStore, store]);

  // Fire any image upload that was queued before the DB project existed.
  // Runs whenever projectId or currentFloorId changes — once both are real DB
  // UUIDs and a pending file is waiting, upload it then clear the ref.
  useEffect(() => {
    if (!isDbProject(projectId)) return;
    if (currentFloorId.startsWith("floor-")) return;
    const file = pendingImageRef.current;
    if (!file) return;
    pendingImageRef.current = null;
    uploadFloorImage(file, projectId!, currentFloorId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, currentFloorId]);

  // ── Load reports from DB when a real project is opened ───────────────────
  useEffect(() => {
    if (!isDbProject(projectId)) return;
    fetch(`/api/reports?projectId=${projectId}`)
      .then((r) => r.json())
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        // Use live store state (not the stale closure) to avoid adding duplicates
        // when the effect fires twice (StrictMode, re-navigation, concurrent fetches).
        const existingIds = new Set(useReportStore.getState().reports.map((r) => r.id));
        data.forEach((row: Record<string, unknown>) => {
          if (existingIds.has(row.id as string)) return;
          const report: Report = {
            id:              row.id as string,
            projectId:       row.project_id as string,
            projectName:     store.projectName,
            clientName:      store.clientName,
            propertyAddress: "",
            northDeg:        store.northDeg,
            reportName:      row.report_name as string,
            preset:          row.preset as Report["preset"],
            floorSelections: (row.floor_selections as Report["floorSelections"]) ?? [],
            status:          row.status as Report["status"],
            createdAt:       row.created_at as string,
            updatedAt:       row.updated_at as string,
          };
          reportStore.addReport(report);
        });
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Reconcile stale local floor IDs with DB UUIDs on load ────────────────
  // Handles the case where Zustand persist restored local `floor-xxx` IDs for a DB project
  useEffect(() => {
    if (!isDbProject(projectId)) return;
    const hasLocalIds = store.floors.some((f) => f.id.startsWith("floor-"));
    if (!hasLocalIds) return;

    fetch(`/api/projects/${projectId}/floors`)
      .then((r) => r.json())
      .then(async ({ data }: { data?: Array<{ id: string; order: number; name: string }> }) => {
        if (!Array.isArray(data)) return;
        const liveFloors = useCanvasStore.getState().floors;
        const existingDbIds = new Set(liveFloors.filter((f) => !f.id.startsWith("floor-")).map((f) => f.id));
        for (const local of liveFloors.filter((f) => f.id.startsWith("floor-"))) {
          const match = data.find((d) => d.order === local.order && !existingDbIds.has(d.id));
          if (match) {
            // DB already has a floor at this order — just swap the ID
            existingDbIds.add(match.id); // prevent duplicate mapping
            useCanvasStore.getState().replaceFloorId(local.id, match.id);
          } else if (!data.find((d) => d.order === local.order)) {
            // Orphan local floor (no DB row at this order) — create it
            try {
              const res = await fetch(`/api/projects/${projectId}/floors`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: local.name, order: local.order, canvasState: local.canvasState }),
              });
              const { data: created } = await res.json();
              if (created?.id) useCanvasStore.getState().replaceFloorId(local.id, created.id);
            } catch { /* stay local */ }
          } else {
            // A DB floor exists at this order but its ID is already in the store — drop the stale local duplicate
            useCanvasStore.getState().deleteFloor(local.id);
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Auto-save canvas state to DB (debounced 2 s) ──────────────────────────
  const saveNow = useCallback(async () => {
    // Race condition guard — if already saving, flag for a follow-up save
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    const pid = store.projectId;
    const fid = store.currentFloorId;
    if (!isDbProject(pid)) return;
    if (fid.startsWith("floor-")) return;
    const packed = store.getProjectFloors().find((f) => f.id === fid);
    if (!packed) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    const body = JSON.stringify({
      canvasState:       packed.canvasState,
      notes:             packed.notes,
      consultantSummary: packed.consultantSummary,
      consultantActions: packed.consultantActions,
      zoomLevel:         packed.zoomLevel,
      panX:              packed.panX,
      panY:              packed.panY,
    });

    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`/api/projects/${pid}/floors/${fid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });

        // Project was deleted in another tab
        if (res.status === 404) {
          showToast("This project no longer exists — it may have been deleted");
          store.resetToBlank();
          router.push("/projects");
          isSavingRef.current = false;
          setSaveStatus("idle");
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        success = true;
        break;
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }

    isSavingRef.current = false;

    if (success) {
      persistFloors();
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
    } else {
      setSaveStatus("error");
      showToast("Auto-save failed — check your connection");
    }

    // Another change came in while we were saving — save it now
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      saveNow();
    }
  }, [store, isDbProject, persistFloors, showToast, router]);

  useEffect(() => {
    const pid = store.projectId;
    const fid = store.currentFloorId;
    if (!isDbProject(pid)) return;
    if (fid.startsWith("floor-")) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveNow, 2000);

    // On unmount flush immediately so navigating away doesn't lose the last change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveNow();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    perimeterPoints, cuts, brahmaX, brahmaY, northDeg, notes,
    consultantSummary, consultantActions, zoomLevel, panX, panY,
    currentFloorId, projectId,
  ]);

  const startEditingName = () => {
    setNameValue(projectName || "Untitled Project");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitName = () => {
    const trimmed = nameValue.trim() || "Untitled Project";
    store.setProjectName(trimmed);
    if (projectId) {
      projectStore.updateProject(projectId, { name: trimmed });
      if (isDbProject(projectId)) {
        fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        }).catch(() => showToast("Failed to save project name"));
      }
    }
    setEditingName(false);
  };

  const TOOLS: { id: CanvasTool; icon: string; title: string }[] = [
    { id: "select",    icon: "⊹", title: "Select" },
    { id: "perimeter", icon: "⬡", title: "Draw Perimeter (P)" },
    { id: "cut",       icon: "✂", title: "Draw Cut (C)" },
    { id: "brahma",    icon: "◉", title: "Move Brahmasthan (B)" },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Canvas topbar */}
      <div className="h-[42px] bg-bg-2 border-b border-[rgba(100,70,20,0.20)] flex items-center px-[11px] gap-[7px] flex-shrink-0 overflow-hidden">
        {/* Project info — click to rename */}
        <div className="min-w-0 flex-shrink-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") setEditingName(false);
              }}
              autoFocus
              className="font-serif text-[14px] font-medium text-vastu-text bg-bg-3 border border-gold-3 rounded-[3px] px-1 outline-none max-w-[200px]"
            />
          ) : (
            <div
              className="font-serif text-[14px] font-medium text-vastu-text whitespace-nowrap truncate max-w-[180px] cursor-text hover:text-gold-2 transition-colors group flex items-center gap-[4px]"
              onClick={startEditingName}
              title="Click to rename"
            >
              {projectName || "Untitled Project"}
              <span className="text-[9px] text-vastu-text-3 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </div>
          )}
          {clientName && (
            <div className="text-[9px] text-vastu-text-3 whitespace-nowrap">{clientName}</div>
          )}
        </div>

        {/* Save status indicator */}
        {saveStatus === "saving" && (
          <span className="text-[9px] text-vastu-text-3 font-mono animate-pulse flex-shrink-0">Saving…</span>
        )}
        {saveStatus === "saved" && (
          <span className="text-[9px] text-green-500/70 font-mono flex-shrink-0">✓ Saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-[9px] text-red-400 font-mono flex-shrink-0">⚠ Save failed</span>
        )}

        <div className="w-[1px] h-4 bg-[rgba(100,70,20,0.20)] flex-shrink-0" />

        {/* North input — draft state prevents immediate re-render while typing */}
        <span className="text-[10px] text-vastu-text-3 whitespace-nowrap flex-shrink-0">🧭 N:</span>
        <input
          type="number"
          value={northDraft ?? northDeg.toFixed(1)}
          min={0} max={360} step={0.5}
          onFocus={(e) => { setNorthDraft(northDeg.toFixed(1)); e.target.select(); }}
          onChange={(e) => setNorthDraft(e.target.value)}
          onBlur={() => {
            const v = parseFloat(northDraft ?? "");
            if (!isNaN(v)) setNorth(Math.max(0, Math.min(360, v)));
            setNorthDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = parseFloat(northDraft ?? "");
              if (!isNaN(v)) setNorth(Math.max(0, Math.min(360, v)));
              setNorthDraft(null);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setNorthDraft(null);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-[60px] px-[6px] py-[3px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[4px] text-gold-2 font-mono text-[11px] font-semibold outline-none focus:border-gold-3 flex-shrink-0"
        />

        <div className="w-[1px] h-4 bg-[rgba(100,70,20,0.20)] flex-shrink-0" />

        {/* Tool buttons */}
        <div className="flex gap-[2px]">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => setTool(t.id)}
              className={`w-[27px] h-[27px] flex items-center justify-center rounded-[5px] text-[12px] cursor-pointer transition-all duration-[120ms] border font-sans ${
                currentTool === t.id
                  ? "bg-[rgba(100,70,20,0.20)] border-gold text-gold-2"
                  : "bg-bg-3 border-[rgba(100,70,20,0.20)] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2"
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Import Floor Plan — input covers the label so the user clicks it directly */}
        <label
          className="relative inline-flex items-center gap-1 text-[10px] px-[9px] py-[5px] bg-bg-3 border border-[rgba(100,70,20,0.20)] text-vastu-text-2 rounded-md hover:border-gold-3 hover:text-gold-2 cursor-pointer font-sans transition-colors flex-shrink-0"
          style={{ position: "relative" }}
        >
          <input
            type="file"
            accept="image/*,.svg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadGenRef.current++;
              setFloorPlanImage(URL.createObjectURL(file));
              const pid = store.projectId;
              if (isDbProject(pid)) {
                uploadFloorImage(file, pid!, currentFloorId);
              } else {
                pendingImageRef.current = file;
              }
              e.target.value = "";
            }}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
          />
          📂 Import Floor Plan
        </label>

        {floorPlanImage && (
          <button
            onClick={removeFloorImage}
            className="text-[10px] px-[5px] py-[2px] rounded-[3px] cursor-pointer text-vastu-text-3 hover:text-red-400 bg-transparent border-none transition-colors flex-shrink-0"
            title="Remove floor plan image"
          >
            ✕ Remove
          </button>
        )}

        <div className="w-[1px] h-4 bg-[rgba(100,70,20,0.20)] flex-shrink-0" />

        {/* Undo */}
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="text-[10px] px-[5px] py-[2px] rounded-[3px] cursor-pointer text-vastu-text-3 hover:text-gold-2 disabled:opacity-30 disabled:cursor-default bg-transparent border-none transition-colors"
        >
          ↩ Undo
        </button>

        <div className="w-[1px] h-4 bg-[rgba(100,70,20,0.20)] flex-shrink-0" />

        <Button
          variant="ghost"
          className="text-[10px] py-1 px-[9px]"
          onClick={toggleChakra}
        >
          ◎ {chakraVisible ? "Hide" : "Show"} Chakra
        </Button>
        {/* Zone mode selector */}
        <div className="flex items-center gap-[2px] border border-[rgba(100,70,20,0.20)] rounded-md p-[2px]" title="Zone division lines from Brahmasthan (requires closed perimeter)">
          <span className="text-[9px] text-vastu-text-3 px-[5px] font-sans whitespace-nowrap">⊹ Zones</span>
          {(["off", "8", "16"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setZoneMode(mode)}
              className={`text-[9px] px-[7px] py-[3px] rounded-[4px] font-mono cursor-pointer transition-all duration-[120ms] border ${
                zoneMode === mode
                  ? "bg-[rgba(74,144,226,0.2)] border-[rgba(74,144,226,0.6)] text-[#4a90e2]"
                  : "bg-transparent border-transparent text-vastu-text-3 hover:text-vastu-text-2 hover:border-[rgba(100,70,20,0.20)]"
              }`}
            >
              {mode === "off" ? "Off" : `${mode}`}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          className="text-[10px] py-1 px-[9px]"
          onClick={() => setExportModal({ open: true })}
        >
          ⎙ Export
        </Button>
      </div>

      {/* Floor Tabs */}
      <FloorTabs
        floors={floors}
        currentFloorId={currentFloorId}
        onSwitch={(id) => { switchFloor(id); persistFloors(); }}
        onAdd={async () => {
          addFloor();
          persistFloors();
          // Create floor in DB and replace local ID with real UUID
          // Use getState() to read live Zustand state — closure snapshot is stale after addFloor()
          const pid = store.projectId;
          if (isDbProject(pid)) {
            const liveFloors = useCanvasStore.getState().floors;
            const newFloor = liveFloors[liveFloors.length - 1];
            if (newFloor) {
              const localId = newFloor.id;
              try {
                const res = await fetch(`/api/projects/${pid}/floors`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: newFloor.name, order: newFloor.order, canvasState: {} }),
                });
                const { data } = await res.json();
                if (data?.id) store.replaceFloorId(localId, data.id);
              } catch { /* offline — local ID stays */ }
            }
          }
        }}
        onDelete={(id) => {
          deleteFloor(id);
          persistFloors();
          // Delete floor in DB
          const pid = store.projectId;
          if (isDbProject(pid)) {
            fetch(`/api/projects/${pid}/floors/${id}`, { method: "DELETE" }).catch(() => {});
          }
        }}
        onRename={(id, name) => {
          renameFloor(id, name);
          persistFloors();
          // Persist name change to DB
          const pid = store.projectId;
          if (isDbProject(pid)) {
            fetch(`/api/projects/${pid}/floors/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name }),
            }).catch(() => {});
          }
        }}
      />

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left panel */}
        <div
          className={`bg-bg-2 border-r border-[rgba(100,70,20,0.20)] flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-200 z-[5] ${
            leftExpanded ? "w-[186px]" : "w-[52px]"
          }`}
        >
          {/* Toggle */}
          <div
            onClick={() => setLeftExpanded((v) => !v)}
            className="px-[9px] py-[9px] flex justify-center border-b border-[rgba(100,70,20,0.12)] cursor-pointer text-vastu-text-3 text-[12px] hover:text-gold-2 transition-colors flex-shrink-0"
          >
            ≡
          </div>

          {!leftExpanded ? (
            /* Icon column */
            <div className="flex flex-col gap-[2px] px-[6px] py-[7px] flex-1 overflow-y-auto">
              {[
                { icon: "🏠", label: "Plan" },
                { icon: "◫", label: "Layers" },
                { icon: "📝", label: "Notes" },
              ].map((btn) => (
                <div
                  key={btn.label}
                  onClick={() => setLeftExpanded(true)}
                  className="w-10 h-10 flex flex-col items-center justify-center rounded-[6px] cursor-pointer text-vastu-text-3 text-[14px] hover:bg-[rgba(100,70,20,0.09)] hover:text-gold-2 transition-all border border-transparent hover:border-[rgba(100,70,20,0.12)] flex-shrink-0"
                >
                  {btn.icon}
                  <span className="text-[6px] mt-[2px] font-mono uppercase tracking-[0.5px]">{btn.label}</span>
                </div>
              ))}
            </div>
          ) : (
            /* Expanded sections */
            <div className="flex flex-col flex-1 overflow-y-auto">
              {/* Floor Plan */}
              <LpSection title="Floor Plan" defaultOpen>
                {floorPlanImage && (
                  <button
                    onClick={removeFloorImage}
                    className="w-full text-[9px] px-2 py-[5px] bg-transparent border border-[rgba(200,60,40,0.2)] text-red-400 rounded-md hover:border-red-400 cursor-pointer font-sans mb-1"
                  >
                    ✕ Remove Image
                  </button>
                )}
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[6px] mb-1" onClick={() => setTool("perimeter")}>
                  ⬡ Draw Perimeter
                </Button>
                {perimeterComplete && (
                  <Button variant="danger" className="w-full justify-center text-[9px] py-[6px] mb-1" onClick={resetPerimeter}>
                    ✕ Reset Perimeter
                  </Button>
                )}
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[6px] mb-1" onClick={() => setTool("cut")}>
                  ✂ Draw Cut
                </Button>
                {cuts.length > 0 && (
                  <Button variant="danger" className="w-full justify-center text-[9px] py-[6px]" onClick={clearCuts}>
                    ✕ Reset Cuts
                  </Button>
                )}
              </LpSection>

              {/* Layers */}
              <LpSection title="Layers" defaultOpen>
                <div className="flex flex-col gap-[2px]">
                  {([
                    { label: "Vastu Chakra", color: "rgba(100,70,20,.38)", visible: chakraVisible,    toggle: toggleChakra },
                    { label: "Perimeter",    color: "rgba(100,70,20,.52)", visible: perimeterVisible, toggle: togglePerimeterVisible },
                    { label: "Cuts",         color: "rgba(200,60,40,.6)",   visible: cutsVisible,       toggle: toggleCutsVisible },
                  ] as const).map((layer) => (
                    <div
                      key={layer.label}
                      onClick={layer.toggle}
                      className={`flex items-center gap-[7px] px-[5px] py-[5px] rounded-[4px] cursor-pointer text-[10px] hover:bg-[rgba(100,70,20,0.08)] transition-opacity ${
                        layer.visible ? "text-vastu-text-2" : "text-vastu-text-3 opacity-50"
                      }`}
                    >
                      <div
                        className="w-[7px] h-[7px] rounded-[2px] flex-shrink-0"
                        style={{ background: layer.visible ? layer.color : "rgba(100,100,100,0.3)" }}
                      />
                      <span>{layer.label}</span>
                      {/* Eye icon — slashed when hidden */}
                      <span className="ml-auto flex-shrink-0">
                        {layer.visible ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
                            <path d="M1 6C1 6 3 2 6 2C9 2 11 6 11 6C11 6 9 10 6 10C3 10 1 6 1 6Z" stroke="currentColor" strokeWidth="1.2"/>
                            <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                            <path d="M1 6C1 6 3 2 6 2C9 2 11 6 11 6C11 6 9 10 6 10C3 10 1 6 1 6Z" stroke="currentColor" strokeWidth="1.2" opacity="0.4"/>
                            <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.4"/>
                            <line x1="2" y1="10.5" x2="10" y2="1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                          </svg>
                        )}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-[5px] px-[5px] py-[3px_5px_7px]">
                    <span className="text-[8px] text-vastu-text-3 flex-shrink-0">Opacity</span>
                    <input
                      type="range" min={10} max={80}
                      value={Math.round(chakraOpacity * 100)}
                      onChange={(e) => setChakraOpacity(parseInt(e.target.value))}
                      className="flex-1 accent-gold cursor-pointer"
                    />
                    <span className="text-[8px] text-vastu-text-2 font-mono w-6 text-right flex-shrink-0">
                      {Math.round(chakraOpacity * 100)}%
                    </span>
                  </div>
                </div>
              </LpSection>

              {/* Brahmasthan */}
              <LpSection title="Brahmasthan" defaultOpen>
                <div className="text-[9px] text-vastu-text-3 mb-1">Center of floor plan</div>
                <div className="flex gap-[7px] text-[9px] text-vastu-text-2 font-mono mb-[6px]">
                  <span>X: {Math.round(store.brahmaX)}</span>
                  <span>Y: {Math.round(store.brahmaY)}</span>
                </div>
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[5px] mb-1" onClick={() => setTool("brahma")}>
                  ⊹ Drag to Adjust
                </Button>
                <Button variant="ghost" className="w-full justify-center text-[9px] py-[5px]" onClick={store.autoDetectBrahma}>
                  ⟳ Auto-detect
                </Button>
              </LpSection>

              {/* Notes */}
              <LpSection title="Project Notes" defaultOpen>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Client concerns, observations…"
                  className="w-full px-2 py-[6px] bg-bg-4 border border-[rgba(100,70,20,0.12)] rounded-[5px] text-vastu-text-2 font-sans text-[10px] outline-none resize-none leading-relaxed min-h-[70px] focus:border-gold-3"
                />
                <div className="text-[8px] text-vastu-text-3 mt-1">Saved automatically</div>
              </LpSection>
            </div>
          )}
        </div>

        {/* Main canvas */}
        {/* Block canvas when no project open and limit reached */}
        {!projectId && subscription && subscription.projects_limit !== -1 && subscription.projects_used >= subscription.projects_limit && (
          <div className="absolute inset-0 z-30 bg-bg/80 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[360px] shadow-xl text-center">
              <div className="text-[28px] mb-3">◫</div>
              <div className="font-serif text-[18px] text-gold-2 mb-2">Project Limit Reached</div>
              <div className="text-[12px] text-vastu-text-2 leading-relaxed mb-1">
                You&apos;ve used <span className="font-mono text-vastu-text">{subscription.projects_used}/{subscription.projects_limit}</span> projects on your current plan.
              </div>
              <div className="text-[11px] text-vastu-text-3 mb-5">Upgrade your plan to create more projects.</div>
              <div className="flex gap-2 justify-center">
                <button onClick={() => router.back()} className="px-4 py-[7px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[7px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Go Back</button>
                <a href="/settings" className="px-4 py-[7px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[7px] hover:bg-gold transition-colors font-medium">Upgrade Plan →</a>
              </div>
            </div>
          </div>
        )}
        <ErrorBoundary>
          <VastuCanvas
            onImageFile={(file) => {
              uploadGenRef.current++;
              setFloorPlanImage(URL.createObjectURL(file));
              const pid = store.projectId;
              if (isDbProject(pid)) {
                uploadFloorImage(file, pid!, currentFloorId);
              } else {
                pendingImageRef.current = file;
              }
            }}
          />
        </ErrorBoundary>

        {/* Right panel */}
        <RightPanel onExport={() => setExportModal({ open: true })} />

        {/* Full-view Analysis / AI drawer — opened via sidebar panel buttons */}
        {fullPanel !== null && (
          <>
            {/* Backdrop */}
            <div
              className="absolute inset-0 z-[20] bg-bg/50"
              onClick={closePanel}
            />
            {/* Drawer */}
            <div className="absolute top-0 right-0 bottom-0 z-[21] w-[500px] bg-bg-2 border-l border-[rgba(100,70,20,0.20)] flex flex-col shadow-2xl">
              {/* Drawer header */}
              <div className="flex items-center gap-[9px] px-[16px] py-[11px] border-b border-[rgba(100,70,20,0.15)] flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[15px] text-gold-2 leading-tight truncate">
                    {projectName || "Untitled Project"}
                  </div>
                  {clientName && (
                    <div className="text-[9px] text-vastu-text-3 mt-[1px]">{clientName}</div>
                  )}
                </div>
                <div className="flex items-center gap-[2px] border border-[rgba(100,70,20,0.20)] rounded-md p-[2px] flex-shrink-0">
                  {(["analysis", "ai"] as const).map((p) => {
                    const isComingSoon = p === "ai";
                    const switchPanel = () => {
                      if (isComingSoon) return;
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("panel", p);
                      router.push(`${pathname}?${params.toString()}`);
                    };
                    return (
                      <button
                        key={p}
                        onClick={switchPanel}
                        disabled={isComingSoon}
                        title={isComingSoon ? "Coming soon" : undefined}
                        className={`text-[9px] px-[9px] py-[3px] rounded-[4px] font-sans transition-all border ${
                          isComingSoon
                            ? "opacity-40 cursor-not-allowed bg-transparent border-transparent text-vastu-text-3"
                            : fullPanel === p
                            ? "cursor-pointer bg-[rgba(100,70,20,0.20)] border-[rgba(100,70,20,0.50)] text-gold-2"
                            : "cursor-pointer bg-transparent border-transparent text-vastu-text-3 hover:text-vastu-text-2"
                        }`}
                      >
                        {p === "analysis" ? "⊹ Analysis" : "✦ Vastu AI"}
                        {isComingSoon && (
                          <span className="ml-1 text-[6px] bg-[rgba(100,70,20,0.25)] text-vastu-text-3 px-[4px] py-[1px] rounded-full uppercase tracking-[0.5px] align-middle">
                            Soon
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={closePanel}
                  className="text-[12px] text-vastu-text-3 hover:text-gold-2 cursor-pointer bg-transparent border-none transition-colors flex-shrink-0 ml-1"
                >
                  ✕
                </button>
              </div>

              {/* Drawer content */}
              <div className={`flex-1 overflow-hidden ${fullPanel === "ai" ? "flex flex-col" : "overflow-y-auto"}`}>
                <div className={`p-[14px] h-full ${fullPanel === "ai" ? "flex flex-col" : ""}`}>
                  {fullPanel === "analysis" && <AnalysisPanel onExport={() => setExportModal({ open: true })} />}
                  {fullPanel === "ai" && <ErrorBoundary><ChatPanel /></ErrorBoundary>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Builder — full-screen overlay (replaces old export modal) */}
      <ReportBuilder
        open={exportModal.open}
        onClose={() => setExportModal({ open: false })}
      />



    </div>
  );
}

// ── Floor Tabs ────────────────────────────────────────────────────────────────

interface FloorTabsProps {
  floors: Floor[];
  currentFloorId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function FloorTabs({ floors, currentFloorId, onSwitch, onAdd, onDelete, onRename }: FloorTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = (floor: Floor) => {
    setRenamingId(floor.id);
    setRenameValue(floor.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (renamingId) {
      const trimmed = renameValue.trim();
      if (trimmed) onRename(renamingId, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className="h-[30px] bg-bg-2 border-b border-[rgba(100,70,20,0.20)] flex items-center px-[9px] gap-[2px] flex-shrink-0 overflow-x-auto">
      {floors
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((floor) => {
          const isActive = floor.id === currentFloorId;
          return (
            <div
              key={floor.id}
              onClick={() => !isActive && onSwitch(floor.id)}
              className={`flex items-center gap-[5px] px-[8px] h-[22px] rounded-[4px] text-[10px] font-mono flex-shrink-0 cursor-pointer select-none transition-all duration-[120ms] border ${
                isActive
                  ? "bg-[rgba(100,70,20,0.15)] border-[rgba(100,70,20,0.38)] text-gold-2"
                  : "bg-transparent border-transparent text-vastu-text-3 hover:bg-[rgba(100,70,20,0.08)] hover:text-vastu-text-2"
              }`}
            >
              <span className="text-[8px] opacity-50">◫</span>
              {renamingId === floor.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-bg-3 border border-gold-3 rounded-[3px] px-[4px] text-[10px] font-mono text-vastu-text outline-none w-[80px]"
                  autoFocus
                />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); startRename(floor); }}>
                  {floor.name}
                </span>
              )}
              {floors.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(floor.id);
                  }}
                  className="ml-[1px] text-[9px] text-vastu-text-3 hover:text-red-400 transition-colors leading-none cursor-pointer bg-transparent border-none"
                  title={`Delete ${floor.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

      {/* Add floor button */}
      <button
        onClick={onAdd}
        title="Add new floor"
        className="flex items-center gap-[3px] px-[6px] h-[22px] rounded-[4px] text-[10px] font-mono text-vastu-text-3 hover:text-gold-2 hover:bg-[rgba(100,70,20,0.08)] transition-all border border-transparent hover:border-[rgba(100,70,20,0.20)] cursor-pointer bg-transparent flex-shrink-0"
      >
        <span className="text-[11px] leading-none">+</span>
        <span>Floor</span>
      </button>
    </div>
  );
}

// ── Left Panel Section ────────────────────────────────────────────────────────

function LpSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[rgba(100,70,20,0.12)]">
      <div
        className="flex items-center justify-between px-[11px] py-2 text-[9px] uppercase tracking-[1.5px] text-vastu-text-3 cursor-pointer hover:text-vastu-text-2 select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {title}
        <span className="text-[7px] transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
      </div>
      {open && <div className="px-2 pb-[9px]">{children}</div>}
    </div>
  );
}
