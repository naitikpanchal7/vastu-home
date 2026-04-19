// src/lib/vastu/canvasSnapshot.ts
// Renders floor plan + Vastu overlay onto an HTML5 Canvas, returns PNG data URL.
// Client-side only — never import in server components.

import type { Floor } from "@/lib/types";
import { VASTU_ZONES } from "./zones";

// Canvas output size — matches SVG viewBox so coordinates map 1 : 1
export const SNAP_W = 760;
export const SNAP_H = 620;

// ── Coordinate helpers ────────────────────────────────────────────────────────

/**
 * Vastu degree (0 = North, clockwise) → canvas radian.
 * Canvas: 0 rad = right, clockwise. So North (0°) → −π/2 (up).
 */
function toRad(vastuDeg: number): number {
  return ((vastuDeg - 90) * Math.PI) / 180;
}

/**
 * Draw image using xMidYMid meet (same as SVG preserveAspectRatio="xMidYMid meet").
 * The floor plan image lives INSIDE the SVG with this property, so all perimeter
 * points were placed relative to the letter-boxed image — we must replicate
 * exactly the same layout or the overlay won't align.
 */
function drawImageContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
  const iw    = img.naturalWidth  * scale;
  const ih    = img.naturalHeight * scale;
  const ox    = (cw - iw) / 2;
  const oy    = (ch - ih) / 2;
  ctx.drawImage(img, ox, oy, iw, ih);
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Drawing primitives ────────────────────────────────────────────────────────

/** Clip subsequent draw calls to the perimeter polygon. Call ctx.restore() when done. */
function clipToPerimeter(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>
): boolean {
  if (pts.length < 3) return false;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.clip();
  return true;
}

/** 16 zone boundary radial lines — gold, matching VastuCanvas SVG style. */
function drawZoneLines16(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number
) {
  const R = Math.hypot(SNAP_W, SNAP_H) * 1.5;
  ctx.save();
  ctx.strokeStyle = "rgba(200,175,120,0.7)";
  ctx.lineWidth   = 1.2;
  ctx.setLineDash([]);
  for (const zone of VASTU_ZONES) {
    const angle = toRad(zone.startDeg - northDeg);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.stroke();
  }
  ctx.restore();
}

/** 8 compass boundary radial lines — saffron, matching VastuCanvas SVG style. */
function drawZoneLines8(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number
) {
  const R = Math.hypot(SNAP_W, SNAP_H) * 1.5;
  const boundaries = [0, 45, 90, 135, 180, 225, 270, 315].map((d) => d - 22.5);
  ctx.save();
  ctx.strokeStyle = "rgba(232,145,42,0.9)";
  ctx.lineWidth   = 2;
  ctx.setLineDash([]);
  for (const deg of boundaries) {
    const angle = toRad(deg - northDeg);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.stroke();
  }
  ctx.restore();
}

/** Zone name labels — gold text with dark outline, matching canvas style. */
function drawZoneLabels16(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number,
  labelR: number
) {
  ctx.save();
  ctx.font = "bold 9px monospace";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  for (const zone of VASTU_ZONES) {
    const midDeg = (zone.startDeg + zone.endDeg) / 2;
    const angle  = toRad(midDeg - northDeg);
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.strokeStyle = "rgba(15,14,11,0.6)";
    ctx.lineWidth   = 3;
    ctx.lineJoin    = "round";
    ctx.strokeText(zone.shortName, lx, ly);
    ctx.fillStyle   = "#c8af78";
    ctx.fillText(zone.shortName, lx, ly);
  }
  ctx.restore();
}

/** Zone labels at large radius — placed OUTSIDE typical perimeters. */
function drawZoneLabelsOutside16(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number,
) {
  const R = Math.min(SNAP_W, SNAP_H) * 0.44;
  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  for (const zone of VASTU_ZONES) {
    const midDeg = (zone.startDeg + zone.endDeg) / 2;
    const angle  = toRad(midDeg - northDeg);
    const lx = Math.max(14, Math.min(SNAP_W - 14, cx + R * Math.cos(angle)));
    const ly = Math.max(14, Math.min(SNAP_H - 14, cy + R * Math.sin(angle)));
    ctx.strokeStyle = "rgba(15,14,11,0.6)";
    ctx.lineWidth   = 3;
    ctx.lineJoin    = "round";
    ctx.strokeText(zone.shortName, lx, ly);
    ctx.fillStyle   = "#c8af78";
    ctx.fillText(zone.shortName, lx, ly);
  }
  ctx.restore();
}

