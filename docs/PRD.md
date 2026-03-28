# vastu@home — Full Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** March 2026  
**Platform:** Web (Desktop-first, Mobile Responsive)  
**Business Model:** Yearly Subscription (B2B — Vastu Consultants, B2C roadmap)  
**App Name:** vastu@home

---

## 1. PRODUCT OVERVIEW

### 1.1 Vision
vastu@home is an AI-powered Vastu mapping platform built for professional Vastu consultants. It replaces the manual, time-consuming process of floor plan mapping, Vastu Chakra overlay, zone area calculation, and cut analysis with an intelligent, accurate, and beautifully visual digital workspace — all grounded in classical Vastu Shastra texts, primarily **Vishwakarma Prakash**, **Mayamatam**, and **Brihat Samhita**.

### 1.2 Core Differentiators
- AI-assisted floor plan analysis (cut detection, center finding, zone calculation)
- True North detection via GPS + Google Maps + manual degree input
- Authentic Vastu Chakra (Shakti Chakra) overlay using classical zone degree measurements
- Dual workflow: upload existing floor plan OR build custom floor plan from scratch
- AI chatbot grounded in Vishwakarma Prakash and classical Vastu knowledge
- Customizable, exportable PDF reports
- Full consultant dashboard with project + client management

### 1.3 Target Users (Phase 1)
- Individual Vastu consultants
- Vastu firms with multiple consultants (team accounts)
- **Phase 2:** B2C homeowners directly

---

## 2. TECH STACK RECOMMENDATION

| Layer | Technology |
|-------|-----------|
| Frontend | React (Next.js) — SSR for SEO, fast load |
| Canvas / Drawing | Fabric.js or Konva.js (2D canvas manipulation) |
| AI Vision (cut detection, shape replication) | Claude API (claude-sonnet-4) with vision |
| AI Chatbot | Claude API with RAG over Vishwakarma Prakash text |
| Maps / True North | Google Maps JavaScript API + Maps Geocoding API |
| Magnetic Declination | NOAA World Magnetic Model API (free) |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage (floor plan images, exports) |
| PDF Export | Puppeteer (server-side) or react-pdf |
| Payments | Razorpay (India-first) |
| Hosting | Vercel (frontend) + Supabase (backend) |

---

## 3. INFORMATION ARCHITECTURE

```
vastu@home
├── Landing Page (marketing)
├── Auth
│   ├── Sign Up (consultant details, subscription)
│   └── Login
├── Dashboard (home after login)
│   ├── Projects Overview
│   ├── Recent Activity Feed
│   ├── Analytics Summary
│   └── Subscription & Billing
├── Projects
│   ├── All Projects (list/grid view)
│   ├── New Project (canvas setup)
│   └── Project Detail (canvas workspace)
│       ├── Upload Floor Plan Workflow
│       ├── Custom Floor Plan Builder Workflow
│       ├── Vastu Analysis Panel
│       ├── Bar Graph Reports
│       ├── Chatbot Panel
│       └── Export / Report
└── Settings
    ├── Profile
    ├── Subscription
    └── Team Members (for firm accounts)
```

---

## 4. DASHBOARD

### 4.1 Dashboard Sections

**A. Header Stats Bar**
- Total Projects (all time)
- Active Projects (in progress)
- Clients Served
- Reports Exported

**B. Projects Overview Panel**
- Card grid of recent projects (thumbnail of floor plan, project name, client name, date, status badge: Draft / Analysis Done / Report Ready)
- Search + filter (by client, date, status)
- "New Project" CTA button

**C. Recent Activity Feed**
- Chronological list: "Project X — Analysis completed", "New report exported for Client Y", "Zone cut flagged in Project Z"

**D. Analytics Panel**
- Bar chart: Projects completed per month
- Pie chart: Most flagged Vastu zones across all projects
- Number: Average zones with cuts per project

**E. Subscription & Billing Widget**
- Plan name, renewal date, days left
- Usage: projects created vs plan limit
- Upgrade / Manage Subscription button

**F. Quick Actions**
- New Project
- Upload Floor Plan
- Open Last Project
- Export Report

---

## 5. PROJECT & CANVAS SYSTEM

### 5.1 Creating a New Project

User fills a **Project Setup Form:**
- **Project Name** (e.g., "Sharma Residence — 3BHK")
- **Client Name**
- **Client Contact** (optional)
- **Property Address / Location** (used for True North detection)
- **Property Type** (Residential / Commercial / Industrial / Plot)
- **Notes** (free text)

