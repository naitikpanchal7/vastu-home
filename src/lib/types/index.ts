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

  // Workspace mode — set at creation, immutable after that
  workspaceMode?: "canvas" | "builder";

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
