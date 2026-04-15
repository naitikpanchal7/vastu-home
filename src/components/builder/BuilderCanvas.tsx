"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Stage, Layer, Line, Rect, Text, Circle, Group } from "react-konva";
import {
  useBuilderStore,
  SCALE,
  getPlacedRoomCanvasPoints,
} from "@/store/builderStore";
import { pointInPolygon, polygonCentroid } from "@/lib/vastu/geometry";
import { VASTU_ZONES } from "@/lib/vastu/zones";
import { FURNITURE_LIBRARY } from "@/lib/builder/furniture";
import type { PlacedRoom } from "@/store/builderStore";
import type { Point } from "@/lib/vastu/geometry";
import type Konva from "konva";

// ── Constants ─────────────────────────────────────────────────────────────────
const CANVAS_W = 860;
const CANVAS_H = 600;
const GRID_STEP = SCALE;
const SNAP_CLOSE_PX = 18;
const DIM_LABEL_OFFSET = 16;
const MIN_EDGE_FOR_LABEL = 30;
const CHAKRA_R = 250; // radius of the chakra overlay

// ── Union perimeter ───────────────────────────────────────────────────────────
function computeUnionPerimeter(rooms: PlacedRoom[]): Point[] {
  if (rooms.length === 0) return [];

  const occupied = new Set<string>();
  for (const room of rooms) {
    const pts = getPlacedRoomCanvasPoints(room);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minGX = Math.floor(Math.min(...xs) / SCALE);
    const maxGX = Math.ceil(Math.max(...xs) / SCALE);
    const minGY = Math.floor(Math.min(...ys) / SCALE);
    const maxGY = Math.ceil(Math.max(...ys) / SCALE);

    for (let gy = minGY; gy < maxGY; gy++) {
      for (let gx = minGX; gx < maxGX; gx++) {
        const cx = gx * SCALE + SCALE / 2;
        const cy = gy * SCALE + SCALE / 2;
        if (pointInPolygon(cx, cy, pts)) occupied.add(`${gx},${gy}`);
      }
    }
  }

  if (occupied.size === 0) return [];

  interface Edge { x1: number; y1: number; x2: number; y2: number }
  const edges: Edge[] = [];

  for (const key of occupied) {
    const [gx, gy] = key.split(",").map(Number);
    const x = gx * SCALE;
    const y = gy * SCALE;
    if (!occupied.has(`${gx},${gy - 1}`)) edges.push({ x1: x,         y1: y,         x2: x + SCALE, y2: y         });
    if (!occupied.has(`${gx},${gy + 1}`)) edges.push({ x1: x + SCALE, y1: y + SCALE, x2: x,         y2: y + SCALE });
    if (!occupied.has(`${gx - 1},${gy}`)) edges.push({ x1: x,         y1: y + SCALE, x2: x,         y2: y         });
    if (!occupied.has(`${gx + 1},${gy}`)) edges.push({ x1: x + SCALE, y1: y,         x2: x + SCALE, y2: y + SCALE });
  }

  if (edges.length === 0) return [];

  const adjMap = new Map<string, Edge[]>();
  const ptKey = (x: number, y: number) => `${x},${y}`;
  for (const e of edges) {
    const k = ptKey(e.x1, e.y1);
    if (!adjMap.has(k)) adjMap.set(k, []);
    adjMap.get(k)!.push(e);
  }

  const polygon: Point[] = [];
  const used = new Set<Edge>();
  const startEdge = edges[0];
  let current = startEdge;
  used.add(current);
  polygon.push({ x: current.x1, y: current.y1 });

  for (let i = 0; i < edges.length + 1; i++) {
    const nextKey = ptKey(current.x2, current.y2);
    const candidates = adjMap.get(nextKey) || [];
    const next = candidates.find((e) => !used.has(e));
    if (!next) break;
    used.add(next);
    polygon.push({ x: next.x1, y: next.y1 });
    current = next;
    if (current.x2 === startEdge.x1 && current.y2 === startEdge.y1) break;
  }

  return polygon;
}

// ── Zone detection ────────────────────────────────────────────────────────────
function detectZoneForPoint(px: number, py: number, brahmaX: number, brahmaY: number, northDeg: number): string {
  const dx = px - brahmaX;
  const dy = py - brahmaY;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return "Brahmasthan";
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  angle = (angle - northDeg + 360) % 360;
  for (const zone of VASTU_ZONES) {
    const { startDeg: s, endDeg: e } = zone;
    if (s > e ? (angle >= s || angle < e) : (angle >= s && angle < e)) return zone.shortName;
  }
  return "N";
}

