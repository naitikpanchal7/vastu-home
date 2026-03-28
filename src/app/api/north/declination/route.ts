// src/app/api/north/declination/route.ts
// Fetches magnetic declination from NOAA World Magnetic Model API
// Free, no key required

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const url = `https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=${lat}&lon1=${lng}&key=zNEw7&startYear=${today.split("-")[0]}&startMonth=${today.split("-")[1]}&startDay=${today.split("-")[2]}&resultFormat=json`;

    const response = await fetch(url, {
      next: { revalidate: 86400 }, // cache for 24 hours
    });

    if (!response.ok) throw new Error("NOAA API error");

    const data = await response.json();
    const declination = data.result?.[0]?.declination ?? 0;

    return NextResponse.json({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      declination: parseFloat(declination.toFixed(2)),
      unit: "degrees",
      source: "NOAA World Magnetic Model",
    });
  } catch (error) {
    console.error("Declination fetch error:", error);
    // Return 0 declination as fallback — user can override manually
    return NextResponse.json({
      lat: parseFloat(lat!),
      lng: parseFloat(lng!),
      declination: 0,
      unit: "degrees",
      source: "fallback — NOAA unavailable",
    });
  }
}
