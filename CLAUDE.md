# vastu@home — Claude Code Instructions

## What This Project Is

**vastu@home** is a professional Vastu Shastra mapping platform for consultants (B2B, with B2C roadmap). It replaces manual floor plan mapping, Vastu Chakra overlays, zone area calculations, and cut analysis with an AI-powered digital workspace grounded in classical Vastu texts (Vishwakarma Prakash, Mayamatam, Brihat Samhita).

**Current state:** Phase 1 HTML prototype is complete (`docs/prototype/vastu_at_home.html`). We are now building the production Next.js application from this prototype.

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15, React 19, TypeScript | App Router, Server Components |
| Canvas | Konva.js + react-konva | For floor plan drawing and overlays |
| State | Zustand | `src/store/canvasStore.ts`, `src/store/projectStore.ts` |
| Styling | Tailwind CSS + CSS Variables | Dark luxury theme — see Design Tokens below |
| AI | Claude API (`claude-sonnet-4-20250514`) | Via `src/app/api/chat/route.ts` |
| Database | Supabase (PostgreSQL + pgvector) | Schema in `supabase/migrations/` |
| Auth | Supabase Auth (email + Google OAuth) | Phase 1: skip auth, add in Phase 2 |
| Storage | Supabase Storage | Floor plan images, PDF exports |
| PDF Export | @react-pdf/renderer | Phase 2 |
| Payments | Razorpay | Phase 3 |
| Hosting | Vercel + Supabase | |

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout — fonts, metadata
│   ├── page.tsx                # Root redirect → /dashboard
│   ├── globals.css             # CSS variables + Tailwind base
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard screen (build this)
│   ├── projects/
│   │   ├── page.tsx            # All projects list (build this)
│   │   └── [id]/
│   │       └── page.tsx        # Individual project canvas (build this)
│   ├── canvas/
│   │   └── page.tsx            # Standalone canvas (for demo)
│   └── api/
│       ├── chat/route.ts       ✅ DONE — Vastu AI chat endpoint
│       ├── projects/route.ts   ✅ DONE — Projects CRUD
│       ├── projects/[id]/route.ts ✅ DONE
│       └── north/declination/route.ts ✅ DONE — NOAA declination
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx         # Collapsible sidebar (build this)
│   │   ├── Topbar.tsx          # Top navigation bar (build this)
│   │   └── AppShell.tsx        # Main layout wrapper (build this)
│   ├── dashboard/
│   │   ├── StatsBar.tsx        # 4 stat cards (build this)
│   │   ├── RecentProjects.tsx  # Collapsible project cards (build this)
│   │   ├── AnalyticsCard.tsx   # Bar chart + donut chart (build this)
│   │   └── ActivityFeed.tsx    # Activity log (build this)
│   ├── canvas/
│   │   ├── VastuCanvas.tsx     # Main Konva canvas (build this — most complex)
│   │   ├── ShaktiChakra.tsx    # Authentic chakra SVG renderer (build this)
│   │   ├── PerimeterTool.tsx   # Perimeter drawing tool (build this)
│   │   ├── CutTool.tsx         # Cut marking tool (build this)
│   │   ├── ScaleTool.tsx       # Scale calibration (build this)
│   │   ├── BrahmasthanDot.tsx  # Draggable center dot (build this)
│   │   ├── NorthArrow.tsx      # Rotatable north arrow (build this)
│   │   └── EntranceTool.tsx    # Entrance marker (future)
│   ├── panels/
│   │   ├── RightPanel.tsx      # Analysis/North/AI tabbed panel (build this)
│   │   ├── AnalysisPanel.tsx   # 16-zone list with tooltips (build this)
│   │   ├── NorthPanel.tsx      # North input + mini compass (build this)
│   │   └── ChatPanel.tsx       # Vastu AI chatbot (build this)
│   └── ui/
│       ├── Button.tsx          # Reusable button variants (build this)
│       ├── Modal.tsx           # Modal overlay (build this)
│       ├── Toast.tsx           # Notifications (build this)
│       ├── Badge.tsx           # Status badges (build this)
│       └── CollapsibleCard.tsx # Collapsible dashboard cards (build this)
├── lib/
│   ├── vastu/
│   │   ├── zones.ts            ✅ DONE — Zone data, constants, helpers
│   │   ├── geometry.ts         ✅ DONE — Exact polygon area math
│   │   └── knowledge-base.ts  ✅ DONE — Phase 1 curated knowledge
│   ├── supabase/
│   │   ├── client.ts           ✅ DONE — Browser client
│   │   └── server.ts           ✅ DONE — Server client
│   ├── types/index.ts          ✅ DONE — All TypeScript types
│   └── utils/index.ts          ✅ DONE — Helpers (cn, formatArea, etc.)
├── store/
│   ├── canvasStore.ts          ✅ DONE — Zustand canvas state
│   └── projectStore.ts        ✅ DONE — Zustand project state
└── hooks/
    ├── useCanvas.ts            # Canvas event handling hook (build this)
    ├── useNorth.ts             # North + declination hook (build this)
    └── useProjects.ts          # Project CRUD hook (build this)