// ── Furniture assessment ──────────────────────────────────────────────────────
function assessFurniture(templateId: string, zone: string): { label: string; color: string } {
  const item = FURNITURE_LIBRARY.find((f) => f.id === templateId);
  if (!item) return { label: "–", color: "#888" };
  if (item.idealZones.includes(zone)) return { label: "✓ Ideal", color: "#4ade80" };
  if (item.avoidZones.includes(zone)) return { label: "⚠ Avoid", color: "#f87171" };
  return { label: "○ Neutral", color: "#d4af78" };
}

// ── Edge dimension helpers ────────────────────────────────────────────────────
interface EdgeDim {
  midX: number; midY: number;
  labelX: number; labelY: number;
  angleDeg: number;
  lengthFt: number;
  p1: Point; p2: Point;
}

function getEdgeDimensions(absPts: Point[]): EdgeDim[] {
  const n = absPts.length;
  if (n < 2) return [];
  const cx = absPts.reduce((s, p) => s + p.x, 0) / n;
  const cy = absPts.reduce((s, p) => s + p.y, 0) / n;
  return absPts.map((p, i) => {
    const next = absPts[(i + 1) % n];
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < MIN_EDGE_FOR_LABEL) return null as unknown as EdgeDim;
    const midX = (p.x + next.x) / 2;
    const midY = (p.y + next.y) / 2;
    const nx = -dy / len;
    const ny = dx / len;
    const dot = (midX - cx) * nx + (midY - cy) * ny;
    const onx = dot >= 0 ? nx : -nx;
    const ony = dot >= 0 ? ny : -ny;
    const labelX = midX + onx * DIM_LABEL_OFFSET;
    const labelY = midY + ony * DIM_LABEL_OFFSET;
    let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;
    return { midX, midY, labelX, labelY, angleDeg, lengthFt: len / SCALE, p1: p, p2: next };
  }).filter(Boolean);
}

function snap(v: number): number {
  return Math.round(v / SCALE) * SCALE;
}

// ── North Arrow SVG overlay ───────────────────────────────────────────────────
function NorthArrowOverlay({ northDeg }: { northDeg: number }) {
  return (
    <div className="absolute top-3 left-3 pointer-events-none z-10">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24" fill="rgba(15,14,11,0.75)" stroke="rgba(200,175,120,0.2)" strokeWidth="1" />
        {/* Entire compass (needle + cardinal labels) rotates together — matches chakra direction */}
        <g style={{ transformOrigin: "26px 26px", transform: `rotate(${-northDeg}deg)` }}>
          {/* Cross hairs */}
          <line x1="26" y1="4" x2="26" y2="48" stroke="rgba(200,175,120,0.18)" strokeWidth="0.5" />
          <line x1="4" y1="26" x2="48" y2="26" stroke="rgba(200,175,120,0.18)" strokeWidth="0.5" />
          {/* North half — gold */}
          <polygon points="26,6 23,26 29,26" fill="#c8af78" />
          {/* South half — muted */}
          <polygon points="26,46 23,26 29,26" fill="rgba(200,175,120,0.25)" />
          <circle cx="26" cy="26" r="3" fill="#0f0e0b" />
          {/* Cardinal labels rotate with the needle */}
          <text x="26" y="4.5" textAnchor="middle" fill="#c8af78" fontSize="7" fontFamily="DM Mono, monospace" fontWeight="700">N</text>
          <text x="26" y="51" textAnchor="middle" fill="rgba(200,175,120,0.45)" fontSize="6" fontFamily="DM Mono, monospace">S</text>
          <text x="49" y="29" textAnchor="middle" fill="rgba(200,175,120,0.45)" fontSize="6" fontFamily="DM Mono, monospace">E</text>
          <text x="3"  y="29" textAnchor="middle" fill="rgba(200,175,120,0.45)" fontSize="6" fontFamily="DM Mono, monospace">W</text>
        </g>
      </svg>
      <div className="text-center mt-[1px]">
        <span className="font-mono text-[7px] text-gold-3">{northDeg.toFixed(1)}°</span>
      </div>
    </div>
  );
}

