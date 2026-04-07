// src/store/canvasStore.ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { Point } from "@/lib/vastu/geometry";
import type { CanvasState, Cut, EntranceMarker, ScaleCalibration, ZoneAnalysis } from "@/lib/types";
import { polygonCentroid } from "@/lib/vastu/geometry";

// ── Canvas Tool ───────────────────────────────────────────────────────────────
export type CanvasTool =
  | "select"
  | "perimeter"
  | "cut"
  | "scale"
  | "brahma"
  | "entrance"
  | "facing";

// ── Undo/Redo action ──────────────────────────────────────────────────────────
interface UndoAction {
  label: string;
  undo: () => void;
}

// ── Canvas Store ──────────────────────────────────────────────────────────────
interface CanvasStore {
  // Active project
  projectId: string | null;
  projectName: string;
  clientName: string;

  // Canvas tool
  currentTool: CanvasTool;
  setTool: (tool: CanvasTool) => void;

  // North
  northDeg: number;
  northMethod: "manual" | "gps" | "maps";
  setNorth: (deg: number, method?: "manual" | "gps" | "maps") => void;

  // Brahmasthan
  brahmaX: number;
  brahmaY: number;
  brahmaConfirmed: boolean;
  setBrahma: (x: number, y: number) => void;
  confirmBrahma: () => void;
  autoDetectBrahma: () => void;

  // Perimeter
  perimeterPoints: Point[];
  perimeterComplete: boolean;
  addPerimeterPoint: (pt: Point) => void;
  closePerimeter: () => void;
  resetPerimeter: () => void;

  // Cuts
  cuts: Cut[];
  addCut: (points: Point[]) => void;
  removeCut: (id: string) => void;

  // Scale
  scale: ScaleCalibration | null;
  setScale: (cal: ScaleCalibration) => void;
  clearScale: () => void;

  // Entrances
  entrancePoints: EntranceMarker[];
  addEntrance: (marker: EntranceMarker) => void;

  // Facing direction
  facingDirection: number | null;
  setFacingDirection: (deg: number) => void;

  // Zoom / pan
  zoomLevel: number;
  setZoom: (z: number) => void;

  // Chakra
  chakraVisible: boolean;
  chakraOpacity: number;
  toggleChakra: () => void;
  setChakraOpacity: (v: number) => void;

  // Zone analysis results (recalculated on state change)
  zoneAnalysis: ZoneAnalysis[];
  setZoneAnalysis: (results: ZoneAnalysis[]) => void;

  // Floor plan image
  floorPlanImage: string | null;
  setFloorPlanImage: (src: string | null) => void;

  // Project notes
  notes: string;
  setNotes: (n: string) => void;

  // Undo stack
  undoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  undo: () => void;

  // Load project state
  loadCanvasState: (state: Partial<CanvasState>, projectId: string, projectName: string, clientName: string) => void;

  // Serialise for save
  getCanvasState: () => CanvasState;
}

let entranceIdCounter = 0;

