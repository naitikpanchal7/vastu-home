// src/lib/types/index.ts

import type { Point } from "@/lib/vastu/geometry";

// ── Project ───────────────────────────────────────────────────────────────────
export type ProjectStatus = "draft" | "active" | "done";
export type PropertyType = "Residential" | "Commercial" | "Industrial" | "Plot";
export type AreaUnit = "ft" | "m";

export interface Project {
  id: string;
  consultantId: string;            // Supabase auth user ID

  // Client info
  name: string;                    // Project name e.g. "Sharma Residence — 3BHK"
  clientName: string;
  clientContact?: string;
  clientEmail?: string;
  propertyAddress?: string;
  propertyType: PropertyType;
  areaSqFt?: number;

  // Status
  status: ProjectStatus;
  notes?: string;                  // Consultant's private notes

  // Multi-floor support (new) — replaces canvasState for new projects
  floors?: Floor[];

  // Canvas state (legacy single-floor — kept for backward compat)
  canvasState?: CanvasState;

  // Metadata
  createdAt: string;               // ISO date
  updatedAt: string;
  lastOpenedAt?: string;

  // Supabase Storage path for uploaded floor plan image
  floorPlanImagePath?: string;
  floorPlanImageUrl?: string;
}

// ── Floor ─────────────────────────────────────────────────────────────────────
export interface Floor {
  id: string;
  name: string;             // "Floor 1", "Floor 2", etc.
  order: number;            // display order (0-indexed)
  canvasState: CanvasState;
  floorPlanImage?: string | null;
  notes?: string;
  // Per-floor view state — each floor remembers its own zoom and pan position
  zoomLevel?: number;
  panX?: number;
  panY?: number;
}

// ── Canvas State (persisted per floor) ───────────────────────────────────────
export interface CanvasState {
  northDeg: number;                // True North in degrees
  northMethod: "manual" | "gps" | "maps";
  brahmaX: number;                 // Brahmasthan center X (SVG viewBox units)
  brahmaY: number;                 // Brahmasthan center Y
  brahmaConfirmed: boolean;
  perimeterPoints: Point[];        // User-drawn floor plan perimeter
  perimeterComplete: boolean;
  cuts: Cut[];                     // User-marked cut regions
  facingDirection?: number;        // Road-facing wall angle (for facing property)
  entrancePoints: EntranceMarker[];
  scale?: ScaleCalibration;
  viewTransform?: ViewTransform;   // Pan/zoom state
}

export interface Cut {
  id: string;
  label: string;                   // "Cut #1", "Cut #2" etc.
  points: Point[];
  notes?: string;
}

export interface EntranceMarker {
  id: string;
  wallPoint: Point;                // Point on the perimeter
  type: "main" | "bedroom" | "window" | "other";
  pada?: number;                   // 1–32 entrance pada
  zoneName?: string;
}

export interface ScaleCalibration {
  pt1: Point;
  pt2: Point;
  realDistance: number;
  unit: AreaUnit;
  pixelsPerUnit: number;           // derived: distance(pt1,pt2) / realDistance
}

export interface ViewTransform {
  scale: number;                   // zoom level (1 = 100%)
  offsetX: number;
  offsetY: number;
}

// ── Zone Analysis Results ─────────────────────────────────────────────────────
export interface ZoneAnalysis {
  zoneName: string;
  pctOfTotal: number;
  areaSqFt: number | null;
  hasCut: boolean;
  cutPctOfZone: number;
  cutSeverity?: "mild" | "moderate" | "severe";
  status: "good" | "warning" | "critical";
}

export interface FullAnalysis {
  projectId: string;
  calculatedAt: string;
  totalAreaSqFt?: number;
  brahmasthanConfirmed: boolean;
  northDeg: number;
  zones: ZoneAnalysis[];
  cutsCount: number;
  overallScore?: number;          // 0–100 Vastu score
  facingDirection?: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  cite?: string;                   // Classical text citation if applicable
}

// ── Subscription ─────────────────────────────────────────────────────────────
export type PlanTier = "starter" | "professional" | "firm";

export interface Subscription {
  userId: string;
  plan: PlanTier;
  projectsUsed: number;
  projectsLimit: number;          // 5 / 30 / unlimited
  reportsUsed: number;
  reportsLimit: number;           // 5 / unlimited / unlimited
  renewsAt: string;
  razorpaySubscriptionId?: string;
}

// ── Consultant Profile ────────────────────────────────────────────────────────
export interface ConsultantProfile {
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  city?: string;
  yearsExperience?: number;
  specialization?: string;
  logoUrl?: string;
  avatarUrl?: string;
  firmName?: string;
  reportAccentColor?: string;     // hex color for PDF reports
  reportShowBranding?: boolean;   // Show "Prepared using vastu@home" in report
}

// ── Report Builder ────────────────────────────────────────────────────────────
export type ReportPageType =
  | "plan-only"
  | "plan-with-brahma"
  | "plan-with-chakra"
  | "plan-perimeter-only"
  | "plan-cuts-only"
  | "plan-perimeter-cuts"
  | "plan-full"
  | "16zone-lines"
  | "16-zone"
  | "bar-graph-16"
  | "8zone-lines"
  | "8-zone"
  | "bar-graph-8"
  | "cut-analysis"
  | "panchabhuta"
  | "ai-summary"
  | "consultant-summary";

