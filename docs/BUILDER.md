# Custom Floor Plan Builder — Full Documentation

> Branch: `custom-floor-plan-builder`
> Route: `/builder`

---

## What Is It?

A fully interactive floor plan builder embedded in the vastu@home platform. Users can design rooms using preset shapes, draw custom polygons freehand (like MS Paint), resize rooms directly on the canvas by dragging vertex handles, and get real-time Vastu zone feedback for every piece of furniture placed.

---

## What Was Built From Scratch vs Library

| Feature | From Scratch | Library |
|---|---|---|
| Shape polygon math (L, T, U, diagonal-cut) | Yes — pure geometry | — |
| Freehand polygon draw mode | Yes — vertex state machine | — |
| Vertex drag handles + re-normalization | Yes — custom algorithm | — |
| Dimension labels (outward normal, rotation) | Yes — vector math | — |
| Union perimeter tracing | Yes — grid rasterization + edge walk | — |
| Zone detection from angle | Yes — atan2 + zone table | — |
| Canvas rendering | — | react-konva (Konva.js) |
| State management | — | Zustand |
| Styling | — | Tailwind CSS |

---

## Files Created / Modified

### New Files (created for this feature)

| File | Purpose |
|---|---|
| `src/app/builder/page.tsx` | Route entry point — wraps BuilderWorkspace in AppShell |
| `src/components/builder/BuilderWorkspace.tsx` | Top-level layout: topbar, left panel, canvas, right panel |
| `src/components/builder/BuilderCanvas.tsx` | Main Konva canvas — all drawing, interaction, overlays |
| `src/components/builder/RoomCreatorForm.tsx` | Left panel form — create preset-shape rooms |
| `src/components/builder/RoomLibrary.tsx` | Left panel list — drag/drop room templates to canvas |
| `src/components/builder/FurnitureLibrary.tsx` | Left panel list — categorized furniture items |
| `src/store/builderStore.ts` | Zustand store for all builder state |
| `src/lib/builder/presetShapes.ts` | Shape polygon math — all geometry computed here |
| `src/lib/builder/roomTypes.ts` | 14 room types with colors and Vastu zone rules |
| `src/lib/builder/furniture.ts` | 20 furniture items with Vastu significance |

### Modified Files

| File | What Changed |
|---|---|
| `src/components/layout/Sidebar.tsx` | Added "Builder" nav item |

---

## Architecture Overview

```
/builder (page.tsx)
  └── AppShell
        └── BuilderWorkspace
              ├── Topbar (draw mode indicator, rotate, remove, chakra toggle, clear, export)
              ├── Left Panel
              │     ├── RoomCreatorForm  (create preset shapes)
              │     ├── RoomLibrary      (template cards → click to place)
              │     └── FurnitureLibrary (categorized emoji items)
              ├── BuilderCanvas (Konva Stage — all interactivity)
              └── RightPanel (reused from main canvas — analysis, north, AI chat)
```

### State Flow

```
User action → builderStore (Zustand) → BuilderCanvas re-renders via Konva
                                     → assembledPerimeter → canvasStore (Zustand)
                                                          → RightPanel (analysis)
```

---

## Room Shapes

All shapes are **pure polygon math** — no SVG library or shape package used. Each shape returns an array of `Point` objects in feet, with origin at `(0, 0)` (top-left of bounding box).

### Scale

```
SCALE = 20px per foot
```

A 10ft × 10ft room = 200px × 200px on canvas.

### Shape Types

#### Rectangle
Standard 4-point box.
```
(0,0) → (w,0) → (w,h) → (0,h)
```

#### L-Shape
Rectangle with one corner notch removed (bottom-right by default).
```
Notch width (cutWidthFt)  — default: 40% of total width
Notch depth (cutHeightFt) — default: 45% of total height
```
```
┌──────────────┐
│              │
│        ┌─────┘
│        │
└────────┘
```

#### T-Shape
Top bar spans full width; a centred stem drops down.
```
Bar depth  (barHeightFt) — default: 40% of height
Stem width (stemWidthFt) — default: 40% of width, centred
```
```
┌──────────────────┐
│   bar            │
└──┬────────┬──────┘
   │  stem  │
   └────────┘
```

#### U-Shape
Two side arms connected by a bottom slab, open at the top centre.
```
Arm width     (armWidthFt)      — default: 28% of width each side
Opening depth (openingHeightFt) — default: 50% of height
```
```
┌────┐          ┌────┐
│left│          │rgt │
│    └──────────┘    │
│       bottom       │
└────────────────────┘
```