export const useCanvasStore = create<CanvasStore>()(
  devtools(
    (set, get) => ({
      // Defaults
      projectId: null,
      projectName: "Untitled Project",
      clientName: "",
      currentTool: "select",
      northDeg: 0,
      northMethod: "manual",
      brahmaX: 380,
      brahmaY: 310,
      brahmaConfirmed: false,
      perimeterPoints: [],
      perimeterComplete: false,
      cuts: [],
      scale: null,
      entrancePoints: [],
      facingDirection: null,
      zoomLevel: 100,
      chakraVisible: true,
      chakraOpacity: 0.42,
      zoneAnalysis: [],
      floorPlanImage: null,
      notes: "",
      undoStack: [],

      setTool: (tool) => set({ currentTool: tool }),

      setNorth: (deg, method = "manual") =>
        set({ northDeg: Math.max(0, Math.min(360, deg)), northMethod: method }),

      setBrahma: (x, y) => {
        const prev = { x: get().brahmaX, y: get().brahmaY };
        get().pushUndo({
          label: "Move Brahmasthan",
          undo: () => set({ brahmaX: prev.x, brahmaY: prev.y }),
        });
        set({ brahmaX: x, brahmaY: y, brahmaConfirmed: false });
      },

      confirmBrahma: () => set({ brahmaConfirmed: true }),

      autoDetectBrahma: () => {
        const pts = get().perimeterPoints;
        if (pts.length < 3) return;
        const centroid = polygonCentroid(pts);
        get().setBrahma(centroid.x, centroid.y);
      },

      addPerimeterPoint: (pt) => {
        const prev = [...get().perimeterPoints];
        get().pushUndo({
          label: "Remove perimeter point",
          undo: () => set({ perimeterPoints: prev, perimeterComplete: false }),
        });
        set((s) => ({ perimeterPoints: [...s.perimeterPoints, pt] }));
      },

      closePerimeter: () => {
        set({ perimeterComplete: true, currentTool: "select" });
        // Auto-detect Brahmasthan after closing
        get().autoDetectBrahma();
      },

      resetPerimeter: () => {
        const prev = { pts: get().perimeterPoints, complete: get().perimeterComplete };
        get().pushUndo({
          label: "Restore perimeter",
          undo: () => set({ perimeterPoints: prev.pts, perimeterComplete: prev.complete }),
        });
        set({ perimeterPoints: [], perimeterComplete: false, brahmaConfirmed: false });
      },

      addCut: (points) => {
        const nextNum = get().cuts.length + 1;
        const cut: Cut = { id: `cut-${Date.now()}`, label: `Cut #${nextNum}`, points };
        get().pushUndo({
          label: `Remove ${cut.label}`,
          undo: () => set((s) => ({ cuts: s.cuts.filter((c) => c.id !== cut.id) })),
        });
        set((s) => ({ cuts: [...s.cuts, cut], currentTool: "select" }));
      },

      removeCut: (id) =>
        set((s) => ({ cuts: s.cuts.filter((c) => c.id !== id) })),

      setScale: (cal) => {
        const prev = get().scale;
        get().pushUndo({
          label: "Clear scale",
          undo: () => set({ scale: prev }),
        });
        set({ scale: cal });
      },

      clearScale: () => set({ scale: null }),

      addEntrance: (marker) => {
        entranceIdCounter++;
        set((s) => ({ entrancePoints: [...s.entrancePoints, { ...marker, id: `entrance-${entranceIdCounter}` }] }));
      },

      setFacingDirection: (deg) => set({ facingDirection: deg }),

      setZoom: (z) => set({ zoomLevel: Math.max(30, Math.min(300, z)) }),

      toggleChakra: () => set((s) => ({ chakraVisible: !s.chakraVisible })),
      setChakraOpacity: (v) => set({ chakraOpacity: v / 100 }),

      setZoneAnalysis: (results) => set({ zoneAnalysis: results }),

      setFloorPlanImage: (src) => set({ floorPlanImage: src }),

      setNotes: (n) => set({ notes: n }),

      pushUndo: (action) =>
        set((s) => ({
          undoStack: [...s.undoStack.slice(-49), action], // max 50 undo steps
        })),

      undo: () => {
        const stack = get().undoStack;
        if (stack.length === 0) return;
        const last = stack[stack.length - 1];
        last.undo();
        set((s) => ({ undoStack: s.undoStack.slice(0, -1) }));
      },

      loadCanvasState: (state, projectId, projectName, clientName) => {
        set({
          projectId,
          projectName,
          clientName,
          northDeg: state.northDeg ?? 0,
          northMethod: state.northMethod ?? "manual",
          brahmaX: state.brahmaX ?? 380,
          brahmaY: state.brahmaY ?? 310,
          brahmaConfirmed: state.brahmaConfirmed ?? false,
          perimeterPoints: state.perimeterPoints ?? [],
          perimeterComplete: state.perimeterComplete ?? false,
          cuts: state.cuts ?? [],
          entrancePoints: state.entrancePoints ?? [],
          facingDirection: state.facingDirection ?? null,
          scale: state.scale ?? null,
          notes: "",
          undoStack: [],
        });
      },

      getCanvasState: (): CanvasState => {
        const s = get();
        return {
          northDeg: s.northDeg,
          northMethod: s.northMethod,
          brahmaX: s.brahmaX,
          brahmaY: s.brahmaY,
          brahmaConfirmed: s.brahmaConfirmed,
          perimeterPoints: s.perimeterPoints,
          perimeterComplete: s.perimeterComplete,
          cuts: s.cuts,
          entrancePoints: s.entrancePoints,
          facingDirection: s.facingDirection ?? undefined,
          scale: s.scale ?? undefined,
        };
      },
    }),
    { name: "vastu-canvas-store" }
  )
);
