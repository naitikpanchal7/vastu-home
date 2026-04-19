// src/app/api/reports/route.ts
// Phase 1: Reports are managed client-side via Zustand + localStorage.
// These routes are stubs for Phase 2 Supabase persistence.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  // TODO Phase 2: query Supabase reports table filtered by projectId + auth user
  return NextResponse.json({ data: [], status: "ok", note: "Phase 1: reports stored client-side" });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // TODO Phase 2: insert into Supabase reports table
  return NextResponse.json({ data: { id: `report-${Date.now()}`, ...body }, status: "ok" });
}