#### Diagonal-Cut (Cut Corner)
Rectangle with one chamfered corner at 45°. Used for Vastu-compliant NE corner cuts.
```
Chamfer size (chamferFt) — default: 25% of min(width, height)
```
```
    ╱────────────┐
   ╱             │
  │              │
  └──────────────┘
```

#### Custom
Free-form polygon drawn by the user on canvas. Any number of vertices, any shape.

---

## Freehand Draw Mode (MS Paint Style)

Activated by clicking "✏ Draw Custom Room" in the left panel.

### How It Works

1. Canvas cursor changes to crosshair.
2. Each click places a vertex (snapped to grid).
3. A ghost line follows the mouse from the last placed vertex.
4. First vertex glows gold and shows a snap ring when the mouse is within 18px.
5. Clicking near the first vertex (≤18px) **closes the polygon**.
6. Double-clicking anywhere also closes the polygon.
7. ESC cancels and clears all placed points.

### After Closing

A naming dialog appears over the canvas. User sets:
- Room name (text input)
- Room type (dropdown — 14 options)

On confirm: the drawn points are snapped to the nearest grid, normalized, and committed to the store as both a `RoomTemplate` and a `PlacedRoom`.

### Snap-to-Grid

All points are snapped to the nearest 20px (1ft) grid:
```typescript
snap(v: number) = Math.round(v / SCALE) * SCALE
```

---

## Vertex Handles (Resize on Canvas)

When a room is selected, gold circular handles appear at each polygon vertex. These can be dragged to reshape the room.

### Algorithm

1. User drags a handle to a new position.
2. The new absolute canvas position is snapped to grid.
3. All other vertices are converted from local-feet to absolute canvas coords.
4. The dragged vertex is replaced with the new snapped position.
5. New bounding box `(minX, minY, maxX, maxY)` is computed from all absolute points.
6. `room.x = minX`, `room.y = minY` (top-left of new bounding box).
7. All `localPoints` are re-normalized: `lp.x = (absX - minX) / SCALE`.
8. `widthFt` and `heightFt` are recomputed from the new bounding box.

This prevents negative local coordinates and keeps the coordinate system consistent even when a vertex is dragged outside the original bounding box.

---

## Dimension Labels

Each edge of every placed room shows its length in feet, rendered as a Konva `Text` element.

### Placement Algorithm

For each edge `(p1 → p2)`:
1. Compute edge midpoint.
2. Compute polygon centroid (average of all vertices).
3. Compute edge perpendicular normal vector.
4. Dot-product test: if the normal points away from centroid, use it; otherwise flip it.
5. Label position = midpoint + outward normal × 16px.
6. Rotation = `atan2(dy, dx)` — if angle > 90° or < -90°, add 180° to keep text readable.
7. Skip edges shorter than 30px (too small to show label).

Labels show as `"12 ft"` (integer) or `"12.5 ft"` (one decimal).

---

## Union Perimeter

When multiple rooms are placed, the system computes their **combined outer boundary** and syncs it to `canvasStore` so the Vastu chakra analysis works on the assembled floor plan.

### Algorithm (from scratch)

1. **Rasterize**: For each room, iterate over all grid cells within its bounding box. Test each cell centre with `pointInPolygon()`. Add occupied cells to a `Set<string>`.
2. **Boundary edges**: For each occupied cell, check if its 4 neighbours are occupied. Any face without a neighbour = boundary edge.
3. **Chain edges**: Walk edges by their start point using an adjacency map until the polygon closes.

Result: a single polygon array of `Point[]` in canvas pixels representing the outer perimeter of all rooms combined.

---

## Room Types (14 types)

| Value | Label | Ideal Zones | Avoid Zones |
|---|---|---|---|
| `bedroom-master` | Master Bedroom | SW, S, W | NE, N |
| `bedroom-child` | Children's Bedroom | NW, SE, W | NE, SW |
| `bedroom-guest` | Guest Bedroom | NW, W | NE |
| `kitchen` | Kitchen | SE, NW | N, NE, SW |
| `living-room` | Living Room | N, NE, E, NW | SW |
| `bathroom` | Bathroom | NW, W, E | NE, SW, SE |
| `toilet` | Toilet / WC | SW, W, NW, S | NE, N, E, SE |
| `pooja` | Pooja / Prayer | NE, E | S, SW, W, SE |
| `study` | Study / Office | N, E, NE | S, SW |
| `dining` | Dining Room | W, N | SE, NE |
| `hallway` | Hallway / Passage | N, E, NE | — |
| `balcony` | Balcony / Terrace | N, E, NE | SW |
| `garage` | Garage / Parking | SE, NW | NE, SW |
| `store` | Store Room | SW, NW | NE |

---

## Furniture Library (20 items)

### Categories