export type ReportPreset = "consultant-standard" | "quick-summary" | "custom";
export type ReportStatus = "draft" | "generating" | "generated" | "downloaded";

export const REPORT_PAGE_META: Record<
  ReportPageType,
  { label: string; description: string; requiresCuts?: boolean; group: string }
> = {
  // ── Floor Plan visuals ────────────────────────────────────────────────────
  "plan-only":           { label: "Floor Plan",                   description: "Clean floor plan image with north indicator only",                     group: "Floor Plan" },
  "plan-with-brahma":    { label: "Floor Plan + Brahmasthan",     description: "Floor plan with Brahmasthan center marker",                             group: "Floor Plan" },
  "plan-with-chakra":    { label: "Floor Plan + Vastu Chakra",    description: "Floor plan with Chakra overlay — no perimeter or cuts",                group: "Floor Plan" },
  "plan-perimeter-only": { label: "Perimeter View",               description: "Floor plan with drawn perimeter outline",                               group: "Floor Plan" },
  "plan-cuts-only":      { label: "Cuts View",                    description: "Floor plan with cut regions highlighted",                               group: "Floor Plan", requiresCuts: true },
  "plan-perimeter-cuts": { label: "Perimeter + Cuts",             description: "Floor plan with perimeter outline and cut regions",                     group: "Floor Plan" },
  "plan-full":           { label: "Full Composition",             description: "Floor plan with perimeter, cuts, and Vastu Chakra overlay",             group: "Floor Plan" },
  // ── Analysis ──────────────────────────────────────────────────────────────
  "16zone-lines":        { label: "16-Zone Lines View",           description: "Perimeter with 16-zone division lines — labels outside boundary",      group: "Analysis" },
  "16-zone":             { label: "16-Zone Analysis Table",       description: "All 16 zones with area percentages",                                    group: "Analysis" },
  "bar-graph-16":        { label: "16-Zone Bar Graph",            description: "Zone area distribution chart vs 6.25% ideal",                          group: "Analysis" },
  "8zone-lines":         { label: "8-Zone Lines View",            description: "Perimeter with 8-direction division lines — labels outside boundary",  group: "Analysis" },
  "8-zone":              { label: "8-Zone Analysis Table",        description: "8-direction aggregated zone area percentages",                          group: "Analysis" },
  "bar-graph-8":         { label: "8-Zone Bar Graph",             description: "8-direction distribution chart vs 12.5% ideal",                        group: "Analysis" },
  "cut-analysis":        { label: "Cut Analysis",                 description: "Cut severity, affected zones, area percentages",                        group: "Analysis", requiresCuts: true },
  "panchabhuta":         { label: "Panchabhuta (5 Elements)",     description: "Fire / Earth / Water / Air / Space zone grouping",                     group: "Analysis" },
  // ── Summary (placeholder) ────────────────────────────────────────────────
  "ai-summary":          { label: "AI Summary",                   description: "AI-generated analysis summary — placeholder, extension-ready",         group: "Summary" },
  "consultant-summary":  { label: "Consultant Summary",           description: "Consultant notes and recommendations — placeholder",                    group: "Summary" },
};

export const REPORT_PRESET_PAGES: Record<ReportPreset, ReportPageType[]> = {
  "consultant-standard": [
    "plan-only", "plan-with-brahma", "plan-with-chakra",
    "plan-perimeter-only", "plan-cuts-only", "plan-perimeter-cuts", "plan-full",
    "16zone-lines", "16-zone", "bar-graph-16",
    "8zone-lines", "8-zone", "bar-graph-8",
    "cut-analysis",
  ],
  "quick-summary": ["plan-only", "16-zone", "bar-graph-16", "8-zone"],
  "custom":        [],
};

export interface ReportFloorSelection {
  floorId: string;
  floorName: string;
  floorOrder: number;
  enabled: boolean;
  pages: ReportPageType[];
  pageNotes: Partial<Record<ReportPageType, string>>;
}

export interface Report {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string;
  propertyAddress?: string;
  northDeg: number;
  reportName: string;
  preset: ReportPreset;
  floorSelections: ReportFloorSelection[];
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  pdfDataUrl?: string;
}

// ── API Response types ────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: "ok" | "error";
}

// ── Supabase DB table types (auto-generated via supabase gen types) ──────────
// Run: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/types/supabase.ts
// For now, basic shapes are defined in the migration file
export type Database = {
  public: {
    Tables: {
      projects: { Row: Project; Insert: Omit<Project, "id" | "createdAt" | "updatedAt">; Update: Partial<Project> };
      profiles: { Row: ConsultantProfile; Insert: ConsultantProfile; Update: Partial<ConsultantProfile> };
      subscriptions: { Row: Subscription; Insert: Subscription; Update: Partial<Subscription> };
    };
  };
};