/** 8-direction labels at large radius — placed OUTSIDE typical perimeters. */
function drawZoneLabelsOutside8(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number,
) {
  const EIGHT = [
    { label: "N",  centerDeg: 0   },
    { label: "NE", centerDeg: 45  },
    { label: "E",  centerDeg: 90  },
    { label: "SE", centerDeg: 135 },
    { label: "S",  centerDeg: 180 },
    { label: "SW", centerDeg: 225 },
    { label: "W",  centerDeg: 270 },
    { label: "NW", centerDeg: 315 },
  ];
  const R = Math.min(SNAP_W, SNAP_H) * 0.44;
  ctx.save();
  ctx.font = "bold 12px monospace";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  for (const z of EIGHT) {
    const angle = toRad(z.centerDeg - northDeg);
    const lx = Math.max(16, Math.min(SNAP_W - 16, cx + R * Math.cos(angle)));
    const ly = Math.max(16, Math.min(SNAP_H - 16, cy + R * Math.sin(angle)));
    ctx.strokeStyle = "rgba(15,14,11,0.6)";
    ctx.lineWidth   = 3;
    ctx.lineJoin    = "round";
    ctx.strokeText(z.label, lx, ly);
    ctx.fillStyle   = "#e8912a";
    ctx.fillText(z.label, lx, ly);
  }
  ctx.restore();
}

function drawZoneLabels8(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number,
  labelR: number
) {
  const EIGHT = [
    { label: "N",  centerDeg: 0   },
    { label: "NE", centerDeg: 45  },
    { label: "E",  centerDeg: 90  },
    { label: "SE", centerDeg: 135 },
    { label: "S",  centerDeg: 180 },
    { label: "SW", centerDeg: 225 },
    { label: "W",  centerDeg: 270 },
    { label: "NW", centerDeg: 315 },
  ];
  ctx.save();
  ctx.font = "bold 11px monospace";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  for (const z of EIGHT) {
    const angle = toRad(z.centerDeg - northDeg);
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.strokeStyle = "rgba(15,14,11,0.6)";
    ctx.lineWidth   = 3;
    ctx.lineJoin    = "round";
    ctx.strokeText(z.label, lx, ly);
    ctx.fillStyle   = "#e8912a";
    ctx.fillText(z.label, lx, ly);
  }
  ctx.restore();
}

/**
 * Draw the /vastuchakra.png image centered on Brahmasthan, rotated by -northDeg.
 * Uses multiply composite to let the floor plan show through the white PNG background.
 */
async function drawChakraImage(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  northDeg: number,
  opacity = 0.75
): Promise<void> {
  const R = 250; // matches ShaktiChakra.tsx constant
  const img = await loadImage("/vastuchakra.png");
  if (!img) return;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-northDeg * Math.PI) / 180);
  ctx.globalAlpha = opacity;
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(img, -R, -R, R * 2, R * 2);
  ctx.restore();
}

/** Brahmasthan dot (concentric rings). */
function drawBrahmasthan(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  // Outer glow
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  // Gold ring
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
  ctx.strokeStyle = "#c8af78";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Gold fill
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
  ctx.fillStyle = "#c8af78";
  ctx.fill();
  // Centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, 2 * Math.PI);
  ctx.fillStyle = "#7a5a18";
  ctx.fill();
}

/** Perimeter outline — gold stroke, very light fill tint. */
function drawPerimeter(
  ctx: CanvasRenderingContext2D,
  pts: Array<{ x: number; y: number }>
) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.strokeStyle = "#c8af78";
  ctx.lineWidth   = 2.5;
  ctx.setLineDash([]);
  ctx.stroke();
  ctx.fillStyle = "rgba(200,175,120,0.07)";
  ctx.fill();
}

