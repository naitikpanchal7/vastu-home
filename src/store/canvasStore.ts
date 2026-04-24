// src/store/canvasStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Point } from "@/lib/vastu/geometry";
import type { CanvasState, Cut, EntranceMarker, Floor, ScaleCalibration, ZoneAnalysis } from "@/lib/types";
import { polygonCentroid } from "@/lib/vastu/geometry";

// ── Canvas Tool ───────────────────────────────────────────────────────────────
export type CanvasTool =
  | "select"
  | "perimeter"
  | "cut"
  | "brahma"
  | "entrance"
  | "facing";

// ── Undo/Redo action ──────────────────────────────────────────────────────────
interface UndoAction {
  label: string;
  undo: () => void;
}

// ── Default canvas state for a blank floor ────────────────────────────────────
const BLANK_CANVAS_STATE: CanvasState = {
  northDeg: 0,
  northMethod: "manual",
  brahmaX: 380,
  brahmaY: 310,
  brahmaConfirmed: false,
  perimeterPoints: [],
  perimeterComplete: false,
  cuts: [],
  entrancePoints: [],
};

function makeFloor(name: string, order: number, base?: Partial<CanvasState>): Floor {
  return {
    id: `floor-${Date.now()}-${order}`,
    name,
    order,
    canvasState: { ...BLANK_CANVAS_STATE, ...base },
    floorPlanImage: null,
    notes: "",
  };
}

// ── Canvas Store ──────────────────────────────────────────────────────────────
interface CanvasStore {
  // Active project
  projectId: string | null;
  projectName: string;
  clientName: string;

  // ── Floors ──────────────────────────────────────────────────────────────────
  floors: Floor[];
  currentFloorId: string;
  addFloor: () => void;
  switchFloor: (id: string) => void;
  deleteFloor: (id: string) => void;
  renameFloor: (id: string, name: string) => void;
  /** Returns all floors with the current floor's live state baked in. Use this before saving to projectStore. */
  getProjectFloors: () => Floor[];

  // Canvas tool
  currentTool: CanvasTool;
  setTool: (tool: CanvasTool) => void;

  // North (shared across all floors — same building, same compass)
  northDeg: number;
  northMethod: "manual" | "gps" | "maps";
  setNorth: (deg: number, method?: "manual" | "gps" | "maps") => void;

  // Brahmasthan (per floor)
  brahmaX: number;
  brahmaY: number;
  brahmaConfirmed: boolean;
  setBrahma: (x: number, y: number) => void;
  confirmBrahma: () => void;
  autoDetectBrahma: () => void;

  // Perimeter (per floor)
  perimeterPoints: Point[];
  perimeterComplete: boolean;
  addPerimeterPoint: (pt: Point) => void;
  closePerimeter: () => void;
  resetPerimeter: () => void;

  // Cuts (per floor)
  cuts: Cut[];
  addCut: (points: Point[]) => void;
  removeCut: (id: string) => void;
  clearCuts: () => void;

  // Scale (shared across all floors — same building, same physical scale)
  scale: ScaleCalibration | null;
  setScale: (cal: ScaleCalibration) => void;
  clearScale: () => void;

  // Entrances (per floor)
  entrancePoints: EntranceMarker[];
  addEntrance: (marker: EntranceMarker) => void;

  // Facing direction (per floor)
  facingDirection: number | null;
  setFacingDirection: (deg: number) => void;

  // Zoom / pan (per floor — each floor remembers its own view)
  zoomLevel: number;
  panX: number;
  panY: number;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;

  // Chakra
  chakraVisible: boolean;
  chakraOpacity: number;
  toggleChakra: () => void;
  setChakraOpacity: (v: number) => void;

  // Layer visibility
  perimeterVisible: boolean;
  cutsVisible: boolean;
  togglePerimeterVisible: () => void;
  toggleCutsVisible: () => void;

  // Zone grid (division lines from Brahmasthan — 8 compass or 16 Vastu zones)
  zoneMode: "off" | "8" | "16";
  setZoneMode: (mode: "off" | "8" | "16") => void;

  // Zone analysis results (recalculated on state change)
  zoneAnalysis: ZoneAnalysis[];
  setZoneAnalysis: (results: ZoneAnalysis[]) => void;

  // Floor plan image (per floor)
  floorPlanImage: string | null;
  setFloorPlanImage: (src: string | null) => void;

  // Project notes (per floor)
  notes: string;
  setNotes: (n: string) => void;

  // Undo stack
  undoStack: UndoAction[];
  pushUndo: (action: UndoAction) => void;
  undo: () => void;

  // Mutators for project metadata
  setProjectName: (name: string) => void;
  setClientName: (name: string) => void;
  setProjectId: (id: string | null) => void;

  // Load project state
  loadCanvasState: (
    state: Partial<CanvasState>,
    projectId: string,
    projectName: string,
    clientName: string,
    floors?: Floor[]
  ) => void;

  // Serialise current floor for save
  getCanvasState: () => CanvasState;
}

let entranceIdCounter = 0;