| Category | Items |
|---|---|
| Fire | Gas Stove, Microwave/Oven, Fireplace |
| Water | Underground Tank, Overhead Tank, Kitchen Sink, Washing Machine |
| Earth/Heavy | Master Bed, Single Bed, Sofa, Wardrobe, Safe, Dining Table |
| Spiritual | Pooja Altar, Tulsi Plant |
| Air | Window, Air Conditioner |
| Electrical | Television, Study/Work Desk |
| Structural | Staircase, Column/Pillar |

### Vastu Assessment

Each furniture item placed on the canvas is assessed in real-time:
- **✓ Ideal** (green) — item is in one of its `idealZones`
- **⚠ Avoid** (red) — item is in one of its `avoidZones`
- **○ Neutral** (gold) — item is in a zone with no special rule

Zone is detected by computing the angle from `brahmaX/Y` to the furniture's centre, adjusted by `northDeg`.

---

## Store: `builderStore.ts`

### Key Types

```typescript
interface RoomTemplate {
  id: string;
  name: string;
  type: RoomType;
  shape: RoomShape;
  widthFt: number;
  heightFt: number;
  shapeConfig?: ShapeConfig;   // sub-dimensions for L/T/U/diagonal-cut
  localPoints: Point[];         // in feet, origin = top-left
}

interface PlacedRoom {
  id: string;
  templateId: string;
  name: string;
  type: RoomType;
  x: number;   // canvas px — top-left of bounding box
  y: number;
  rotation: 0 | 1 | 2 | 3;    // 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°
  localPoints: Point[];         // in feet, origin = (0,0)
  widthFt: number;
  heightFt: number;
  color: string;
  borderColor: string;
  isCustomDrawn?: boolean;
}

interface PlacedFurniture {
  id: string;
  templateId: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  widthFt: number;
  heightFt: number;
  currentZone?: string;   // auto-computed, e.g. "SW"
}
```

### Key Actions

| Action | What It Does |
|---|---|
| `addRoomTemplate(name, type, shape, w, h, config?)` | Creates a template in the left panel library |
| `addPlacedRoom(templateId)` | Places a template on the canvas |
| `addPlacedRoomFromDrawing(name, type, canvasPoints)` | Places a freehand-drawn room |
| `movePlacedRoom(id, x, y)` | Moves room, snaps to grid |
| `rotatePlacedRoom(id)` | Rotates 90° clockwise, updates localPoints |
| `updatePlacedRoomVertex(roomId, vIdx, absX, absY)` | Drags one vertex, re-normalizes bounding box |
| `removePlacedRoom(id)` | Removes room, clears selection |
| `setDrawingRoom(v)` | Toggles freehand draw mode |
| `addPlacedFurniture(item)` | Places furniture on canvas |
| `setAssembledPerimeter(pts)` | Syncs outer boundary to Zustand |
| `clearCanvas()` | Wipes all rooms, furniture, perimeter |

---

## Coordinate System

```
canvas px = room.x + localPoint.x * SCALE
canvas py = room.y + localPoint.y * SCALE

localPoint.x = (canvasPx - room.x) / SCALE    (in feet)
localPoint.y = (canvasPy - room.y) / SCALE    (in feet)
```

- `room.x / room.y` — always the **top-left corner** of the bounding box, in canvas pixels
- `localPoints` — always in **feet**, always relative to `(0, 0)` = top-left of bounding box
- `SCALE = 20` — 1ft = 20px

---

## Canvas Layers (in render order)

1. **Background + Grid** — dark fill + dot grid (1 dot per foot) + scale bar
2. **Perimeter outline** — dashed gold border showing assembled boundary
3. **Rooms** — filled polygons with labels, dimension text, vertex handles
4. **Furniture** — emoji boxes with Vastu color borders
5. **Draw mode** — vertex circles, lines, ghost line, closing ring
6. **HTML overlays** — furniture tooltip, room context menu, naming dialog

---

## Topbar Actions

| Action | Condition |
|---|---|
| "✏ Drawing Room" badge | When `isDrawingRoom = true` |
| ↻ Rotate | When a room is selected and not in draw mode |
| ✕ Remove | When a room is selected and not in draw mode |
| ✕ Remove Item | When furniture is selected and not in draw mode |
| ◎ Chakra | Always — toggles Vastu chakra overlay |
| Clear | Always — confirms then clears canvas |
| Export | Always — opens export modal (screenshot only in Phase 1) |

---

## What Is NOT Done (Phase 2)

- PDF export with room labels and Vastu annotations
- Saving floor plans to Supabase
- Undo/redo
- Copy/paste rooms
- Room snap-to-edge alignment
- Multi-select
- Zoom + pan
- Import from image (AI-assisted perimeter detection)
