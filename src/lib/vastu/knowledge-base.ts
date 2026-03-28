// src/lib/vastu/knowledge-base.ts
// Phase 1: Manually curated structured knowledge base
// Used as fallback / supplement to Claude API responses
// Phase 2: Replace with full RAG over Vishwakarma Prakash OCR pipeline

export interface KnowledgeEntry {
  zone?: string;          // Zone shortname e.g. "NE"
  topic: string;          // "cut" | "remedy" | "room-placement" | "entrance" | "general"
  title: string;
  content: string;
  source: string;         // Classical text reference
  tags: string[];
}

export const KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // ── NE Zone ─────────────────────────────────────────────────────────────────
  {
    zone: "NE",
    topic: "cut",
    title: "Northeast Cut — Most Critical Vastu Dosha",
    content: "A cut in the Northeast (Ishaan) zone is considered the most severe Vastu dosha. The NE is governed by Ishaan (Lord Shiva) and represents the Space element (Akasha). Any reduction in this zone severely hampers clarity, wisdom, spiritual growth, and overall prosperity of the household. Per Vishwakarma Prakash, the NE corner must always be open, light, and elevated in spiritual significance. A cut here is said to bring confusion, financial loss, and deteriorating health over time.",
    source: "Vishwakarma Prakash, Chapter 4 — Zones and Deities",
    tags: ["NE", "cut", "dosha", "critical", "ishaan"],
  },
  {
    zone: "NE",
    topic: "remedy",
    title: "Northeast Cut Remedies (Non-Demolition)",
    content: "1. Place a Shri Yantra or Vastu Yantra in the NE corner of the existing space. 2. Install a copper pyramid in the NE zone — copper being the metal of Jupiter (NE's ruling planet). 3. Use white or light yellow colors in the NE zone. 4. Place a small water body (bowl of water with flowers) in the NE corner. 5. Avoid any storage, heavy furniture, toilets, or fire elements in NE at all costs. 6. Keep NE completely clutter-free — even a shoe rack here is harmful. Per Brihat Samhita, energizing the NE with copper and water elements can partially restore the zone's energy.",
    source: "Brihat Samhita, Chapter 53 — Vastu Remedies",
    tags: ["NE", "remedy", "copper", "yantra", "water"],
  },

  // ── SW Zone ─────────────────────────────────────────────────────────────────
  {
    zone: "SW",
    topic: "cut",
    title: "Southwest Cut — Stability and Relationship Dosha",
    content: "The Southwest (Nairutya) zone is governed by Niriti and controls stability, relationships, skills, and the master of the house. Per Vishwakarma Prakash, the SW must always be the heaviest, highest, and most closed zone. A cut here removes the grounding earth element, leading to instability in finances, relationships, and the health of the head of the household. The SW is the cornerstone of the structure — any deficiency here directly impacts the family's foundation.",
    source: "Vishwakarma Prakash, Chapter 7 — Southwest Principles",
    tags: ["SW", "cut", "stability", "earth", "nairutya"],
  },
  {
    zone: "SW",
    topic: "remedy",
    title: "Southwest Cut Remedies",
    content: "1. Place the heaviest furniture (iron safe, granite table, large wardrobe) in the SW zone. 2. Use iron or brass strips along the SW boundary wall to contain and strengthen the earth element. 3. Apply yellow, beige, or ochre colors in SW rooms. 4. A heavy iron or brass statue in the SW corner is highly effective. 5. Avoid any water features, fountains, or blue colors in SW — water destroys earth here. 6. The master bedroom should be in SW if possible — the heaviest sleeper's energy helps ground the zone.",
    source: "Vishwakarma Prakash, Chapter 7",
    tags: ["SW", "remedy", "iron", "earth", "heavy"],
  },

  // ── SE Zone ─────────────────────────────────────────────────────────────────
  {
    zone: "SE",
    topic: "general",
    title: "Southeast — Agni Zone",
    content: "The Southeast is governed by Agni (fire deity) and rules cash flow, financial liquidity, and the fire element. Per Mayamatam, the kitchen must always be in SE for ideal Vastu alignment — the cook faces East while cooking, receiving the morning energy of Indra. The SE is also linked to the energy and initiative of the family's earning members. A strong SE zone enhances financial flow and confidence.",
    source: "Mayamatam, Chapter 8 — Kitchen Placement",
    tags: ["SE", "kitchen", "agni", "fire", "cash-flow"],
  },

  // ── N Zone ──────────────────────────────────────────────────────────────────
  {
    zone: "N",
    topic: "general",
    title: "North — Kubera Zone",
    content: "The North is ruled by Kubera, the god of wealth. Per classical Vastu, keeping the North zone open and unobstructed allows wealth and career opportunities to flow in. This is the Water element zone — blue and green tones are ideal. A study, living room, or home office in the North attracts career growth and financial opportunities. Never place a toilet or heavy storage in the North zone.",
    source: "Vishwakarma Prakash, Chapter 3 — Directions and Deities",
    tags: ["N", "kubera", "wealth", "water", "career"],
  },

  // ── General entrances ────────────────────────────────────────────────────────
  {
    topic: "entrance",
    title: "Main Door Pada Analysis — 32 Entrances",
    content: "Per Vishwakarma Prakash, each wall is divided into 9 equal parts (padas), giving 32 entrance positions around the perimeter. Entrances in positions 2-3 (N face), 4-5 (E face) are most auspicious. Pada 1 (NNE) brings instability, Pada 9 (SSE) brings financial loss. The main door direction (which compass direction it faces when opened) is separate from the zone it falls in — both must be analysed together. Per Brihat Samhita, an entrance in the NE pada is ideal for spiritual households, while E pada suits business owners.",
    source: "Vishwakarma Prakash, Chapter 12 — Dwara Lakshana (Door Analysis)",
    tags: ["entrance", "main-door", "pada", "auspicious"],
  },

  // ── Brahmasthan ──────────────────────────────────────────────────────────────
  {
    topic: "general",
    title: "Brahmasthan — The Sacred Center",
    content: "The Brahmasthan is the geometric center of the floor plan and is considered the most sacred point in Vastu Shastra. Per Vishwakarma Prakash, the Brahmasthan must always be open, unobstructed, and free of structural columns, walls, toilets, or heavy furniture. It represents Brahma (the creator) and is the point where all energies of the 16 zones converge. A blocked or defective Brahmasthan creates energy stagnation throughout the property affecting all aspects of life.",
    source: "Vishwakarma Prakash, Chapter 2 — Brahmasthan Principles",
    tags: ["brahmasthan", "center", "brahma", "sacred"],
  },

  // ── Property facing ──────────────────────────────────────────────────────────
  {
    topic: "general",
    title: "Facing Direction Analysis",
    content: "A property's 'facing' is determined by which compass direction you face when standing at the main entrance looking outward — NOT the direction the door opens toward. Per Mayamatam, East-facing and North-facing properties are generally most auspicious as they receive morning sunlight (Indra's energy) and Kubera's blessings respectively. South-facing properties require specific remedies at the main entrance. The facing direction affects which zone receives the main energy influx of the property.",
    source: "Mayamatam, Chapter 5 — Property Orientation",
    tags: ["facing", "north-facing", "east-facing", "south-facing", "entrance"],
  },

  // ── Vastu scoring ────────────────────────────────────────────────────────────
  {
    topic: "general",
    title: "Zone Percentage Interpretation",
    content: "In the 16-zone Shakti Chakra analysis, each zone should ideally represent 6.25% of the total floor area (100% / 16 = 6.25%). A zone below 5% is considered deficient — representing underactive energy in that life area. A zone above 8% is in surplus — representing overactive energy. Zones with cuts have effective area removed from calculation. The ideal property has all zones within 5.5% to 7.5%, with no cuts in NE, NNE, or SW zones. Cuts in ESE or SSW are least harmful per classical texts.",
    source: "Applied Vastu Shastra — Zone Calculation Methodology",
    tags: ["percentage", "ideal", "deficit", "surplus", "analysis"],
  },
];

// Quick lookup by zone
export function getKnowledgeForZone(zoneName: string): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter(
    (e) => e.zone === zoneName || e.tags.includes(zoneName.toLowerCase())
  );
}

// Quick lookup by topic
export function getKnowledgeByTopic(topic: string): KnowledgeEntry[] {
  return KNOWLEDGE_BASE.filter((e) => e.topic === topic || e.tags.includes(topic));
}