const DEFAULT_FLOOR = makeFloor("Floor 1", 0);

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
      panX: 0,
      panY: 0,
      chakraVisible: true,
      chakraOpacity: 0.42,
      perimeterVisible: true,
      cutsVisible: true,
      zoneMode: "off" as "off" | "8" | "16",
      zoneAnalysis: [],
      floorPlanImage: null,
      notes: "",
      undoStack: [],

      // Floor defaults
      floors: [DEFAULT_FLOOR],
      currentFloorId: DEFAULT_FLOOR.id,

      // ── Floor actions ──────────────────────────────────────────────────────

      getProjectFloors: () => {
        const s = get();
        return s.floors.map((f) =>
          f.id === s.currentFloorId
            ? {
                ...f,
                canvasState: s.getCanvasState(),
                floorPlanImage: s.floorPlanImage,
                notes: s.notes,
                zoomLevel: s.zoomLevel,
                panX: s.panX,
                panY: s.panY,
              }
            : f
        );
      },

      addFloor: () => {
        const s = get();
        const nextNum = s.floors.length + 1;

        // Pack current floor state (including zoom/pan) before switching
        const packedFloors = s.floors.map((f) =>
          f.id === s.currentFloorId
            ? { ...f, canvasState: s.getCanvasState(), floorPlanImage: s.floorPlanImage, notes: s.notes, zoomLevel: s.zoomLevel, panX: s.panX, panY: s.panY }
            : f
        );

        const newFloor = makeFloor(`Floor ${nextNum}`, nextNum - 1, {
          northDeg: s.northDeg,
          northMethod: s.northMethod,
          scale: s.scale ?? undefined, // inherit shared scale
        });

        set({
          floors: [...packedFloors, newFloor],
          currentFloorId: newFloor.id,
          perimeterPoints: [],
          perimeterComplete: false,
          brahmaX: 380,
          brahmaY: 310,
          brahmaConfirmed: false,
          cuts: [],
          entrancePoints: [],
          facingDirection: null,
          floorPlanImage: null,
          notes: "",
          zoomLevel: 100,
          panX: 0,
          panY: 0,
          zoneAnalysis: [],
          undoStack: [],
        });
      },

      switchFloor: (targetId: string) => {
        const s = get();
        if (s.currentFloorId === targetId) return;

        // Pack current floor state including zoom/pan
        const packedFloors = s.floors.map((f) =>
          f.id === s.currentFloorId
            ? { ...f, canvasState: s.getCanvasState(), floorPlanImage: s.floorPlanImage, notes: s.notes, zoomLevel: s.zoomLevel, panX: s.panX, panY: s.panY }
            : f
        );

        const target = packedFloors.find((f) => f.id === targetId);
        if (!target) return;

        set({
          floors: packedFloors,
          currentFloorId: targetId,
          perimeterPoints: target.canvasState.perimeterPoints ?? [],
          perimeterComplete: target.canvasState.perimeterComplete ?? false,
          brahmaX: target.canvasState.brahmaX ?? 380,
          brahmaY: target.canvasState.brahmaY ?? 310,
          brahmaConfirmed: target.canvasState.brahmaConfirmed ?? false,
          cuts: target.canvasState.cuts ?? [],
          entrancePoints: target.canvasState.entrancePoints ?? [],
          facingDirection: target.canvasState.facingDirection ?? null,
          floorPlanImage: target.floorPlanImage ?? null,
          notes: target.notes ?? "",
          zoomLevel: target.zoomLevel ?? 100,
          panX: target.panX ?? 0,
          panY: target.panY ?? 0,
          zoneAnalysis: [],
          undoStack: [], // clear undo on floor switch
        });
        // northDeg and scale are NOT reset — they are shared across floors
      },

      deleteFloor: (id: string) => {
        const s = get();
        if (s.floors.length <= 1) return; // can't delete the last floor

        const remaining = s.floors.filter((f) => f.id !== id);

        if (s.currentFloorId === id) {
          // Switch to adjacent floor before deleting
          const deletedIdx = s.floors.findIndex((f) => f.id === id);
          const next = remaining[Math.min(deletedIdx, remaining.length - 1)];

          set({
            floors: remaining,
            currentFloorId: next.id,
            perimeterPoints: next.canvasState.perimeterPoints ?? [],
            perimeterComplete: next.canvasState.perimeterComplete ?? false,
            brahmaX: next.canvasState.brahmaX ?? 380,
            brahmaY: next.canvasState.brahmaY ?? 310,
            brahmaConfirmed: next.canvasState.brahmaConfirmed ?? false,
            cuts: next.canvasState.cuts ?? [],
            entrancePoints: next.canvasState.entrancePoints ?? [],
            facingDirection: next.canvasState.facingDirection ?? null,
            floorPlanImage: next.floorPlanImage ?? null,
            notes: next.notes ?? "",
            zoomLevel: next.zoomLevel ?? 100,
            panX: next.panX ?? 0,
            panY: next.panY ?? 0,
            zoneAnalysis: [],
            undoStack: [],
          });
        } else {
          set({ floors: remaining });
        }
      },

      renameFloor: (id: string, name: string) => {
        set((s) => ({
          floors: s.floors.map((f) => (f.id === id ? { ...f, name } : f)),
        }));
      },

      // ── Project metadata ───────────────────────────────────────────────────

      setProjectName: (name) => set({ projectName: name }),
      setClientName: (name) => set({ clientName: name }),
      setProjectId: (id) => set({ projectId: id }),

      setTool: (tool) => set({ currentTool: tool }),

      // ── North — synced to all floors ───────────────────────────────────────

      setNorth: (deg, method = "manual") => {
        const newDeg = Math.max(0, Math.min(360, deg));
        set((s) => ({
          northDeg: newDeg,
          northMethod: method,
          floors: s.floors.map((f) => ({
            ...f,
            canvasState: { ...f.canvasState, northDeg: newDeg, northMethod: method },
          })),
        }));
      },

      // ── Brahmasthan ────────────────────────────────────────────────────────

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

      // ── Perimeter ─────────────────────────────────────────────────────────

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

      // ── Cuts ──────────────────────────────────────────────────────────────

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

      clearCuts: () => {
        const prev = get().cuts;
        get().pushUndo({
          label: "Clear all cuts",
          undo: () => set({ cuts: prev }),
        });
        set({ cuts: [] });
      },

      // ── Scale — synced to all floors ───────────────────────────────────────

      setScale: (cal) => {
        const prev = get().scale;
        get().pushUndo({
          label: "Clear scale",
          undo: () => set({ scale: prev }),
        });
        set((s) => ({
          scale: cal,
          floors: s.floors.map((f) => ({
            ...f,
            canvasState: { ...f.canvasState, scale: cal },
          })),
        }));
      },

      clearScale: () => set({ scale: null }),

      // ── Entrances ─────────────────────────────────────────────────────────

      addEntrance: (marker) => {
        entranceIdCounter++;
        set((s) => ({
          entrancePoints: [
            ...s.entrancePoints,
            { ...marker, id: `entrance-${entranceIdCounter}` },
          ],
        }));
      },

      setFacingDirection: (deg) => set({ facingDirection: deg }),

      // ── Zoom / Chakra ──────────────────────────────────────────────────────

      setZoom: (z) => set({ zoomLevel: Math.max(30, Math.min(300, z)) }),

      setPan: (x, y) => set({ panX: x, panY: y }),

      toggleChakra: () => set((s) => ({ chakraVisible: !s.chakraVisible })),
      setChakraOpacity: (v) => set({ chakraOpacity: v / 100 }),
      togglePerimeterVisible: () => set((s) => ({ perimeterVisible: !s.perimeterVisible })),
      toggleCutsVisible: () => set((s) => ({ cutsVisible: !s.cutsVisible })),
      setZoneMode: (mode) => set({ zoneMode: mode }),

      setZoneAnalysis: (results) => set({ zoneAnalysis: results }),

      setFloorPlanImage: (src) => set({ floorPlanImage: src }),

      setNotes: (n) => set({ notes: n }),

      // ── Undo ──────────────────────────────────────────────────────────────

      pushUndo: (action) =>
        set((s) => ({
          undoStack: [...s.undoStack.slice(-49), action],
        })),

      undo: () => {
        const stack = get().undoStack;
        if (stack.length === 0) return;
        const last = stack[stack.length - 1];
        last.undo();
        set((s) => ({ undoStack: s.undoStack.slice(0, -1) }));
      },

      // ── Load / Save ───────────────────────────────────────────────────────

      loadCanvasState: (state, projectId, projectName, clientName, incomingFloors?) => {
        let floorsToLoad: Floor[];

        if (incomingFloors && incomingFloors.length > 0) {
          floorsToLoad = incomingFloors;
        } else {
          // Legacy single-floor project or new project — wrap into Floor 1
          floorsToLoad = [
            {
              id: `floor-${Date.now()}-0`,
              name: "Floor 1",
              order: 0,
              canvasState: { ...BLANK_CANVAS_STATE, ...state } as CanvasState,
              floorPlanImage: null,
              notes: "",
            },
          ];
        }

        const first = floorsToLoad[0];
        const cs = first.canvasState;

        set({
          projectId,
          projectName,
          clientName,
          floors: floorsToLoad,
          currentFloorId: first.id,
          northDeg: cs.northDeg ?? 0,
          northMethod: cs.northMethod ?? "manual",
          brahmaX: cs.brahmaX ?? 380,
          brahmaY: cs.brahmaY ?? 310,
          brahmaConfirmed: cs.brahmaConfirmed ?? false,
          perimeterPoints: cs.perimeterPoints ?? [],
          perimeterComplete: cs.perimeterComplete ?? false,
          cuts: cs.cuts ?? [],
          entrancePoints: cs.entrancePoints ?? [],
          facingDirection: cs.facingDirection ?? null,
          scale: cs.scale ?? null,
          floorPlanImage: first.floorPlanImage ?? null,
          notes: first.notes ?? "",
          zoomLevel: first.zoomLevel ?? 100,
          panX: first.panX ?? 0,
          panY: first.panY ?? 0,
          undoStack: [],
          zoneAnalysis: [],
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
