'use client';

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCadStore } from '@/store/cadStore';
import { polygonCentroid, polygonArea, calculateZoneAreas } from '@/lib/vastu/geometry';
import { VASTU_ZONES } from '@/lib/vastu/zones';
import type { ZoneAnalysis } from '@/lib/types';
import type { CADWall, CADNode, SnapResult } from '@/lib/paper-geometry/types';
import { FURNITURE_TEMPLATES } from '@/lib/paper-geometry/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_THICKNESS = 8;    // project pixels wall thickness
const SNAP_THRESHOLD_PX = 15;  // screen pixels for snapping
const CHAKRA_R = 300;           // project-unit radius for the chakra overlay
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;

// ── Snap helper ────────────────────────────────────────────────────────────────

function findSnap(
  cursor: { x: number; y: number },
  nodes: Record<string, CADNode>,
  walls: CADWall[],
  gridSize: number,
  zoom: number,
  snapEnabled: boolean,
  excludeNodeId?: string
): SnapResult {
  if (!snapEnabled) {
    const gx = Math.round(cursor.x / gridSize) * gridSize;
    const gy = Math.round(cursor.y / gridSize) * gridSize;
    return { x: gx, y: gy, type: 'grid' };
  }

  const thresh = SNAP_THRESHOLD_PX / zoom;
  let best: SnapResult = { ...cursor, type: 'grid' };
  let minDist = thresh;

  // Endpoint snap (highest priority)
  for (const node of Object.values(nodes)) {
    if (node.id === excludeNodeId) continue;
    const d = Math.hypot(node.x - cursor.x, node.y - cursor.y);
    if (d < minDist) {
      minDist = d;
      best = { x: node.x, y: node.y, type: 'endpoint', nodeId: node.id };
    }
  }

  // Midpoint snap (medium priority)
  if (minDist > thresh * 0.5) {
    for (const wall of walls) {
      if (wall.type !== 'line') continue;
      const s = nodes[wall.startNodeId];
      const e = nodes[wall.endNodeId];
      if (!s || !e) continue;
      const mx = (s.x + e.x) / 2;
      const my = (s.y + e.y) / 2;
      const d = Math.hypot(mx - cursor.x, my - cursor.y);
      if (d < minDist) {
        minDist = d;
        best = { x: mx, y: my, type: 'midpoint', wallId: wall.id };
      }
    }
  }

  // Grid snap (lowest priority)
  if (best.type === 'grid') {
    const gx = Math.round(cursor.x / gridSize) * gridSize;
    const gy = Math.round(cursor.y / gridSize) * gridSize;
    const d = Math.hypot(gx - cursor.x, gy - cursor.y);
    if (d < thresh * 0.8) {
      best = { x: gx, y: gy, type: 'grid' };
    }
  }

  return best;
}

// ── Detect closed wall polygon ────────────────────────────────────────────────

function detectClosedPolygon(
  nodes: Record<string, CADNode>,
  walls: CADWall[]
): { x: number; y: number }[] | null {
  const lineWalls = walls.filter((w) => w.type === 'line');
  if (lineWalls.length < 3) return null;

  const adj = new Map<string, Array<{ nodeId: string }> >();
  for (const w of lineWalls) {
    if (!nodes[w.startNodeId] || !nodes[w.endNodeId]) continue;
    if (!adj.has(w.startNodeId)) adj.set(w.startNodeId, []);
    if (!adj.has(w.endNodeId)) adj.set(w.endNodeId, []);
    adj.get(w.startNodeId)!.push({ nodeId: w.endNodeId });
    adj.get(w.endNodeId)!.push({ nodeId: w.startNodeId });
  }

  const polygons: { x: number; y: number }[][] = [];
  const globalVisited = new Set<string>();

  for (const [startId] of adj.entries()) {
    if (globalVisited.has(startId)) continue;
    const nbrs = adj.get(startId) || [];
    if (nbrs.length < 2) continue;

    const poly: { x: number; y: number }[] = [];
    const inPoly = new Set<string>();
    let cur = startId;
    let prev = '';
    let valid = true;

    for (let step = 0; step <= lineWalls.length + 2; step++) {
      if (step > 0 && cur === startId) break;
      if (inPoly.has(cur)) { valid = false; break; }
      const node = nodes[cur];
      if (!node) { valid = false; break; }
      const curNbrs = adj.get(cur) || [];
      if (curNbrs.length < 1) { valid = false; break; }
      poly.push({ x: node.x, y: node.y });
      inPoly.add(cur);
      const nxt = curNbrs.find((n) => n.nodeId !== prev) ?? curNbrs[0];
      if (!nxt) { valid = false; break; }
      prev = cur;
      cur = nxt.nodeId;
    }

    if (valid && cur === startId && poly.length >= 3) {
      polygons.push(poly);
      inPoly.forEach((id) => globalVisited.add(id));
    }
  }

  if (polygons.length === 0) return null;
  return polygons.reduce((a, b) => (polygonArea(a) >= polygonArea(b) ? a : b));
}

// ── Format wall length ────────────────────────────────────────────────────────

function fmtLen(px: number, ppu: number, unit: string): string {
  if (ppu <= 0) return `${Math.round(px)}px`;
  const val = px / ppu;
  return `${val.toFixed(1)} ${unit}`;
}

// ── Snap indicator colors ─────────────────────────────────────────────────────

const SNAP_COLORS: Record<SnapResult['type'], string> = {
  endpoint: '#00e5ff',
  midpoint: '#ffcc44',
  grid: 'rgba(200,175,120,0.5)',
  intersection: '#ff8844',
};

// ── PaperCanvas ───────────────────────────────────────────────────────────────