After creation → opens the **Canvas Workspace**.

### 5.2 Canvas Workspace Layout

```
┌─────────────────────────────────────────────────────────┐
│  TOP BAR: Project Name | Client | North Degree | Tools  │
├──────────┬──────────────────────────────────┬───────────┤
│          │                                  │           │
│  LEFT    │       MAIN CANVAS                │  RIGHT    │
│  PANEL   │   (Floor Plan + Chakra)          │  PANEL    │
│          │                                  │           │
│ - Layers │                                  │ - Analysis│
│ - Tools  │                                  │ - Zones   │
│ - Assets │                                  │ - Chatbot │
│          │                                  │           │
├──────────┴──────────────────────────────────┴───────────┤
│  BOTTOM BAR: Zoom | Undo/Redo | Grid | Export           │
└─────────────────────────────────────────────────────────┘
```

---

## 6. TRUE NORTH DETECTION

### 6.1 Three Input Methods (user picks one or combines)

**Method A — Google Maps Location**
1. User types the property address or pastes a Google Maps URL/coordinates
2. App geocodes the address → gets lat/lng
3. App fetches **magnetic declination** for that lat/lng from NOAA WMM API
4. Declination is applied to convert magnetic north → **true north degree**
5. A mini Google Map shows with a north arrow overlay on the property

**Method B — GPS (browser)**
1. User clicks "Use My Location"
2. Browser Geolocation API gets lat/lng
3. Same declination correction applied

**Method C — Manual Entry**
1. Text input: "Enter North Direction Degree (0°–360°)"
2. User can type exact degree (e.g., 22.5° means north is 22.5° from the top of the floor plan)
3. Compass rose widget updates live as user types

### 6.2 North Lock
Once north is set, a **North Arrow** appears on the canvas (draggable, lockable). User can lock it before starting analysis to prevent accidental changes.

### 6.3 Display
- Compass rose shown in top-right corner of canvas always
- Degree value shown in top bar (e.g., "N: 14.3°")
- User can click to edit at any time

---

## 7. WORKFLOW A — UPLOAD FLOOR PLAN

### 7.1 File Upload
- Supported formats: JPG, PNG, PDF, DWG (basic), SVG
- File dropped onto canvas or via upload button
- Image renders on canvas, auto-scaled to fit
- User can resize / reposition before analysis

### 7.2 Center Point Detection (Brahmasthan)

**Automatic:**
- AI + geometric algorithm finds the **bounding box** of the floor plan shape
- Draws diagonal lines from corner to corner of the bounding rectangle
- Intersection = Brahmasthan (center point)
- For irregular (non-rectangular) shapes: centroid calculation via polygon area method

**User Confirmation Step:**
- Center point shown as a pulsing dot with crosshair
- Dialog: "Is this the correct center point (Brahmasthan)?"
- User can **drag** the center point to correct it manually
- "Confirm Center" button locks it

### 7.3 AI Cut Detection

**What is a "cut"?**
A cut is any area that is *absent* from an otherwise expected rectangular/regular boundary of the floor plan — i.e., missing corners, notched areas, L-shapes, irregular indentations, anything that deviates from a full bounding rectangle.

