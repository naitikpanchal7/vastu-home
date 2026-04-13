// src/store/builderStore.ts
// Zustand store for the Custom Floor Plan Builder

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Point } from "@/lib/vastu/geometry";
import type { RoomType } from "@/lib/builder/roomTypes";
import type { RoomShape, ShapeConfig } from "@/lib/builder/presetShapes";
import type { FurnitureItem } from "@/lib/builder/furniture";
import { getShapePoints, rotatePoints, boundingBox, scalePoints } from "@/lib/builder/presetShapes";
import { ROOM_TYPES } from "@/lib/builder/roomTypes";

// ── Scale ─────────────────────────────────────────────────────────────────────
export const SCALE = 20; // pixels per foot — 1ft = 20px

// ── Data shapes ───────────────────────────────────────────────────────────────

/** A room template stored in the left-panel library (not yet placed). */
export interface RoomTemplate {
  id: string;
  name: string;
  type: RoomType;
  shape: RoomShape;
  widthFt: number;
  heightFt: number;
  shapeConfig?: ShapeConfig;
  /** Local polygon points in feet (origin = top-left of bounding box). */
  localPoints: Point[];
}

/** A room that has been placed on the canvas. */
export interface PlacedRoom {
  id: string;
  templateId: string;
  name: string;
  type: RoomType;
  /** Top-left canvas position in pixels. */
  x: number;
  y: number;
  /** Rotation: 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270° */
  rotation: 0 | 1 | 2 | 3;
  /** Local polygon points in feet (post-rotation, normalised to top-left origin). */
  localPoints: Point[];
  /** Bounding box in feet post-rotation. */
  widthFt: number;
  heightFt: number;
  color: string;
  borderColor: string;
  /** Whether this room was drawn freehand (no fixed shape type) */
  isCustomDrawn?: boolean;
}

/** A piece of furniture placed on the canvas. */
export interface PlacedFurniture {
  id: string;
  templateId: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  widthFt: number;
  heightFt: number;
  /** The Vastu zone short-name the item currently sits in (computed externally). */
  currentZone?: string;
}

// ── Store shape ───────────────────────────────────────────────────────────────

interface BuilderStore {
  // Room library (templates created in the left panel)
  roomTemplates: RoomTemplate[];
  addRoomTemplate: (
    name: string,
    type: RoomType,
    shape: RoomShape,
    widthFt: number,
    heightFt: number,
    shapeConfig?: ShapeConfig
  ) => void;
  deleteRoomTemplate: (id: string) => void;
  updateRoomTemplate: (
    id: string,
    updates: Partial<Pick<RoomTemplate, "name" | "type" | "shape" | "widthFt" | "heightFt" | "shapeConfig">>
  ) => void;

  // Placed rooms on canvas
  placedRooms: PlacedRoom[];
  addPlacedRoom: (templateId: string) => void;
  /** Create a placed room from freehand-drawn canvas-space points. */
  addPlacedRoomFromDrawing: (name: string, type: RoomType, canvasPoints: Point[]) => void;
  removePlacedRoom: (id: string) => void;
  movePlacedRoom: (id: string, x: number, y: number) => void;
  rotatePlacedRoom: (id: string) => void;
  /** Move one vertex of a placed room to new absolute canvas coords. */
  updatePlacedRoomVertex: (roomId: string, vIdx: number, absX: number, absY: number) => void;
  selectedRoomId: string | null;
  selectRoom: (id: string | null) => void;

  // Draw mode — user is drawing a new room freehand on the canvas
  isDrawingRoom: boolean;
  setDrawingRoom: (v: boolean) => void;

  // Placed furniture on canvas
  placedFurniture: PlacedFurniture[];
  addPlacedFurniture: (item: FurnitureItem) => void;
  removePlacedFurniture: (id: string) => void;
  movePlacedFurniture: (id: string, x: number, y: number) => void;
  updateFurnitureZone: (id: string, zone: string) => void;
  selectedFurnitureId: string | null;
  selectFurniture: (id: string | null) => void;

  // Assembled perimeter (computed from placed rooms)
  assembledPerimeter: Point[];
  setAssembledPerimeter: (pts: Point[]) => void;

  // Clear entire canvas
  clearCanvas: () => void;
}

let templateCounter = 0;
let placedCounter = 0;
let furnitureCounter = 0;

