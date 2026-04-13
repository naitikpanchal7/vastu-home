// src/lib/builder/presetShapes.ts
// Generates polygon point arrays (in feet) for preset room shapes.
// Origin is always the top-left corner of the bounding box.

import type { Point } from "@/lib/vastu/geometry";

export type RoomShape =
  | "rectangle"
  | "l-shape"
  | "t-shape"
  | "u-shape"
  | "diagonal-cut"
  | "custom";

/**
 * Optional per-shape sub-dimensions.
 * All values in feet. Defaults are applied when omitted.
 */
export interface ShapeConfig {
  // L-shape: size of the notch cut from one corner
  cutWidthFt?: number;
  cutHeightFt?: number;

  // T-shape: size of the central stem
  stemWidthFt?: number;
  barHeightFt?: number;

  // U-shape: width of each arm and how deep the opening is
  armWidthFt?: number;
  openingHeightFt?: number;

  // Diagonal-cut: size of the 45° corner chamfer
  chamferFt?: number;
}

/**
 * Returns local polygon points (in feet) for a given shape.
 * All shapes are normalised so origin = (0, 0) = top-left of bounding box.
 * @param shape   - one of the preset shapes
 * @param w       - bounding-box width in feet
 * @param h       - bounding-box height in feet
 * @param config  - optional per-shape sub-dimensions
 */
export function getShapePoints(
  shape: RoomShape,
  w: number,
  h: number,
  config?: ShapeConfig
): Point[] {
  switch (shape) {
    case "rectangle":
      return rectanglePoints(w, h);
    case "l-shape":
      return lShapePoints(w, h, config);
    case "t-shape":
      return tShapePoints(w, h, config);
    case "u-shape":
      return uShapePoints(w, h, config);
    case "diagonal-cut":
      return diagonalCutPoints(w, h, config);
    case "custom":
      // Custom shapes are built from explicit points — return a rectangle as placeholder
      return rectanglePoints(w, h);
    default:
      return rectanglePoints(w, h);
  }
}

// ── Shapes ────────────────────────────────────────────────────────────────────

function rectanglePoints(w: number, h: number): Point[] {
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
}

/**
 * L-shape: full rectangle minus one corner notch (bottom-right by default).
 *
 *  ┌──────────────┐
 *  │              │  ← (h - cutH)
 *  │        ┌─────┘
 *  │        │        ← cutH
 *  └────────┘
 *   (w-cutW)  cutW
 */
function lShapePoints(w: number, h: number, cfg?: ShapeConfig): Point[] {
  const cutW = clamp(cfg?.cutWidthFt  ?? round1(w * 0.4), 1, w - 1);
  const cutH = clamp(cfg?.cutHeightFt ?? round1(h * 0.45), 1, h - 1);
  const stemW = w - cutW; // width of the vertical part
  return [
    { x: 0,     y: 0     },
    { x: w,     y: 0     },
    { x: w,     y: h - cutH },
    { x: stemW, y: h - cutH },
    { x: stemW, y: h     },
    { x: 0,     y: h     },
  ];
}

/**
 * T-shape: top bar spans full width, a centred stem goes down.
 *
 *  ┌──────────────────┐
 *  │   bar  (barH)    │
 *  └──┬────────┬──────┘
 *     │  stem  │
 *     │(stemW) │
 *     └────────┘
 */
function tShapePoints(w: number, h: number, cfg?: ShapeConfig): Point[] {
  const barH  = clamp(cfg?.barHeightFt  ?? round1(h * 0.4), 1, h - 1);
  const stemW = clamp(cfg?.stemWidthFt  ?? round1(w * 0.4), 1, w - 2);
  const stemX = round1((w - stemW) / 2); // centred
  return [
    { x: 0,           y: 0    },
    { x: w,           y: 0    },
    { x: w,           y: barH },
    { x: stemX + stemW, y: barH },
    { x: stemX + stemW, y: h   },
    { x: stemX,        y: h   },
    { x: stemX,        y: barH },
    { x: 0,           y: barH },
  ];
}

/**
 * U-shape: two side arms connected by a bottom slab, open at the top centre.
 *
 *  ┌────┐          ┌────┐
 *  │left│          │rgt │
 *  │arm │          │arm │
 *  │    └──────────┘    │
 *  │       bottom       │
 *  └────────────────────┘
 */
function uShapePoints(w: number, h: number, cfg?: ShapeConfig): Point[] {
  const armW    = clamp(cfg?.armWidthFt       ?? round1(w * 0.28), 1, w / 2 - 1);
  const openH   = clamp(cfg?.openingHeightFt  ?? round1(h * 0.5),  1, h - 1);
  return [
    { x: 0,       y: 0       },
    { x: armW,    y: 0       },
    { x: armW,    y: h - openH },
    { x: w - armW, y: h - openH },
    { x: w - armW, y: 0      },
    { x: w,       y: 0       },
    { x: w,       y: h       },
    { x: 0,       y: h       },
  ];
}

/**
 * Diagonal-cut: rectangle with one corner chamfered at 45°.
 * Useful for Vastu-compliant homes where the NE corner is cut.
 *
 *        chamfer
 *       ╱
 *  ┌───╱────────────┐
 *  │                │
 *  │                │
 *  └────────────────┘
 */
function diagonalCutPoints(w: number, h: number, cfg?: ShapeConfig): Point[] {
  const ch = clamp(cfg?.chamferFt ?? round1(Math.min(w, h) * 0.25), 1, Math.min(w, h) - 1);
  return [
    { x: ch,  y: 0  },   // top-left start (after chamfer)
    { x: w,   y: 0  },
    { x: w,   y: h  },
    { x: 0,   y: h  },
    { x: 0,   y: ch },   // left side end (chamfer)
    // diagonal line back to (ch, 0) is implicit (closed polygon)
  ];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/**
 * Scale local points (in feet) to canvas pixels.
 * @param pts    - local points in feet
 * @param scale  - pixels per foot
 * @param ox     - canvas X offset (placement position)
 * @param oy     - canvas Y offset
 */
export function scalePoints(
  pts: Point[],
  scale: number,
  ox: number,
  oy: number
): Point[] {
  return pts.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }));
}

/**
 * Rotate local points around their bounding-box centre by 90° increments.
 * rotation = 0 | 1 | 2 | 3  (×90°)
 */
export function rotatePoints(pts: Point[], rotation: 0 | 1 | 2 | 3): Point[] {
  if (rotation === 0) return pts;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  let result = pts;
  for (let i = 0; i < rotation; i++) {
    result = result.map((p) => ({
      x: cx + (p.y - cy),
      y: cy - (p.x - cx),
    }));
  }

  // Re-normalise to (0,0) top-left
  const minX = Math.min(...result.map((p) => p.x));
  const minY = Math.min(...result.map((p) => p.y));
  return result.map((p) => ({ x: round1(p.x - minX), y: round1(p.y - minY) }));
}

/**
 * Bounding box width/height of a set of points (in whatever unit they use).
 */
export function boundingBox(pts: Point[]): { w: number; h: number } {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return {
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
}
