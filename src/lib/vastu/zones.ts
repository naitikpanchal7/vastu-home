// src/lib/vastu/zones.ts
// Authentic Vastu Shakti Chakra — 16 zones, 22.5° each, classical data

export interface VastuZone {
  name: string;
  shortName: string;
  startDeg: number;      // degrees clockwise from true North
  endDeg: number;
  color: string;         // zone fill color (classical element color)
  element: string;       // Panchabhuta element
  deity: string;         // Presiding deity (devta)
  planet: string;        // Ruling planet
  governs: string;       // What this zone governs in life
  idealUse: string[];    // Ideal room/space usage
  avoid: string[];       // What to avoid in this zone
  remedy: string;        // Primary non-demolition remedy if cut/deficient
}

export const VASTU_ZONES: VastuZone[] = [
  {
    name: "North",
    shortName: "N",
    startDeg: 348.75,
    endDeg: 11.25,
    color: "#4a90c4",
    element: "Water",
    deity: "Kubera",
    planet: "Mercury",
    governs: "Wealth, career, new opportunities, finances",
    idealUse: ["Living room", "Home office", "Work from home area"],
    avoid: ["Toilets", "Heavy storage", "Kitchen"],
    remedy: "Place a water feature or blue/green elements. Keep this zone open and clutter-free.",
  },
  {
    name: "North-Northeast",
    shortName: "NNE",
    startDeg: 11.25,
    endDeg: 33.75,
    color: "#5ba8d8",
    element: "Water",
    deity: "Soma",
    planet: "Moon",
    governs: "Health, immunity, well-being, healing",
    idealUse: ["Bathroom (no toilet)", "Health room", "Living room"],
    avoid: ["Kitchen", "Toilet", "Fire elements"],
    remedy: "Use white or light blue tones. Copper water vessels or silver items are beneficial.",
  },
  {
    name: "Northeast",
    shortName: "NE",
    startDeg: 33.75,
    endDeg: 56.25,
    color: "#6ec6e8",
    element: "Space (Akasha)",
    deity: "Ishaan (Shiva)",
    planet: "Jupiter",
    governs: "Wisdom, clarity, spirituality, mental peace",
    idealUse: ["Pooja room", "Meditation space", "Study room", "Prayer area"],
    avoid: ["Kitchen", "Toilet", "Master bedroom", "Heavy storage"],
    remedy: "A NE cut is most serious — place a Shri Yantra or copper pyramid. Keep absolutely clutter-free. Use yellow and white.",
  },
  {
    name: "East-Northeast",
    shortName: "ENE",
    startDeg: 56.25,
    endDeg: 78.75,
    color: "#5aaa6a",
    element: "Air",
    deity: "Parjanya",
    planet: "Venus",
    governs: "New ideas, fun, recreation, rejuvenation",
    idealUse: ["Children's room", "Study room", "Play area", "Home gym"],
    avoid: ["Master bedroom", "Heavy furniture"],
    remedy: "Light green shades. Keep active and well-ventilated.",
  },
  {
    name: "East",
    shortName: "E",
    startDeg: 78.75,
    endDeg: 101.25,
    color: "#48a858",
    element: "Air",
    deity: "Indra",
    planet: "Sun",
    governs: "Social life, achievements, networking, health",
    idealUse: ["Living room", "Drawing room", "Social area"],
    avoid: ["Toilet", "Store room", "Heavy machinery"],
    remedy: "Keep East walls low. Green plants and natural light. Avoid blocking sunrise.",
  },
  {
    name: "East-Southeast",
    shortName: "ESE",
    startDeg: 101.25,
    endDeg: 123.75,
    color: "#72b872",
    element: "Fire + Air",
    deity: "Vitatha",
    planet: "Saturn",
    governs: "Analysis, churning of thoughts, confidence building",
    idealUse: ["Gym", "Activity room", "Home office (secondary)"],
    avoid: ["Bedroom", "Pooja room"],
    remedy: "Light green tones. Activity-oriented spaces work well here.",
  },
  {
    name: "Southeast",
    shortName: "SE",
    startDeg: 123.75,
    endDeg: 146.25,
    color: "#e85050",
    element: "Fire",
    deity: "Agni",
    planet: "Venus",
    governs: "Cash flow, energy, financial liquidity, cooking",
    idealUse: ["Kitchen", "Electrical room", "Generator room"],
    avoid: ["Bedroom", "Pooja room", "Water bodies"],
    remedy: "Red/orange tones. Copper strips along SE boundary. Avoid blue or water.",
  },
  {
    name: "South-Southeast",
    shortName: "SSE",
    startDeg: 146.25,
    endDeg: 168.75,
    color: "#d04848",
    element: "Fire",
    deity: "Pushan",
    planet: "Saturn",
    governs: "Confidence, power, stamina, strength",
    idealUse: ["Bedroom", "Storage", "Gym"],
    avoid: ["Pooja room", "Main entrance"],
    remedy: "Pink or terracotta tones. Iron elements to ground fire energy.",
  },
  {
    name: "South",
    shortName: "S",
    startDeg: 168.75,
    endDeg: 191.25,
    color: "#c03838",
    element: "Earth",
    deity: "Yama",
    planet: "Mars",
    governs: "Rest, fame, social recognition, discipline",
    idealUse: ["Bedroom", "Heavy storage", "Master bedroom"],
    avoid: ["Main entrance", "Pooja room", "Living room"],
    remedy: "Keep South walls high and heavy. Red and earthy tones. No open spaces or large windows facing South.",
  },
  {
    name: "South-Southwest",
    shortName: "SSW",
    startDeg: 191.25,
    endDeg: 213.75,
    color: "#c8a028",
    element: "Earth",
    deity: "Nairutya",
    planet: "Rahu",
    governs: "Savings, secrets, disposal, expenditure",
    idealUse: ["Locker room", "Master bedroom", "Safe/vault area"],
    avoid: ["Kitchen", "Living room", "Main entrance"],
    remedy: "Yellow ochre and brown. Heavy furniture and earth elements. Iron safe in SW/SSW.",
  },
  {
    name: "Southwest",
    shortName: "SW",
    startDeg: 213.75,
    endDeg: 236.25,
    color: "#b09020",
    element: "Earth",
    deity: "Niriti (Nairutya)",
    planet: "Rahu/Ketu",
    governs: "Stability, relationships, skills, family bonding",
    idealUse: ["Master bedroom", "Safe/locker", "Heavy storage"],
    avoid: ["Main entrance", "Kitchen", "Water bodies"],
    remedy: "Most critical zone to keep heavy and stable. Granite/marble flooring. Yellow, beige, brown. Heavy iron furniture. Avoid cuts at all costs.",
  },
  {
    name: "West-Southwest",
    shortName: "WSW",
    startDeg: 236.25,
    endDeg: 258.75,
    color: "#b8b8b8",
    element: "Earth + Water",
    deity: "Duwarik",
    planet: "Saturn",
    governs: "Education, savings, profits, knowledge",
    idealUse: ["Children's study", "Library", "Accounts room"],
    avoid: ["Toilet"],
    remedy: "White and silver metallic tones. Bookshelf or study table ideal here.",
  },
  {
    name: "West",
    shortName: "W",
    startDeg: 258.75,
    endDeg: 281.25,
    color: "#a0a8b8",
    element: "Water",
    deity: "Varuna",
    planet: "Saturn",
    governs: "Learning, gains, prosperity, gratitude",
    idealUse: ["Study room", "Dining room", "Children's room"],
    avoid: ["Main entrance", "Kitchen"],
    remedy: "White, grey, silver tones. Keep moderately heavy. Water elements acceptable here.",
  },
  {
    name: "West-Northwest",
    shortName: "WNW",
    startDeg: 281.25,
    endDeg: 303.75,
    color: "#8898b0",
    element: "Air + Water",
    deity: "Pushpadanta",
    planet: "Moon",
    governs: "Support systems, banking, movement, stress relief",
    idealUse: ["Guest room", "Toilet (acceptable here)", "Guest bathroom"],
    avoid: ["Master bedroom", "Pooja room"],
    remedy: "Light grey or silver-blue. Keep airy and well-ventilated.",
  },
  {
    name: "Northwest",
    shortName: "NW",
    startDeg: 303.75,
    endDeg: 326.25,
    color: "#7898b0",
    element: "Air",
    deity: "Vayu",
    planet: "Moon",
    governs: "Support, travel, banking relationships, networking",
    idealUse: ["Guest room", "Garage", "Toilet", "Store room"],
    avoid: ["Main entrance", "Pooja room"],
    remedy: "Keep airy. Light blue/grey tones. Wind chimes enhance NW energy.",
  },
  {
    name: "North-Northwest",
    shortName: "NNW",
    startDeg: 326.25,
    endDeg: 348.75,
    color: "#6890c0",
    element: "Air",
    deity: "Bhallat",
    planet: "Moon",
    governs: "Attraction, strength of relationships, sensuality",
    idealUse: ["Secondary bedroom", "Couple's space"],
    avoid: ["Kitchen", "Pooja room"],
    remedy: "Light blue tones. Keep this zone inviting and comfortable.",
  },
];

