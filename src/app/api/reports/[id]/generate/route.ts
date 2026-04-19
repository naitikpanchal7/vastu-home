// src/app/api/reports/[id]/generate/route.ts
// Phase 1: PDF generation is done client-side via @react-pdf/renderer.
// This route is a placeholder for Phase 2 server-side PDF generation.
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO Phase 2: server-side PDF generation using puppeteer or @react-pdf/renderer
  return NextResponse.json({
    status: "ok",
    note: "Phase 1: PDF generation is client-side. Use the Report Builder UI to generate PDFs.",
    reportId: id,
  });
}