**Detection Process:**
1. Claude Vision API analyzes the uploaded floor plan image
2. Identifies the outer boundary of the floor plan
3. Computes the **minimum bounding rectangle** of the entire shape
4. Compares the actual shape polygon against the bounding rectangle
5. Any region inside the bounding rectangle but **outside** the actual floor plan = potential cut
6. Each detected cut is highlighted with a colored overlay (semi-transparent red)
7. Each cut is numbered (Cut #1, Cut #2, etc.)

**User Verification Dialog (per cut):**
```
┌─────────────────────────────────────────────────┐
│  AI detected 3 cuts in your floor plan          │
│                                                 │
│  [Cut #1 highlighted on floor plan image]       │
│  Location: North-East corner                    │
│  Approx. area: 45 sq ft                         │
│                                                 │
│  ✅ Yes, this is a cut   ❌ No, mark as wall    │
│  ✏️ Adjust cut boundary manually               │
│                                                 │
│  [ Previous ]  Cut 1 of 3  [ Next ]            │
└─────────────────────────────────────────────────┘
```

**Manual Cut Marking:**
- If AI misses cuts, user can click "Mark Cut Manually"
- Polygon drawing tool appears — user traces the cut area on the floor plan
- Multiple cuts can be added manually

### 7.4 Vastu Chakra Overlay

**The Shakti Chakra — Visual Specification:**

The Vastu Chakra (Shakti Chakra) as used in classical Vastu Shastra practice:
- Circular radial grid centered on Brahmasthan
- 16 zones radiating outward from center
- Zone boundaries extend to the edges of the floor plan
- Semi-transparent overlay (opacity: 25–40%, user adjustable)

**Zone Degree Measurements (Shakti Chakra — classical):**
As per the Vastu Chakra used in professional practice (derived from Vastu Purusha Mandala proportions):

| Zone | Direction | Start° | End° | Span° |
|------|-----------|--------|------|-------|
| 1 | N (North) | 348.75° | 11.25° | 22.5° |
| 2 | NNE | 11.25° | 33.75° | 22.5° |
| 3 | NE | 33.75° | 56.25° | 22.5° |
| 4 | ENE | 56.25° | 78.75° | 22.5° |
| 5 | E (East) | 78.75° | 101.25° | 22.5° |
| 6 | ESE | 101.25° | 123.75° | 22.5° |
| 7 | SE | 123.75° | 146.25° | 22.5° |
| 8 | SSE | 146.25° | 168.75° | 22.5° |
| 9 | S (South) | 168.75° | 191.25° | 22.5° |
| 10 | SSW | 191.25° | 213.75° | 22.5° |
| 11 | SW | 213.75° | 236.25° | 22.5° |
| 12 | WSW | 236.25° | 258.75° | 22.5° |
| 13 | W (West) | 258.75° | 281.25° | 22.5° |
| 14 | WNW | 281.25° | 303.75° | 22.5° |
| 15 | NW | 303.75° | 326.25° | 22.5° |
| 16 | NNW | 326.25° | 348.75° | 22.5° |

*Note: Zone start angles are measured clockwise from True North (0°). The 22.5° equal division is the standard used by the Shakti Chakra in physical practice. The chakra is rotated by the true north degree of the property.*

**Visual Rendering:**
- Each zone rendered as a pie slice from center outward
- Each zone has a distinct light color (pastel palette — 16 colors)
- Zone label (N, NNE, NE, etc.) shown at midpoint of each slice
- Zone boundaries: thin lines (1px, semi-transparent)
- Brahmasthan: small circular glyph at center
- Outer ring: circle marking the extent of the chakra
- The chakra rotates according to the true north degree of the property

**Chakra Controls:**
- Opacity slider (10% – 80%)
- Toggle chakra on/off
- Rotate chakra ± degree (fine adjustment)
- Lock chakra to floor plan

### 7.5 Zone Area Calculation

**Algorithm:**
1. Convert floor plan image to a binary mask (floor plan area = white, outside = black)
2. For each of the 16 zones: compute the polygon formed by the zone's angular boundaries clipped to the floor plan boundary
3. Count pixels (or compute polygon area geometrically) inside each zone
4. **Exclude cut areas** from the zone polygon before calculating zone area
5. Total floor plan area = sum of all zone areas (cuts excluded)
6. Zone percentage = (zone area / total area) × 100

**Output per Zone:**
- Zone name (e.g., NE)
- Zone area (sq ft or sq m — user selects unit)
- Zone area as % of total floor plan (cuts excluded)
- Cuts present in zone: Yes/No
- If cuts present: list of cuts (Cut #1, Cut #2...) with individual cut area and % of zone area
- Zone area WITH cuts included (raw, before exclusion)
- Zone area WITHOUT cuts (after exclusion)

### 7.6 Bar Graphs

**Graph 1 — Zone Area Distribution (without cuts)**
- X-axis: 16 zone names
- Y-axis: Area percentage (0–100%)
- Each bar colored per zone color
- Reference line at the ideal "equal distribution" level (6.25% each)
- Bars above: surplus zones; below: deficit zones

**Graph 2 — Cut Area by Zone**
- X-axis: Zones that have cuts only
- Y-axis: Cut area as % of that zone's total area
- Color coded: red gradient by severity

**Both graphs are interactive** (hover for exact values, click to highlight zone on floor plan).

---

## 8. WORKFLOW B — CUSTOM FLOOR PLAN BUILDER

### 8.1 Overview
User builds the floor plan from scratch using a form-based room system + a drag-and-drop canvas puzzle. The north direction is set first, then rooms are created one by one and assembled.

### 8.2 Step 1 — Set North
- Same 3-method north input as Section 6
- North arrow appears on blank canvas
- User confirms before proceeding

### 8.3 Step 2 — Room Creator Form

For each room, user fills:

```
┌─────────────────────────────────────────────────┐
│  CREATE ROOM                                    │
│                                                 │
│  Room Name: [_____________________]             │
│  Room Type: [Bedroom ▼]                         │
│    (options: Living Room, Master Bedroom,        │
│     Bedroom, Kitchen, Bathroom, Toilet,          │
│     Pooja Room, Study, Dining, Balcony,          │
│     Store, Garage, Garden, Corridor,             │
│     Staircase, Custom...)                        │
│                                                 │
│  Dimensions:                                    │
│    Width:  [___] ft/m                           │
│    Length: [___] ft/m                           │
│    Unit: [ft ▼] [m] [cm]                        │
│                                                 │
│  Shape:                                         │
│    ○ Rectangle  ○ L-Shape  ○ Custom             │
│    If Custom → Draw or paste image below        │
│                                                 │
│  Wall Thickness: [___] cm  (default: 15cm)      │
│                                                 │
│  [ Add Elements to Room ] (optional, later)     │
│                                                 │
│  [ Preview Shape ]  [ Add Room to Canvas ]      │
└─────────────────────────────────────────────────┘
```

**Room Types List:**
Living Room, Master Bedroom, Bedroom 2/3/4, Kitchen, Bathroom, Toilet, Attached Toilet, Pooja/Prayer Room, Study/Home Office, Dining Room, Drawing Room, Balcony, Terrace, Store Room, Garage, Parking, Servant Room, Garden/Courtyard, Staircase, Passage/Corridor, Lift/Elevator, Custom (user-named)

### 8.4 Custom Room Shape System

**Option A — Preset Shapes:**
Rectangle, Square, L-Shape, T-Shape, U-Shape, Hexagon, Octagon (rendered as polygon on canvas)

**Option B — AI Shape Replication:**
1. User pastes / uploads an image of the room shape (screenshot, photo, sketch)
2. Claude Vision API analyzes the shape outline
3. App generates an SVG polygon approximating the shape
4. Shape appears on canvas — user can fine-tune control points
5. User confirms shape

**Option C — Manual Polygon Drawing:**
- Click-to-place polygon drawing tool
- Each click = a vertex
- Double-click = close polygon
- Vertices draggable after creation

### 8.5 Canvas Puzzle Assembly

Each room appears as a **draggable tile** on the canvas:
- Rooms have visible walls (default 15cm, user adjustable per segment)
- Rooms snap to each other (grid snap, wall alignment snap)
- Rooms can be rotated in 22.5° increments
- Rooms can be freely positioned

**Wall Thickness Control (per segment):**
- Click any wall segment to select it
- Wall thickness panel appears: "This segment: 15cm"
- User can split any segment: click a point on the wall → divides into two sub-segments
- Each sub-segment has independent thickness
- Example: 10cm wall → split at 50% → first 5cm = 20cm thick, second 5cm = 10cm thick

**Entrance Placement:**
- Select a wall segment → "Add Entrance" button
- Entrance types: Main Door, Bedroom Door, Window, Ventilator, Sliding Door, French Door
- Entrance shown as a gap in the wall with a door symbol
- Entrance width adjustable

### 8.6 Furniture & Elements Library

**Element Categories:**

| Category | Elements |
|----------|----------|
| Bedroom | Bed (single/double/king), Wardrobe, Dressing Table, Side Table |
| Kitchen | Stove/Hob, Chimney, Refrigerator, Sink, Washing Machine, Microwave, Oven, Kitchen Counter |
| Living Room | Sofa (2/3-seater), TV Unit, Coffee Table, Bookshelf |
| Bathroom/Toilet | WC/Toilet Seat, Shower, Bathtub, Washbasin, Mirror |
| Water Elements | Fountain, Aquarium, Underground Tank, Overhead Tank, Borewell |
| Fire Elements | Fireplace, Candle holder, Yajna Kund |
| Spiritual | Mandir/Pooja Unit, Tulsi Plant, Deity Idol |
| Plants | Indoor Plant (large), Indoor Plant (small), Bonsai |
| Electrical | AC Unit, Heater, Generator, Solar Panel |
| Miscellaneous | Safe/Locker, Stairs, Shoe Rack, Dustbin, Main Gate |
| Custom | User creates custom element |

**Each Element:**
- SVG symbol/icon (Vastu-style, clean line art)
- Draggable, resizable, rotatable on canvas
- Snaps to room boundaries
- Has a Vastu significance tag (hover tooltip: e.g., "Stove — best placed in SE zone")

**Custom Element Creator:**
- User names the element
- Chooses from 50+ symbol library (shapes, icons, glyphs)
- OR uploads their own image/SVG
- Sets default dimensions
- Saved to user's personal element library

### 8.7 After Floor Plan is Built
Once all rooms are assembled → same process as Workflow A:
- AI finds center (Brahmasthan) of the composite floor plan
- User confirms
- Vastu Chakra overlay applied
- Zone area calculation
- Cut analysis (cuts defined by irregular room assembly edges)
- Bar graphs generated

---

## 9. VASTU ANALYSIS PANEL (RIGHT SIDEBAR)

Shown after analysis is complete:

```
VASTU ANALYSIS
──────────────
Property: Sharma Residence
True North: 14.3°
Total Area: 1,840 sq ft
Brahmasthan: Confirmed

ZONE SUMMARY (16 zones)
─────────────────────
NE   : 8.2%  ✅ (no cut)
ENE  : 5.1%  ⚠️ (deficit)
N    : 9.4%  ✅
NNE  : 4.2%  🔴 Cut #1 present (18.3% of zone)
...

[ View Full Table ]
[ Show Bar Graphs ]
[ Open Chatbot ]
[ Export Report ]
```

**Color coding:**
- ✅ Green: Zone within ideal range, no cuts
- ⚠️ Yellow: Zone slightly deficit/surplus (>1% from ideal)
- 🔴 Red: Zone has a cut or significant deficit

---

## 10. AI CHATBOT — VASTU ADVISOR

### 10.1 Knowledge Base
The chatbot is powered by Claude API with RAG (Retrieval-Augmented Generation) over:
- **Vishwakarma Prakash** (primary classical text — Shilpashastra)
- **Mayamatam** (secondary classical text)
- **Brihat Samhita** (supplementary)
- General curated Vastu Shastra knowledge base (modern interpretations aligned with classical texts)
- The **current project's analysis data** (zones, cuts, percentages) is injected into the system prompt

### 10.2 Chatbot Capabilities
- Answer "How is the Vastu of this floor plan?" with zone-specific analysis
- Suggest remedies for flagged zones (non-demolition preferred: yantras, colors, elements, furniture repositioning)
- Explain what each zone governs (health, wealth, relationships, etc.)
- Answer general Vastu questions
- Discuss specific zones: "What does a cut in the NE zone mean?"
- Recommend ideal room placements
- Compare two floor plans ("Which of my two floor plans is better?")

### 10.3 Chatbot UI
- Right sidebar panel or full-screen modal
- Chat interface (user message + AI response bubbles)
- Floor plan context shown as a thumbnail at top of chat
- User can click a zone on the floor plan → chatbot auto-asks "Tell me about the NE zone"
- Citations shown: "Per Vishwakarma Prakash, Chapter X..."
- Voice input option (speech-to-text)

### 10.4 Chatbot System Prompt Structure (developer note)
```
You are a professional Vastu Shastra advisor powered by classical texts 
including Vishwakarma Prakash, Mayamatam, and Brihat Samhita. 

Current floor plan analysis:
- Property: {project_name}
- True North: {north_degree}°
- Total Area: {total_area} sq ft
- Zone breakdown: {zone_data_json}
- Cuts detected: {cuts_data_json}

Answer questions about this floor plan and general Vastu. 
Always cite the classical text when referencing traditional rules.
Prefer non-demolition remedies. Be respectful of the tradition.
```

---

## 11. FLOOR PLAN COMPARISON

### 11.1 Side-by-Side View
- User selects 2 projects from their dashboard
- Both floor plans shown side by side with Vastu Chakra overlay
- Synchronized zoom/pan (toggle: sync or independent)
- Both analysis panels shown below respective floor plans
- Both bar graphs shown stacked for visual comparison

### 11.2 Comparison Report
- AI-generated summary: "Floor Plan A has stronger NE and E zones. Floor Plan B has better SW stability. Floor Plan A is recommended for [use case]."
- Exportable as combined PDF

---

## 12. REPORT / PDF EXPORT

### 12.1 Report Builder (User Customizes)
User selects what to include via checklist:

**Cover Page**
- [ ] Project name, client name, consultant name, date
- [ ] Company logo (consultant uploads their logo)

**Floor Plan Section**
- [ ] Floor plan image (clean, no overlay)
- [ ] Floor plan with Vastu Chakra overlay
- [ ] Floor plan with zone color fill
- [ ] Floor plan with cuts highlighted

**Analysis Section**
- [ ] Zone area table (all 16 zones)
- [ ] Bar Graph 1: Zone area distribution
- [ ] Bar Graph 2: Cut area by zone
- [ ] Cut details per zone (list)

**Recommendations Section**
- [ ] AI-generated zone-by-zone recommendations
- [ ] Remedy suggestions
- [ ] Ideal element placements

**Appendix**
- [ ] True North details and methodology
- [ ] Classical text references
- [ ] Glossary of Vastu terms

### 12.2 Report Branding
- Consultant can upload their logo
- Choose accent color (used in report headers)
- Add their contact details, license number
- Report footer: "Prepared using vastu@home" (can be toggled off on higher plans)

---

## 13. SUBSCRIPTION PLANS

### Plan Tiers

| Feature | Starter | Professional | Firm |
|---------|---------|-------------|------|
| Projects | 5/month | 30/month | Unlimited |
| Team Members | 1 | 1 | Up to 10 |
| AI Chatbot | Basic | Full | Full |
| PDF Reports | 5/month | Unlimited | Unlimited |
| Custom Elements | 10 | Unlimited | Unlimited |
| Floor Plan Comparison | — | ✅ | ✅ |
| White-label Reports | — | ✅ | ✅ |
| Priority Support | — | — | ✅ |
| Price (yearly) | ₹4,999/yr | ₹14,999/yr | ₹39,999/yr |

*Prices are indicative — adjust as needed.*

---

## 14. AUTHENTICATION & USER MANAGEMENT

### 14.1 Registration Flow
1. Enter name, email, password
2. Select role: Individual Consultant / Firm Admin
3. Select plan (or start free trial — 14 days)
4. Add consultant details: years of experience, city, specialization
5. Upload profile photo + company logo (optional)

### 14.2 Firm Accounts
- Firm Admin creates the account
- Can invite consultants via email
- Each consultant has their own project space
- Admin can view all projects across firm
- Billing centralized to Admin

### 14.3 Security
- Supabase Auth (JWT-based)
- Row-level security on all database tables (consultant sees only their data)
- All uploaded floor plans stored in private Supabase storage buckets

---

## 15. DATA MODELS (DATABASE)

### Core Tables

```sql
users (
  id, email, name, role, firm_id, 
  subscription_plan, subscription_expires_at, 
  profile_photo_url, company_logo_url, 
  consultant_details_json, created_at
)

firms (
  id, name, admin_user_id, logo_url, created_at
)

projects (
  id, user_id, firm_id, 
  project_name, client_name, client_contact,
  property_address, property_lat, property_lng,
  true_north_degree, north_input_method,
  property_type, status, notes,
  created_at, updated_at
)

floor_plans (
  id, project_id, 
  type, -- 'uploaded' | 'custom'
  image_url, canvas_json,
  center_x, center_y, 
  scale_factor, unit, -- 'ft' | 'm' | 'cm'
  total_area,
  created_at
)

cuts (
  id, floor_plan_id, cut_number,
  polygon_points_json,
  area, ai_detected, user_confirmed,
  zone_assignments_json -- which zones this cut touches
)

zones (
  id, floor_plan_id, zone_name, -- 'N', 'NNE', 'NE'...
  zone_degree_start, zone_degree_end,
  area_with_cuts, area_without_cuts,
  percentage_with_cuts, percentage_without_cuts,
  cuts_present_json
)

rooms (
  id, floor_plan_id, 
  room_name, room_type,
  width, length, unit,
  shape_type, shape_polygon_json,
  canvas_x, canvas_y, rotation,
  wall_thickness_default,
  wall_segments_json
)

elements (
  id, room_id, floor_plan_id,
  element_type, element_name,
  custom_icon_url,
  canvas_x, canvas_y, 
  width, height, rotation
)

reports (
  id, project_id, user_id,
  config_json, -- what sections user selected
  pdf_url,
  created_at
)

chatbot_conversations (
  id, project_id, user_id,
  messages_json,
  created_at, updated_at
)
```

---

## 16. API ENDPOINTS (Backend)

```
POST   /api/projects              — Create project
GET    /api/projects              — List all projects (paginated)
GET    /api/projects/:id          — Get project detail
PUT    /api/projects/:id          — Update project
DELETE /api/projects/:id          — Delete project

POST   /api/projects/:id/floor-plan/upload    — Upload floor plan image
POST   /api/projects/:id/floor-plan/detect-center  — AI center detection
POST   /api/projects/:id/floor-plan/detect-cuts    — AI cut detection
POST   /api/projects/:id/floor-plan/confirm-cuts   — Save confirmed cuts
POST   /api/projects/:id/floor-plan/calculate-zones — Run zone analysis
GET    /api/projects/:id/floor-plan/zones     — Get zone data

POST   /api/north/geocode         — Geocode address → lat/lng
POST   /api/north/declination     — Get magnetic declination for lat/lng
POST   /api/north/true-north      — Calculate true north degree

POST   /api/chatbot/message       — Send message to chatbot
GET    /api/chatbot/:project_id   — Get conversation history

POST   /api/reports/generate      — Generate PDF report
GET    /api/reports/:id           — Get report PDF URL

GET    /api/elements/library      — Get system elements
POST   /api/elements/custom       — Create custom element

POST   /api/compare               — Generate comparison between 2 projects
```

---

## 17. PHASE-BY-PHASE DEVELOPMENT PLAN

### Phase 1 — Foundation (Weeks 1–8)
- [ ] Auth system (Supabase)
- [ ] Dashboard (basic)
- [ ] Project CRUD
- [ ] True North (manual input + GPS)
- [ ] Floor plan image upload + canvas render
- [ ] Center point detection + user confirmation
- [ ] Vastu Chakra overlay (visual)
- [ ] Zone division (16 zones, 22.5° each, rotated by true north)
- [ ] Basic zone area calculation
- [ ] Bar Graph 1 (zone distribution)
- [ ] Subscription system (Razorpay basic)

### Phase 2 — AI & Analysis (Weeks 9–14)
- [ ] AI cut detection (Claude Vision)
- [ ] Cut confirmation dialog
- [ ] Cut area calculation per zone
- [ ] Bar Graph 2 (cuts by zone)
- [ ] Full analysis panel
- [ ] AI Chatbot (Claude API + Vastu knowledge base)
- [ ] Google Maps integration for True North
- [ ] PDF Report export (basic)

### Phase 3 — Custom Builder (Weeks 15–22)
- [ ] Room creation form
- [ ] Preset shape renderer
- [ ] AI shape replication (Claude Vision → SVG polygon)
- [ ] Manual polygon drawing tool
- [ ] Canvas puzzle assembly (drag, snap, rotate)
- [ ] Wall segment thickness control
- [ ] Entrance placement
- [ ] Furniture/element library (system elements)
- [ ] Custom element creator
- [ ] Full analysis on custom floor plans

### Phase 4 — Polish & Platform (Weeks 23–28)
- [ ] Report builder (user-configurable PDF)
- [ ] Report branding (consultant logo, colors)
- [ ] Floor plan comparison (side-by-side)
- [ ] Team/firm accounts
- [ ] Advanced dashboard analytics
- [ ] Mobile responsive polish
- [ ] Performance optimization
- [ ] B2C flow (Phase 5 prep)

---

## 18. VASTU ZONE REFERENCE TABLE

For chatbot and analysis reference:

| Zone | Direction | Lord/Deity | Element | Governs | Ideal Use | Avoid |
|------|-----------|-----------|---------|---------|-----------|-------|
| N | North | Kubera | Water | Wealth, career, opportunities | Living room, work from home | Toilets, heavy storage |
| NNE | North of NE | Soma | Water | Health, well-being | Bathroom (no toilet), living | Kitchen, toilet |
| NE | North-East | Ishaan/Shiva | Ether/Space | Wisdom, clarity, spirituality | Pooja room, meditation | Kitchen, toilet, storage |
| ENE | East of NE | Parjanya | Air+Ether | New ideas, freshness | Study, children room | Master bedroom |
| E | East | Indra | Air | Social life, achievements | Living room, drawing room | Toilet, store |
| ESE | SE of East | Vitatha | Fire+Air | Confidence, digestion | Gym, activity room | Bedroom |
| SE | South-East | Agni | Fire | Energy, finance, cooking | Kitchen, electrical | Bedroom, pooja |
| SSE | South of SE | Pushan | Fire+Earth | Strength, stamina | Bedroom, storage | Pooja room |
| S | South | Yama | Earth | Rest, fame, discipline | Bedroom, heavy storage | Main entrance, pooja |
| SSW | SW of South | Nairutya | Earth | Savings, secrets | Locker, master bedroom | Kitchen, living room |
| SW | South-West | Nairutya/Niriti | Earth | Stability, relationships | Master bedroom, safe | Main entrance, kitchen |
| WSW | West of SW | Duwarik | Earth+Water | Profits, gains | Children study, profits room | Toilet |
| W | West | Varuna | Water | Learning, gains | Study, dining, children room | Main entrance |
| WNW | NW of West | Pushpadanta | Air+Water | Support, banking, movement | Guest room, toilet (ok) | Master bedroom |
| NW | North-West | Vayu | Air | Support systems, travel, banking | Guest room, garage, toilet | Main entrance, pooja |
| NNW | North of NW | Bhallat | Air | Strength of relationships | Bedroom (secondary) | Kitchen, pooja |

---

## 19. VASTU CHAKRA VISUAL SPECIFICATION

The authentic Shakti Chakra to be rendered on canvas:

**Structure:**
- Outer circle (full compass boundary)
- 16 radial lines from center at 22.5° intervals (rotated to true north)
- Zone label ring (zone names on outer arc of each slice)
- Degree markers on outer ring
- Brahmasthan symbol at center (a lotus or mandala glyph)
- Inner ring at ~15% radius = Brahma zone / Brahmasthan boundary
- Optional: deity names in fine text at zone midpoints

**Color Theme (professional Vastu style):**
- NE quadrant zones: Light golden/saffron
- E zones: Light orange
- SE zones: Light red/coral
- S zones: Light burgundy
- SW zones: Light brown/earth
- W zones: Light blue-grey
- NW zones: Light teal
- N zones: Light green
- All at 30% opacity for overlay mode

**Stroke style:**
- Zone boundary lines: 1px, opacity 60%
- Cardinal direction lines (N/S/E/W): 2px, opacity 80%, slightly bolder
- Outer circle: 2px, full opacity
- Labels: 11px, bold, centered in zone

---

## 20. IMPORTANT NOTES FOR DEVELOPMENT

1. **True North vs. Grid North:** Always use True North (corrected for magnetic declination). The NOAA WMM API is free and accurate.

2. **Floor Plan Scale:** When the user uploads an image, prompt them to set a scale reference ("This wall is ___ ft/m long"). Without this, area calculations will be in pixel units only. Provide both pixel-relative percentages and actual sq ft (if scale is set).

3. **AI Cut Detection Fallback:** Claude Vision may not always detect cuts perfectly on hand-drawn or low-resolution floor plans. Always provide the manual override path.

4. **Canvas Performance:** Fabric.js with large floor plan images + overlay SVG can get slow. Implement canvas object caching and layer separation (background layer: floor plan image; overlay layer: Vastu Chakra; annotation layer: cuts, center point, labels).

5. **Chatbot Rate Limiting:** Implement per-session token limits to control Claude API costs. Show users remaining "chat credits" per month based on plan.

6. **PDF Generation:** Use Puppeteer headless rendering for highest quality PDFs (capture the canvas as-rendered). react-pdf is a fallback for simpler layouts.

7. **Vishwakarma Prakash RAG:** The full text should be chunked into semantic sections (by chapter/topic), embedded using an embedding model, stored in a vector database (pgvector on Supabase works well). Retrieved chunks injected into chatbot context.

8. **Mobile Responsiveness:** Canvas interaction (drawing, dragging elements) is complex on mobile. Phase 1 desktop-first. Phase 3+ add touch support for tablets (most consultants use iPads on-site).

9. **Vastu Chakra Rotation:** The chakra must rotate based on true north of the property. If true north = 0°, the N line points up. If true north = 30°, rotate the entire chakra 30° clockwise so the N pointer is at 30° from vertical.

10. **Cut Percentage Display:** Show both: (a) cut area as % of the specific zone, and (b) cut area as % of total floor plan area. Both are useful for different analysis purposes.

---

*Document prepared for vastu@home development. This spec covers the full vision. Begin with Phase 1 and iterate. All Vastu zone data and classical text references should be verified with a practicing Vastu consultant before launch.*