// Helper: get zone for a given angle from Brahmasthan (0° = North, clockwise)
export function getZoneForAngle(angleDeg: number, northDeg: number = 0): VastuZone {
  // Normalize angle relative to true North
  let normalized = ((angleDeg - northDeg) % 360 + 360) % 360;
  return VASTU_ZONES.find(z => {
    const s = z.startDeg, e = z.endDeg;
    if (s > e) return normalized >= s || normalized < e; // wraps around 0
    return normalized >= s && normalized < e;
  }) ?? VASTU_ZONES[0];
}

// Helper: get zone for a point relative to Brahmasthan
export function getZoneForPoint(
  px: number, py: number,
  brahmaX: number, brahmaY: number,
  northDeg: number = 0
): VastuZone {
  const angleRad = Math.atan2(py - brahmaY, px - brahmaX);
  // Convert to clockwise from North: atan2 gives CCW from East
  let angleDeg = (angleRad * 180 / Math.PI) + 90; // rotate to from-North
  angleDeg = ((angleDeg % 360) + 360) % 360;
  return getZoneForAngle(angleDeg, northDeg);
}

// Ideal percentage per zone (equal 22.5° division = 6.25% each)
export const IDEAL_ZONE_PCT = 6.25;

// Severity thresholds for cuts
export const CUT_SEVERITY = {
  mild:     { max: 10,  label: "Mild",     color: "#c8a028" },
  moderate: { max: 25,  label: "Moderate", color: "#e08830" },
  severe:   { max: 100, label: "Severe",   color: "#e85050" },
} as const;

export function getCutSeverity(cutPctOfZone: number) {
  if (cutPctOfZone < CUT_SEVERITY.mild.max) return CUT_SEVERITY.mild;
  if (cutPctOfZone < CUT_SEVERITY.moderate.max) return CUT_SEVERITY.moderate;
  return CUT_SEVERITY.severe;
}

// 32 entrance padas (11.25° each) — for entrance placement feature
export const ENTRANCE_PADAS = Array.from({ length: 32 }, (_, i) => ({
  pada: i + 1,
  startDeg: i * 11.25,
  endDeg: (i + 1) * 11.25,
  zone: VASTU_ZONES[Math.floor(i / 2)].shortName,
  auspicious: ![1, 2, 9, 10, 17, 18].includes(i + 1), // classical inauspicious padas
}));
