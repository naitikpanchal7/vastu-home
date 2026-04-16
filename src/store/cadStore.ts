// src/store/cadStore.ts
// Zustand store for the Paper.js CAD floor plan builder

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { polygonArea } from '@/lib/vastu/geometry';
import type { ZoneAnalysis } from '@/lib/types';
import type {
  CADTool,
  CADNode,
  CADWall,
  CADOpening,
  CADFurniture,
  CADCut,
  CADSelectedItem,
  WallType,
} from '@/lib/paper-geometry/types';

// ── History snapshot ──────────────────────────────────────────────────────────

interface HistorySnapshot {
  nodes: Record<string, CADNode>;
  walls: CADWall[];
  openings: CADOpening[];
  furniture: CADFurniture[];
  cuts: CADCut[];
}

function snapshot(s: HistorySnapshot): HistorySnapshot {
  return {
    nodes: { ...s.nodes },
    walls: s.walls.map((w) => ({ ...w })),
    openings: s.openings.map((o) => ({ ...o })),
    furniture: s.furniture.map((f) => ({ ...f })),
    cuts: s.cuts.map((c) => ({ ...c, points: [...c.points] })),
  };
}

// ── ID helpers ────────────────────────────────────────────────────────────────

let _seq = 0;
function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${++_seq}`;
}

// ── Store interface ───────────────────────────────────────────────────────────

interface CADStore {
  // ── Entity data ──────────────────────────────────────────────────────────
  nodes: Record<string, CADNode>;
  walls: CADWall[];
  openings: CADOpening[];
  furniture: CADFurniture[];
  cuts: CADCut[];

  // ── Tool state ───────────────────────────────────────────────────────────
  activeTool: CADTool;

  // ── Selection ────────────────────────────────────────────────────────────
  selection: CADSelectedItem[];

  // ── Grid / snap ──────────────────────────────────────────────────────────
  gridSize: number;   // project pixels between grid lines
  showGrid: boolean;
  showDimensions: boolean;
  snapEnabled: boolean;

  // ── Units ────────────────────────────────────────────────────────────────
  unit: 'ft' | 'm';
  pixelsPerUnit: number; // calibrated (px per ft/m)

  // ── Furniture palette ────────────────────────────────────────────────────
  activeFurnitureTemplateId: string | null;

  // ── History ──────────────────────────────────────────────────────────────
  history: HistorySnapshot[];
  historyIndex: number; // current position in history; -1 = before any snapshot

  // ── Actions ──────────────────────────────────────────────────────────────

  setActiveTool: (tool: CADTool) => void;
  setSelection: (items: CADSelectedItem[]) => void;
  clearSelection: () => void;

  // Node ops
  addNode: (x: number, y: number) => string;
  updateNode: (id: string, x: number, y: number) => void;
  findOrAddNode: (x: number, y: number, threshold?: number) => string;

  // Wall ops
  addWall: (
    type: WallType,
    startNodeId: string,
    endNodeId: string,
    extra?: Partial<CADWall>
  ) => string;
  updateWall: (id: string, update: Partial<CADWall>) => void;
  deleteWall: (id: string) => void;
  splitWall: (wallId: string, x: number, y: number) => [string, string] | null;

  // Opening ops
  addOpening: (opening: Omit<CADOpening, 'id'>) => string;
  updateOpening: (id: string, update: Partial<CADOpening>) => void;
  deleteOpening: (id: string) => void;

  // Furniture ops
  addFurniture: (f: Omit<CADFurniture, 'id'>) => string;
  updateFurniture: (id: string, update: Partial<CADFurniture>) => void;
  deleteFurniture: (id: string) => void;
  setActiveFurnitureTemplate: (id: string | null) => void;

  // Cut ops
  addCut: (points: { x: number; y: number }[]) => string;
  removeCut: (id: string) => void;
  clearCuts: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Settings
  setGridSize: (size: number) => void;
  setShowGrid: (v: boolean) => void;
  setShowDimensions: (v: boolean) => void;
  setSnapEnabled: (v: boolean) => void;
  setUnit: (unit: 'ft' | 'm', ppu: number) => void;

  // ── Builder display state (isolated from canvasStore) ────────────────────
  northDeg: number;
  setNorth: (deg: number) => void;
  brahmaX: number;
  brahmaY: number;
  brahmaConfirmed: boolean;
  setBrahma: (x: number, y: number) => void;
  chakraVisible: boolean;
  chakraOpacity: number;
  toggleChakra: () => void;
  setChakraOpacity: (pct: number) => void;
  zoneAnalysis: ZoneAnalysis[];
  setZoneAnalysis: (analysis: ZoneAnalysis[]) => void;

  // Derived helpers
  getNode: (id: string) => CADNode | undefined;
  getWallNodes: (wallId: string) => { start: CADNode; end: CADNode } | null;
  getWallLength: (wallId: string) => number;
  getLargestClosedPolygon: () => { x: number; y: number }[] | null;
  getTotalArea: () => number; // px²

  // Reset
  reset: () => void;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS = {
  nodes: {} as Record<string, CADNode>,
  walls: [] as CADWall[],
  openings: [] as CADOpening[],
  furniture: [] as CADFurniture[],
  cuts: [] as CADCut[],
  activeTool: 'select' as CADTool,
  selection: [] as CADSelectedItem[],
  gridSize: 30,        // 30px default grid — ~2ft at 15px/ft
  showGrid: true,
  showDimensions: true,
  snapEnabled: true,
  unit: 'ft' as const,
  pixelsPerUnit: 15,   // 15px per foot default (can be calibrated)
  activeFurnitureTemplateId: null as string | null,
  history: [] as HistorySnapshot[],
  historyIndex: -1,
  // Builder display state — fully isolated from canvasStore
  northDeg: 0,
  brahmaX: 0,
  brahmaY: 0,
  brahmaConfirmed: false,
  chakraVisible: false,
  chakraOpacity: 0.35,
  zoneAnalysis: [] as ZoneAnalysis[],
};

// ── Closed polygon detection ──────────────────────────────────────────────────

function detectClosedPolygon(
  nodes: Record<string, CADNode>,
  walls: CADWall[]
): { x: number; y: number }[] | null {
  const lineWalls = walls.filter((w) => w.type === 'line');
  if (lineWalls.length < 3) return null;

  // Build adjacency list
  const adj = new Map<string, Array<{ nodeId: string; wallId: string }>>();
  for (const w of lineWalls) {
    if (!nodes[w.startNodeId] || !nodes[w.endNodeId]) continue;
    if (!adj.has(w.startNodeId)) adj.set(w.startNodeId, []);
    if (!adj.has(w.endNodeId)) adj.set(w.endNodeId, []);
    adj.get(w.startNodeId)!.push({ nodeId: w.endNodeId, wallId: w.id });
    adj.get(w.endNodeId)!.push({ nodeId: w.startNodeId, wallId: w.id });
  }

  const polygons: { x: number; y: number }[][] = [];
  const globalVisited = new Set<string>();

  for (const [startId, neighbors] of adj.entries()) {
    if (globalVisited.has(startId) || neighbors.length < 2) continue;

    const poly: { x: number; y: number }[] = [];
    const inPoly = new Set<string>();
    let cur = startId;
    let prev = '';
    let valid = true;

    for (let step = 0; step <= lineWalls.length + 1; step++) {
      if (step > 0 && cur === startId) break; // closed!
      if (inPoly.has(cur)) { valid = false; break; }

      const node = nodes[cur];
      if (!node) { valid = false; break; }
      const nbrs = adj.get(cur);
      if (!nbrs || nbrs.length < 1) { valid = false; break; }

      poly.push({ x: node.x, y: node.y });
      inPoly.add(cur);

      // Pick the neighbor that isn't where we came from
      const next = nbrs.find((n) => n.nodeId !== prev) ?? nbrs[0];
      if (!next) { valid = false; break; }

      prev = cur;
      cur = next.nodeId;
    }

    if (valid && cur === startId && poly.length >= 3) {
      polygons.push(poly);
      poly.forEach((_, i) => {
        // We need node IDs here — rebuild from poly traversal
      });
      inPoly.forEach((id) => globalVisited.add(id));
    }
  }

  if (polygons.length === 0) return null;
  return polygons.reduce((a, b) => (polygonArea(a) >= polygonArea(b) ? a : b));
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useCadStore = create<CADStore>()(
  devtools(
    (set, get) => ({
      ...DEFAULTS,

      // ── Tool ──────────────────────────────────────────────────────────────

      setActiveTool: (tool) => set({ activeTool: tool }),

      // ── Selection ─────────────────────────────────────────────────────────

      setSelection: (items) => set({ selection: items }),
      clearSelection: () => set({ selection: [] }),

      // ── Node ops ──────────────────────────────────────────────────────────

      addNode: (x, y) => {
        const id = uid('node');
        set((s) => ({ nodes: { ...s.nodes, [id]: { id, x, y } } }));
        return id;
      },

      updateNode: (id, x, y) => {
        set((s) => ({
          nodes: { ...s.nodes, [id]: { ...s.nodes[id], x, y } },
        }));
      },

      /** Returns existing node within threshold, or creates a new one */
      findOrAddNode: (x, y, threshold = 5) => {
        const nodes = get().nodes;
        for (const node of Object.values(nodes)) {
          const d = Math.hypot(node.x - x, node.y - y);
          if (d <= threshold) return node.id;
        }
        return get().addNode(x, y);
      },

      // ── Wall ops ──────────────────────────────────────────────────────────

      addWall: (type, startNodeId, endNodeId, extra = {}) => {
        const id = uid('wall');
        const wall: CADWall = {
          id,
          type,
          startNodeId,
          endNodeId,
          thickness: 8,
          color: '#c8af78',
          locked: false,
          ...extra,
        };
        set((s) => ({ walls: [...s.walls, wall] }));
        return id;
      },

      updateWall: (id, update) => {
        set((s) => ({
          walls: s.walls.map((w) => (w.id === id ? { ...w, ...update } : w)),
        }));
      },

      deleteWall: (id) => {
        set((s) => {
          const wall = s.walls.find((w) => w.id === id);
          if (!wall) return {};
          const newWalls = s.walls.filter((w) => w.id !== id);
          // Remove openings on this wall
          const newOpenings = s.openings.filter((o) => o.wallId !== id);
          // Clean up orphan nodes (nodes with no remaining walls)
          const usedNodeIds = new Set<string>();
          newWalls.forEach((w) => {
            usedNodeIds.add(w.startNodeId);
            usedNodeIds.add(w.endNodeId);
          });
          const newNodes = Object.fromEntries(
            Object.entries(s.nodes).filter(([nid]) => usedNodeIds.has(nid))
          );
          return { walls: newWalls, openings: newOpenings, nodes: newNodes };
        });
      },

      splitWall: (wallId, x, y) => {
        const s = get();
        const wall = s.walls.find((w) => w.id === wallId);
        if (!wall || wall.type !== 'line') return null;

        s.pushHistory();

        const midNodeId = s.findOrAddNode(x, y, 1);

        const wall1Id = uid('wall');
        const wall2Id = uid('wall');

        const wall1: CADWall = { ...wall, id: wall1Id, endNodeId: midNodeId };
        const wall2: CADWall = { ...wall, id: wall2Id, startNodeId: midNodeId };

        const openingsOnWall = s.openings.filter((o) => o.wallId === wallId);
        const startNode = s.nodes[wall.startNodeId];
        const endNode = s.nodes[wall.endNodeId];
        const midNode = s.nodes[midNodeId];

        if (!startNode || !endNode || !midNode) return null;

        const totalLen = Math.hypot(
          endNode.x - startNode.x,
          endNode.y - startNode.y
        );
        const splitPos =
          Math.hypot(midNode.x - startNode.x, midNode.y - startNode.y) /
          totalLen;

        // Re-assign openings to appropriate half
        const newOpenings = s.openings.filter((o) => o.wallId !== wallId);
        for (const op of openingsOnWall) {
          if (op.positionAlongWall <= splitPos) {
            newOpenings.push({
              ...op,
              wallId: wall1Id,
              positionAlongWall: op.positionAlongWall / splitPos,
            });
          } else {
            newOpenings.push({
              ...op,
              wallId: wall2Id,
              positionAlongWall:
                (op.positionAlongWall - splitPos) / (1 - splitPos),
            });
          }
        }

        set((st) => ({
          walls: [
            ...st.walls.filter((w) => w.id !== wallId),
            wall1,
            wall2,
          ],
          openings: newOpenings,
        }));

        return [wall1Id, wall2Id];
      },

      // ── Opening ops ───────────────────────────────────────────────────────

      addOpening: (opening) => {
        const id = uid('opening');
        set((s) => ({
          openings: [...s.openings, { ...opening, id }],
        }));
        return id;
      },

      updateOpening: (id, update) => {
        set((s) => ({
          openings: s.openings.map((o) =>
            o.id === id ? { ...o, ...update } : o
          ),
        }));
      },

      deleteOpening: (id) => {
        set((s) => ({
          openings: s.openings.filter((o) => o.id !== id),
        }));
      },

      // ── Furniture ops ─────────────────────────────────────────────────────

      addFurniture: (f) => {
        const id = uid('furn');
        set((s) => ({
          furniture: [...s.furniture, { ...f, id }],
        }));
        return id;
      },

      updateFurniture: (id, update) => {
        set((s) => ({
          furniture: s.furniture.map((f) =>
            f.id === id ? { ...f, ...update } : f
          ),
        }));
      },

      deleteFurniture: (id) => {
        set((s) => ({
          furniture: s.furniture.filter((f) => f.id !== id),
        }));
      },

      setActiveFurnitureTemplate: (id) =>
        set({ activeFurnitureTemplateId: id }),

      // ── Cut ops ───────────────────────────────────────────────────────────

      addCut: (points) => {
        const id = uid('cut');
        const nextNum = get().cuts.length + 1;
        set((s) => ({
          cuts: [...s.cuts, { id, label: `Cut #${nextNum}`, points }],
        }));
        return id;
      },

      removeCut: (id) => {
        set((s) => ({ cuts: s.cuts.filter((c) => c.id !== id) }));
      },

      clearCuts: () => set({ cuts: [] }),

      // ── History ───────────────────────────────────────────────────────────

      pushHistory: () => {
        const s = get();
        const snap = snapshot({
          nodes: s.nodes,
          walls: s.walls,
          openings: s.openings,
          furniture: s.furniture,
          cuts: s.cuts,
        });
        // Truncate redo tail and push
        const newHistory = [
          ...s.history.slice(0, s.historyIndex + 1).slice(-49),
          snap,
        ];
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },

      undo: () => {
        const s = get();
        if (s.historyIndex <= 0) return;
        const prev = s.history[s.historyIndex - 1];
        set({ ...prev, historyIndex: s.historyIndex - 1 });
      },

      redo: () => {
        const s = get();
        if (s.historyIndex >= s.history.length - 1) return;
        const next = s.history[s.historyIndex + 1];
        set({ ...next, historyIndex: s.historyIndex + 1 });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // ── Settings ──────────────────────────────────────────────────────────

      setGridSize: (size) => set({ gridSize: Math.max(5, size) }),
      setShowGrid: (v) => set({ showGrid: v }),
      setShowDimensions: (v) => set({ showDimensions: v }),
      setSnapEnabled: (v) => set({ snapEnabled: v }),
      setUnit: (unit, ppu) => set({ unit, pixelsPerUnit: ppu }),

      // ── Builder display state ─────────────────────────────────────────────

      setNorth: (deg) => set({ northDeg: deg }),
      setBrahma: (x, y) => set({ brahmaX: x, brahmaY: y, brahmaConfirmed: true }),
      toggleChakra: () => set((s) => ({ chakraVisible: !s.chakraVisible })),
      setChakraOpacity: (pct) => set({ chakraOpacity: pct / 100 }),
      setZoneAnalysis: (analysis) => set({ zoneAnalysis: analysis }),

      // ── Derived ───────────────────────────────────────────────────────────

      getNode: (id) => get().nodes[id],

      getWallNodes: (wallId) => {
        const s = get();
        const wall = s.walls.find((w) => w.id === wallId);
        if (!wall) return null;
        const start = s.nodes[wall.startNodeId];
        const end = s.nodes[wall.endNodeId];
        if (!start || !end) return null;
        return { start, end };
      },

      getWallLength: (wallId) => {
        const nodes = get().getWallNodes(wallId);
        if (!nodes) return 0;
        return Math.hypot(
          nodes.end.x - nodes.start.x,
          nodes.end.y - nodes.start.y
        );
      },

      getLargestClosedPolygon: () =>
        detectClosedPolygon(get().nodes, get().walls),

      getTotalArea: () => {
        const poly = detectClosedPolygon(get().nodes, get().walls);
        return poly ? polygonArea(poly) : 0;
      },

      // ── Reset ─────────────────────────────────────────────────────────────

      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'vastu-cad-store' }
  )
);
