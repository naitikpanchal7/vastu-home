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
import type { ReportPageType, ReportAttachment } from "@/lib/types";
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
  attachments: ReportAttachment[];
}

type ReportPageEntry =
  | { kind: "attachment"; attachment: ReportAttachment; pageNum: number }
  | { kind: "floor"; floor: FloorPDFData; pageType: ReportPageType; pageNum: number };

const SUMMARY_PAGE_TYPES = new Set<ReportPageType>(["ai-summary", "consultant-summary"]);

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

function buildPageEntries(data: ReportDocumentData): ReportPageEntry[] {
  const entries: ReportPageEntry[] = [];
  let pageNum = 3; // 1=cover, 2=toc

  const topAttachments = data.attachments.filter((attachment) => attachment.position === "after-intro");
  const bottomAttachments = data.attachments.filter((attachment) => attachment.position === "before-summary");

  for (const attachment of topAttachments) {
    entries.push({ kind: "attachment", attachment, pageNum });
    pageNum++;
  }

  for (const floor of data.floors) {
    for (const pageType of floor.selectedPages.filter((page) => !SUMMARY_PAGE_TYPES.has(page))) {
      entries.push({ kind: "floor", floor, pageType, pageNum });
      pageNum++;
    }
  }

  for (const attachment of bottomAttachments) {
    entries.push({ kind: "attachment", attachment, pageNum });
    pageNum++;
  }

  for (const floor of data.floors) {
    for (const pageType of floor.selectedPages.filter((page) => SUMMARY_PAGE_TYPES.has(page))) {
      entries.push({ kind: "floor", floor, pageType, pageNum });
      pageNum++;
    }
  }

  return entries;
}

function totalPages(pageEntries: ReportPageEntry[]): number {
  return 2 + pageEntries.length;
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

function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageAttachment(attachment: ReportAttachment): boolean {
  return attachment.mimeType.startsWith("image/");
}

function isTextAttachment(attachment: ReportAttachment): boolean {
  return (
    attachment.mimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/csv"].includes(attachment.mimeType) ||
    /\.(txt|md|csv|json|xml|yml|yaml)$/i.test(attachment.name)
  );
}

function extractTextPreview(dataUrl: string): string {
  try {
    const commaIdx = dataUrl.indexOf(",");
    if (commaIdx < 0) return "";
    const encoded = dataUrl.slice(commaIdx + 1);
    const body = dataUrl.includes(";base64,") ? atob(encoded) : decodeURIComponent(encoded);
    return body.slice(0, 1200);
  } catch {
    return "";
  }
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

function SupplementaryInsertPage({ attachment, pageNum, total }: { attachment: ReportAttachment; pageNum: number; total: number }) {
  const isImage = isImageAttachment(attachment);
  const isText = isTextAttachment(attachment);
  const textPreview = isText ? extractTextPreview(attachment.dataUrl) : "";

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <View style={{ marginBottom: 14 }}>
          <View style={[styles.row, { alignItems: "center", marginBottom: 4 }]}> 
            <View style={{ flex: 1 }}>
              <Text style={styles.pageLabel}>Page {pageNum} of {total} — Supplementary Insert</Text>
              <Text style={styles.h3}>Inserted File</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.small, { color: C.text3 }]}>Placement</Text>
              <Text style={[styles.body, { color: C.gold, fontFamily: "Helvetica-Bold" }]}> 
                {attachment.position === "after-intro" ? "After Intro" : "Before Summary"}
              </Text>
            </View>
          </View>
          <View style={styles.goldBarThin} />
        </View>

        <View style={[styles.card, { marginBottom: 10 }]}> 
          <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Attachment Details</Text>
          {[
            ["File", attachment.name],
            ["Type", attachment.mimeType || "unknown"],
            ["Size", formatFileSize(attachment.sizeBytes)],
            ["Placement", attachment.position === "after-intro" ? "After Intro" : "Before Summary"],
          ].map(([k, v]) => (
            <View key={k} style={[styles.row, { marginBottom: 5 }]}> 
              <Text style={[styles.small, { width: 80, color: C.text3 }]}>{k}</Text>
              <Text style={[styles.body, { flex: 1 }]}>{v}</Text>
            </View>
          ))}
        </View>

        {isImage ? (
          <View style={{ alignItems: "center", marginBottom: 8 }}>
            <Image src={attachment.dataUrl} style={{ width: 460, height: 360, objectFit: "contain" }} />
          </View>
        ) : isText && textPreview ? (
          <View style={[styles.card, { padding: 12, backgroundColor: "#fffdf8" }]}> 
            <Text style={[styles.small, { fontFamily: "Courier", color: C.text2, lineHeight: 1.35 }]}> 
              {textPreview}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { padding: 24, alignItems: "center" }]}> 
            <Text style={[styles.body, { color: C.text3, textAlign: "center", marginBottom: 6 }]}> 
              Supplementary file inserted into the report.
            </Text>
            <Text style={[styles.small, { color: C.text3, textAlign: "center" }]}> 
              This file type is shown as a document insert page.
            </Text>
          </View>
        )}
      </View>
      <PageFooter label={`Supplementary Insert — ${attachment.name}`} page={pageNum} total={total} />
    </Page>
  );
}

