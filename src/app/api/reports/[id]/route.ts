// src/app/api/reports/[id]/route.ts
// Phase 1: stub routes — actual report data lives in Zustand + localStorage.
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO Phase 2: fetch from Supabase
  return NextResponse.json({ data: null, status: "ok", id, note: "Phase 1: reports stored client-side" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  // TODO Phase 2: update in Supabase
  return NextResponse.json({ data: { id, ...body }, status: "ok" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // TODO Phase 2: delete from Supabase
  return NextResponse.json({ data: { id }, status: "ok" });
}
