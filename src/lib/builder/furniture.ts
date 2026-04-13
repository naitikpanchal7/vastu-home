// src/lib/builder/furniture.ts
// Furniture and element library with Vastu significance

export type FurnitureCategory =
  | "fire"
  | "water"
  | "earth"
  | "air"
  | "spiritual"
  | "structural"
  | "electrical";

export interface FurnitureItem {
  id: string;
  name: string;
  emoji: string;
  category: FurnitureCategory;
  widthFt: number;   // default footprint width in feet
  heightFt: number;  // default footprint height in feet
  idealZones: string[];   // short zone names e.g. ["SE", "S"]
  avoidZones: string[];
  vastuNote: string;
  element: string;   // Panchabhuta element
}

export const FURNITURE_LIBRARY: FurnitureItem[] = [
  // ── Fire ──────────────────────────────────────────────────────────────────
  {
    id: "stove",
    name: "Gas Stove",
    emoji: "🔥",
    category: "fire",
    widthFt: 2,
    heightFt: 1.5,
    idealZones: ["SE", "NW"],
    avoidZones: ["N", "NE", "SW"],
    vastuNote: "SE (Agni) is ideal. Cook facing East. Never place in NE — it extinguishes the spiritual zone.",
    element: "Fire",
  },
  {
    id: "oven",
    name: "Microwave / Oven",
    emoji: "📦",
    category: "fire",
    widthFt: 1.5,
    heightFt: 1,
    idealZones: ["SE"],
    avoidZones: ["NE", "N"],
    vastuNote: "Keep all fire appliances in the SE quadrant.",
    element: "Fire",
  },
  {
    id: "fireplace",
    name: "Fireplace",
    emoji: "🪵",
    category: "fire",
    widthFt: 3,
    heightFt: 1,
    idealZones: ["SE", "S"],
    avoidZones: ["N", "NE", "SW"],
    vastuNote: "SE or S for a fireplace — fire element matches these zones.",
    element: "Fire",
  },

  // ── Water ─────────────────────────────────────────────────────────────────
  {
    id: "water-tank-ground",
    name: "Underground Water Tank",
    emoji: "💧",
    category: "water",
    widthFt: 3,
    heightFt: 3,
    idealZones: ["NE", "N", "E"],
    avoidZones: ["SW", "SE", "S"],
    vastuNote: "NE or N — water in the north-east brings wealth, health, and spiritual clarity.",
    element: "Water",
  },
  {
    id: "water-tank-overhead",
    name: "Overhead Water Tank",
    emoji: "🫙",
    category: "water",
    widthFt: 3,
    heightFt: 3,
    idealZones: ["NW", "W", "SW"],
    avoidZones: ["NE", "N"],
    vastuNote: "NW or SW for overhead tanks — heavy weight in NE is inauspicious.",
    element: "Water",
  },
  {
    id: "sink",
    name: "Kitchen Sink",
    emoji: "🚿",
    category: "water",
    widthFt: 2,
    heightFt: 1.5,
    idealZones: ["NE", "N"],
    avoidZones: ["SE"],
    vastuNote: "Place sink in the N or NE corner of the kitchen — water here is auspicious.",
    element: "Water",
  },
  {
    id: "washing-machine",
    name: "Washing Machine",
    emoji: "🌀",
    category: "water",
    widthFt: 2,
    heightFt: 2,
    idealZones: ["NW"],
    avoidZones: ["NE", "SE"],
    vastuNote: "NW (Vayu zone) supports circulation and movement — ideal for laundry.",
    element: "Water",
  },

  // ── Earth (Heavy Furniture) ───────────────────────────────────────────────
  {
    id: "bed-master",
    name: "Master Bed",
    emoji: "🛏️",
    category: "earth",
    widthFt: 6,
    heightFt: 7,
    idealZones: ["SW", "S", "W"],
    avoidZones: ["NE", "N", "E"],
    vastuNote: "Head towards South or West while sleeping. SW gives the deepest, most restful sleep.",
    element: "Earth",
  },
  {
    id: "bed-single",
    name: "Single Bed",
    emoji: "🛏️",
    category: "earth",
    widthFt: 3.5,
    heightFt: 6.5,
    idealZones: ["NW", "SE", "W"],
    avoidZones: ["NE"],
    vastuNote: "NW is good for children or guests — promotes independence and movement.",
    element: "Earth",
  },
  {
    id: "sofa",
    name: "Sofa / Couch",
    emoji: "🛋️",
    category: "earth",
    widthFt: 7,
    heightFt: 3,
    idealZones: ["W", "SW"],
    avoidZones: ["NE"],
    vastuNote: "SW or W sofa placement ensures guests sit facing East or North — auspicious.",
    element: "Earth",
  },
  {
    id: "wardrobe",
    name: "Wardrobe / Almirah",
    emoji: "🗄️",
    category: "earth",
    widthFt: 5,
    heightFt: 2,
    idealZones: ["SW", "W"],
    avoidZones: ["NE", "N"],
    vastuNote: "Heavy storage in the SW provides grounding and stability.",
    element: "Earth",
  },
  {
    id: "safe",
    name: "Safe / Locker",
    emoji: "🔒",
    category: "earth",
    widthFt: 2,
    heightFt: 2,
    idealZones: ["N", "SW"],
    avoidZones: ["SE"],
    vastuNote: "Face the locker door towards the North (Kubera — god of wealth).",
    element: "Earth",
  },
  {
    id: "dining-table",
    name: "Dining Table",
    emoji: "🪑",
    category: "earth",
    widthFt: 5,
    heightFt: 3.5,
    idealZones: ["W", "N"],
    avoidZones: ["SE"],
    vastuNote: "W promotes satisfaction and contentment. Avoid SE — fire zone causes rushed meals.",
    element: "Earth",
  },

  // ── Spiritual ─────────────────────────────────────────────────────────────
  {
    id: "pooja-altar",
    name: "Pooja Altar / Mandir",
    emoji: "🕉️",
    category: "spiritual",
    widthFt: 3,
    heightFt: 2,
    idealZones: ["NE", "E"],
    avoidZones: ["S", "SW", "W", "SE"],
    vastuNote: "NE (Ishaan) is sacred — place deity idols facing West or South so worshippers face East or North.",
    element: "Space",
  },
  {
    id: "tulsi-plant",
    name: "Tulsi / Sacred Plants",
    emoji: "🌿",
    category: "spiritual",
    widthFt: 1,
    heightFt: 1,
    idealZones: ["NE", "N", "E"],
    avoidZones: ["SW", "SE"],
    vastuNote: "Tulsi in the NE or courtyard purifies the home's energy field.",
    element: "Space",
  },

  // ── Air ───────────────────────────────────────────────────────────────────
  {
    id: "window",
    name: "Window",
    emoji: "🪟",
    category: "air",
    widthFt: 4,
    heightFt: 0.5,
    idealZones: ["N", "E", "NE"],
    avoidZones: ["SW"],
    vastuNote: "Windows in N and E bring morning light and Prana (life force). Avoid large openings in SW.",
    element: "Air",
  },
  {
    id: "ac",
    name: "Air Conditioner",
    emoji: "❄️",
    category: "air",
    widthFt: 3,
    heightFt: 1,
    idealZones: ["W", "N", "NW"],
    avoidZones: ["SE", "NE"],
    vastuNote: "W or NW for AC — avoid SE (fire zone) and NE (spiritual zone).",
    element: "Air",
  },

  // ── Electrical ───────────────────────────────────────────────────────────
  {
    id: "tv",
    name: "Television",
    emoji: "📺",
    category: "electrical",
    widthFt: 4,
    heightFt: 0.5,
    idealZones: ["SE", "E"],
    avoidZones: ["NE", "SW"],
    vastuNote: "SE (fire element) is good for electronics. Face TV towards East or South for best results.",
    element: "Fire",
  },
  {
    id: "study-desk",
    name: "Study / Work Desk",
    emoji: "🖥️",
    category: "electrical",
    widthFt: 4,
    heightFt: 2,
    idealZones: ["N", "E", "NE"],
    avoidZones: ["SW"],
    vastuNote: "Sit facing East (creativity) or North (career, focus) while working.",
    element: "Air",
  },

  // ── Structural ────────────────────────────────────────────────────────────
  {
    id: "stairs",
    name: "Staircase",
    emoji: "🪜",
    category: "structural",
    widthFt: 4,
    heightFt: 8,
    idealZones: ["S", "SW", "W", "SE"],
    avoidZones: ["NE", "N"],
    vastuNote: "Stairs in SW or S are ideal. Stairs in NE suppress positive energy — the most serious defect.",
    element: "Earth",
  },
  {
    id: "column",
    name: "Column / Pillar",
    emoji: "🏛️",
    category: "structural",
    widthFt: 1,
    heightFt: 1,
    idealZones: ["SW", "S", "W"],
    avoidZones: ["NE", "Brahmasthan"],
    vastuNote: "Columns in SW are acceptable. A column at Brahmasthan (centre) is a major defect.",
    element: "Earth",
  },
];

export const FURNITURE_CATEGORIES: Record<FurnitureCategory, string> = {
  fire: "Fire Elements",
  water: "Water Elements",
  earth: "Earth / Heavy",
  air: "Air Elements",
  spiritual: "Spiritual",
  structural: "Structural",
  electrical: "Electrical",
};