// ── Cover page ────────────────────────────────────────────────────────────────
function CoverPage({ data }: { data: ReportDocumentData }) {
  const pageEntries = buildPageEntries(data);
  const total = totalPages(pageEntries);
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
            ["Scope",     data.floors.length === 1 ? data.floors[0].floorName : `${data.floors.length} floors`],
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
  const pageEntries = buildPageEntries(data);
  const total = totalPages(pageEntries);
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.goldBar} />
      <View style={{ flex: 1, paddingTop: 10 }}>
        <View style={{ marginBottom: 14 }}>
          <Text style={styles.h2}>Table of Contents</Text>
          <View style={styles.goldBarThin} />
        </View>

        {/* Fixed pages */}
        {[ ["Cover Page", "1"], ["Table of Contents", "2"] ].map(([label, pg]) => (
          <View key={label} style={[styles.row, { paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.border, alignItems: "center" }]}>
            <Text style={[styles.body, { flex: 1 }]}>{label}</Text>
            <Text style={[styles.small, { color: C.text3, width: 20, textAlign: "right" }]}>{pg}</Text>
          </View>
        ))}

        <View style={{ height: 8 }} />

        {/* All report pages in final order */}
        {pageEntries.map((entry) => {
          if (entry.kind === "attachment") {
            return (
              <View key={entry.attachment.id} style={[styles.row, { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border + "80", alignItems: "center" }]}> 
                <View style={{ width: 3, height: 3, backgroundColor: entry.attachment.position === "after-intro" ? C.gold : C.sevMod, borderRadius: 1.5, marginRight: 8 }} />
                <Text style={[styles.small, { flex: 1 }]}>Supplementary Insert · {entry.attachment.name}</Text>
                <Text style={[styles.small, { color: C.text3, width: 24, textAlign: "right" }]}>{entry.pageNum}</Text>
              </View>
            );
          }

          return (
            <View key={`${entry.floor.floorId}-${entry.pageType}`} style={[styles.row, { paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: C.border + "80", alignItems: "center" }]}> 
              <View style={{ width: 3, height: 3, backgroundColor: C.border, borderRadius: 1.5, marginRight: 8 }} />
              <Text style={[styles.small, { flex: 1 }]}>{PAGE_LABELS[entry.pageType]} · {entry.floor.floorName}</Text>
              <Text style={[styles.small, { color: C.text3, width: 24, textAlign: "right" }]}>{entry.pageNum}</Text>
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
    label: "Fire",
    sanskrit: "अग्नि",
    color: "#e84020",
    zones: ["ESE", "SE", "SSE"],
  },
  {
    key: "earth" as const,
    label: "Earth",
    sanskrit: "पृथ्वी",
    color: "#9a6010",
    zones: ["S", "SSW", "SW", "WSW"],
  },
  {
    key: "water" as const,
    label: "Water",
    sanskrit: "जल",
    color: "#1860c0",
    zones: ["N", "NNE", "W"],
  },
  {
    key: "air"   as const,
    label: "Air",
    sanskrit: "वायु",
    color: "#38a850",
    zones: ["ENE", "E", "WNW", "NW", "NNW"],
  },
  {
    key: "space" as const,
    label: "Space",
    sanskrit: "आकाश",
    color: "#7040b8",
    zones: ["NE"],
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
          Color key for the Panchabhuta zones. Red = Fire (Agni).
        </Text>

        <View style={[styles.row, { flexWrap: "wrap", gap: 8, marginBottom: 10 }]}> 
          {PANCHABHUTA_DEF.map((el) => (
            <View key={el.key} style={[styles.row, { alignItems: "center", gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1, borderColor: el.color + "33", borderRadius: 999, backgroundColor: el.color + "10" }]}> 
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: el.color }} />
              <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: el.color }}>{el.label}</Text>
            </View>
          ))}
        </View>

        {overlayImage && (
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <Image src={overlayImage} style={{ width: 300, height: 244, objectFit: "contain" }} />
            <Text style={[styles.small, { marginTop: 3, color: C.text3 }]}>
              Panchabhuta element zones — {floor.floorName} — N: {floor.northDeg.toFixed(1)}°
            </Text>
          </View>
        )}

        <View style={[styles.row, { flexWrap: "wrap", gap: 6, marginBottom: 2 }]}> 
          {PANCHABHUTA_DEF.map((el) => (
            <View key={el.key} style={{ width: "48%", borderWidth: 1, borderColor: el.color + "44", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
              <View style={[styles.row, { alignItems: "stretch" }]}> 
                <View style={{ width: 6, backgroundColor: el.color }} />
                <View style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 8, backgroundColor: el.color + "08" }}>
                  <View style={[styles.row, { alignItems: "center", justifyContent: "space-between", marginBottom: 4 }]}> 
                    <View style={[styles.row, { alignItems: "center", gap: 6 }]}> 
                      <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: el.color }}>{el.label}</Text>
                    </View>
                  </View>
                  <View style={[styles.row, { gap: 4, flexWrap: "wrap" }]}> 
                    {el.zones.map((z) => (
                      <View key={z} style={[styles.badge, { backgroundColor: el.color + "1a" }]}> 
                        <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: el.color }}>{z}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
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
  const pageEntries = buildPageEntries(data);
  const total = totalPages(pageEntries);

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

      {/* Pages 3+: Full report in final order */}
      {pageEntries.map((entry) => {
        if (entry.kind === "attachment") {
          return (
            <SupplementaryInsertPage
              key={`attachment-${entry.attachment.id}`}
              attachment={entry.attachment}
              pageNum={entry.pageNum}
              total={total}
            />
          );
        }

        const { floor, pageType, pageNum } = entry;

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
              pageNum={pageNum}
              total={total}
            />
          );
        }

        switch (pageType) {
          case "16-zone":
            return <ZoneAnalysisPage key={`${floor.floorId}-16zone`} floor={floor} pageNum={pageNum} total={total} />;
          case "bar-graph-16":
            return <BarGraph16Page key={`${floor.floorId}-bargraph16`} floor={floor} pageNum={pageNum} total={total} />;
          case "8-zone":
            return <EightZonePage key={`${floor.floorId}-8zone`} floor={floor} pageNum={pageNum} total={total} />;
          case "bar-graph-8":
            return <BarGraph8Page key={`${floor.floorId}-bargraph8`} floor={floor} pageNum={pageNum} total={total} />;
          case "cut-analysis":
            return <CutAnalysisPage key={`${floor.floorId}-cuts`} floor={floor} pageNum={pageNum} total={total} />;
          case "panchabhuta":
            return <PanchabhutaPage key={`${floor.floorId}-panchabhuta`} floor={floor} pageNum={pageNum} total={total} />;
          case "ai-summary":
            return <AISummaryPage key={`${floor.floorId}-aisummary`} floor={floor} pageNum={pageNum} total={total} />;
          case "consultant-summary":
            return <ConsultantSummaryPage key={`${floor.floorId}-consultantsummary`} floor={floor} pageNum={pageNum} total={total} />;
          default:
            return null;
        }
      })}
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
