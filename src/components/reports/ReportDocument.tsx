// src/components/reports/ReportDocument.tsx
// @react-pdf/renderer document — client-side only (dynamic import, no SSR)
"use client";

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Rect,
  Line,
  G,
} from "@react-pdf/renderer";
import type { ReportPageType } from "@/lib/types";
import { REPORT_PAGE_META } from "@/lib/types";
import type { ZoneAreaResult, CutAnalysisResult } from "@/lib/vastu/geometry";
import type { VastuZone } from "@/lib/vastu/zones";

// ── Colour palette (light/print-friendly) ─────────────────────────────────────
const C = {
  bg:       "#fdfaf5",
  bg2:      "#f5f0e8",
  gold:     "#b8922a",
  goldDark: "#8a6a1a",
  text:     "#1a1410",
  text2:    "#4a3a28",
  text3:    "#8a7a60",
  border:   "#d4bc88",
  sevMild:  "#c8a028",
  sevMod:   "#e87820",
  sevSev:   "#e05050",
};

const styles = StyleSheet.create({
  page:        { backgroundColor: C.bg,  paddingTop: 36, paddingBottom: 48, paddingHorizontal: 44, fontFamily: "Helvetica" },
  pageWide:    { backgroundColor: C.bg,  paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontFamily: "Helvetica" },
  goldBar:     { height: 6, backgroundColor: C.gold, marginBottom: 0 },
  goldBarThin: { height: 2, backgroundColor: C.gold, marginBottom: 0 },
  footer:      { position: "absolute", bottom: 18, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  footerText:  { fontSize: 7, color: C.text3, fontFamily: "Helvetica" },
  sectionTitle:{ fontSize: 9, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  pageLabel:   { fontSize: 8, color: C.text3, fontFamily: "Helvetica", marginBottom: 2 },
  h1:          { fontSize: 26, color: C.goldDark, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h2:          { fontSize: 15, color: C.text, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  h3:          { fontSize: 11, color: C.text, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  body:        { fontSize: 9,  color: C.text2, fontFamily: "Helvetica", lineHeight: 1.5 },
  small:       { fontSize: 7.5, color: C.text3, fontFamily: "Helvetica", lineHeight: 1.4 },
  row:         { flexDirection: "row" },
  col:         { flexDirection: "column" },
  separator:   { height: 1, backgroundColor: C.border, marginVertical: 8 },
  card:        { backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 10, marginBottom: 8 },
  badge:       { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  noteBox:     { borderLeftWidth: 2, borderLeftColor: C.gold, paddingLeft: 8, paddingVertical: 4, marginTop: 8 },
});

// ── Data types ────────────────────────────────────────────────────────────────
export interface FloorPDFData {
  floorId: string;
  floorName: string;
  floorOrder: number;
  floorPlanImageBase64: string | null;
  /** Pre-rendered canvas snapshots for each overlay variant */
  snapshots: {
    planOnly:          string | null;   // floor plan, no overlay
    planBrahma:        string | null;   // floor plan + brahmasthan marker
    planChakra:        string | null;   // floor plan + chakra (no perimeter/cuts)
    planPerimeter:     string | null;   // floor plan + perimeter only
    planCutsOnly:      string | null;   // floor plan + cuts only
    planPerimeterCuts: string | null;   // floor plan + perimeter + cuts
    planFull:          string | null;   // floor plan + perimeter + cuts + chakra
    zoneLines16:       string | null;   // floor plan + perimeter + 16-zone lines + outside labels
    zoneLines8:        string | null;   // floor plan + perimeter + 8-zone lines + outside labels
    panchabhuta:       string | null;   // floor plan + 5-element colored fills
  };
  northDeg: number;
  zoneAnalysis: ZoneAreaResult[];
  zoneRows: Array<{ zone: VastuZone; pct: number; status: "good" | "warning" | "critical"; hasCut: boolean; cutPct: number }>;
  cutAnalysis: CutAnalysisResult[];
  hasCuts: boolean;
  scaleUnit: string;
  selectedPages: ReportPageType[];
  pageNotes: Partial<Record<ReportPageType, string>>;
}

export interface ReportDocumentData {
  reportName: string;
  projectName: string;
  clientName: string;
  propertyAddress: string;
  consultantName: string;
  date: string;
  northDeg: number;
  floors: FloorPDFData[];
}

// ── Page labels ───────────────────────────────────────────────────────────────
const PAGE_LABELS: Record<ReportPageType, string> = {
  "plan-only":           "Floor Plan",
  "plan-with-brahma":    "Floor Plan + Brahmasthan",
  "plan-with-chakra":    "Floor Plan + Vastu Chakra",
  "plan-perimeter-only": "Perimeter View",
  "plan-cuts-only":      "Cuts View",
  "plan-perimeter-cuts": "Perimeter + Cuts",
  "plan-full":           "Full Composition",
  "16zone-lines":        "16-Zone Lines View",
  "16-zone":             "16-Zone Analysis Table",
  "bar-graph-16":        "16-Zone Bar Graph",
  "8zone-lines":         "8-Zone Lines View",
  "8-zone":              "8-Zone Analysis Table",
  "bar-graph-8":         "8-Zone Bar Graph",
  "cut-analysis":        "Cut Analysis",
  "panchabhuta":         "Panchabhuta — 5 Elements",
  "ai-summary":          "AI Summary",
  "consultant-summary":  "Consultant Summary",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Page 1 = Cover, Page 2 = Table of Contents, Pages 3+ = floor pages
function pageNumber(
  floors: FloorPDFData[],
  targetFloorIdx: number,
  targetPage: ReportPageType
): number {
  let n = 3; // 1=cover, 2=toc
  for (let fi = 0; fi <= targetFloorIdx; fi++) {
    const floor = floors[fi];
    for (const page of floor.selectedPages) {
      if (fi === targetFloorIdx && page === targetPage) return n;
      n++;
    }
  }
  return n;
}

function totalPages(floors: FloorPDFData[]): number {
  return 2 + floors.reduce((sum, f) => sum + f.selectedPages.length, 0);
}

// Maps each page type to the correct pre-rendered snapshot
function getSnapshotForPageType(
  pageType: ReportPageType,
  snap: FloorPDFData["snapshots"],
  fallback: string | null
): string | null {
  switch (pageType) {
    case "plan-only":           return snap.planOnly          ?? fallback;
    case "plan-with-brahma":    return snap.planBrahma        ?? fallback;
    case "plan-with-chakra":    return snap.planChakra        ?? fallback;
    case "plan-perimeter-only": return snap.planPerimeter     ?? fallback;
    case "plan-cuts-only":      return snap.planCutsOnly      ?? fallback;
    case "plan-perimeter-cuts": return snap.planPerimeterCuts ?? fallback;
    case "plan-full":           return snap.planFull          ?? fallback;
    case "16zone-lines":        return snap.zoneLines16       ?? fallback;
    case "16-zone":             return snap.zoneLines16       ?? fallback;
    case "8zone-lines":         return snap.zoneLines8        ?? fallback;
    case "8-zone":              return snap.zoneLines8        ?? fallback;
    case "cut-analysis":        return snap.planPerimeterCuts ?? fallback;
    case "panchabhuta":         return snap.panchabhuta       ?? fallback;
    default:                    return fallback;
  }
}

// ── Page footer ───────────────────────────────────────────────────────────────
function PageFooter({ label, page, total }: { label: string; page: number; total: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>vastu@home — Vastu Shastra Analysis</Text>
      <Text style={styles.footerText}>{label}</Text>
      <Text style={styles.footerText}>Page {page} of {total}</Text>
    </View>
  );
}

// ── Page header component ─────────────────────────────────────────────────────
function FloorPageHeader({ pageType, floorName, northDeg, pageNum, total }: {
  pageType: ReportPageType; floorName: string; northDeg: number; pageNum: number; total: number;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={[styles.row, { alignItems: "center", marginBottom: 4 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageLabel}>Page {pageNum} of {total} — {floorName}</Text>
          <Text style={styles.h3}>{PAGE_LABELS[pageType]}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.small, { color: C.text3 }]}>True North</Text>
          <Text style={[styles.body, { color: C.gold, fontFamily: "Helvetica-Bold" }]}>
            {northDeg.toFixed(1)}°
          </Text>
        </View>
      </View>
      <View style={styles.goldBarThin} />
    </View>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────
function CoverPage({ data }: { data: ReportDocumentData }) {
  const total = totalPages(data.floors);
  return (
    <Page size="A4" style={[styles.page, { paddingTop: 0, paddingHorizontal: 0 }]}>
      {/* Gold header */}
      <View style={{ height: 8, backgroundColor: C.gold }} />

      <View style={{ padding: 44, flex: 1 }}>
        {/* Logo area */}
        <View style={{ marginBottom: 32 }}>
          <Text style={{ fontSize: 11, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 2, textTransform: "uppercase" }}>
            vastu@home
          </Text>
          <Text style={{ fontSize: 8, color: C.text3, fontFamily: "Helvetica", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>
            Vastu Shastra Analysis Platform
          </Text>
        </View>

        {/* Report title */}
        <View style={{ marginBottom: 28 }}>
          <Text style={styles.h1}>{data.reportName}</Text>
          <View style={{ height: 2, backgroundColor: C.gold, width: 60, marginTop: 6 }} />
        </View>

        {/* Project details card */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Project Details</Text>
          {[
            ["Project",   data.projectName],
            ["Client",    data.clientName],
            ["Address",   data.propertyAddress || "—"],
            ["North",     `${data.northDeg.toFixed(1)}° True North`],
            ["Floors",    `${data.floors.length} floor${data.floors.length > 1 ? "s" : ""}`],
            ["Pages",     `${total} pages`],
          ].map(([k, v]) => (
            <View key={k} style={[styles.row, { marginBottom: 5 }]}>
              <Text style={[styles.small, { width: 80, color: C.text3 }]}>{k}</Text>
              <Text style={[styles.body, { flex: 1 }]}>{v}</Text>
            </View>
          ))}
        </View>

        {/* Prepared by */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Prepared By</Text>
          <View style={[styles.row, { marginBottom: 5 }]}>
            <Text style={[styles.small, { width: 80, color: C.text3 }]}>Consultant</Text>
            <Text style={[styles.body, { flex: 1 }]}>{data.consultantName}</Text>
          </View>
          <View style={[styles.row, { marginBottom: 5 }]}>
            <Text style={[styles.small, { width: 80, color: C.text3 }]}>Date</Text>
            <Text style={[styles.body, { flex: 1 }]}>{data.date}</Text>
          </View>
        </View>

        {/* Branding placeholder */}
        <View style={{ borderWidth: 1, borderColor: C.border, borderStyle: "dashed", borderRadius: 4, padding: 14, alignItems: "center" }}>
          <Text style={[styles.small, { color: C.text3, textAlign: "center" }]}>
            [Consultant Logo — Upload in Settings]
          </Text>
        </View>
      </View>

      {/* Gold footer bar */}
      <View style={{ height: 6, backgroundColor: C.gold }} />
      <PageFooter label="Cover" page={1} total={total} />
    </Page>
  );
}

// ── Table of Contents page ────────────────────────────────────────────────────
function TableOfContentsPage({ data }: { data: ReportDocumentData }) {
  const total = totalPages(data.floors);
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.h2}>Table of Contents</Text>
          <View style={styles.goldBarThin} />
        </View>

        {/* Fixed pages */}
        {[["Cover Page", "1"], ["Table of Contents", "2"]].map(([label, pg]) => (
          <View key={label} style={[styles.row, { paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.border, alignItems: "center" }]}>
            <Text style={[styles.body, { flex: 1 }]}>{label}</Text>
            <Text style={[styles.small, { color: C.text3, width: 20, textAlign: "right" }]}>{pg}</Text>
          </View>
        ))}

        <View style={{ height: 8 }} />

        {/* Floor pages */}
        {data.floors.map((floor, fi) => {
          if (floor.selectedPages.length === 0) return null;
          return (
            <View key={floor.floorId}>
              {/* Floor heading row */}
              <View style={[styles.row, { paddingVertical: 5, marginTop: 6, borderBottomWidth: 1, borderBottomColor: C.gold }]}>
                <Text style={[styles.small, { flex: 1, color: C.gold, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase" }]}>
                  {floor.floorName}
                </Text>
              </View>
              {floor.selectedPages.map((page) => {
                const pn = pageNumber(data.floors, fi, page);
                return (
                  <View key={`${floor.floorId}-${page}`} style={[styles.row, { paddingVertical: 4, paddingLeft: 10, borderBottomWidth: 0.5, borderBottomColor: C.border + "80", alignItems: "center" }]}>
                    <View style={{ width: 3, height: 3, backgroundColor: C.border, borderRadius: 1.5, marginRight: 8 }} />
                    <Text style={[styles.small, { flex: 1 }]}>{PAGE_LABELS[page]}</Text>
                    <Text style={[styles.small, { color: C.text3, width: 24, textAlign: "right" }]}>{pn}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
      <PageFooter label="Table of Contents" page={2} total={total} />
    </Page>
  );
}

// ── Generic floor plan image page (pages 3–10, 13) ───────────────────────────
// Handles all visual overlay pages: plan-only through 8zone-lines
function FloorImagePage({ floor, pageType, pageNum, total }: {
  floor: FloorPDFData; pageType: ReportPageType; pageNum: number; total: number;
}) {
  const notes = floor.pageNotes[pageType];
  const image = getSnapshotForPageType(pageType, floor.snapshots, floor.floorPlanImageBase64);
  const isCutsPage = pageType === "plan-cuts-only";
  const meta = REPORT_PAGE_META[pageType];

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType={pageType} floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        {/* Description sub-line */}
        <Text style={[styles.small, { color: C.text3, marginBottom: 8 }]}>{meta.description}</Text>

        {/* Empty state for cuts page when no cuts */}
        {isCutsPage && !floor.hasCuts ? (
          <View style={[styles.card, { alignItems: "center", padding: 32 }]}>
            <Text style={[styles.body, { color: C.text3, textAlign: "center" }]}>
              No cuts marked in this floor plan.
            </Text>
            <Text style={[styles.small, { color: C.text3, textAlign: "center", marginTop: 4 }]}>
              Use the Cut tool in the Canvas to mark cut regions, then regenerate the report.
            </Text>
          </View>
        ) : image ? (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Image src={image} style={{ width: 460, height: 374, objectFit: "contain" }} />
            <Text style={[styles.small, { marginTop: 4, color: C.text3 }]}>
              {floor.floorName} — N: {floor.northDeg.toFixed(1)}° True North
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { alignItems: "center", padding: 40 }]}>
            <Text style={[styles.body, { color: C.text3, textAlign: "center" }]}>
              No floor plan image for {floor.floorName}.{"\n"}
              Import a floor plan image in the Canvas to include visual overlays.
            </Text>
          </View>
        )}

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`${PAGE_LABELS[pageType]} — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── 16-Zone Analysis Table (no status labels) ─────────────────────────────────
function ZoneAnalysisPage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const rows = floor.zoneRows;
  const maxPct = Math.max(...rows.map((r) => r.pct), 10);
  const notes = floor.pageNotes["16-zone"];
  const overlayImage = floor.snapshots.zoneLines16 ?? floor.floorPlanImageBase64;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="16-zone" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        {/* Overlay image — small at top */}
        {overlayImage && (
          <View style={{ marginBottom: 10, alignItems: "center" }}>
            <Image src={overlayImage} style={{ width: 300, height: 244, objectFit: "contain" }} />
            <Text style={[styles.small, { marginTop: 3, color: C.text3 }]}>
              16-zone division overlay — {floor.floorName} — N: {floor.northDeg.toFixed(1)}°
            </Text>
          </View>
        )}

        {/* Zone table header */}
        <View style={[styles.row, { backgroundColor: C.bg2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 3, marginBottom: 2 }]}>
          <Text style={[styles.small, { width: 40, fontFamily: "Helvetica-Bold", color: C.text }]}>Zone</Text>
          <Text style={[styles.small, { flex: 1, fontFamily: "Helvetica-Bold", color: C.text }]}>Name</Text>
          <Text style={[styles.small, { width: 50, textAlign: "right", fontFamily: "Helvetica-Bold", color: C.text }]}>Area %</Text>
          <Text style={[styles.small, { width: 50, fontFamily: "Helvetica-Bold", color: C.text }]}>Cut</Text>
          <Text style={[styles.small, { width: 64, textAlign: "right", fontFamily: "Helvetica-Bold", color: C.text }]}>Bar</Text>
        </View>

        {rows.map(({ zone, pct, hasCut, cutPct }) => {
          const barW = Math.max((pct / maxPct) * 60, 1);
          return (
            <View key={zone.shortName} style={[styles.row, { paddingHorizontal: 6, paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.border, alignItems: "center" }]}>
              {/* Color swatch + short name */}
              <View style={[styles.row, { width: 40, alignItems: "center", gap: 3 }]}>
                <View style={{ width: 4, height: 12, backgroundColor: zone.color, borderRadius: 1 }} />
                <Text style={[styles.small, { fontFamily: "Helvetica-Bold" }]}>{zone.shortName}</Text>
              </View>
              <Text style={[styles.small, { flex: 1 }]}>{zone.name}</Text>
              <Text style={[styles.small, { width: 50, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{pct.toFixed(1)}%</Text>
              <Text style={[styles.small, { width: 50, color: hasCut ? C.sevSev : C.text3 }]}>
                {hasCut ? `✂ ${cutPct.toFixed(0)}%` : "—"}
              </Text>
              {/* Mini bar */}
              <View style={{ width: 64, height: 6, backgroundColor: "#e8e0d0", borderRadius: 2 }}>
                <View style={{ width: barW, height: 6, backgroundColor: zone.color, borderRadius: 2, opacity: 0.85 }} />
              </View>
            </View>
          );
        })}

        {/* Ideal reference note */}
        <View style={[styles.row, { marginTop: 8, alignItems: "center", gap: 6 }]}>
          <View style={{ width: 16, height: 2, backgroundColor: C.gold }} />
          <Text style={[styles.small, { color: C.text3 }]}>Ideal = 6.25% per zone (360° ÷ 16 = 22.5° each)</Text>
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`16-Zone Analysis — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── 16-Zone Bar Graph ──────────────────────────────────────────────────────────
function BarGraph16Page({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const rows = floor.zoneRows;
  const chartW = 468;
  const chartH = 160;
  const barW = chartW / rows.length;
  const maxPct = Math.max(...rows.map((r) => r.pct), 10);
  const idealY = chartH - (6.25 / maxPct) * chartH;
  const notes = floor.pageNotes["bar-graph-16"];

  return (
    <Page size="A4" style={styles.pageWide}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="bar-graph-16" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        <Text style={[styles.body, { color: C.text3, marginBottom: 10 }]}>
          Zone area distribution across all 16 Shakti Chakra zones. Dashed line marks the ideal 6.25% per zone.
        </Text>

        <Svg width={chartW} height={chartH + 22}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = chartH - (pct / 100) * chartH;
            return <G key={pct}><Line x1={0} y1={y} x2={chartW} y2={y} stroke="#e0d8c8" strokeWidth={0.5} /></G>;
          })}

          {/* Bars */}
          {rows.map(({ zone, pct }, i) => {
            const barH = Math.max((pct / maxPct) * chartH, 2);
            const x = i * barW;
            const y = chartH - barH;
            return (
              <G key={zone.shortName}>
                <Rect x={x + 2} y={y} width={barW - 4} height={barH} fill={zone.color} opacity={0.85} rx={1} />
              </G>
            );
          })}

          {/* Ideal dashed line at 6.25% */}
          <Line x1={0} y1={idealY} x2={chartW} y2={idealY} stroke={C.gold} strokeWidth={1.2} strokeDasharray="5 3" />
        </Svg>

        {/* Zone label row */}
        <View style={[styles.row, { width: chartW }]}>
          {rows.map(({ zone }) => (
            <Text key={zone.shortName} style={{ width: barW, textAlign: "center", fontSize: 5.5, color: C.text3 }}>
              {zone.shortName}
            </Text>
          ))}
        </View>

        {/* Legend */}
        <View style={[styles.row, { marginTop: 10, gap: 16, alignItems: "center" }]}>
          <View style={[styles.row, { alignItems: "center", gap: 4 }]}>
            <View style={{ width: 16, height: 2, backgroundColor: C.gold }} />
            <Text style={styles.small}>Ideal 6.25%</Text>
          </View>
        </View>

        {/* Data table */}
        <View style={[styles.separator, { marginTop: 10 }]} />
        <View style={[styles.row, { flexWrap: "wrap", gap: 4, marginTop: 4 }]}>
          {rows.map(({ zone, pct }) => (
            <View key={zone.shortName} style={[styles.row, { width: 56, alignItems: "center", gap: 3, paddingVertical: 2 }]}>
              <View style={{ width: 4, height: 10, backgroundColor: zone.color, borderRadius: 1 }} />
              <Text style={[styles.small, { width: 20, fontFamily: "Helvetica-Bold" }]}>{zone.shortName}</Text>
              <Text style={[styles.small, { fontFamily: "Helvetica-Bold" }]}>{pct.toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`16-Zone Bar Graph — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── 8-Zone Analysis Table (no status labels) ──────────────────────────────────
const EIGHT_ZONES_DEF: Array<{ label: string; shortLabel: string; indices: [number, number]; color: string }> = [
  { label: "North",     shortLabel: "N",  indices: [15, 0], color: "#4a90c4" },
  { label: "Northeast", shortLabel: "NE", indices: [1, 2],  color: "#6ec6e8" },
  { label: "East",      shortLabel: "E",  indices: [3, 4],  color: "#5aaa6a" },
  { label: "Southeast", shortLabel: "SE", indices: [5, 6],  color: "#e8c840" },
  { label: "South",     shortLabel: "S",  indices: [7, 8],  color: "#e87820" },
  { label: "Southwest", shortLabel: "SW", indices: [9, 10], color: "#c84040" },
  { label: "West",      shortLabel: "W",  indices: [11,12], color: "#8a70e8" },
  { label: "Northwest", shortLabel: "NW", indices: [13,14], color: "#a8d88a" },
];

function EightZonePage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const rows = floor.zoneRows;
  const aggregated = EIGHT_ZONES_DEF.map(({ label, shortLabel, indices, color }) => {
    const pct = indices.reduce((sum, i) => sum + (rows[i]?.pct ?? 0), 0);
    return { label, shortLabel, pct, color };
  });
  const maxPct = Math.max(...aggregated.map((r) => r.pct), 15);
  const notes = floor.pageNotes["8-zone"];
  const overlayImage = floor.snapshots.zoneLines8 ?? floor.floorPlanImageBase64;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="8-zone" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        {overlayImage && (
          <View style={{ marginBottom: 10, alignItems: "center" }}>
            <Image src={overlayImage} style={{ width: 280, height: 228, objectFit: "contain" }} />
            <Text style={[styles.small, { marginTop: 3, color: C.text3 }]}>
              8-direction overlay — {floor.floorName} — N: {floor.northDeg.toFixed(1)}°
            </Text>
          </View>
        )}

        <Text style={[styles.body, { color: C.text3, marginBottom: 8 }]}>
          8-direction aggregated zone distribution. Ideal per direction: 12.5% (2 × 6.25%).
        </Text>

        {aggregated.map(({ label, shortLabel, pct, color }) => {
          const barW = Math.max((pct / maxPct) * 360, 2);
          return (
            <View key={shortLabel} style={[styles.row, { alignItems: "center", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.border }]}>
              <View style={{ width: 5, height: 22, backgroundColor: color, borderRadius: 2, marginRight: 8 }} />
              <Text style={[styles.body, { width: 90, fontFamily: "Helvetica-Bold" }]}>{label}</Text>
              <Text style={[styles.small, { width: 28, color: C.text3 }]}>{shortLabel}</Text>
              <View style={{ flex: 1, height: 10, backgroundColor: "#e8e0d0", borderRadius: 3, marginRight: 8 }}>
                <View style={{ width: barW, height: 10, backgroundColor: color, borderRadius: 3, opacity: 0.85 }} />
              </View>
              <Text style={[styles.body, { width: 42, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{pct.toFixed(1)}%</Text>
            </View>
          );
        })}

        <View style={[styles.row, { marginTop: 8, alignItems: "center", gap: 6 }]}>
          <View style={{ width: 16, height: 2, backgroundColor: C.gold }} />
          <Text style={[styles.small, { color: C.text3 }]}>Ideal = 12.5% per 8-direction zone</Text>
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`8-Zone Analysis — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── 8-Zone Bar Graph ───────────────────────────────────────────────────────────
function BarGraph8Page({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const rows = floor.zoneRows;
  const aggregated = EIGHT_ZONES_DEF.map(({ label, shortLabel, indices, color }) => {
    const pct = indices.reduce((sum, i) => sum + (rows[i]?.pct ?? 0), 0);
    return { label, shortLabel, pct, color };
  });
  const chartW = 468;
  const chartH = 160;
  const barW = chartW / aggregated.length;
  const maxPct = Math.max(...aggregated.map((r) => r.pct), 15);
  const idealY = chartH - (12.5 / maxPct) * chartH;
  const notes = floor.pageNotes["bar-graph-8"];

  return (
    <Page size="A4" style={styles.pageWide}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="bar-graph-8" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        <Text style={[styles.body, { color: C.text3, marginBottom: 10 }]}>
          8-direction zone area distribution. Dashed line marks the ideal 12.5% per direction.
        </Text>

        <Svg width={chartW} height={chartH + 22}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = chartH - (pct / 100) * chartH;
            return <G key={pct}><Line x1={0} y1={y} x2={chartW} y2={y} stroke="#e0d8c8" strokeWidth={0.5} /></G>;
          })}

          {/* Bars */}
          {aggregated.map(({ shortLabel, pct, color }, i) => {
            const barH = Math.max((pct / maxPct) * chartH, 2);
            const x = i * barW;
            const y = chartH - barH;
            return (
              <G key={shortLabel}>
                <Rect x={x + 4} y={y} width={barW - 8} height={barH} fill={color} opacity={0.85} rx={2} />
              </G>
            );
          })}

          {/* Ideal dashed line at 12.5% */}
          <Line x1={0} y1={idealY} x2={chartW} y2={idealY} stroke={C.gold} strokeWidth={1.2} strokeDasharray="5 3" />
        </Svg>

        {/* Direction labels */}
        <View style={[styles.row, { width: chartW }]}>
          {aggregated.map(({ shortLabel }) => (
            <Text key={shortLabel} style={{ width: barW, textAlign: "center", fontSize: 7, color: C.text3, fontFamily: "Helvetica-Bold" }}>
              {shortLabel}
            </Text>
          ))}
        </View>

        <View style={[styles.row, { marginTop: 10, gap: 16, alignItems: "center" }]}>
          <View style={[styles.row, { alignItems: "center", gap: 4 }]}>
            <View style={{ width: 16, height: 2, backgroundColor: C.gold }} />
            <Text style={styles.small}>Ideal 12.5%</Text>
          </View>
        </View>

        {/* Data table */}
        <View style={[styles.separator, { marginTop: 10 }]} />
        <View style={[styles.row, { flexWrap: "wrap", gap: 8, marginTop: 4 }]}>
          {aggregated.map(({ label, shortLabel, pct, color }) => (
            <View key={shortLabel} style={[styles.row, { width: 100, alignItems: "center", gap: 4, paddingVertical: 2 }]}>
              <View style={{ width: 6, height: 10, backgroundColor: color, borderRadius: 1 }} />
              <Text style={[styles.small, { width: 26, fontFamily: "Helvetica-Bold" }]}>{shortLabel}</Text>
              <Text style={[styles.small]}>{pct.toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`8-Zone Bar Graph — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── Cut Analysis page ─────────────────────────────────────────────────────────
function CutAnalysisPage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const cuts = floor.cutAnalysis;
  const notes = floor.pageNotes["cut-analysis"];
  const SEV_C = { mild: C.sevMild, moderate: C.sevMod, severe: C.sevSev };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="cut-analysis" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        {cuts.length === 0 ? (
          <View style={[styles.card, { alignItems: "center", padding: 20 }]}>
            <Text style={[styles.body, { color: C.text3 }]}>No cuts present in this floor plan.</Text>
          </View>
        ) : (
          <>
            {/* Summary stats */}
            <View style={[styles.row, { gap: 10, marginBottom: 12 }]}>
              {[
                ["Total Cuts", `${cuts.length}`],
                ["Mild",     `${cuts.filter(c => c.severity === "mild").length}`],
                ["Moderate", `${cuts.filter(c => c.severity === "moderate").length}`],
                ["Severe",   `${cuts.filter(c => c.severity === "severe").length}`],
              ].map(([k, v]) => (
                <View key={k} style={[styles.card, { flex: 1, alignItems: "center", padding: 8 }]}>
                  <Text style={[styles.h2, { fontSize: 18, color: C.gold }]}>{v}</Text>
                  <Text style={styles.small}>{k}</Text>
                </View>
              ))}
            </View>

            {/* Cut table header */}
            <View style={[styles.row, { backgroundColor: C.bg2, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 3, marginBottom: 2 }]}>
              <Text style={[styles.small, { width: 50, fontFamily: "Helvetica-Bold" }]}>Cut</Text>
              <Text style={[styles.small, { width: 40, fontFamily: "Helvetica-Bold" }]}>Zone</Text>
              <Text style={[styles.small, { width: 60, fontFamily: "Helvetica-Bold", textAlign: "right" }]}>% of Floor</Text>
              <Text style={[styles.small, { width: 60, fontFamily: "Helvetica-Bold", textAlign: "right" }]}>% Combined</Text>
              <Text style={[styles.small, { flex: 1, fontFamily: "Helvetica-Bold" }]}>Severity</Text>
            </View>

            {cuts.map((cut) => {
              const sc = SEV_C[cut.severity];
              return (
                <View key={cut.id} style={[styles.row, { paddingHorizontal: 6, paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border, alignItems: "center" }]}>
                  <Text style={[styles.small, { width: 50, fontFamily: "Helvetica-Bold" }]}>{cut.label}</Text>
                  <View style={[styles.badge, { width: 40, backgroundColor: C.bg2 }]}>
                    <Text style={[styles.small, { color: C.gold }]}>{cut.primaryZone}</Text>
                  </View>
                  <Text style={[styles.small, { width: 60, textAlign: "right", color: sc, fontFamily: "Helvetica-Bold" }]}>{cut.pctOfFloor.toFixed(1)}%</Text>
                  <Text style={[styles.small, { width: 60, textAlign: "right" }]}>{cut.pctOfCombined.toFixed(1)}%</Text>
                  <View style={[styles.badge, { flex: 1, backgroundColor: sc + "22" }]}>
                    <Text style={[styles.small, { color: sc, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }]}>{cut.severity}</Text>
                  </View>
                </View>
              );
            })}

            {/* Severity legend */}
            <View style={[styles.row, { marginTop: 8, gap: 12 }]}>
              {([["mild", C.sevMild, "<5% of floor"], ["moderate", C.sevMod, "5–15% of floor"], ["severe", C.sevSev, ">15% of floor"]] as const).map(([s, c, r]) => (
                <View key={s} style={[styles.row, { alignItems: "center", gap: 4 }]}>
                  <View style={{ width: 8, height: 8, backgroundColor: c, borderRadius: 1, opacity: 0.8 }} />
                  <Text style={styles.small}>{s} ({r})</Text>
                </View>
              ))}
            </View>

            <View style={[styles.card, { marginTop: 12, backgroundColor: "#fff8ee", borderColor: C.gold }]}>
              <Text style={[styles.small, { fontFamily: "Helvetica-Bold", marginBottom: 3 }]}>Calculation Method</Text>
              <Text style={styles.small}>
                Cut severity = (cut area within zone / total floor area) × 100%.
                Mild: &lt;5%, Moderate: 5–15%, Severe: &gt;15% of floor plan area.
              </Text>
            </View>
          </>
        )}

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`Cut Analysis — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── Panchabhuta (5 Elements) page ─────────────────────────────────────────────
const PANCHABHUTA_DEF = [
  {
    key: "fire"  as const,
    label: "Fire — Agni",
    sanskrit: "अग्नि",
    color: "#e84020",
    bg: "#fff2f0",
    zones: ["ESE", "SE", "SSE"],
    governs: "Energy, cash flow, cooking, electrical systems",
    element: "Transformative force — enables digestion, financial activity and warmth",
    remedy: "Keep SE zone active with kitchen or electrical room. Avoid water bodies.",
  },
  {
    key: "earth" as const,
    label: "Earth — Prithvi",
    sanskrit: "पृथ्वी",
    color: "#9a6010",
    bg: "#fffaf0",
    zones: ["S", "SSW", "SW", "WSW"],
    governs: "Stability, savings, relationships, ancestral wealth",
    element: "Grounding force — provides foundation, weight and permanence",
    remedy: "Keep SW/S heavy and solid. Master bedroom and locker room ideal. Avoid open spaces.",
  },
  {
    key: "water" as const,
    label: "Water — Jal",
    sanskrit: "जल",
    color: "#1860c0",
    bg: "#f0f4ff",
    zones: ["N", "NNE", "W"],
    governs: "Wealth, career, health, learning, prosperity",
    element: "Flowing force — enables growth, career opportunities and financial flow",
    remedy: "Keep N open and clutter-free. Water features in N or NE are highly beneficial.",
  },
  {
    key: "air"   as const,
    label: "Air — Vayu",
    sanskrit: "वायु",
    color: "#38a850",
    bg: "#f0fff4",
    zones: ["ENE", "E", "WNW", "NW", "NNW"],
    governs: "Networking, travel, social connections, recreation",
    element: "Mobile force — facilitates communication, movement and new experiences",
    remedy: "Keep E and NW well-ventilated and airy. Avoid heavy walls blocking sunrise.",
  },
  {
    key: "space" as const,
    label: "Space — Akasha",
    sanskrit: "आकाश",
    color: "#7040b8",
    bg: "#f8f0ff",
    zones: ["NE"],
    governs: "Wisdom, spirituality, clarity, mental peace",
    element: "Expansive force — the most sattvic zone; gateway to higher consciousness",
    remedy: "NE cut is most critical. Keep completely open and sacred. Pooja room ideal.",
  },
] as const;

function PanchabhutaPage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const notes = floor.pageNotes["panchabhuta"];
  const overlayImage = floor.snapshots.panchabhuta ?? floor.floorPlanImageBase64;

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="panchabhuta" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        <Text style={[styles.body, { color: C.text3, marginBottom: 10 }]}>
          The Panchabhuta (five elements) governs the energy quality of each zone. Every zone belongs to one of five elements, each with distinct characteristics and ideal uses.
        </Text>

        {overlayImage && (
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <Image src={overlayImage} style={{ width: 300, height: 244, objectFit: "contain" }} />
            <Text style={[styles.small, { marginTop: 3, color: C.text3 }]}>
              Panchabhuta element zones — {floor.floorName} — N: {floor.northDeg.toFixed(1)}°
            </Text>
          </View>
        )}

        {PANCHABHUTA_DEF.map((el) => (
          <View key={el.key} style={[styles.row, { marginBottom: 6, borderWidth: 1, borderColor: el.color + "44", borderRadius: 4, overflow: "hidden" }]}>
            <View style={{ width: 5, backgroundColor: el.color }} />
            <View style={{ flex: 1, padding: 7, backgroundColor: el.bg }}>
              <View style={[styles.row, { alignItems: "center", marginBottom: 3, gap: 6 }]}>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: el.color }}>{el.label}</Text>
                <Text style={{ fontSize: 8, fontFamily: "Helvetica", color: "#8a7a60" }}>({el.sanskrit})</Text>
                <View style={[styles.row, { gap: 2, flexWrap: "wrap" }]}>
                  {el.zones.map((z) => (
                    <View key={z} style={[styles.badge, { backgroundColor: el.color + "22" }]}>
                      <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: el.color }}>{z}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Text style={[styles.small, { marginBottom: 2 }]}>{el.governs}</Text>
              <Text style={[styles.small, { color: "#8a7a60", fontStyle: "italic", marginBottom: 2 }]}>{el.element}</Text>
              <Text style={[styles.small, { color: "#8a7a60" }]}>Remedy: {el.remedy}</Text>
            </View>
          </View>
        ))}

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`Panchabhuta — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── AI Summary placeholder ────────────────────────────────────────────────────
function AISummaryPage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const notes = floor.pageNotes["ai-summary"];
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="ai-summary" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        <View style={[styles.card, { padding: 20, marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>AI Analysis Summary</Text>
          <Text style={[styles.body, { color: C.text3, marginBottom: 12 }]}>
            {floor.floorName} — {floor.northDeg.toFixed(1)}° True North
          </Text>
          <View style={{ borderWidth: 1, borderColor: C.border, borderStyle: "dashed", borderRadius: 4, padding: 24, alignItems: "center" }}>
            <Text style={[styles.small, { color: C.text3, textAlign: "center", marginBottom: 4 }]}>
              AI-generated Vastu analysis summary
            </Text>
            <Text style={[styles.small, { color: C.text3, textAlign: "center" }]}>
              This section will be populated with AI-generated insights once the AI Summary feature is enabled.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Key Observations</Text>
          {[1, 2, 3].map((n) => (
            <View key={n} style={[styles.row, { marginBottom: 8, alignItems: "flex-start", gap: 8 }]}>
              <View style={{ width: 16, height: 16, backgroundColor: C.bg2, borderWidth: 1, borderColor: C.border, borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 7, color: C.text3 }}>{n}</Text>
              </View>
              <View style={{ flex: 1, height: 1, backgroundColor: C.border, marginTop: 7 }} />
            </View>
          ))}
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`AI Summary — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── Consultant Summary placeholder ────────────────────────────────────────────
function ConsultantSummaryPage({ floor, pageNum, total }: { floor: FloorPDFData; pageNum: number; total: number }) {
  const notes = floor.pageNotes["consultant-summary"];
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <FloorPageHeader pageType="consultant-summary" floorName={floor.floorName} northDeg={floor.northDeg} pageNum={pageNum} total={total} />

        <View style={[styles.card, { padding: 20, marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Consultant Recommendations</Text>
          <Text style={[styles.body, { color: C.text3, marginBottom: 12 }]}>
            {floor.floorName} — Prepared by Consultant
          </Text>
          <View style={{ borderWidth: 1, borderColor: C.border, borderStyle: "dashed", borderRadius: 4, padding: 24, alignItems: "center" }}>
            <Text style={[styles.small, { color: C.text3, textAlign: "center", marginBottom: 4 }]}>
              Consultant notes and remedies
            </Text>
            <Text style={[styles.small, { color: C.text3, textAlign: "center" }]}>
              Add your personalized recommendations, remedy suggestions, and client-specific guidance here.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Recommended Actions</Text>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[styles.row, { marginBottom: 10, alignItems: "flex-start", gap: 8 }]}>
              <View style={{ width: 5, height: 5, backgroundColor: C.gold, borderRadius: 2.5, marginTop: 5 }} />
              <View style={{ flex: 1, height: 1, backgroundColor: C.border, marginTop: 7 }} />
            </View>
          ))}
        </View>

        {notes && (
          <View style={styles.noteBox}>
            <Text style={[styles.small, { color: C.text3, marginBottom: 2 }]}>NOTES</Text>
            <Text style={styles.body}>{notes}</Text>
          </View>
        )}
      </View>
      <PageFooter label={`Consultant Summary — ${floor.floorName}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── Main Document ─────────────────────────────────────────────────────────────
export function VastuReportDocument({ data }: { data: ReportDocumentData }) {
  const total = totalPages(data.floors);

  return (
    <Document
      title={data.reportName}
      author={data.consultantName}
      subject="Vastu Shastra Analysis Report"
      creator="vastu@home"
    >
      {/* Page 1: Cover */}
      <CoverPage data={data} />

      {/* Page 2: Table of Contents */}
      <TableOfContentsPage data={data} />

      {/* Pages 3+: Floor pages in canonical order */}
      {data.floors.map((floor, fi) =>
        floor.selectedPages.map((pageType) => {
          const pn = pageNumber(data.floors, fi, pageType);

          // All visual floor plan pages (including zone-lines views)
          if (
            pageType === "plan-only" ||
            pageType === "plan-with-brahma" ||
            pageType === "plan-with-chakra" ||
            pageType === "plan-perimeter-only" ||
            pageType === "plan-cuts-only" ||
            pageType === "plan-perimeter-cuts" ||
            pageType === "plan-full" ||
            pageType === "16zone-lines" ||
            pageType === "8zone-lines"
          ) {
            return (
              <FloorImagePage
                key={`${floor.floorId}-${pageType}`}
                floor={floor}
                pageType={pageType}
                pageNum={pn}
                total={total}
              />
            );
          }

          switch (pageType) {
            case "16-zone":
              return <ZoneAnalysisPage key={`${floor.floorId}-16zone`} floor={floor} pageNum={pn} total={total} />;
            case "bar-graph-16":
              return <BarGraph16Page key={`${floor.floorId}-bargraph16`} floor={floor} pageNum={pn} total={total} />;
            case "8-zone":
              return <EightZonePage key={`${floor.floorId}-8zone`} floor={floor} pageNum={pn} total={total} />;
            case "bar-graph-8":
              return <BarGraph8Page key={`${floor.floorId}-bargraph8`} floor={floor} pageNum={pn} total={total} />;
            case "cut-analysis":
              return <CutAnalysisPage key={`${floor.floorId}-cuts`} floor={floor} pageNum={pn} total={total} />;
            case "panchabhuta":
              return <PanchabhutaPage key={`${floor.floorId}-panchabhuta`} floor={floor} pageNum={pn} total={total} />;
            case "ai-summary":
              return <AISummaryPage key={`${floor.floorId}-aisummary`} floor={floor} pageNum={pn} total={total} />;
            case "consultant-summary":
              return <ConsultantSummaryPage key={`${floor.floorId}-consultantsummary`} floor={floor} pageNum={pn} total={total} />;
            default:
              return null;
          }
        })
      )}
    </Document>
  );
}

// ── Blob URL → base64 helper (used before PDF generation) ────────────────────
export async function blobUrlToBase64(url: string): Promise<string> {
  try {
    if (url.startsWith("data:")) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// ── Generate and download PDF ─────────────────────────────────────────────────
export async function generateAndDownloadPDF(
  data: ReportDocumentData,
  filename: string
): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<VastuReportDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Generate PDF and return data URL (for storing in report store) ─────────────
export async function generatePDFDataUrl(data: ReportDocumentData): Promise<string> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<VastuReportDocument data={data} />).toBlob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