export default function PaperCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Paper.js imperative refs
  const paperRef = useRef<any>(null);
  const toolRef = useRef<any>(null);

  // Layer refs
  const gridLayerRef = useRef<any>(null);
  const imageLayerRef = useRef<any>(null);
  const wallLayerRef = useRef<any>(null);
  const openingLayerRef = useRef<any>(null);
  const furnitureLayerRef = useRef<any>(null);
  const cutLayerRef = useRef<any>(null);
  const dimLayerRef = useRef<any>(null);
  const uiLayerRef = useRef<any>(null);

  // Paper item maps (id → paper item)
  const wallItemsRef = useRef<Map<string, any>>(new Map());
  const openingItemsRef = useRef<Map<string, any>>(new Map());
  const furnitureItemsRef = useRef<Map<string, any>>(new Map());
  const cutItemsRef = useRef<Map<string, any>>(new Map());
  const dimItemsRef = useRef<Map<string, any>>(new Map());

  // Active tool drawing state
  const toolStateRef = useRef<any>({});

  // Live preview items (in uiLayer)
  const previewRef = useRef<any>(null);
  const snapIndicatorRef = useRef<any>(null);

  // React state for overlay / status
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snapType, setSnapType] = useState<SnapResult['type']>('grid');
  const [statusMsg, setStatusMsg] = useState('');
  const [chakra, setChakra] = useState<{
    left: number; top: number; size: number;
  } | null>(null);

  // Store references (avoid stale closures in paper event handlers)
  const cadStore = useCadStore();
  const canvasStore = useCanvasStore();
  const cadRef = useRef(cadStore);
  const csRef = useRef(canvasStore);
  useEffect(() => { cadRef.current = cadStore; }, [cadStore]);
  useEffect(() => { csRef.current = canvasStore; }, [canvasStore]);

  // ── Zone recalc ─────────────────────────────────────────────────────────────

  const recalcZones = useCallback(() => {
    const cs = csRef.current;
    const pts = cs.perimeterPoints;
    if (pts.length < 3) return;
    const results = calculateZoneAreas(
      pts,
      cs.brahmaX,
      cs.brahmaY,
      cs.northDeg,
      VASTU_ZONES,
      cs.cuts,
      cs.scale?.pixelsPerUnit
    );
    const analysis: ZoneAnalysis[] = VASTU_ZONES.map((z) => {
      const r = results.find((res) => res.zoneName === z.shortName);
      const pct = r?.pctOfTotal ?? 0;
      const cutPct = r?.cutPctOfZone ?? 0;
      return {
        zoneName: z.shortName,
        pctOfTotal: pct,
        areaSqFt: r?.areaSqFt ?? null,
        hasCut: cutPct > 0,
        cutPctOfZone: cutPct,
        cutSeverity:
          cutPct === 0 ? undefined : cutPct < 10 ? 'mild' : cutPct < 25 ? 'moderate' : 'severe',
        status: pct >= 5 && pct <= 7.5 ? 'good' : pct < 3 ? 'critical' : 'warning',
      };
    });
    cs.setZoneAnalysis(analysis);
  }, []);

  // ── Sync walls → Vastu perimeter ────────────────────────────────────────────

  const syncToVastu = useCallback(() => {
    const cad = cadRef.current;
    const cs = csRef.current;
    const poly = detectClosedPolygon(cad.nodes, cad.walls);
    if (!poly || poly.length < 3) {
      cs.setZoneAnalysis([]);
      return;
    }
    const centroid = polygonCentroid(poly);

    // Rebuild perimeter in canvasStore
    cs.resetPerimeter();
    for (const pt of poly) cs.addPerimeterPoint(pt);
    cs.closePerimeter();
    cs.setBrahma(centroid.x, centroid.y);
    cs.confirmBrahma();

    if (cad.pixelsPerUnit > 0) {
      cs.setScale({
        pt1: { x: 0, y: 0 },
        pt2: { x: cad.pixelsPerUnit, y: 0 },
        realDistance: 1,
        unit: cad.unit,
        pixelsPerUnit: cad.pixelsPerUnit,
      });
    }

    setTimeout(recalcZones, 50);
  }, [recalcZones]);

  // ── Chakra overlay position ──────────────────────────────────────────────────

  const updateChakra = useCallback(() => {
    const paper = paperRef.current;
    const cs = csRef.current;
    if (!paper) return;
    try {
      const vp = paper.view.projectToView(
        new paper.Point(cs.brahmaX, cs.brahmaY)
      );
      const size = CHAKRA_R * 2 * paper.view.zoom;
      setChakra({ left: vp.x, top: vp.y, size });
    } catch { /* view not ready */ }
  }, []);

  // ── Grid rendering ───────────────────────────────────────────────────────────

  const drawGrid = useCallback(() => {
    const paper = paperRef.current;
    const layer = gridLayerRef.current;
    if (!paper || !layer) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();
    layer.removeChildren();

    // Always draw the dark background so the canvas is never white
    const bgBounds = paper.view.bounds;
    const bg = new paper.Path.Rectangle(bgBounds);
    bg.fillColor = new paper.Color(15 / 255, 14 / 255, 11 / 255, 1); // #0f0e0b = var(--bg)

    const cad = cadRef.current;
    if (!cad.showGrid) { prevActive?.activate(); return; }

    const gs = cad.gridSize;
    const zoom = paper.view.zoom;
    const sw = 1 / zoom;
    const b = paper.view.bounds;

    const x0 = Math.floor(b.left / gs) * gs;
    const x1 = Math.ceil(b.right / gs) * gs;
    const y0 = Math.floor(b.top / gs) * gs;
    const y1 = Math.ceil(b.bottom / gs) * gs;

    for (let x = x0; x <= x1; x += gs) {
      const line = new paper.Path.Line(
        new paper.Point(x, y0), new paper.Point(x, y1)
      );
      line.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.05);
      line.strokeWidth = sw;
    }
    for (let y = y0; y <= y1; y += gs) {
      const line = new paper.Path.Line(
        new paper.Point(x0, y), new paper.Point(x1, y)
      );
      line.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.05);
      line.strokeWidth = sw;
    }

    // Major grid (5× spacing)
    const mgs = gs * 5;
    const mx0 = Math.floor(b.left / mgs) * mgs;
    const mx1 = Math.ceil(b.right / mgs) * mgs;
    const my0 = Math.floor(b.top / mgs) * mgs;
    const my1 = Math.ceil(b.bottom / mgs) * mgs;

    for (let x = mx0; x <= mx1; x += mgs) {
      const line = new paper.Path.Line(
        new paper.Point(x, my0), new paper.Point(x, my1)
      );
      line.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.1);
      line.strokeWidth = sw * 1.5;
    }
    for (let y = my0; y <= my1; y += mgs) {
      const line = new paper.Path.Line(
        new paper.Point(mx0, y), new paper.Point(mx1, y)
      );
      line.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.1);
      line.strokeWidth = sw * 1.5;
    }

    prevActive?.activate();
  }, []);

  // ── Wall rendering ───────────────────────────────────────────────────────────

  const renderWall = useCallback((wallId: string) => {
    const paper = paperRef.current;
    const layer = wallLayerRef.current;
    if (!paper || !layer) return;

    const cad = cadRef.current;
    const wall = cad.walls.find((w) => w.id === wallId);
    if (!wall) return;

    const sNode = cad.nodes[wall.startNodeId];
    const eNode = cad.nodes[wall.endNodeId];
    if (!sNode || !eNode) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    // Remove old item
    const old = wallItemsRef.current.get(wallId);
    if (old) old.remove();

    let path: any;
    const sp = new paper.Point(sNode.x, sNode.y);
    const ep = new paper.Point(eNode.x, eNode.y);

    if (wall.type === 'line') {
      path = new paper.Path.Line(sp, ep);
    } else if (wall.type === 'arc' && wall.arcThroughX != null) {
      const tp = new paper.Point(wall.arcThroughX, wall.arcThroughY!);
      path = new paper.Path.Arc(sp, tp, ep);
    } else if (wall.type === 'bezier') {
      path = new paper.Path();
      path.add(sp);
      if (wall.cp1x != null) {
        const seg0 = path.segments[0];
        seg0.handleOut = new paper.Point(
          wall.cp1x - sNode.x,
          wall.cp1y! - sNode.y
        );
      }
      const seg1 = path.add(ep);
      if (wall.cp2x != null) {
        seg1.handleIn = new paper.Point(
          wall.cp2x - eNode.x,
          wall.cp2y! - eNode.y
        );
      }
    } else {
      path = new paper.Path.Line(sp, ep);
    }

    path.strokeColor = new paper.Color(wall.color || '#c8af78');
    path.strokeWidth = wall.thickness || DEFAULT_THICKNESS;
    path.strokeCap = 'square';
    path.strokeJoin = 'miter';
    path.data = { type: 'wall', id: wallId };

    wallItemsRef.current.set(wallId, path);
    prevActive?.activate();
  }, []);

  const removeWallItem = useCallback((wallId: string) => {
    const item = wallItemsRef.current.get(wallId);
    if (item) { item.remove(); wallItemsRef.current.delete(wallId); }
    const dim = dimItemsRef.current.get(`dim-${wallId}`);
    if (dim) { dim.remove(); dimItemsRef.current.delete(`dim-${wallId}`); }
  }, []);

  // ── Dimension label ──────────────────────────────────────────────────────────

  const renderDimension = useCallback((wallId: string) => {
    const paper = paperRef.current;
    const layer = dimLayerRef.current;
    if (!paper || !layer) return;

    const cad = cadRef.current;
    if (!cad.showDimensions) return;

    const wall = cad.walls.find((w) => w.id === wallId);
    if (!wall || wall.type !== 'line') return;

    const sNode = cad.nodes[wall.startNodeId];
    const eNode = cad.nodes[wall.endNodeId];
    if (!sNode || !eNode) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    const dimKey = `dim-${wallId}`;
    const old = dimItemsRef.current.get(dimKey);
    if (old) old.remove();

    const mx = (sNode.x + eNode.x) / 2;
    const my = (sNode.y + eNode.y) / 2;
    const dx = eNode.x - sNode.x;
    const dy = eNode.y - sNode.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) { prevActive?.activate(); return; }

    // Perpendicular offset for label
    const nx = -dy / len;
    const ny = dx / len;
    const offset = 14 / paper.view.zoom;

    const txt = new paper.PointText({
      point: new paper.Point(mx + nx * offset, my + ny * offset),
      content: fmtLen(len, cad.pixelsPerUnit, cad.unit),
      fillColor: new paper.Color(176 / 255, 160 / 255, 128 / 255, 0.8),
      fontSize: 11 / paper.view.zoom,
      fontFamily: 'monospace',
      justification: 'center',
    });

    // Rotate label to align with wall
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (angle > 90 || angle < -90) angle += 180;
    txt.rotate(angle, txt.position);

    txt.data = { type: 'dim', wallId };
    dimItemsRef.current.set(dimKey, txt);
    prevActive?.activate();
  }, []);

  // ── Opening rendering ────────────────────────────────────────────────────────

  const renderOpening = useCallback((openingId: string) => {
    const paper = paperRef.current;
    const layer = openingLayerRef.current;
    if (!paper || !layer) return;

    const cad = cadRef.current;
    const op = cad.openings.find((o) => o.id === openingId);
    if (!op) return;

    const wall = cad.walls.find((w) => w.id === op.wallId);
    if (!wall || wall.type !== 'line') return;

    const sNode = cad.nodes[wall.startNodeId];
    const eNode = cad.nodes[wall.endNodeId];
    if (!sNode || !eNode) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    const old = openingItemsRef.current.get(openingId);
    if (old) old.remove();

    const dx = eNode.x - sNode.x;
    const dy = eNode.y - sNode.y;
    const wallLen = Math.hypot(dx, dy);
    if (wallLen < 1) { prevActive?.activate(); return; }

    // Center of opening along wall
    const cx = sNode.x + dx * op.positionAlongWall;
    const cy = sNode.y + dy * op.positionAlongWall;
    const ux = dx / wallLen;  // unit vector along wall
    const uy = dy / wallLen;

    const hw = op.widthPx / 2;
    const group = new paper.Group();

    if (op.type === 'window') {
      // Gap in wall + 3 hash lines
      const gap = new paper.Path();
      gap.add(new paper.Point(cx - ux * hw, cy - uy * hw));
      gap.add(new paper.Point(cx + ux * hw, cy + uy * hw));
      gap.strokeColor = new paper.Color(0.1, 0.1, 0.08, 1);
      gap.strokeWidth = (wall.thickness || DEFAULT_THICKNESS) + 2;

      const win = new paper.Path();
      win.add(new paper.Point(cx - ux * hw, cy - uy * hw));
      win.add(new paper.Point(cx + ux * hw, cy + uy * hw));
      win.strokeColor = new paper.Color(200 / 255, 220 / 255, 240 / 255, 0.9);
      win.strokeWidth = 2 / paper.view.zoom;

      group.addChildren([gap, win]);
    } else {
      // Door: gap + door panel line + swing arc
      const swingDir = op.swingDirection === 'left' ? -1 : 1;
      const nx = -uy * swingDir; // perpendicular direction
      const ny = ux * swingDir;

      // Gap (erase wall under door)
      const gap = new paper.Path();
      gap.add(new paper.Point(cx - ux * hw, cy - uy * hw));
      gap.add(new paper.Point(cx + ux * hw, cy + uy * hw));
      gap.strokeColor = new paper.Color(0.1, 0.1, 0.08, 1);
      gap.strokeWidth = (wall.thickness || DEFAULT_THICKNESS) + 2;

      // Door hinge point (start) and door panel end
      const hinge = new paper.Point(cx - ux * hw, cy - uy * hw);
      const panelEnd = new paper.Point(
        hinge.x + nx * op.widthPx,
        hinge.y + ny * op.widthPx
      );

      const panel = new paper.Path.Line(hinge, panelEnd);
      panel.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.9);
      panel.strokeWidth = 2 / paper.view.zoom;

      // Swing arc (quarter circle)
      const arcEnd = new paper.Point(cx + ux * hw, cy + uy * hw);
      const arc = new paper.Path.Arc(panelEnd, arcEnd, arcEnd);
      // Simplified: draw a partial arc using Path
      const arcPath = new paper.Path();
      const sweepAngle = 90;
      const steps = 12;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * sweepAngle * (Math.PI / 180);
        const angle = Math.atan2(ny, nx) + t * swingDir;
        arcPath.add(
          new paper.Point(
            hinge.x + Math.cos(angle) * op.widthPx,
            hinge.y + Math.sin(angle) * op.widthPx
          )
        );
      }
      arcPath.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.4);
      arcPath.strokeWidth = 1 / paper.view.zoom;
      arcPath.dashArray = [4 / paper.view.zoom, 3 / paper.view.zoom];

      // Main entrance marker
      if (op.isMainEntrance || op.type === 'main_door') {
        const markerPt = new paper.Point(
          cx + nx * (wall.thickness || DEFAULT_THICKNESS),
          cy + ny * (wall.thickness || DEFAULT_THICKNESS)
        );
        const marker = new paper.PointText({
          point: markerPt,
          content: '⛩',
          fontSize: 14 / paper.view.zoom,
          justification: 'center',
        });
        group.addChild(marker);
      }

      group.addChildren([gap, panel, arcPath]);
      arc.remove();
    }

    group.data = { type: 'opening', id: openingId };
    openingItemsRef.current.set(openingId, group);
    prevActive?.activate();
  }, []);

  // ── Furniture rendering ──────────────────────────────────────────────────────

  const renderFurniture = useCallback((furnId: string) => {
    const paper = paperRef.current;
    const layer = furnitureLayerRef.current;
    if (!paper || !layer) return;

    const cad = cadRef.current;
    const f = cad.furniture.find((fi) => fi.id === furnId);
    if (!f || !f.visible) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    const old = furnitureItemsRef.current.get(furnId);
    if (old) old.remove();

    const rect = new paper.Rectangle(
      new paper.Point(f.x - f.widthPx / 2, f.y - f.heightPx / 2),
      new paper.Size(f.widthPx, f.heightPx)
    );
    const shape = new paper.Path.Rectangle(rect, 3 / paper.view.zoom);
    shape.fillColor = new paper.Color(f.color || '#8B7355');
    shape.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.4);
    shape.strokeWidth = 1 / paper.view.zoom;
    shape.opacity = 0.75;

    const label = new paper.PointText({
      point: new paper.Point(f.x, f.y + 4 / paper.view.zoom),
      content: f.label,
      fillColor: new paper.Color(232 / 255, 224 / 255, 208 / 255, 0.9),
      fontSize: 9 / paper.view.zoom,
      fontFamily: 'monospace',
      justification: 'center',
    });

    const group = new paper.Group([shape, label]);
    group.rotate(f.rotation, new paper.Point(f.x, f.y));
    group.data = { type: 'furniture', id: furnId };
    furnitureItemsRef.current.set(furnId, group);
    prevActive?.activate();
  }, []);

  // ── Cut rendering ────────────────────────────────────────────────────────────

  const renderCut = useCallback((cutId: string, points: { x: number; y: number }[]) => {
    const paper = paperRef.current;
    const layer = cutLayerRef.current;
    if (!paper || !layer || points.length < 3) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    const old = cutItemsRef.current.get(cutId);
    if (old) old.remove();

    const path = new paper.Path();
    for (const pt of points) path.add(new paper.Point(pt.x, pt.y));
    path.closed = true;
    path.fillColor = new paper.Color(200 / 255, 60 / 255, 40 / 255, 0.15);
    path.strokeColor = new paper.Color(200 / 255, 60 / 255, 40 / 255, 0.7);
    path.strokeWidth = 2 / paper.view.zoom;
    path.dashArray = [6 / paper.view.zoom, 3 / paper.view.zoom];
    path.data = { type: 'cut', id: cutId };

    cutItemsRef.current.set(cutId, path);
    prevActive?.activate();
  }, []);

  // ── Snap indicator ──────────────────────────────────────────────────────────

  const showSnapIndicator = useCallback((snap: SnapResult) => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    if (!paper || !layer) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    if (snapIndicatorRef.current) snapIndicatorRef.current.remove();

    const r = 5 / paper.view.zoom;
    const circle = new paper.Path.Circle(new paper.Point(snap.x, snap.y), r);
    circle.strokeColor = new paper.Color(SNAP_COLORS[snap.type]);
    circle.strokeWidth = 1.5 / paper.view.zoom;
    circle.fillColor = null;
    circle.data = { type: 'snap_indicator' };

    if (snap.type === 'endpoint') {
      const cross1 = new paper.Path.Line(
        new paper.Point(snap.x - r * 1.4, snap.y),
        new paper.Point(snap.x + r * 1.4, snap.y)
      );
      const cross2 = new paper.Path.Line(
        new paper.Point(snap.x, snap.y - r * 1.4),
        new paper.Point(snap.x, snap.y + r * 1.4)
      );
      cross1.strokeColor = cross2.strokeColor = circle.strokeColor;
      cross1.strokeWidth = cross2.strokeWidth = circle.strokeWidth;
      const grp = new paper.Group([circle, cross1, cross2]);
      snapIndicatorRef.current = grp;
    } else {
      snapIndicatorRef.current = circle;
    }

    setSnapType(snap.type);
    prevActive?.activate();
  }, []);

  const hideSnapIndicator = useCallback(() => {
    if (snapIndicatorRef.current) {
      snapIndicatorRef.current.remove();
      snapIndicatorRef.current = null;
    }
  }, []);

  // ── Node dots (endpoint circles) ────────────────────────────────────────────

  const renderAllNodeDots = useCallback(() => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    if (!paper || !layer) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();

    // Remove existing node dots
    layer.children
      .filter((c: any) => c.data?.type === 'node_dot')
      .forEach((c: any) => c.remove());

    const cad = cadRef.current;
    const r = 3 / paper.view.zoom;

    for (const node of Object.values(cad.nodes)) {
      const circle = new paper.Path.Circle(
        new paper.Point(node.x, node.y), r
      );
      circle.fillColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.7);
      circle.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.4);
      circle.strokeWidth = 0.5 / paper.view.zoom;
      circle.data = { type: 'node_dot', nodeId: node.id };
    }

    prevActive?.activate();
  }, []);

  // ── Tool: Wall Line ─────────────────────────────────────────────────────────

  const initWallLineTool = useCallback((paper: any) => {
    const state = toolStateRef.current;
    state.phase = 'idle';
    state.startPoint = null;
    state.lastNodeId = null;
    state.chainPath = null; // shows current chain being drawn
    setStatusMsg('Wall Line — Click to place points. Double-click to finish.');
  }, []);

  const handleWallLineDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );

    if (state.phase === 'idle') {
      state.phase = 'drawing';
      state.startPoint = snap;
      state.lastNodeId = null;
    } else if (state.phase === 'drawing') {
      // Finish this segment, continue chain
      const startPt = state.startPoint!;
      cad.pushHistory();

      const startId = cad.findOrAddNode(startPt.x, startPt.y, 3);
      const endId = cad.findOrAddNode(snap.x, snap.y, 3);

      if (startId !== endId) {
        const wallId = cad.addWall('line', startId, endId);
        renderWall(wallId);
        renderDimension(wallId);
        renderAllNodeDots();
        syncToVastu();
      }

      // Continue from snap point
      state.startPoint = snap;
      state.lastNodeId = endId;
    }
  }, [renderWall, renderDimension, renderAllNodeDots, syncToVastu]);

  const handleWallLineMove = useCallback((event: any) => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;
    if (!paper || !layer) return;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );

    showSnapIndicator(snap);
    setCursorPos({ x: snap.x, y: snap.y });

    if (state.phase === 'drawing' && state.startPoint) {
      // Preview line
      const prevActive = paper.project.activeLayer;
      layer.activate();
      if (previewRef.current) previewRef.current.remove();

      const preview = new paper.Path.Line(
        new paper.Point(state.startPoint.x, state.startPoint.y),
        new paper.Point(snap.x, snap.y)
      );
      preview.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.5);
      preview.strokeWidth = 8;
      preview.dashArray = [8 / paper.view.zoom, 4 / paper.view.zoom];
      previewRef.current = preview;

      // Live length display
      const len = Math.hypot(snap.x - state.startPoint.x, snap.y - state.startPoint.y);
      setStatusMsg(
        `Drawing wall — ${fmtLen(len, cad.pixelsPerUnit, cad.unit)} | Double-click to finish`
      );

      prevActive?.activate();
    }
  }, [showSnapIndicator]);

  const handleWallLineDblClick = useCallback(() => {
    const state = toolStateRef.current;
    if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
    state.phase = 'idle';
    state.startPoint = null;
    setStatusMsg('Wall Line — Click to place points. Double-click to finish.');
  }, []);

  // ── Tool: Wall Arc (3-point) ─────────────────────────────────────────────────

  const handleWallArcDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );

    if (!state.arcStart) {
      state.arcStart = snap;
      setStatusMsg('Arc Wall — click the through-point (middle of arc)');
    } else if (!state.arcThrough) {
      state.arcThrough = snap;
      setStatusMsg('Arc Wall — click the end point');
    } else {
      // Complete arc
      const { arcStart, arcThrough } = state;
      cad.pushHistory();

      const startId = cad.findOrAddNode(arcStart.x, arcStart.y, 3);
      const endId = cad.findOrAddNode(snap.x, snap.y, 3);

      const wallId = cad.addWall('arc', startId, endId, {
        arcThroughX: arcThrough.x,
        arcThroughY: arcThrough.y,
      });

      renderWall(wallId);
      renderAllNodeDots();
      syncToVastu();

      state.arcStart = null;
      state.arcThrough = null;
      if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
      setStatusMsg('Arc Wall — click the start point');
    }
  }, [renderWall, renderAllNodeDots, syncToVastu]);

  const handleWallArcMove = useCallback((event: any) => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;
    if (!paper || !layer) return;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );
    showSnapIndicator(snap);
    setCursorPos({ x: snap.x, y: snap.y });

    const prevActive = paper.project.activeLayer;
    layer.activate();
    if (previewRef.current) previewRef.current.remove();

    if (state.arcStart && !state.arcThrough) {
      const preview = new paper.Path.Line(
        new paper.Point(state.arcStart.x, state.arcStart.y),
        new paper.Point(snap.x, snap.y)
      );
      preview.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.4);
      preview.strokeWidth = 8;
      preview.dashArray = [6 / paper.view.zoom, 3 / paper.view.zoom];
      previewRef.current = preview;
    } else if (state.arcStart && state.arcThrough) {
      try {
        const arc = new paper.Path.Arc(
          new paper.Point(state.arcStart.x, state.arcStart.y),
          new paper.Point(state.arcThrough.x, state.arcThrough.y),
          new paper.Point(snap.x, snap.y)
        );
        arc.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.5);
        arc.strokeWidth = 8;
        arc.dashArray = [6 / paper.view.zoom, 3 / paper.view.zoom];
        previewRef.current = arc;
      } catch { /* arc might fail for collinear points */ }
    }

    prevActive?.activate();
  }, [showSnapIndicator]);

  // ── Tool: Wall Bezier ────────────────────────────────────────────────────────

  const handleWallBezierDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );

    if (!state.bezStart) {
      state.bezStart = snap;
      setStatusMsg('Bezier Wall — drag out control handle, then click end point');
    } else {
      // End point
      const { bezStart, bezCp1 } = state;
      cad.pushHistory();

      const startId = cad.findOrAddNode(bezStart.x, bezStart.y, 3);
      const endId = cad.findOrAddNode(snap.x, snap.y, 3);

      const wallId = cad.addWall('bezier', startId, endId, {
        cp1x: bezCp1?.x ?? (bezStart.x + snap.x) / 2,
        cp1y: bezCp1?.y ?? (bezStart.y + snap.y) / 2,
        cp2x: snap.x,
        cp2y: snap.y,
      });

      renderWall(wallId);
      renderDimension(wallId);
      renderAllNodeDots();
      syncToVastu();

      state.bezStart = null;
      state.bezCp1 = null;
      if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
      setStatusMsg('Bezier Wall — click the start point');
    }
  }, [renderWall, renderDimension, renderAllNodeDots, syncToVastu]);

  const handleWallBezierDrag = useCallback((event: any) => {
    const state = toolStateRef.current;
    if (!state.bezStart || state.bezCp1) return;
    state.bezCp1 = { x: event.point.x, y: event.point.y };
  }, []);

  const handleWallBezierMove = useCallback((event: any) => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;
    if (!paper || !layer) return;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(
      raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled
    );
    showSnapIndicator(snap);
    setCursorPos({ x: snap.x, y: snap.y });

    const prevActive = paper.project.activeLayer;
    layer.activate();
    if (previewRef.current) previewRef.current.remove();

    if (state.bezStart) {
      const path = new paper.Path();
      path.add(new paper.Point(state.bezStart.x, state.bezStart.y));
      const seg = path.add(new paper.Point(snap.x, snap.y));
      if (state.bezCp1) {
        path.segments[0].handleOut = new paper.Point(
          state.bezCp1.x - state.bezStart.x,
          state.bezCp1.y - state.bezStart.y
        );
        seg.handleIn = new paper.Point(0, 0);
      }
      path.strokeColor = new paper.Color(200 / 255, 175 / 255, 120 / 255, 0.5);
      path.strokeWidth = 8;
      path.dashArray = [6 / paper.view.zoom, 3 / paper.view.zoom];
      previewRef.current = path;
    }

    prevActive?.activate();
  }, [showSnapIndicator]);

  // ── Tool: Select ────────────────────────────────────────────────────────────

  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const dragStartRef = useRef<{ nodeId: string; origX: number; origY: number } | null>(null);
  const isDraggingNode = useRef(false);
  const isPanningRef = useRef(false);
  const panOriginRef = useRef<{ mx: number; my: number; cx: number; cy: number } | null>(null);

  const handleSelectDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    if (!paper) return;

    const hitResult = paper.project.hitTest(event.point, {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 8 / paper.view.zoom,
    });

    if (hitResult) {
      const item = hitResult.item;
      const data = item.data || item.parent?.data;

      if (data?.type === 'wall') {
        setSelectedWallId(data.id);
        cad.setSelection([{ type: 'wall', id: data.id }]);
      } else if (data?.type === 'node_dot') {
        const nodeId = data.nodeId;
        const node = cad.nodes[nodeId];
        if (node) {
          dragStartRef.current = { nodeId, origX: node.x, origY: node.y };
          isDraggingNode.current = false;
        }
      } else if (data?.type === 'furniture') {
        cad.setSelection([{ type: 'furniture', id: data.id }]);
      }
    } else {
      setSelectedWallId(null);
      cad.clearSelection();
      // Start panning
      isPanningRef.current = true;
      panOriginRef.current = {
        mx: event.event.clientX,
        my: event.event.clientY,
        cx: paper.view.center.x,
        cy: paper.view.center.y,
      };
    }
  }, []);

  const handleSelectDrag = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;

    if (isPanningRef.current && panOriginRef.current) {
      const dx = (event.event.clientX - panOriginRef.current.mx) / paper.view.zoom;
      const dy = (event.event.clientY - panOriginRef.current.my) / paper.view.zoom;
      paper.view.center = new paper.Point(
        panOriginRef.current.cx - dx,
        panOriginRef.current.cy - dy
      );
      drawGrid();
      updateChakra();
      return;
    }

    if (dragStartRef.current) {
      isDraggingNode.current = true;
      const snap = findSnap(
        { x: event.point.x, y: event.point.y },
        cad.nodes,
        cad.walls,
        cad.gridSize,
        paper.view.zoom,
        cad.snapEnabled,
        dragStartRef.current.nodeId
      );
      cad.updateNode(dragStartRef.current.nodeId, snap.x, snap.y);

      // Re-render all walls connected to this node
      const connectedWallIds = cad.walls
        .filter(
          (w) =>
            w.startNodeId === dragStartRef.current!.nodeId ||
            w.endNodeId === dragStartRef.current!.nodeId
        )
        .map((w) => w.id);

      connectedWallIds.forEach((wid) => {
        renderWall(wid);
        renderDimension(wid);
      });
      renderAllNodeDots();
      showSnapIndicator(snap);
      syncToVastu();
    }
  }, [drawGrid, updateChakra, renderWall, renderDimension, renderAllNodeDots, showSnapIndicator, syncToVastu]);

  const handleSelectUp = useCallback(() => {
    if (isDraggingNode.current && dragStartRef.current) {
      cadRef.current.pushHistory();
    }
    dragStartRef.current = null;
    isDraggingNode.current = false;
    isPanningRef.current = false;
    panOriginRef.current = null;
    hideSnapIndicator();
  }, [hideSnapIndicator]);

  const handleSelectMove = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    if (!paper) return;
    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled);
    setCursorPos({ x: snap.x, y: snap.y });
  }, []);

  // ── Tool: Door / Window ──────────────────────────────────────────────────────

  const handleOpeningDown = useCallback((event: any, opType: 'door' | 'window' | 'main_door') => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    if (!paper) return;

    // Find which wall was clicked
    const hitResult = paper.project.hitTest(event.point, {
      stroke: true,
      tolerance: 12 / paper.view.zoom,
    });

    if (!hitResult) return;
    const wallId = hitResult.item?.data?.id || hitResult.item?.parent?.data?.id;
    if (!wallId) return;

    const wall = cad.walls.find((w) => w.id === wallId);
    if (!wall || wall.type !== 'line') return;

    const sNode = cad.nodes[wall.startNodeId];
    const eNode = cad.nodes[wall.endNodeId];
    if (!sNode || !eNode) return;

    const dx = eNode.x - sNode.x;
    const dy = eNode.y - sNode.y;
    const wallLen = Math.hypot(dx, dy);

    // Calculate position along wall
    const clickPt = { x: event.point.x, y: event.point.y };
    const t = Math.max(
      0.1,
      Math.min(
        0.9,
        ((clickPt.x - sNode.x) * dx + (clickPt.y - sNode.y) * dy) /
          (wallLen * wallLen)
      )
    );

    const defaultWidthPx = opType === 'window' ? 50 : 60;
    cad.pushHistory();
    const id = cad.addOpening({
      wallId,
      type: opType,
      positionAlongWall: t,
      widthPx: defaultWidthPx,
      swingDirection: 'right',
      swingAngle: 90,
      isMainEntrance: opType === 'main_door',
      locked: false,
    });
    renderOpening(id);

    // Sync entrance to canvasStore if main door
    if (opType === 'main_door') {
      const cx = sNode.x + dx * t;
      const cy = sNode.y + dy * t;
      csRef.current.addEntrance({
        id,
        wallPoint: { x: cx, y: cy },
        type: 'main',
      });
    }
  }, [renderOpening]);

  // ── Tool: Split ──────────────────────────────────────────────────────────────

  const handleSplitDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    if (!paper) return;

    const hitResult = paper.project.hitTest(event.point, {
      stroke: true,
      tolerance: 12 / paper.view.zoom,
    });
    if (!hitResult) return;

    const wallId = hitResult.item?.data?.id || hitResult.item?.parent?.data?.id;
    if (!wallId) return;

    const result = cad.splitWall(wallId, event.point.x, event.point.y);
    if (!result) return;

    removeWallItem(wallId);
    const [w1, w2] = result;
    renderWall(w1);
    renderWall(w2);
    renderDimension(w1);
    renderDimension(w2);
    renderAllNodeDots();
    syncToVastu();
  }, [removeWallItem, renderWall, renderDimension, renderAllNodeDots, syncToVastu]);

  // ── Tool: Delete ─────────────────────────────────────────────────────────────

  const handleDeleteDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    if (!paper) return;

    const hitResult = paper.project.hitTest(event.point, {
      segments: true,
      stroke: true,
      fill: true,
      tolerance: 12 / paper.view.zoom,
    });
    if (!hitResult) return;

    const data = hitResult.item?.data || hitResult.item?.parent?.data;
    if (!data) return;

    cad.pushHistory();

    if (data.type === 'wall') {
      cad.deleteWall(data.id);
      removeWallItem(data.id);
      const old = openingItemsRef.current.get(data.id);
      if (old) { old.remove(); openingItemsRef.current.delete(data.id); }
      renderAllNodeDots();
      syncToVastu();
    } else if (data.type === 'opening') {
      cad.deleteOpening(data.id);
      const item = openingItemsRef.current.get(data.id);
      if (item) { item.remove(); openingItemsRef.current.delete(data.id); }
    } else if (data.type === 'furniture') {
      cad.deleteFurniture(data.id);
      const item = furnitureItemsRef.current.get(data.id);
      if (item) { item.remove(); furnitureItemsRef.current.delete(data.id); }
    } else if (data.type === 'cut') {
      cad.removeCut(data.id);
      const item = cutItemsRef.current.get(data.id);
      if (item) { item.remove(); cutItemsRef.current.delete(data.id); }
      syncToVastu();
    }
  }, [removeWallItem, renderAllNodeDots, syncToVastu]);

  // ── Tool: Cut ────────────────────────────────────────────────────────────────

  const handleCutDown = useCallback((event: any) => {
    const paper = paperRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;
    if (!paper) return;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled);

    if (!state.cutPts) state.cutPts = [];
    state.cutPts.push({ x: snap.x, y: snap.y });
    setStatusMsg(`Cut — ${state.cutPts.length} pts drawn. Double-click to close.`);
  }, []);

  const handleCutMove = useCallback((event: any) => {
    const paper = paperRef.current;
    const layer = uiLayerRef.current;
    const cad = cadRef.current;
    const state = toolStateRef.current;
    if (!paper || !layer) return;

    const raw = { x: event.point.x, y: event.point.y };
    const snap = findSnap(raw, cad.nodes, cad.walls, cad.gridSize, paper.view.zoom, cad.snapEnabled);
    showSnapIndicator(snap);
    setCursorPos({ x: snap.x, y: snap.y });

    if (!state.cutPts || state.cutPts.length === 0) return;

    const prevActive = paper.project.activeLayer;
    layer.activate();
    if (previewRef.current) previewRef.current.remove();

    const pts = [...state.cutPts, { x: snap.x, y: snap.y }];
    const path = new paper.Path();
    for (const pt of pts) path.add(new paper.Point(pt.x, pt.y));
    path.strokeColor = new paper.Color(200 / 255, 60 / 255, 40 / 255, 0.6);
    path.strokeWidth = 2 / paper.view.zoom;
    path.dashArray = [5 / paper.view.zoom, 3 / paper.view.zoom];
    previewRef.current = path;

    prevActive?.activate();
  }, [showSnapIndicator]);

  const handleCutDblClick = useCallback(() => {
    const state = toolStateRef.current;
    const cad = cadRef.current;
    if (!state.cutPts || state.cutPts.length < 3) return;

    cad.pushHistory();
    const cutId = cad.addCut(state.cutPts);
    renderCut(cutId, state.cutPts);

    // Also sync to canvasStore cuts
    csRef.current.addCut(state.cutPts);

    state.cutPts = [];
    if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
    setStatusMsg('Cut Mode — Click to draw cut area. Double-click to close.');
    syncToVastu();
  }, [renderCut, syncToVastu]);

  // ── Tool: Furniture ──────────────────────────────────────────────────────────

  const handleFurnitureDown = useCallback((event: any) => {
    const cad = cadRef.current;
    const tplId = cad.activeFurnitureTemplateId;
    if (!tplId) return;

    const tpl = FURNITURE_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    cad.pushHistory();
    const id = cad.addFurniture({
      templateId: tplId,
      label: tpl.label,
      x: event.point.x,
      y: event.point.y,
      rotation: 0,
      widthPx: tpl.defaultWidthPx,
      heightPx: tpl.defaultHeightPx,
      locked: false,
      visible: true,
      color: tpl.color,
    });
    renderFurniture(id);
  }, [renderFurniture]);

  // ── Main Paper.js initialization ─────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    let mounted = true;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const { default: paper } = await import('paper');
      if (!mounted || !canvasRef.current) return;

      paper.setup(canvasRef.current);
      paperRef.current = paper;

      // ── Create layers (back to front) ──────────────────────────────────
      paper.project.clear();
      const gridLayer = new paper.Layer(); gridLayer.name = 'grid';
      const imageLayer = new paper.Layer(); imageLayer.name = 'image';
      const wallLayer = new paper.Layer(); wallLayer.name = 'walls';
      const openingLayer = new paper.Layer(); openingLayer.name = 'openings';
      const furnitureLayer = new paper.Layer(); furnitureLayer.name = 'furniture';
      const cutLayer = new paper.Layer(); cutLayer.name = 'cuts';
      const dimLayer = new paper.Layer(); dimLayer.name = 'dimensions';
      const uiLayer = new paper.Layer(); uiLayer.name = 'ui';

      gridLayerRef.current = gridLayer;
      imageLayerRef.current = imageLayer;
      wallLayerRef.current = wallLayer;
      openingLayerRef.current = openingLayer;
      furnitureLayerRef.current = furnitureLayer;
      cutLayerRef.current = cutLayer;
      dimLayerRef.current = dimLayer;
      uiLayerRef.current = uiLayer;

      // ── Tool setup ────────────────────────────────────────────────────
      const tool = new paper.Tool();
      toolRef.current = tool;

      tool.onMouseDown = (event: any) => {
        const activeTool = cadRef.current.activeTool;
        if (activeTool === 'wall_line') handleWallLineDown(event);
        else if (activeTool === 'wall_arc') handleWallArcDown(event);
        else if (activeTool === 'wall_bezier') handleWallBezierDown(event);
        else if (activeTool === 'select') handleSelectDown(event);
        else if (activeTool === 'door') handleOpeningDown(event, 'door');
        else if (activeTool === 'window') handleOpeningDown(event, 'window');
        else if (activeTool === 'split') handleSplitDown(event);
        else if (activeTool === 'delete') handleDeleteDown(event);
        else if (activeTool === 'cut') handleCutDown(event);
        else if (activeTool === 'furniture') handleFurnitureDown(event);
      };

      tool.onMouseMove = (event: any) => {
        const activeTool = cadRef.current.activeTool;
        if (activeTool === 'wall_line') handleWallLineMove(event);
        else if (activeTool === 'wall_arc') handleWallArcMove(event);
        else if (activeTool === 'wall_bezier') handleWallBezierMove(event);
        else if (activeTool === 'select') handleSelectMove(event);
        else if (activeTool === 'cut') handleCutMove(event);
        else {
          const raw = { x: event.point.x, y: event.point.y };
          const snap = findSnap(
            raw, cadRef.current.nodes, cadRef.current.walls,
            cadRef.current.gridSize, paper.view.zoom, cadRef.current.snapEnabled
          );
          showSnapIndicator(snap);
          setCursorPos({ x: snap.x, y: snap.y });
        }
      };

      tool.onMouseDrag = (event: any) => {
        const activeTool = cadRef.current.activeTool;
        if (activeTool === 'select') handleSelectDrag(event);
        else if (activeTool === 'wall_bezier') handleWallBezierDrag(event);
      };

      tool.onMouseUp = () => {
        if (cadRef.current.activeTool === 'select') handleSelectUp();
      };

      tool.onKeyDown = (event: any) => {
        if (event.key === 'escape') {
          // Cancel active drawing
          const state = toolStateRef.current;
          state.phase = 'idle';
          state.startPoint = null;
          state.arcStart = null;
          state.arcThrough = null;
          state.bezStart = null;
          state.bezCp1 = null;
          state.cutPts = [];
          if (previewRef.current) { previewRef.current.remove(); previewRef.current = null; }
          setStatusMsg('');
        }

        if (event.key === 'z' && (event.modifiers?.control || event.modifiers?.meta)) {
          event.preventDefault?.();
          cadRef.current.undo();
          // Full re-render after undo
          setTimeout(() => { if (mounted) fullRebuild(); }, 0);
        }
      };

      // Double-click
      tool.onMouseDown = (() => {
        const originalDown = tool.onMouseDown;
        let lastClick = 0;
        return (event: any) => {
          const now = Date.now();
          const isDbl = now - lastClick < 350;
          lastClick = now;

          if (isDbl) {
            const activeTool = cadRef.current.activeTool;
            if (activeTool === 'wall_line') handleWallLineDblClick();
            else if (activeTool === 'cut') handleCutDblClick();
            return;
          }
          if (originalDown) originalDown(event);
        };
      })();

      // ── Wheel zoom ────────────────────────────────────────────────────
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        const p = paperRef.current;
        if (!p) return;

        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, p.view.zoom * factor));

        // Zoom toward cursor
        const rect = canvasRef.current!.getBoundingClientRect();
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const viewPt = p.view.viewToProject(new p.Point(vx, vy));

        p.view.zoom = newZoom;
        const newViewPt = p.view.projectToView(viewPt);
        p.view.center = p.view.center.add(
          new p.Point(
            (vx - newViewPt.x) / newZoom,
            (vy - newViewPt.y) / newZoom
          )
        );

        drawGrid();
        updateChakra();
        // Re-render node dots and dimensions at new scale
        renderAllNodeDots();
        fullRebuildDimensions();
      };

      canvasRef.current.addEventListener('wheel', onWheel, { passive: false });

      // ── Resize ────────────────────────────────────────────────────────
      const ro = new ResizeObserver(() => {
        if (!mounted) return;
        const el = containerRef.current;
        if (!el || !canvasRef.current) return;
        canvasRef.current.width = el.clientWidth;
        canvasRef.current.height = el.clientHeight;
        paper.view.viewSize = new paper.Size(el.clientWidth, el.clientHeight);
        drawGrid();
        updateChakra();
      });
      if (containerRef.current) ro.observe(containerRef.current);

      // Initial grid
      drawGrid();
      updateChakra();

      cleanup = () => {
        canvasRef.current?.removeEventListener('wheel', onWheel);
        ro.disconnect();
        try { paper.project?.clear(); } catch { /* ignore */ }
      };
    };

    init();
    return () => { mounted = false; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Full rebuild helpers ─────────────────────────────────────────────────────

  const fullRebuild = useCallback(() => {
    const cad = cadRef.current;
    const paper = paperRef.current;
    if (!paper) return;

    // Clear all layers and rebuild from store
    wallLayerRef.current?.removeChildren();
    openingLayerRef.current?.removeChildren();
    furnitureLayerRef.current?.removeChildren();
    cutLayerRef.current?.removeChildren();
    dimLayerRef.current?.removeChildren();
    uiLayerRef.current?.removeChildren();

    wallItemsRef.current.clear();
    openingItemsRef.current.clear();
    furnitureItemsRef.current.clear();
    cutItemsRef.current.clear();
    dimItemsRef.current.clear();

    cad.walls.forEach((w) => { renderWall(w.id); renderDimension(w.id); });
    cad.openings.forEach((o) => renderOpening(o.id));
    cad.furniture.forEach((f) => renderFurniture(f.id));
    cad.cuts.forEach((c) => renderCut(c.id, c.points));
    renderAllNodeDots();
    drawGrid();
    updateChakra();
  }, [renderWall, renderDimension, renderOpening, renderFurniture, renderCut, renderAllNodeDots, drawGrid, updateChakra]);

  const fullRebuildDimensions = useCallback(() => {
    const cad = cadRef.current;
    if (!cad.showDimensions) return;
    dimLayerRef.current?.removeChildren();
    dimItemsRef.current.clear();
    cad.walls.forEach((w) => renderDimension(w.id));
  }, [renderDimension]);

  // ── Sync cadStore.walls → canvas (incremental) ─────────────────────────────

  const prevWallIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;

    const currentIds = new Set(cadStore.walls.map((w) => w.id));
    // Remove deleted walls
    for (const id of prevWallIdsRef.current) {
      if (!currentIds.has(id)) removeWallItem(id);
    }
    // Add/update walls
    for (const wall of cadStore.walls) {
      renderWall(wall.id);
      renderDimension(wall.id);
    }
    renderAllNodeDots();
    prevWallIdsRef.current = currentIds;
  }, [cadStore.walls, cadStore.nodes, renderWall, renderDimension, removeWallItem, renderAllNodeDots]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    cadStore.openings.forEach((o) => renderOpening(o.id));
  }, [cadStore.openings, renderOpening]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    cadStore.furniture.forEach((f) => renderFurniture(f.id));
  }, [cadStore.furniture, renderFurniture]);

  useEffect(() => {
    const paper = paperRef.current;
    if (!paper) return;
    // Rebuild cuts
    cutLayerRef.current?.removeChildren();
    cutItemsRef.current.clear();
    cadStore.cuts.forEach((c) => renderCut(c.id, c.points));
  }, [cadStore.cuts, renderCut]);

  // ── Tool change effects ──────────────────────────────────────────────────────

  useEffect(() => {
    const tool = cadStore.activeTool;
    const state = toolStateRef.current;
    // Reset tool state on tool switch
    state.phase = 'idle';
    state.startPoint = null;
    state.arcStart = null;
    state.arcThrough = null;
    state.bezStart = null;
    state.bezCp1 = null;
    state.cutPts = [];
    if (previewRef.current) { previewRef.current?.remove?.(); previewRef.current = null; }
    hideSnapIndicator();

    const msgs: Record<string, string> = {
      select: 'Select — click or drag to move elements',
      wall_line: 'Wall Line — click to place points. Double-click to finish.',
      wall_arc: 'Arc Wall — click start point',
      wall_bezier: 'Bezier Wall — click start point',
      door: 'Door — click on a wall to place a door',
      window: 'Window — click on a wall to place a window',
      split: 'Split — click on a wall to split it',
      delete: 'Delete — click on any element to remove it',
      extend: 'Extend — click wall endpoint to extend',
      cut: 'Cut Mode — click to draw cut area. Double-click to close.',
      furniture: 'Furniture — click to place selected furniture',
    };
    setStatusMsg(msgs[tool] || '');
  }, [cadStore.activeTool, hideSnapIndicator]);

  // ── Chakra position update ───────────────────────────────────────────────────

  useEffect(() => {
    updateChakra();
  }, [
    canvasStore.brahmaX,
    canvasStore.brahmaY,
    canvasStore.chakraVisible,
    updateChakra,
  ]);

  // ── Grid update on settings change ──────────────────────────────────────────

  useEffect(() => {
    drawGrid();
  }, [cadStore.showGrid, cadStore.gridSize, drawGrid]);

  // ── Dimension update on settings change ─────────────────────────────────────

  useEffect(() => {
    fullRebuildDimensions();
  }, [cadStore.showDimensions, cadStore.pixelsPerUnit, cadStore.unit, fullRebuildDimensions]);

  // ── Cursor style ─────────────────────────────────────────────────────────────

  const cursorStyle: Record<string, string> = {
    select: 'default',
    wall_line: 'crosshair',
    wall_arc: 'crosshair',
    wall_bezier: 'crosshair',
    door: 'cell',
    window: 'cell',
    split: 'col-resize',
    delete: 'not-allowed',
    extend: 'e-resize',
    cut: 'crosshair',
    furniture: 'copy',
  };

  const cursor = cursorStyle[cadStore.activeTool] || 'default';

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-bg min-h-0"
      style={{ cursor }}
    >
      {/* Paper.js canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Shakti Chakra overlay */}
      {chakra && canvasStore.chakraVisible && (
        <div
          style={{
            position: 'absolute',
            left: chakra.left,
            top: chakra.top,
            width: chakra.size,
            height: chakra.size,
            transform: `translate(-50%, -50%) rotate(${-canvasStore.northDeg}deg)`,
            opacity: canvasStore.chakraOpacity,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/vastuchakra.png"
            alt="Vastu Shakti Chakra"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      )}

      {/* Brahmasthan indicator */}
      {chakra && canvasStore.brahmaConfirmed && (
        <div
          style={{
            position: 'absolute',
            left: chakra.left,
            top: chakra.top,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--gold)',
              boxShadow: '0 0 8px var(--gold)',
              border: '2px solid var(--gold-2)',
            }}
          />
        </div>
      )}

      {/* Snap type indicator (top-left) */}
      {cursorPos && (
        <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none z-10">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: SNAP_COLORS[snapType] }}
          />
          <span className="text-[9px] font-mono text-vastu-text-3">
            {snapType}
          </span>
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-full px-3 py-1 text-[10px] text-gold-2 z-10 pointer-events-none">
          {statusMsg}
        </div>
      )}

      {/* Bottom status bar */}
      <div className="absolute bottom-0 left-0 right-0 h-7 bg-bg-2 border-t border-[rgba(200,175,120,0.12)] flex items-center px-3 gap-3 text-[9px] text-vastu-text-3 z-10">
        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const p = paperRef.current;
              if (!p) return;
              p.view.zoom = Math.max(MIN_ZOOM, p.view.zoom * 0.8);
              drawGrid(); updateChakra(); fullRebuildDimensions(); renderAllNodeDots();
            }}
            className="w-[18px] h-[18px] bg-bg-3 border border-[rgba(200,175,120,0.1)] rounded-[2px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 cursor-pointer"
          >−</button>
          <span className="font-mono min-w-[32px] text-center">
            {paperRef.current ? `${Math.round(paperRef.current.view.zoom * 100)}%` : '100%'}
          </span>
          <button
            onClick={() => {
              const p = paperRef.current;
              if (!p) return;
              p.view.zoom = Math.min(MAX_ZOOM, p.view.zoom * 1.25);
              drawGrid(); updateChakra(); fullRebuildDimensions(); renderAllNodeDots();
            }}
            className="w-[18px] h-[18px] bg-bg-3 border border-[rgba(200,175,120,0.1)] rounded-[2px] flex items-center justify-center text-[11px] text-vastu-text-2 hover:border-gold-3 cursor-pointer"
          >+</button>
          <button
            onClick={() => {
              const p = paperRef.current;
              if (!p) return;
              p.view.zoom = 1;
              p.view.center = new p.Point(0, 0);
              drawGrid(); updateChakra(); fullRebuildDimensions(); renderAllNodeDots();
            }}
            className="w-[18px] h-[18px] bg-bg-3 border border-[rgba(200,175,120,0.1)] rounded-[2px] flex items-center justify-center text-[10px] text-vastu-text-2 hover:border-gold-3 cursor-pointer"
            title="Reset zoom"
          >⊙</button>
        </div>

        <div className="w-[1px] h-3 bg-[rgba(200,175,120,0.08)]" />

        {/* Cursor position */}
        {cursorPos && (
          <span className="font-mono">
            {cadStore.pixelsPerUnit > 0
              ? `${(cursorPos.x / cadStore.pixelsPerUnit).toFixed(1)} ${cadStore.unit}, ${(cursorPos.y / cadStore.pixelsPerUnit).toFixed(1)} ${cadStore.unit}`
              : `${Math.round(cursorPos.x)}, ${Math.round(cursorPos.y)} px`}
          </span>
        )}

        <div className="w-[1px] h-3 bg-[rgba(200,175,120,0.08)]" />

        {/* Wall count + area */}
        <span>{cadStore.walls.length} walls</span>
        {cadStore.getTotalArea() > 0 && (
          <>
            <div className="w-[1px] h-3 bg-[rgba(200,175,120,0.08)]" />
            <span>
              Area:{' '}
              {cadStore.pixelsPerUnit > 0
                ? `${(cadStore.getTotalArea() / (cadStore.pixelsPerUnit ** 2)).toFixed(1)} ${cadStore.unit}²`
                : `${Math.round(cadStore.getTotalArea())} px²`}
            </span>
          </>
        )}

        <div className="flex-1" />

        {/* Scale indicator */}
        <span>
          {cadStore.pixelsPerUnit > 0
            ? `Scale: 1${cadStore.unit} = ${cadStore.pixelsPerUnit}px`
            : 'Scale: uncalibrated'}
        </span>
      </div>
    </div>
  );
}