// ── Shakti Chakra SVG overlay ─────────────────────────────────────────────────
function ChakraOverlay({ cx, cy, northDeg, visible }: { cx: number; cy: number; northDeg: number; visible: boolean }) {
  if (!visible) return null;
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width={CANVAS_W}
      height={CANVAS_H}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
    >
      <image
        href="/vastuchakra.png"
        x={cx - CHAKRA_R}
        y={cy - CHAKRA_R}
        width={CHAKRA_R * 2}
        height={CHAKRA_R * 2}
        opacity={0.42}
        transform={`rotate(${-northDeg}, ${cx}, ${cy})`}
        style={{ mixBlendMode: "screen" }}
      />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function BuilderCanvas() {
  const builder = useBuilderStore();
  const stageRef = useRef<Konva.Stage>(null);

  // Draw mode local state
  const [drawPts, setDrawPts]           = useState<Point[]>([]);
  const [mousePos, setMousePos]         = useState<Point>({ x: 0, y: 0 });
  const [namingDialog, setNamingDialog] = useState<{ pts: Point[] } | null>(null);
  const [pendingName, setPendingName]   = useState("Custom Room");
  const [pendingType, setPendingType]   = useState<string>("living-room");

  // Cut draw mode — use ref so handlers always see fresh points without stale closures
  const cutPtsRef = useRef<Point[]>([]);
  const [cutPts, setCutPts]   = useState<Point[]>([]);
  const updateCutPts = useCallback((pts: Point[]) => {
    cutPtsRef.current = pts;
    setCutPts(pts);
  }, []);
  // Debounce ref — prevents Konva's dblClick from firing two onClick events and adding
  // two ghost points before the polygon is closed (same pattern as VastuCanvas.tsx)
  const lastCutClickTimeRef = useRef(0);

  // Move-all drag state
  const moveAllStartRef = useRef<Point | null>(null);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; roomId: string } | null>(null);
  // Furniture tooltip
  const [hoveredFurnId, setHoveredFurnId] = useState<string | null>(null);

  const {
    placedRooms, placedFurniture,
    selectedRoomId, selectedFurnitureId,
    selectRoom, selectFurniture,
    movePlacedRoom, movePlacedFurniture,
    removePlacedRoom, removePlacedFurniture,
    rotatePlacedRoom,
    updatePlacedRoomVertex,
    setAssembledPerimeter,
    isDrawingRoom, setDrawingRoom,
    isCuttingMode, setCuttingMode,
    isMovingAll, setMovingAll, moveAllRooms,
    addPlacedRoomFromDrawing,
    addCut,
    northDeg, brahmaX, brahmaY, setBrahma,
    showChakra,
    cuts,
  } = builder;

  // ── ESC to cancel drawing / modes ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawPts([]);
        updateCutPts([]);
        setNamingDialog(null);
        lastCutClickTimeRef.current = 0;
        if (isDrawingRoom) setDrawingRoom(false);
        if (isCuttingMode) setCuttingMode(false);
        if (isMovingAll) setMovingAll(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isDrawingRoom, setDrawingRoom, isCuttingMode, setCuttingMode, isMovingAll, setMovingAll, updateCutPts]);

  // ── Recompute perimeter + auto-detect Brahmasthan ─────────────────────────
  useEffect(() => {
    if (placedRooms.length === 0) {
      setAssembledPerimeter([]);
      return;
    }
    const perimeter = computeUnionPerimeter(placedRooms);
    setAssembledPerimeter(perimeter);

    // Auto-detect Brahmasthan as exact centroid of the union perimeter
    if (perimeter.length >= 3) {
      const c = polygonCentroid(perimeter);
      if (isFinite(c.x) && isFinite(c.y)) {
        setBrahma(c.x, c.y);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedRooms]);

  // ── Update furniture zones ─────────────────────────────────────────────────
  useEffect(() => {
    placedFurniture.forEach((f) => {
      const fCx = f.x + (f.widthFt * SCALE) / 2;
      const fCy = f.y + (f.heightFt * SCALE) / 2;
      const zone = detectZoneForPoint(fCx, fCy, brahmaX, brahmaY, northDeg);
      if (zone !== f.currentZone) builder.updateFurnitureZone(f.id, zone);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placedFurniture.length, brahmaX, brahmaY, northDeg]);

  // ── Snapped position from stage ────────────────────────────────────────────
  const getSnappedPos = useCallback((): Point => {
    const pos = stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };
    return { x: snap(pos.x), y: snap(pos.y) };
  }, []);

  // ── Mouse move — ghost line ────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawingRoom && !isCuttingMode) return;
    const pos = stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };
    // snap for room drawing, raw for cut
    if (isDrawingRoom) setMousePos({ x: snap(pos.x), y: snap(pos.y) });
    else setMousePos({ x: pos.x, y: pos.y });
  }, [isDrawingRoom, isCuttingMode]);

  // ── Place a room draw point ────────────────────────────────────────────────
  const handleDrawPoint = useCallback(() => {
    const pt = getSnappedPos();
    if (drawPts.length >= 3) {
      const dist = Math.hypot(pt.x - drawPts[0].x, pt.y - drawPts[0].y);
      if (dist <= SNAP_CLOSE_PX) {
        setNamingDialog({ pts: drawPts });
        setDrawPts([]);
        return;
      }
    }
    setDrawPts((prev) => [...prev, pt]);
  }, [drawPts, getSnappedPos]);

  // ── Close room drawing ─────────────────────────────────────────────────────
  const handleDrawDblClick = useCallback(() => {
    if (drawPts.length >= 3) {
      setNamingDialog({ pts: drawPts });
      setDrawPts([]);
    }
  }, [drawPts]);

  // ── Stage click — handles draw, cut, deselect ─────────────────────────────
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Cut mode: add a cut point using ref (always fresh, no stale closure)
    if (isCuttingMode) {
      // Debounce: ignore clicks within 350 ms — prevents Konva's dblClick from adding
      // two ghost points before the dblClick handler can close the polygon.
      const now = Date.now();
      if (now - lastCutClickTimeRef.current < 350) return;
      lastCutClickTimeRef.current = now;

      const pos = stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 };
      const pt: Point = { x: pos.x, y: pos.y };
      const current = cutPtsRef.current;
      if (current.length >= 3) {
        const dist = Math.hypot(pt.x - current[0].x, pt.y - current[0].y);
        if (dist <= SNAP_CLOSE_PX * 2) {
          addCut(current);
          updateCutPts([]);
          lastCutClickTimeRef.current = 0;
          setCuttingMode(false);
          return;
        }
      }
      updateCutPts([...current, pt]);
      return;
    }

    if (isDrawingRoom) { handleDrawPoint(); return; }

    const isStage = e.target === e.target.getStage();
    if (isStage) {
      selectRoom(null);
      selectFurniture(null);
      setContextMenu(null);
    }
  }, [isCuttingMode, isDrawingRoom, handleDrawPoint, selectRoom, selectFurniture, addCut, updateCutPts, setCuttingMode]);

  const handleStageDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Cut mode: close polygon on double-click using ref (always fresh)
    if (isCuttingMode) {
      // Set timestamp so any trailing onClick fired by Konva after this dblClick is debounced away
      lastCutClickTimeRef.current = Date.now();
      const current = cutPtsRef.current;
      if (current.length >= 3) {
        addCut(current);
        updateCutPts([]);
        setCuttingMode(false);
      }
      return;
    }
    if (isDrawingRoom) handleDrawDblClick();
  }, [isCuttingMode, isDrawingRoom, handleDrawDblClick, addCut, updateCutPts, setCuttingMode]);

  // ── Confirm drawn room ─────────────────────────────────────────────────────
  const confirmDrawnRoom = () => {
    if (!namingDialog) return;
    addPlacedRoomFromDrawing(pendingName, pendingType as import("@/lib/builder/roomTypes").RoomType, namingDialog.pts);
    setNamingDialog(null);
    setPendingName("Custom Room");
  };

  // ── Room context menu ──────────────────────────────────────────────────────
  const handleRoomContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>, roomId: string) => {
      e.evt.preventDefault();
      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return;
      setContextMenu({ x: pos.x, y: pos.y, roomId });
    }, []
  );

  // ── Grid dots ─────────────────────────────────────────────────────────────
  const dots: React.ReactNode[] = [];
  for (let x = GRID_STEP; x < CANVAS_W; x += GRID_STEP) {
    for (let y = GRID_STEP; y < CANVAS_H; y += GRID_STEP) {
      dots.push(
        <Circle key={`d-${x}-${y}`} x={x} y={y} radius={1} fill="rgba(200,175,120,0.12)" listening={false} />
      );
    }
  }

  const perimeter = builder.assembledPerimeter;
  const perimeterFlat = perimeter.flatMap((p) => [p.x, p.y]);

  // Active drawing points (room or cut)
  const activePts  = isDrawingRoom ? drawPts : isCuttingMode ? cutPts : [];
  const activeMode = isDrawingRoom ? "room" : isCuttingMode ? "cut" : null;

  // ── Move-all drag handlers ────────────────────────────────────────────────
  const handleMoveAllMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMovingAll) return;
    moveAllStartRef.current = { x: e.clientX, y: e.clientY };
  }, [isMovingAll]);

  const handleMoveAllMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMovingAll || !moveAllStartRef.current) return;
    const dx = e.clientX - moveAllStartRef.current.x;
    const dy = e.clientY - moveAllStartRef.current.y;
    moveAllStartRef.current = { x: e.clientX, y: e.clientY };
    moveAllRooms(dx, dy);
  }, [isMovingAll, moveAllRooms]);

  const handleMoveAllMouseUp = useCallback(() => {
    moveAllStartRef.current = null;
  }, []);

  const activeCursor = isMovingAll ? "grab" : (isDrawingRoom || isCuttingMode) ? "crosshair" : "default";

  return (
    <div
      className="relative bg-[#0f0e0b] overflow-hidden select-none"
      style={{ width: CANVAS_W, height: CANVAS_H, cursor: isMovingAll ? "grab" : undefined }}
      onClick={() => setContextMenu(null)}
      onMouseDown={handleMoveAllMouseDown}
      onMouseMove={handleMoveAllMouseMove}
      onMouseUp={handleMoveAllMouseUp}
    >
      <Stage
        ref={stageRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onClick={handleStageClick}
        onDblClick={handleStageDblClick}
        onMouseMove={handleMouseMove}
        style={{ cursor: activeCursor }}
      >
        {/* ── Background + Grid ─────────────────────────────────────────── */}
        <Layer listening={false}>
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill="#0f0e0b" />
          {dots}
          <Line points={[20, CANVAS_H - 18, 20 + SCALE * 10, CANVAS_H - 18]} stroke="rgba(200,175,120,0.3)" strokeWidth={1} />
          <Line points={[20, CANVAS_H - 22, 20, CANVAS_H - 14]} stroke="rgba(200,175,120,0.3)" strokeWidth={1} />
          <Line points={[20 + SCALE * 10, CANVAS_H - 22, 20 + SCALE * 10, CANVAS_H - 14]} stroke="rgba(200,175,120,0.3)" strokeWidth={1} />
          <Text x={20} y={CANVAS_H - 32} width={SCALE * 10} align="center" text="10 ft" fontSize={8} fontFamily="DM Mono, monospace" fill="rgba(200,175,120,0.4)" listening={false} />
        </Layer>

        {/* ── Perimeter outline ──────────────────────────────────────────── */}
        <Layer listening={false}>
          {perimeter.length >= 3 && (
            <Line points={perimeterFlat} closed stroke="#c8af78" strokeWidth={2} dash={[8, 4]} opacity={0.5} />
          )}
        </Layer>

        {/* ── Cut regions ───────────────────────────────────────────────── */}
        <Layer listening={false}>
          {cuts.map((cut) => (
            <Group key={cut.id}>
              <Line
                points={cut.points.flatMap((p) => [p.x, p.y])}
                closed
                fill="rgba(200,60,40,0.2)"
                stroke="rgba(200,60,40,0.7)"
                strokeWidth={1.8}
                dash={[6, 3]}
              />
              {/* Label at centroid — matches normal canvas style */}
              {cut.points.length > 0 && (
                <Text
                  x={cut.points.reduce((s, p) => s + p.x, 0) / cut.points.length - 28}
                  y={cut.points.reduce((s, p) => s + p.y, 0) / cut.points.length - 6}
                  width={56}
                  align="center"
                  text={cut.label}
                  fontSize={11}
                  fontStyle="bold"
                  fontFamily="DM Mono, monospace"
                  fill="#e05050"
                />
              )}
            </Group>
          ))}
        </Layer>

        {/* ── Rooms layer ────────────────────────────────────────────────── */}
        <Layer>
          {placedRooms.map((room) => {
            const absPts = getPlacedRoomCanvasPoints(room);
            const flatLocal = room.localPoints.flatMap((p) => [p.x * SCALE, p.y * SCALE]);
            const isSelected = room.id === selectedRoomId;
            const lCx = room.localPoints.reduce((s, p) => s + p.x, 0) / room.localPoints.length * SCALE;
            const lCy = room.localPoints.reduce((s, p) => s + p.y, 0) / room.localPoints.length * SCALE;
            const edgeDims = getEdgeDimensions(absPts);
            return (
              <Group
                key={room.id}
                x={room.x}
                y={room.y}
                draggable={!isDrawingRoom && !isCuttingMode}
                onDragEnd={(e) => movePlacedRoom(room.id, e.target.x(), e.target.y())}
                onClick={(e) => {
                  if (!isDrawingRoom && !isCuttingMode) {
                    e.cancelBubble = true;
                    selectRoom(room.id);
                    setContextMenu(null);
                  }
                }}
                onContextMenu={(e) => handleRoomContextMenu(e, room.id)}
              >
                <Line points={flatLocal} closed fill={room.color} stroke={isSelected ? "#e8d4a0" : room.borderColor} strokeWidth={isSelected ? 2.5 : 1.5} />
                <Text x={lCx - 60} y={lCy - 12} width={120} align="center" text={room.name} fontSize={9} fontFamily="DM Sans, sans-serif" fill="rgba(232,224,208,0.92)" listening={false} />
                {edgeDims.map((dim, i) => {
                  const localLX = dim.labelX - room.x;
                  const localLY = dim.labelY - room.y;
                  const ftLabel = Number.isInteger(dim.lengthFt) ? `${dim.lengthFt} ft` : `${dim.lengthFt.toFixed(1)} ft`;
                  return (
                    <Text key={i} x={localLX - 24} y={localLY - 5} width={48} align="center" text={ftLabel} fontSize={7.5} fontFamily="DM Mono, monospace" fill={isSelected ? "rgba(232,212,160,0.85)" : "rgba(176,160,128,0.65)"} rotation={dim.angleDeg} listening={false} />
                  );
                })}
                {isSelected && room.localPoints.map((lp, vi) => (
                  <Circle
                    key={`vh-${vi}`} x={lp.x * SCALE} y={lp.y * SCALE} radius={5} fill="#e8d4a0" stroke="#0f0e0b" strokeWidth={1.5} draggable
                    onMouseDown={(e) => { e.cancelBubble = true; }}
                    onDragMove={(e) => { e.cancelBubble = true; updatePlacedRoomVertex(room.id, vi, room.x + e.target.x(), room.y + e.target.y()); }}
                    onDragEnd={(e) => { e.cancelBubble = true; updatePlacedRoomVertex(room.id, vi, room.x + e.target.x(), room.y + e.target.y()); }}
                  />
                ))}
              </Group>
            );
          })}
        </Layer>

        {/* ── Furniture layer ────────────────────────────────────────────── */}
        <Layer>
          {placedFurniture.map((furn) => {
            const isSelected = furn.id === selectedFurnitureId;
            const wPx = Math.max(furn.widthFt * SCALE, 22);
            const hPx = Math.max(furn.heightFt * SCALE, 22);
            const zone = furn.currentZone || "";
            const assessment = assessFurniture(furn.templateId, zone);
            return (
              <Group key={furn.id} x={furn.x} y={furn.y} draggable={!isDrawingRoom && !isCuttingMode}
                onDragEnd={(e) => movePlacedFurniture(furn.id, e.target.x(), e.target.y())}
                onClick={(e) => { if (!isCuttingMode) { e.cancelBubble = true; selectFurniture(furn.id); } }}
                onMouseEnter={() => setHoveredFurnId(furn.id)}
                onMouseLeave={() => setHoveredFurnId(null)}
              >
                <Rect width={wPx} height={hPx} fill="rgba(200,175,120,0.07)" stroke={isSelected ? "#e8d4a0" : assessment.color} strokeWidth={1} cornerRadius={2} />
                <Text x={0} y={3} width={wPx} align="center" text={furn.emoji} fontSize={Math.min(wPx * 0.55, 20)} listening={false} />
                <Text x={-16} y={hPx + 2} width={wPx + 32} align="center" text={furn.name} fontSize={7} fontFamily="DM Sans, sans-serif" fill="rgba(176,160,128,0.8)" listening={false} />
              </Group>
            );
          })}
        </Layer>

        {/* ── Brahmasthan dot ───────────────────────────────────────────── */}
        <Layer>
          <Circle
            x={brahmaX}
            y={brahmaY}
            radius={7}
            fill="#c8af78"
            stroke="#0f0e0b"
            strokeWidth={1.5}
            opacity={0.9}
            draggable={!isDrawingRoom && !isCuttingMode}
            onDragEnd={(e) => {
              setBrahma(e.target.x(), e.target.y());
            }}
            onDragMove={(e) => {
              setBrahma(e.target.x(), e.target.y());
            }}
          />
          <Circle x={brahmaX} y={brahmaY} radius={2.5} fill="#0f0e0b" listening={false} />
          <Text
            x={brahmaX - 40}
            y={brahmaY + 10}
            width={80}
            align="center"
            text="Brahmasthan"
            fontSize={7}
            fontFamily="DM Mono, monospace"
            fill="rgba(200,175,120,0.6)"
            listening={false}
          />
        </Layer>

        {/* ── Active draw overlay (room or cut) ──────────────────────────── */}
        {activeMode && (
          <Layer listening={false}>
            {activePts.map((pt, i) => (
              <Circle
                key={i} x={pt.x} y={pt.y}
                radius={i === 0 ? 6 : 4}
                fill={activeMode === "cut" ? (i === 0 ? "#e05050" : "#f87171") : (i === 0 ? "#c8af78" : "#e8d4a0")}
                stroke="#0f0e0b" strokeWidth={1.5} listening={false}
              />
            ))}
            {activePts.length >= 2 && (
              <Line
                points={activePts.flatMap((p) => [p.x, p.y])}
                stroke={activeMode === "cut" ? "#e05050" : "#c8af78"}
                strokeWidth={1.5} dash={[4, 3]} listening={false}
              />
            )}
            {activePts.length >= 1 && (
              <Line
                points={[activePts[activePts.length - 1].x, activePts[activePts.length - 1].y, mousePos.x, mousePos.y]}
                stroke={activeMode === "cut" ? "rgba(224,80,80,0.5)" : "rgba(200,175,120,0.5)"}
                strokeWidth={1} dash={[4, 4]} listening={false}
              />
            )}
            {activePts.length >= 3 && Math.hypot(mousePos.x - activePts[0].x, mousePos.y - activePts[0].y) <= SNAP_CLOSE_PX * 2 && (
              <Circle x={activePts[0].x} y={activePts[0].y} radius={12}
                stroke={activeMode === "cut" ? "#e05050" : "#c8af78"}
                strokeWidth={2} opacity={0.7} listening={false}
              />
            )}
            {/* Hint badge */}
            <Rect x={CANVAS_W - 180} y={10} width={170} height={28} fill="rgba(15,14,11,0.85)" cornerRadius={5} listening={false} />
            <Text
              x={CANVAS_W - 180} y={16} width={170} align="center"
              text={
                activeMode === "cut"
                  ? activePts.length === 0 ? "Click to mark cut region" : `${activePts.length} pts — dbl-click to finish`
                  : activePts.length === 0 ? "Click to start room" : `${activePts.length} pts — dbl-click to finish`
              }
              fontSize={8.5} fontFamily="DM Sans, sans-serif"
              fill={activeMode === "cut" ? "rgba(240,100,80,0.9)" : "rgba(200,175,120,0.8)"}
              listening={false}
            />
          </Layer>
        )}
      </Stage>

      {/* ── Chakra SVG overlay ────────────────────────────────────────────── */}
      <ChakraOverlay cx={brahmaX} cy={brahmaY} northDeg={northDeg} visible={showChakra} />

      {/* ── North arrow ───────────────────────────────────────────────────── */}
      <NorthArrowOverlay northDeg={northDeg} />

      {/* ── Furniture tooltip ─────────────────────────────────────────────── */}
      {hoveredFurnId && (() => {
        const furn = placedFurniture.find((f) => f.id === hoveredFurnId);
        if (!furn) return null;
        const zone = furn.currentZone || "–";
        const assessment = assessFurniture(furn.templateId, zone);
        return (
          <div className="absolute bottom-4 left-4 bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-md px-3 py-2 pointer-events-none z-20 max-w-[220px]">
            <div className="text-[10px] text-gold-2 font-sans font-medium mb-1">{furn.emoji} {furn.name}</div>
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="text-vastu-text-3">Zone:</span>
              <span className="text-gold">{zone}</span>
              <span style={{ color: assessment.color }}>{assessment.label}</span>
            </div>
          </div>
        );
      })()}

      {/* ── Room context menu ─────────────────────────────────────────────── */}
      {contextMenu && (
        <div
          className="absolute bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-md py-1 z-30 shadow-lg min-w-[150px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="w-full text-left px-3 py-[6px] text-[11px] text-vastu-text font-sans hover:bg-[rgba(200,175,120,0.08)]"
            onClick={() => { rotatePlacedRoom(contextMenu.roomId); setContextMenu(null); }}>
            ↻ Rotate 90°
          </button>
          <button className="w-full text-left px-3 py-[6px] text-[11px] text-red-400 font-sans hover:bg-red-900/10"
            onClick={() => { removePlacedRoom(contextMenu.roomId); setContextMenu(null); }}>
            ✕ Remove Room
          </button>
        </div>
      )}

      {/* ── Selected furniture remove ──────────────────────────────────────── */}
      {selectedFurnitureId && (
        <div className="absolute top-2 right-[70px] bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-md px-2 py-1 flex gap-2 z-20">
          <button className="text-[9px] text-red-400 font-sans hover:text-red-300"
            onClick={() => removePlacedFurniture(selectedFurnitureId)}>
            ✕ Remove
          </button>
        </div>
      )}

      {/* ── Draw mode naming dialog ───────────────────────────────────────── */}
      {namingDialog && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/40">
          <div className="bg-bg-2 border border-[rgba(200,175,120,0.2)] rounded-[12px] p-5 w-[280px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-serif text-[17px] text-gold-2 mb-3">Name Your Room</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[8px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">Room Name</label>
                <input autoFocus value={pendingName} onChange={(e) => setPendingName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmDrawnRoom()}
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3" />
              </div>
              <div>
                <label className="block text-[8px] uppercase tracking-[1.5px] text-vastu-text-3 mb-1">Room Type</label>
                <select value={pendingType} onChange={(e) => setPendingType(e.target.value)}
                  className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[11px] outline-none focus:border-gold-3">
                  {[
                    { value: "bedroom-master", label: "Master Bedroom" },
                    { value: "bedroom-child",  label: "Children's Bedroom" },
                    { value: "bedroom-guest",  label: "Guest Bedroom" },
                    { value: "kitchen",        label: "Kitchen" },
                    { value: "living-room",    label: "Living Room" },
                    { value: "bathroom",       label: "Bathroom" },
                    { value: "toilet",         label: "Toilet / WC" },
                    { value: "pooja",          label: "Pooja / Prayer" },
                    { value: "study",          label: "Study / Office" },
                    { value: "dining",         label: "Dining Room" },
                    { value: "hallway",        label: "Hallway / Passage" },
                    { value: "balcony",        label: "Balcony / Terrace" },
                    { value: "garage",         label: "Garage / Parking" },
                    { value: "store",          label: "Store Room" },
                  ].map((opt) => <option key={opt.value} value={opt.value} className="bg-bg-3">{opt.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setNamingDialog(null)} className="flex-1 py-[7px] bg-transparent border border-[rgba(200,175,120,0.15)] text-vastu-text-2 font-sans text-[11px] rounded-md hover:border-gold-3">Cancel</button>
                <button onClick={confirmDrawnRoom} className="flex-1 py-[7px] bg-gold text-bg font-sans font-medium text-[11px] rounded-md hover:bg-gold-2">Add Room</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {placedRooms.length === 0 && !isDrawingRoom && !isCuttingMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-[40px] opacity-10 mb-3 font-serif">⊞</div>
            <p className="text-[11px] text-vastu-text-3 font-sans mb-1">Add rooms from the left panel</p>
            <p className="text-[10px] text-vastu-text-3 font-sans opacity-60">or click <span className="text-gold-3">✏ Draw Custom Room</span></p>
          </div>
        </div>
      )}

      {/* ── Cut mode active indicator ──────────────────────────────────────── */}
      {isCuttingMode && cutPts.length === 0 && (
        <div className="absolute bottom-4 right-4 bg-red-900/30 border border-red-800/40 rounded-md px-3 py-[5px] pointer-events-none z-20">
          <span className="text-[9px] text-red-300 font-sans">✕ Cut mode — click to mark region, ESC to cancel</span>
        </div>
      )}
    </div>
  );
}
