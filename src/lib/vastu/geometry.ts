// src/lib/vastu/geometry.ts
// Exact geometric calculations for zone area analysis
// Uses polygon clipping (Sutherland-Hodgman) for precise results

export interface Point {
  x: number;
  y: number;
}

export interface Polygon {
  points: Point[];
}

// ── Polygon area (Shoelace formula) ──────────────────────────────────────────
export function polygonArea(pts: Point[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

// ── Polygon centroid (exact) ─────────────────────────────────────────────────
export function polygonCentroid(pts: Point[]): Point {
  let area = 0, cx = 0, cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const cross = pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    area += cross;
    cx += (pts[i].x + pts[j].x) * cross;
    cy += (pts[i].y + pts[j].y) * cross;
  }
  area /= 2;
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

// ── Point in polygon (ray casting) ──────────────────────────────────────────
export function pointInPolygon(px: number, py: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Sutherland-Hodgman polygon clipping ─────────────────────────────────────
// Used to clip floor plan polygon against each zone wedge for exact area
function lineIntersect(a: Point, b: Point, c: Point, d: Point): Point | null {
  const denom = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denom) < 1e-10) return null;
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / denom;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

function isInsideHalfPlane(p: Point, a: Point, b: Point): boolean {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

function clipPolygonByEdge(poly: Point[], a: Point, b: Point): Point[] {
  const output: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const currInside = isInsideHalfPlane(curr, a, b);
    const prevInside = isInsideHalfPlane(prev, a, b);
    if (currInside) {
      if (!prevInside) {
        const inter = lineIntersect(prev, curr, a, b);
        if (inter) output.push(inter);
      }
      output.push(curr);
    } else if (prevInside) {
      const inter = lineIntersect(prev, curr, a, b);
      if (inter) output.push(inter);
    }
  }
  return output;
}

// ── Zone wedge polygon ────────────────────────────────────────────────────────
// Creates a large wedge polygon for a zone angle range
function zoneWedgePolygon(
  cx: number, cy: number,
  startDeg: number, endDeg: number,
  R: number = 10000 // large enough to cover any floor plan
): Point[] {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;

  // For zone N (348.75 to 11.25), we need to handle the wrap
  let pts: Point[] = [{ x: cx, y: cy }];

  const steps = 8; // sub-points along the arc for accuracy
  let s = startDeg, e = endDeg;
  if (s > e) e += 360; // unwrap

  for (let i = 0; i <= steps; i++) {
    const deg = s + (i / steps) * (e - s);
    pts.push({
      x: cx + R * Math.cos(toRad(deg)),
      y: cy + R * Math.sin(toRad(deg)),
    });
  }
  return pts;
}

// ── Main: calculate exact zone areas ─────────────────────────────────────────
export interface ZoneAreaResult {
  zoneName: string;
  areaPixels: number;
  areaSqFt: number | null;    // null if scale not calibrated
  pctOfTotal: number;
  hasCut: boolean;
  cutAreaPixels: number;
  cutPctOfZone: number;
}

export function calculateZoneAreas(
  floorPlanPoly: Point[],
  brahmaX: number,
  brahmaY: number,
  northDeg: number,
  zones: Array<{ shortName: string; startDeg: number; endDeg: number }>,
  cuts: Array<{ points: Point[] }>,
  scalePixelsPerFt?: number // pixels per foot (from calibration)
): ZoneAreaResult[] {
  const totalArea = polygonArea(floorPlanPoly);
  if (totalArea <= 0) return [];

  return zones.map(zone => {
    // Get wedge polygon for this zone
    const adjStart = zone.startDeg + northDeg;
    const adjEnd = zone.endDeg + northDeg;
    const wedge = zoneWedgePolygon(brahmaX, brahmaY, adjStart, adjEnd);

    // Clip floor plan against wedge to get zone polygon
    let zonePolygon = [...floorPlanPoly];
    for (let i = 0; i < wedge.length; i++) {
      const a = wedge[i];
      const b = wedge[(i + 1) % wedge.length];
      zonePolygon = clipPolygonByEdge(zonePolygon, a, b);
      if (zonePolygon.length === 0) break;
    }

    const zoneAreaPx = zonePolygon.length >= 3 ? polygonArea(zonePolygon) : 0;

    // Calculate cut area within this zone
    let cutAreaPx = 0;
    let hasCut = false;
    cuts.forEach(cut => {
      if (cut.points.length < 3) return;
      // Intersect cut with zone polygon
      let clipped = [...cut.points];
      for (let i = 0; i < wedge.length; i++) {
        clipped = clipPolygonByEdge(clipped, wedge[i], wedge[(i + 1) % wedge.length]);
        if (clipped.length === 0) break;
      }
      // Also clip against floor plan
      let finalCut = [...clipped];
      for (let i = 0; i < floorPlanPoly.length; i++) {
        finalCut = clipPolygonByEdge(finalCut, floorPlanPoly[i], floorPlanPoly[(i + 1) % floorPlanPoly.length]);
        if (finalCut.length === 0) break;
      }
      if (finalCut.length >= 3) {
        const cutA = polygonArea(finalCut);
        cutAreaPx += cutA;
        hasCut = true;
      }
    });

    // pctOfTotal is pure zone area — not affected by cuts (cuts are shown separately)
    const pctOfTotal = (zoneAreaPx / totalArea) * 100;
    const cutPctOfZone = zoneAreaPx > 0 ? (cutAreaPx / zoneAreaPx) * 100 : 0;

    return {
      zoneName: zone.shortName,
      areaPixels: zoneAreaPx,
      areaSqFt: scalePixelsPerFt ? zoneAreaPx / (scalePixelsPerFt * scalePixelsPerFt) : null,
      pctOfTotal,
      hasCut,
      cutAreaPixels: cutAreaPx,
      cutPctOfZone,
    };
  });
}

// ── Cut analysis ──────────────────────────────────────────────────────────────
// Each cut's share of (floor plan area + all cuts area combined)
export interface CutAnalysisResult {
  id: string;
  label: string;
  areaPixels: number;
  pctOfCombined: number;   // cutArea / (floorArea + allCutsArea) * 100
  pctOfFloor: number;      // cutArea / floorArea * 100 — used for severity
  primaryZone: string;     // zone the cut centroid falls in
  severity: "mild" | "moderate" | "severe";
}

export function calculateCutAnalysis(
  floorPlanPoly: Point[],
  brahmaX: number,
  brahmaY: number,
  northDeg: number,
  zones: Array<{ shortName: string; startDeg: number; endDeg: number }>,
  cuts: Array<{ id: string; label: string; points: Point[] }>
): CutAnalysisResult[] {
  if (cuts.length === 0 || floorPlanPoly.length < 3) return [];

  const floorArea = polygonArea(floorPlanPoly);
  if (floorArea <= 0) return [];

  const totalCutArea = cuts.reduce(
    (sum, c) => sum + (c.points.length >= 3 ? polygonArea(c.points) : 0),
    0
  );
  const combinedArea = floorArea + totalCutArea;

  return cuts
    .filter(c => c.points.length >= 3)
    .map(cut => {
      const cutArea = polygonArea(cut.points);
      const pctOfCombined = (cutArea / combinedArea) * 100;
      const pctOfFloor = (cutArea / floorArea) * 100;
      const severity: "mild" | "moderate" | "severe" =
        pctOfFloor < 5 ? "mild" : pctOfFloor < 15 ? "moderate" : "severe";

      // Determine which zone the cut centroid falls in
      const centroid = polygonCentroid(cut.points);
      const dx = centroid.x - brahmaX;
      const dy = centroid.y - brahmaY;
      // SVG coords: atan2(dy,dx) + 90 gives clockwise angle from top (screen North)
      const screenAngle = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
      // Subtract northDeg to get angle in the canonical zone frame
      const zoneAngle = ((screenAngle - northDeg) % 360 + 360) % 360;

      let primaryZone = "–";
      for (const zone of zones) {
        const s = ((zone.startDeg % 360) + 360) % 360;
        const e = ((zone.endDeg % 360) + 360) % 360;
        const inZone = s <= e
          ? zoneAngle >= s && zoneAngle < e
          : zoneAngle >= s || zoneAngle < e; // wraps around 0° (zone N)
        if (inZone) { primaryZone = zone.shortName; break; }
      }

      return { id: cut.id, label: cut.label, areaPixels: cutArea, pctOfCombined, pctOfFloor, primaryZone, severity };
    });
}

// ── Distance between two points ───────────────────────────────────────────────
export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

// ── SVG coordinate transform ──────────────────────────────────────────────────
export function svgCoords(
  e: React.MouseEvent<SVGElement>,
  svgEl: SVGSVGElement
): Point {
  const rect = svgEl.getBoundingClientRect();
  const vb = svgEl.viewBox.baseVal;
  return {
    x: ((e.clientX - rect.left) / rect.width) * vb.width,
    y: ((e.clientY - rect.top) / rect.height) * vb.height,
  };
}

// ── Angle from Brahmasthan to a point (0° = North, clockwise) ────────────────
export function angleFromBrahma(
  px: number, py: number,
  brahmaX: number, brahmaY: number
): number {
  const rad = Math.atan2(py - brahmaY, px - brahmaX);
  let deg = rad * (180 / Math.PI) + 90;
  return ((deg % 360) + 360) % 360;
}