```

---

## Design System — ALWAYS Follow This

### Colors (CSS Variables — always use these, never hardcode)
```css
/* Backgrounds */
--bg:       #0f0e0b   /* main bg */
--bg-2:     #161410   /* sidebar, panels */
--bg-3:     #1e1b16   /* cards, inputs */
--bg-4:     #252018   /* hover states */

/* Gold accent */
--gold:     #c8af78   /* primary accent */
--gold-2:   #e8d4a0   /* headlines, highlights */
--gold-3:   #a08050   /* muted gold */
--saffron:  #e8912a   /* warm accent, gradients */

/* Text */
--vastu-text:   #e8e0d0   /* primary text */
--vastu-text-2: #b0a080   /* secondary text */
--vastu-text-3: #706050   /* muted/labels */

/* Borders */
--border:   rgba(200,175,120,0.15)
--border-2: rgba(200,175,120,0.08)
```

### Tailwind Classes (mapped from design tokens)
```
bg-bg, bg-bg-2, bg-bg-3, bg-bg-4
text-gold, text-gold-2, text-gold-3, text-saffron
border-vastu-border → use: border border-[rgba(200,175,120,0.15)]
font-serif → Cormorant Garamond (headings, large numbers, logo)
font-sans  → DM Sans (body, UI)
font-mono  → DM Mono (data, coordinates, percentages)
```

### Typography Rules
- **Large numbers / headings**: `font-serif` (Cormorant Garamond)
- **UI labels / buttons**: `font-sans` (DM Sans)
- **Data / coordinates / percentages**: `font-mono` (DM Mono)
- **Zone names in chakra**: DM Mono, bold, white
- **Deity names in chakra**: Cormorant Garamond, italic, zone color

### Component Patterns
```tsx
// Card / Panel
<div className="bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[9px] p-4">

// Primary button
<button className="bg-gold text-bg font-sans font-medium text-[11px] px-3 py-[5px] rounded-md hover:bg-gold-2 transition-colors">

// Ghost button
<button className="bg-transparent text-vastu-text-2 border border-[rgba(200,175,120,0.15)] text-[11px] px-3 py-[5px] rounded-md hover:border-gold-3 hover:text-vastu-text transition-colors">

// Input
<input className="w-full px-3 py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-md text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3">

