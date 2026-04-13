// src/lib/builder/roomTypes.ts
// Room type definitions with colors and Vastu zone recommendations

// Re-export RoomShape from presetShapes so callers only need one import
export type { RoomShape } from "@/lib/builder/presetShapes";

export type RoomType =
  | "bedroom-master"
  | "bedroom-child"
  | "bedroom-guest"
  | "kitchen"
  | "living-room"
  | "bathroom"
  | "toilet"
  | "pooja"
  | "study"
  | "dining"
  | "hallway"
  | "balcony"
  | "garage"
  | "store";


export interface RoomTypeConfig {
  label: string;
  color: string;          // fill color for canvas
  borderColor: string;    // stroke color
  idealZones: string[];   // e.g. ["SW", "S"]
  avoidZones: string[];
  vastuNote: string;
}

export const ROOM_TYPES: Record<RoomType, RoomTypeConfig> = {
  "bedroom-master": {
    label: "Master Bedroom",
    color: "rgba(100, 120, 200, 0.55)",
    borderColor: "#6478c8",
    idealZones: ["SW", "S", "W"],
    avoidZones: ["NE", "N"],
    vastuNote: "SW is ideal — heavy, grounding energy supports sleep and health.",
  },
  "bedroom-child": {
    label: "Children's Bedroom",
    color: "rgba(120, 160, 210, 0.55)",
    borderColor: "#78a0d2",
    idealZones: ["NW", "SE", "W"],
    avoidZones: ["NE", "SW"],
    vastuNote: "NW promotes movement and social energy, good for growing children.",
  },
  "bedroom-guest": {
    label: "Guest Bedroom",
    color: "rgba(140, 170, 220, 0.55)",
    borderColor: "#8caade",
    idealZones: ["NW", "W"],
    avoidZones: ["NE"],
    vastuNote: "NW is ideal for guests — energy here supports temporary stay.",
  },
  kitchen: {
    label: "Kitchen",
    color: "rgba(220, 130, 60, 0.55)",
    borderColor: "#dc823c",
    idealZones: ["SE", "NW"],
    avoidZones: ["N", "NE", "SW"],
    vastuNote: "SE (Agni zone) is the classical position for the kitchen — fire element thrives here.",
  },
  "living-room": {
    label: "Living Room",
    color: "rgba(160, 190, 120, 0.55)",
    borderColor: "#a0be78",
    idealZones: ["N", "NE", "E", "NW"],
    avoidZones: ["SW"],
    vastuNote: "N and NE bring prosperity and positive energy to social gatherings.",
  },
  bathroom: {
    label: "Bathroom",
    color: "rgba(100, 190, 200, 0.5)",
    borderColor: "#64bec8",
    idealZones: ["NW", "W", "E"],
    avoidZones: ["NE", "SW", "SE"],
    vastuNote: "E or NW works well for bathing spaces — avoid NE (spirituality zone).",
  },
  toilet: {
    label: "Toilet / WC",
    color: "rgba(160, 100, 140, 0.5)",
    borderColor: "#a0648c",
    idealZones: ["SW", "W", "NW", "S"],
    avoidZones: ["NE", "N", "E", "SE"],
    vastuNote: "SW or S is acceptable — strictly avoid NE and N.",
  },
  pooja: {
    label: "Pooja / Prayer",
    color: "rgba(220, 190, 80, 0.55)",
    borderColor: "#dcbe50",
    idealZones: ["NE", "E"],
    avoidZones: ["S", "SW", "W", "SE"],
    vastuNote: "NE is the Ishaan zone — spirituality, wisdom, and divine blessings.",
  },
  study: {
    label: "Study / Office",
    color: "rgba(130, 160, 100, 0.55)",
    borderColor: "#82a064",
    idealZones: ["N", "E", "NE"],
    avoidZones: ["S", "SW"],
    vastuNote: "N (Kubera) supports career and concentration. E brings morning clarity.",
  },
  dining: {
    label: "Dining Room",
    color: "rgba(180, 140, 80, 0.55)",
    borderColor: "#b48c50",
    idealZones: ["W", "N"],
    avoidZones: ["SE", "NE"],
    vastuNote: "W promotes satisfaction after meals. Avoid SE (fire zone — causes irritability).",
  },
  hallway: {
    label: "Hallway / Passage",
    color: "rgba(150, 140, 130, 0.45)",
    borderColor: "#968c82",
    idealZones: ["N", "E", "NE"],
    avoidZones: [],
    vastuNote: "Passages in N or E allow free flow of positive energy through the home.",
  },
  balcony: {
    label: "Balcony / Terrace",
    color: "rgba(120, 200, 160, 0.45)",
    borderColor: "#78c8a0",
    idealZones: ["N", "E", "NE"],
    avoidZones: ["SW"],
    vastuNote: "N and E balconies bring in morning sun and Kubera energy.",
  },
  garage: {
    label: "Garage / Parking",
    color: "rgba(140, 130, 120, 0.45)",
    borderColor: "#8c8278",
    idealZones: ["SE", "NW"],
    avoidZones: ["NE", "SW"],
    vastuNote: "SE or NW for vehicles — keeps fire/movement energy away from living zones.",
  },
  store: {
    label: "Store Room",
    color: "rgba(160, 140, 110, 0.45)",
    borderColor: "#a08c6e",
    idealZones: ["SW", "NW"],
    avoidZones: ["NE"],
    vastuNote: "SW supports heavy, static storage. NW also acceptable for supplies.",
  },
};

export const ROOM_TYPE_OPTIONS: { value: RoomType; label: string }[] = Object.entries(
  ROOM_TYPES
).map(([value, config]) => ({ value: value as RoomType, label: config.label }));