/** Cut regions — red dashed outline with semi-transparent fill. */
function drawCuts(
  ctx: CanvasRenderingContext2D,
  cuts: Array<{ points: Array<{ x: number; y: number }> }>
) {
  for (const cut of cuts) {
    if (cut.points.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(cut.points[0].x, cut.points[0].y);
    for (let i = 1; i < cut.points.length; i++) ctx.lineTo(cut.points[i].x, cut.points[i].y);
    ctx.closePath();
    ctx.fillStyle = "rgba(220,60,60,0.28)";
    ctx.fill();
    ctx.strokeStyle = "#e05050";
    ctx.lineWidth   = 2;
    ctx.setLineDash([5, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Compass rose + degree label (bottom-right corner). */
function drawNorthIndicator(
  ctx: CanvasRenderingContext2D,
  northDeg: number
) {
  const x = SNAP_W - 38;
  const y = SNAP_H - 38;
  const r = 22;

  // Dark pill background
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle   = "rgba(15,14,11,0.78)";
  ctx.fill();
  ctx.strokeStyle = "rgba(200,175,120,0.75)";
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  // Arrow tip points toward true north on the screen
  const arrowAngle = toRad(northDeg);
  const tipX  = x + (r - 6) * Math.cos(arrowAngle);
  const tipY  = y + (r - 6) * Math.sin(arrowAngle);
  const tailX = x - (r - 8) * Math.cos(arrowAngle);
  const tailY = y - (r - 8) * Math.sin(arrowAngle);

  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.strokeStyle = "#c8af78";
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Arrowhead
  const perp = arrowAngle + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - 5 * Math.cos(arrowAngle) + 4 * Math.cos(perp),
    tipY - 5 * Math.sin(arrowAngle) + 4 * Math.sin(perp)
  );
  ctx.lineTo(
    tipX - 5 * Math.cos(arrowAngle) - 4 * Math.cos(perp),
    tipY - 5 * Math.sin(arrowAngle) - 4 * Math.sin(perp)
  );
  ctx.closePath();
  ctx.fillStyle = "#c8af78";
  ctx.fill();

  // "N" + degree labels
  ctx.fillStyle    = "#e8d4a0";
  ctx.font         = "bold 8px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", x, y - 4);
  ctx.font      = "6px monospace";
  ctx.fillStyle = "rgba(200,175,120,0.75)";
  ctx.fillText(`${northDeg.toFixed(1)}°`, x, y + 6);
}

// ── Panchabhuta element definitions ───────────────────────────────────────────

// Maps zone shortName → Panchabhuta element
const ZONE_ELEMENT_MAP: Record<string, "fire" | "earth" | "water" | "air" | "space"> = {
  // Fire — SE quadrant
  ESE: "fire", SE: "fire", SSE: "fire",
  // Earth — SW quadrant
  S: "earth", SSW: "earth", SW: "earth", WSW: "earth",
  // Water — N and W
  N: "water", NNE: "water", W: "water",
  // Air — E, NW quadrant
  ENE: "air", E: "air", WNW: "air", NW: "air", NNW: "air",
  // Space — NE corner (most sattvic)
  NE: "space",
};

export const PANCHABHUTA = {
  fire:  { label: "Fire (Agni)",    color: "#e84020", english: "Fire"  },
  earth: { label: "Earth (Prithvi)",color: "#9a6010", english: "Earth" },
  water: { label: "Water (Jal)",    color: "#1860c0", english: "Water" },
  air:   { label: "Air (Vayu)",     color: "#38a850", english: "Air"   },
  space: { label: "Space (Akasha)", color: "#7040b8", english: "Space" },
} as const;

// ── Canvas factory ────────────────────────────────────────────────────────────

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width  = SNAP_W;
  c.height = SNAP_H;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f5f2ec";
  ctx.fillRect(0, 0, SNAP_W, SNAP_H);
  return [c, ctx];
}

// ── Snapshot generators ────────────────────────────────────────────────────────

/** Floor plan only — no overlay, just north indicator. */
export async function snapshotPlanOnly(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/** Floor plan + Brahmasthan marker only. */
export async function snapshotPlanWithBrahma(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  drawBrahmasthan(ctx, cs.brahmaX, cs.brahmaY);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/**
 * Floor plan + Vastu Chakra lines + Brahmasthan — NO perimeter, NO cuts.
 * Center and north are synced to the perimeter centroid (stored as brahmaX/Y).
 */
export async function snapshotPlanWithChakraOnly(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  const cx = cs.brahmaX;
  const cy = cs.brahmaY;

  // Draw the chakra PNG image centered on Brahmasthan with multiply blend
  await drawChakraImage(ctx, cx, cy, cs.northDeg);

  // Zone lines on top — clipped to perimeter for clean look, but perimeter NOT drawn
  if (cs.perimeterPoints.length >= 3) {
    ctx.save();
    clipToPerimeter(ctx, cs.perimeterPoints);
    drawZoneLines16(ctx, cx, cy, cs.northDeg);
    ctx.restore();
  } else {
    drawZoneLines16(ctx, cx, cy, cs.northDeg);
  }

  drawZoneLabels16(ctx, cx, cy, cs.northDeg, Math.min(SNAP_W, SNAP_H) * 0.28);
  drawBrahmasthan(ctx, cx, cy);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/** Floor plan + gold perimeter outline only. */
export async function snapshotPlanWithPerimeter(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  if (cs.perimeterPoints.length >= 3) drawPerimeter(ctx, cs.perimeterPoints);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/** Floor plan + cut regions only (no perimeter outline). */
export async function snapshotCutsOnly(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  if (cs.cuts.length > 0) drawCuts(ctx, cs.cuts);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/** Floor plan + perimeter + cuts (no chakra). */
export async function snapshotPerimeterAndCuts(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  if (cs.cuts.length > 0) drawCuts(ctx, cs.cuts);
  if (cs.perimeterPoints.length >= 3) drawPerimeter(ctx, cs.perimeterPoints);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/** Floor plan + perimeter + cuts + Vastu Chakra (full canvas composition). */
export async function snapshotPlanFull(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  const cx = cs.brahmaX;
  const cy = cs.brahmaY;

  // Chakra image first (behind zone lines)
  await drawChakraImage(ctx, cx, cy, cs.northDeg);

  if (cs.perimeterPoints.length >= 3) {
    ctx.save();
    clipToPerimeter(ctx, cs.perimeterPoints);
    drawZoneLines16(ctx, cx, cy, cs.northDeg);
    ctx.restore();
  }

  if (cs.cuts.length > 0) drawCuts(ctx, cs.cuts);
  if (cs.perimeterPoints.length >= 3) drawPerimeter(ctx, cs.perimeterPoints);

  drawBrahmasthan(ctx, cx, cy);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/**
 * 16-zone lines view: perimeter + zone division lines (clipped inside),
 * with zone labels placed OUTSIDE the perimeter boundary.
 */
export async function snapshotZoneLines16(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  const cx = cs.brahmaX;
  const cy = cs.brahmaY;

  // Zone lines clipped to perimeter
  if (cs.perimeterPoints.length >= 3) {
    ctx.save();
    clipToPerimeter(ctx, cs.perimeterPoints);
    drawZoneLines16(ctx, cx, cy, cs.northDeg);
    ctx.restore();
    drawPerimeter(ctx, cs.perimeterPoints);
  } else {
    drawZoneLines16(ctx, cx, cy, cs.northDeg);
  }

  // Labels at large radius — outside the perimeter
  drawZoneLabelsOutside16(ctx, cx, cy, cs.northDeg);
  drawBrahmasthan(ctx, cx, cy);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/**
 * 8-zone lines view: perimeter + 8-direction lines (clipped inside),
 * with compass labels placed OUTSIDE the perimeter boundary.
 */
export async function snapshotZoneLines8(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  const cx = cs.brahmaX;
  const cy = cs.brahmaY;

  // Zone lines clipped to perimeter
  if (cs.perimeterPoints.length >= 3) {
    ctx.save();
    clipToPerimeter(ctx, cs.perimeterPoints);
    drawZoneLines8(ctx, cx, cy, cs.northDeg);
    ctx.restore();
    drawPerimeter(ctx, cs.perimeterPoints);
  } else {
    drawZoneLines8(ctx, cx, cy, cs.northDeg);
  }

  // Labels at large radius — outside the perimeter
  drawZoneLabelsOutside8(ctx, cx, cy, cs.northDeg);
  drawBrahmasthan(ctx, cx, cy);
  drawNorthIndicator(ctx, cs.northDeg);
  return canvas.toDataURL("image/png");
}

/**
 * Floor plan + 5-element Panchabhuta zone fills (colored by element, clipped to perimeter)
 * + thin white division lines + labels + perimeter + north.
 */
export async function snapshotPanchabhuta(
  floor: Floor,
  imageDataUrl: string | null
): Promise<string> {
  const [canvas, ctx] = makeCanvas();
  const cs = floor.canvasState;
  const R  = Math.hypot(SNAP_W, SNAP_H) * 1.5;

  if (imageDataUrl) {
    const img = await loadImage(imageDataUrl);
    if (img) drawImageContain(ctx, img, SNAP_W, SNAP_H);
  }

  const cx = cs.brahmaX;
  const cy = cs.brahmaY;
  const northDeg = cs.northDeg;

  // Draw element-colored wedge fills, clipped to perimeter
  ctx.save();
  if (cs.perimeterPoints.length >= 3) clipToPerimeter(ctx, cs.perimeterPoints);

  for (const zone of VASTU_ZONES) {
    const elem  = ZONE_ELEMENT_MAP[zone.shortName];
    if (!elem) continue;
    const color = PANCHABHUTA[elem].color;
    let s = zone.startDeg - northDeg;
    let e = zone.endDeg   - northDeg;
    if (s > e) e += 360;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, toRad(s), toRad(e));
    ctx.closePath();
    ctx.fillStyle = color + "55"; // ~33% opacity fill
    ctx.fill();
  }

  // Thin white zone boundary lines on top of fills
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth   = 0.8;
  for (const zone of VASTU_ZONES) {
    const angle = toRad(zone.startDeg - northDeg);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(angle), cy + R * Math.sin(angle));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Perimeter + labels
  if (cs.perimeterPoints.length >= 3) drawPerimeter(ctx, cs.perimeterPoints);

  const labelR = Math.min(SNAP_W, SNAP_H) * 0.28;
  ctx.save();
  ctx.font         = "bold 9px sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  for (const zone of VASTU_ZONES) {
    const elem  = ZONE_ELEMENT_MAP[zone.shortName];
    const color = elem ? PANCHABHUTA[elem].color : "#888888";
    const midDeg = (zone.startDeg + zone.endDeg) / 2;
    const angle  = toRad(midDeg - northDeg);
    const lx = cx + labelR * Math.cos(angle);
    const ly = cy + labelR * Math.sin(angle);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(zone.shortName, lx + 1, ly + 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(zone.shortName, lx, ly);
  }
  ctx.restore();

  drawBrahmasthan(ctx, cx, cy);
  drawNorthIndicator(ctx, cs.northDeg);

  return canvas.toDataURL("image/png");
}

// ── FloorSnapshots type ────────────────────────────────────────────────────────

export interface FloorSnapshots {
  planOnly:          string;  // page 3: just image + north
  planBrahma:        string;  // page 4: image + brahmasthan
  planChakra:        string;  // page 5: image + chakra (no perimeter/cuts)
  planPerimeter:     string;  // page 6: image + perimeter only
  planCutsOnly:      string;  // page 7: cuts only (no perimeter)
  planPerimeterCuts: string;  // page 8: perimeter + cuts
  planFull:          string;  // page 9: perimeter + cuts + chakra
  zoneLines16:       string;  // page 10 + 11: 16-zone lines + outside labels
  zoneLines8:        string;  // page 13 + 14: 8-zone lines + outside labels
  panchabhuta:       string;  // panchabhuta element fills
}

// ── Generate all snapshots in parallel ────────────────────────────────────────

export async function generateAllSnapshots(
  floor: Floor,
  imageDataUrl: string | null
): Promise<FloorSnapshots> {
  const [
    planOnly,
    planBrahma,
    planChakra,
    planPerimeter,
    planCutsOnly,
    planPerimeterCuts,
    planFull,
    zoneLines16,
    zoneLines8,
    panchabhuta,
  ] = await Promise.all([
    snapshotPlanOnly(floor, imageDataUrl),
    snapshotPlanWithBrahma(floor, imageDataUrl),
    snapshotPlanWithChakraOnly(floor, imageDataUrl),
    snapshotPlanWithPerimeter(floor, imageDataUrl),
    snapshotCutsOnly(floor, imageDataUrl),
    snapshotPerimeterAndCuts(floor, imageDataUrl),
    snapshotPlanFull(floor, imageDataUrl),
    snapshotZoneLines16(floor, imageDataUrl),
    snapshotZoneLines8(floor, imageDataUrl),
    snapshotPanchabhuta(floor, imageDataUrl),
  ]);

  return {
    planOnly,
    planBrahma,
    planChakra,
    planPerimeter,
    planCutsOnly,
    planPerimeterCuts,
    planFull,
    zoneLines16,
    zoneLines8,
    panchabhuta,
  };
}