// Badge
<span className="text-[8px] px-[6px] py-[2px] rounded-full font-medium uppercase bg-amber-900/40 text-amber-400">Draft</span>
```

---

## Vastu Domain Rules — CRITICAL, Never Get Wrong

### The Shakti Chakra
- **16 zones, 22.5° each**, measured clockwise from True North
- Zone N starts at 348.75° and ends at 11.25° (wraps around 0°)
- All zone data is in `src/lib/vastu/zones.ts` — **always import from there, never hardcode**
- The chakra rotates based on True North degree — if north = 14.3°, rotate all zone boundaries by +14.3°
- **Brahmasthan** = geometric centroid of the floor plan polygon (NOT center of SVG/screen)
- Use `polygonCentroid()` from `src/lib/vastu/geometry.ts` — never eyeball it

### Zone Percentage Calculation
- Use `calculateZoneAreas()` from `src/lib/vastu/geometry.ts` — exact Sutherland-Hodgman clipping
- **NEVER use random sampling / Monte Carlo** — it's inaccurate and inconsistent
- Ideal = 6.25% per zone (360°/16 = 22.5° = 6.25% if regular)
- Zone % = (zone area after cuts / total floor plan area) × 100

### Cuts
- A cut = area OUTSIDE the floor plan perimeter that falls within a zone's angular wedge
- Cuts reduce effective zone area
- Cut severity: mild < 10% of zone, moderate 10–25%, severe > 25%
- Always show cut % of that zone, not of total floor plan

### North
- Always use **True North** (magnetic + declination correction)
- NOAA API endpoint: `src/app/api/north/declination/route.ts`
- User can override manually (most common in Phase 1)
- North degree rotates the entire Shakti Chakra — the zone N always points to true north

### Classical Text Priority
- Vishwakarma Prakash → primary source for zone rules, entrance placement, Brahmasthan
- Mayamatam → secondary, especially kitchen, orientation, structural rules
- Brihat Samhita → supplementary, remedies, timing
- Never cite sources you haven't seen — use `src/lib/vastu/knowledge-base.ts` as ground truth

---

## Canvas Architecture (Most Complex Part)

The canvas has two rendering systems that must stay in sync:

### 1. Konva (react-konva) — for interaction
- Floor plan image display
- Perimeter point placement (click to add points)
- Cut region drawing
- Brahmasthan dot (draggable)
- Scale calibration points
- Entrance markers
- User-driven interaction lives here

### 2. SVG — for the Shakti Chakra
- The chakra is pure SVG (not Konva) for crisp vector rendering at all zoom levels
- Chakra slices, zone labels, deity names, element color band, tick marks
- North arrow
- Overlaid on top of Konva canvas via absolute positioning

### Coordinate System
- Both systems use the same coordinate space: **SVG viewBox 0 0 760 620**
- When user clicks on Konva canvas: convert `(e.clientX, e.clientY)` → viewBox coords using `svgCoords()` from geometry.ts
- Brahmasthan position is stored in viewBox units in the Zustand store

### Tool Modes (from canvasStore.ts)
```
select    → default, no drawing
perimeter → click to add polygon points, dblclick to close
cut       → click to mark cut region, dblclick to close
scale     → click 2 points, then enter real distance
brahma    → drag brahmasthan dot
entrance  → click on perimeter wall to mark door
```

---

## Phase 1 Build Order (Do These in Order)

1. **AppShell + Sidebar** — collapsible sidebar (like Claude.ai), topbar
2. **Dashboard page** — stats, collapsible cards, recent projects, analytics
3. **Projects page** — grid, search, filter, status toggle, new project modal
4. **Canvas page** — Konva canvas + SVG chakra overlay (most time here)
5. **Perimeter tool** — click to place points, dblclick to close, auto-centroid
6. **Chakra rendering** — full authentic Shakti Chakra (see prototype for reference)
7. **Analysis panel** — 16-zone list with exact percentages, zone tooltips
8. **North panel** — degree input, mini compass, NOAA declination
9. **Vastu AI chat** — multi-turn, full zone context injected
10. **Cut tool** — draw cuts, severity scoring
11. **Scale calibration** — 2-point click + real distance

---

## Files to Reference

- `docs/prototype/vastu_at_home.html` — **the complete working prototype** — use as the primary visual and functional reference for everything. When building any component, open this file first to understand the exact look and behavior.
- `src/lib/vastu/zones.ts` — all 16 zones with colors, deities, elements, ideal use
- `src/lib/vastu/geometry.ts` — all math (area, centroid, clipping, point-in-polygon)
- `src/lib/vastu/knowledge-base.ts` — curated Vastu knowledge for AI context
- `src/store/canvasStore.ts` — the source of truth for all canvas state
- `src/store/projectStore.ts` — project management state

---

## Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.local.example .env.local
# Fill in: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

# 3. Start Supabase (optional for Phase 1 — state is in-memory without auth)
npx supabase start
npx supabase db push   # runs migrations/001_initial_schema.sql

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

---

## Phase 1 vs Phase 2 Boundaries

### Phase 1 (build now)
- All UI components and canvas functionality
- Floor plan upload → perimeter drawing → Brahmasthan → zone analysis
- Cut marking and severity scoring
- Vastu AI chat (multi-turn, grounded in zone data)
- Project management (create, view, notes, status toggle)
- Export modal (UI only — no actual PDF yet)
- State in Zustand (in-memory + localStorage)
- **Auth: skip for now** — all features accessible without login

### Phase 2 (next sprint)
- Supabase Auth (email + Google OAuth)
- Persist projects to Supabase DB
- Floor plan image upload to Supabase Storage
- Real PDF export (Puppeteer or @react-pdf/renderer)
- NOAA True North with GPS
- Claude Vision for AI cut detection
- Vishwakarma Prakash OCR pipeline → pgvector RAG

---

## Common Mistakes to Avoid

1. **Never estimate zone areas** — use `calculateZoneAreas()` with polygon clipping, always
2. **Never hardcode zone colors** — always import from `VASTU_ZONES` in `zones.ts`
3. **Never place Brahmasthan at SVG center** — always compute `polygonCentroid(perimeterPoints)`
4. **Never rotate the floor plan** — rotate the chakra by northDeg, keep the plan fixed
5. **Never use Monte Carlo** for area calculation — it gives different results each render
6. **Never single-turn chat** — always pass full `messages[]` history to `/api/chat`
7. **Never import from Tailwind** for zone-specific colors — use `hexToRgba()` from utils
8. **Don't add auth checks in Phase 1** — add a TODO comment instead

---

## Running Tests (Future)

```bash
npm run type-check   # TypeScript check (zero errors required before commits)
npm run lint         # ESLint
```

---

## Git Workflow

```bash
git init
git add .
git commit -m "feat: initial project scaffold with zone data, geometry, stores, and API routes"

# Feature branches
git checkout -b feat/canvas-perimeter-tool
git checkout -b feat/shakti-chakra-renderer
git checkout -b feat/zone-analysis-panel
git checkout -b feat/vastu-ai-chat
```

---

## Questions Claude Code Should Ask Before Starting Any Component

1. Does the prototype (`docs/prototype/vastu_at_home.html`) already show this? → Open it first
2. Does the component need zone data? → Import from `src/lib/vastu/zones.ts`
3. Does it need area math? → Use `src/lib/vastu/geometry.ts`
4. Does it touch canvas state? → Use `useCanvasStore()` from `src/store/canvasStore.ts`
5. Does it touch projects? → Use `useProjectStore()` from `src/store/projectStore.ts`
6. Is it a new API endpoint? → Follow the pattern in `src/app/api/chat/route.ts`
