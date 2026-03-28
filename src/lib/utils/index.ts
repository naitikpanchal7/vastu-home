// src/lib/utils/index.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format area with unit
export function formatArea(sqFt: number | null | undefined, unit: "ft" | "m" = "ft"): string {
  if (!sqFt) return "—";
  if (unit === "m") return `${(sqFt * 0.0929).toFixed(1)} m²`;
  return `${sqFt.toLocaleString("en-IN")} sq ft`;
}

// Format percentage
export function formatPct(pct: number, decimals = 1): string {
  return `${pct.toFixed(decimals)}%`;
}

// Format date for display
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// Format relative time
export function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

// Convert hex color to rgba
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Convert degrees to SVG radians (0° = North, clockwise)
export function toSVGRad(deg: number): number {
  return ((deg - 90) * Math.PI) / 180;
}

// Clamp a number between min and max
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Generate a unique ID
export function generateId(): string {
  return crypto.randomUUID();
}

// Status badge config
export const STATUS_CONFIG = {
  draft:  { label: "Draft",       color: "bg-amber-900/40 text-amber-400",   dot: "#e8912a" },
  active: { label: "In Analysis", color: "bg-blue-900/40 text-blue-400",    dot: "#7ab0e8" },
  done:   { label: "Done",        color: "bg-green-900/40 text-green-400",  dot: "#6dc87a" },
} as const;

// Get greeting based on time of day
export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name.split(" ")[0];
  return `${greeting}, ${firstName}`;
}

// Severity color for cut analysis
export const SEVERITY_COLORS = {
  mild:     { bg: "bg-amber-900/30",  text: "text-amber-400",  hex: "#c8a028" },
  moderate: { bg: "bg-orange-900/30", text: "text-orange-400", hex: "#e08830" },
  severe:   { bg: "bg-red-900/30",    text: "text-red-400",    hex: "#e85050" },
} as const;