export const useBuilderStore = create<BuilderStore>()(
  devtools(
    (set, get) => ({
      // ── Room templates ──────────────────────────────────────────────────────
      roomTemplates: [],

      addRoomTemplate: (name, type, shape, widthFt, heightFt, shapeConfig?) => {
        templateCounter++;
        const localPoints = getShapePoints(shape, widthFt, heightFt, shapeConfig);
        const template: RoomTemplate = {
          id: `tpl-${Date.now()}-${templateCounter}`,
          name: name.trim() || `Room ${templateCounter}`,
          type,
          shape,
          widthFt,
          heightFt,
          shapeConfig,
          localPoints,
        };
        set((s) => ({ roomTemplates: [...s.roomTemplates, template] }));
      },

      deleteRoomTemplate: (id) =>
        set((s) => ({ roomTemplates: s.roomTemplates.filter((t) => t.id !== id) })),

      updateRoomTemplate: (id, updates) => {
        set((s) => ({
          roomTemplates: s.roomTemplates.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...updates };
            if (next.shape !== "custom") {
              next.localPoints = getShapePoints(next.shape, next.widthFt, next.heightFt, next.shapeConfig);
            }
            return next;
          }),
        }));
      },

      // ── Placed rooms ────────────────────────────────────────────────────────
      placedRooms: [],

      addPlacedRoom: (templateId) => {
        const tpl = get().roomTemplates.find((t) => t.id === templateId);
        if (!tpl) return;

        placedCounter++;
        const config = ROOM_TYPES[tpl.type];

        const existing = get().placedRooms;
        const offsetX = 60 + (existing.length % 4) * (SCALE * 5);
        const offsetY = 60 + Math.floor(existing.length / 4) * (SCALE * 5);
        const snapX = Math.round(offsetX / SCALE) * SCALE;
        const snapY = Math.round(offsetY / SCALE) * SCALE;

        const placed: PlacedRoom = {
          id: `placed-${Date.now()}-${placedCounter}`,
          templateId,
          name: tpl.name,
          type: tpl.type,
          x: snapX,
          y: snapY,
          rotation: 0,
          localPoints: tpl.localPoints,
          widthFt: tpl.widthFt,
          heightFt: tpl.heightFt,
          color: config.color,
          borderColor: config.borderColor,
        };
        set((s) => ({ placedRooms: [...s.placedRooms, placed], selectedRoomId: placed.id }));
      },

      addPlacedRoomFromDrawing: (name, type, canvasPoints) => {
        if (canvasPoints.length < 3) return;

        // Snap all points to grid
        const snapped = canvasPoints.map((p) => ({
          x: Math.round(p.x / SCALE) * SCALE,
          y: Math.round(p.y / SCALE) * SCALE,
        }));

        const xs = snapped.map((p) => p.x);
        const ys = snapped.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        const localPoints = snapped.map((p) => ({
          x: (p.x - minX) / SCALE,
          y: (p.y - minY) / SCALE,
        }));

        const widthFt = (maxX - minX) / SCALE;
        const heightFt = (maxY - minY) / SCALE;

        // Create template
        templateCounter++;
        const tplId = `tpl-${Date.now()}-${templateCounter}`;
        const tpl: RoomTemplate = {
          id: tplId,
          name: name.trim() || "Custom Room",
          type,
          shape: "custom",
          widthFt,
          heightFt,
          localPoints,
        };

        // Create placed room
        placedCounter++;
        const typeConfig = ROOM_TYPES[type];
        const placed: PlacedRoom = {
          id: `placed-${Date.now()}-${placedCounter}`,
          templateId: tplId,
          name: tpl.name,
          type,
          x: minX,
          y: minY,
          rotation: 0,
          localPoints,
          widthFt,
          heightFt,
          color: typeConfig.color,
          borderColor: typeConfig.borderColor,
          isCustomDrawn: true,
        };

        set((s) => ({
          roomTemplates: [...s.roomTemplates, tpl],
          placedRooms: [...s.placedRooms, placed],
          selectedRoomId: placed.id,
          isDrawingRoom: false,
        }));
      },

      removePlacedRoom: (id) =>
        set((s) => ({
          placedRooms: s.placedRooms.filter((r) => r.id !== id),
          selectedRoomId: s.selectedRoomId === id ? null : s.selectedRoomId,
        })),

      movePlacedRoom: (id, x, y) => {
        const sx = Math.round(x / SCALE) * SCALE;
        const sy = Math.round(y / SCALE) * SCALE;
        set((s) => ({
          placedRooms: s.placedRooms.map((r) =>
            r.id === id ? { ...r, x: sx, y: sy } : r
          ),
        }));
      },

      rotatePlacedRoom: (id) => {
        set((s) => ({
          placedRooms: s.placedRooms.map((r) => {
            if (r.id !== id) return r;
            const nextRot = ((r.rotation + 1) % 4) as 0 | 1 | 2 | 3;

            // For custom-drawn rooms, rotate the existing localPoints directly
            const basePts = r.localPoints;
            const rotatedPts = rotatePoints(basePts, 1); // rotate by 1×90°
            const bb = boundingBox(rotatedPts);
            return {
              ...r,
              rotation: nextRot,
              localPoints: rotatedPts,
              widthFt: bb.w,
              heightFt: bb.h,
            };
          }),
        }));
      },

      updatePlacedRoomVertex: (roomId, vIdx, absX, absY) => {
        // Snap the dragged point to grid
        const snapAbsX = Math.round(absX / SCALE) * SCALE;
        const snapAbsY = Math.round(absY / SCALE) * SCALE;

        set((s) => ({
          placedRooms: s.placedRooms.map((room) => {
            if (room.id !== roomId) return room;

            // Compute current absolute canvas positions of all vertices
            const absPoints = room.localPoints.map((lp) => ({
              x: room.x + lp.x * SCALE,
              y: room.y + lp.y * SCALE,
            }));

            // Update the dragged vertex
            absPoints[vIdx] = { x: snapAbsX, y: snapAbsY };

            // Re-normalise bounding box
            const xs = absPoints.map((p) => p.x);
            const ys = absPoints.map((p) => p.y);
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            const newLocalPts = absPoints.map((p) => ({
              x: (p.x - minX) / SCALE,
              y: (p.y - minY) / SCALE,
            }));

            return {
              ...room,
              x: minX,
              y: minY,
              localPoints: newLocalPts,
              widthFt: (maxX - minX) / SCALE,
              heightFt: (maxY - minY) / SCALE,
            };
          }),
        }));
      },

      selectedRoomId: null,
      selectRoom: (id) => set({ selectedRoomId: id, selectedFurnitureId: null }),

      // ── Draw mode ───────────────────────────────────────────────────────────
      isDrawingRoom: false,
      setDrawingRoom: (v) => set({ isDrawingRoom: v, selectedRoomId: null, selectedFurnitureId: null }),

      // ── Placed furniture ────────────────────────────────────────────────────
      placedFurniture: [],

      addPlacedFurniture: (item) => {
        furnitureCounter++;
        const existing = get().placedFurniture;
        const offsetX = 200 + (existing.length % 5) * (SCALE * 3);
        const offsetY = 200 + Math.floor(existing.length / 5) * (SCALE * 3);
        const placed: PlacedFurniture = {
          id: `furn-${Date.now()}-${furnitureCounter}`,
          templateId: item.id,
          name: item.name,
          emoji: item.emoji,
          x: Math.round(offsetX / SCALE) * SCALE,
          y: Math.round(offsetY / SCALE) * SCALE,
          widthFt: item.widthFt,
          heightFt: item.heightFt,
        };
        set((s) => ({
          placedFurniture: [...s.placedFurniture, placed],
          selectedFurnitureId: placed.id,
          selectedRoomId: null,
        }));
      },

      removePlacedFurniture: (id) =>
        set((s) => ({
          placedFurniture: s.placedFurniture.filter((f) => f.id !== id),
          selectedFurnitureId: s.selectedFurnitureId === id ? null : s.selectedFurnitureId,
        })),

      movePlacedFurniture: (id, x, y) => {
        const sx = Math.round(x / SCALE) * SCALE;
        const sy = Math.round(y / SCALE) * SCALE;
        set((s) => ({
          placedFurniture: s.placedFurniture.map((f) =>
            f.id === id ? { ...f, x: sx, y: sy } : f
          ),
        }));
      },

      updateFurnitureZone: (id, zone) =>
        set((s) => ({
          placedFurniture: s.placedFurniture.map((f) =>
            f.id === id ? { ...f, currentZone: zone } : f
          ),
        })),

      selectedFurnitureId: null,
      selectFurniture: (id) => set({ selectedFurnitureId: id, selectedRoomId: null }),

      // ── Assembled perimeter ─────────────────────────────────────────────────
      assembledPerimeter: [],
      setAssembledPerimeter: (pts) => set({ assembledPerimeter: pts }),

      // ── Clear canvas ────────────────────────────────────────────────────────
      clearCanvas: () =>
        set({
          placedRooms: [],
          placedFurniture: [],
          assembledPerimeter: [],
          selectedRoomId: null,
          selectedFurnitureId: null,
          isDrawingRoom: false,
        }),
    }),
    { name: "vastu-builder-store" }
  )
);

// ── Helper: get canvas-space polygon for a placed room ────────────────────────
export function getPlacedRoomCanvasPoints(room: PlacedRoom): Point[] {
  return scalePoints(room.localPoints, SCALE, room.x, room.y);
}
