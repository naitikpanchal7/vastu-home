"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useProjectStore } from "@/store/projectStore";
import { useCanvasStore, isCanvasStoreHydrated, onCanvasStoreHydrated } from "@/store/canvasStore";
import CanvasWorkspace from "@/app/canvas/CanvasWorkspace";
import type { Floor, Project, PropertyType, ProjectStatus } from "@/lib/types";

function dbFloorToFloor(row: Record<string, unknown>): Floor {
  // Old data stored zoom as a decimal scale factor (1.0 = 100%).
  // Current code stores it as a percentage integer (100 = 100%).
  // If the stored value is < 5, treat it as old-format and convert; also reset
  // pan because the old pan offsets were calibrated to the old zoom unit and
  // would put the view completely off-screen at the converted zoom.
  const rawZoom = row.zoom_level as number | null;
  let zoomLevel = 100;
  let panX = 0;
  let panY = 0;
  if (rawZoom != null && rawZoom > 0) {
    if (rawZoom < 5) {
      // Old decimal format: convert to percentage and reset pan
      zoomLevel = Math.round(rawZoom * 100);
    } else {
      zoomLevel = Math.max(30, Math.min(300, rawZoom));
      panX = (row.pan_x as number) ?? 0;
      panY = (row.pan_y as number) ?? 0;
    }
  }

  return {
    id:                row.id as string,
    name:              row.name as string,
    order:             row.order as number,
    canvasState:       (row.canvas_state as Floor["canvasState"]) ?? {},
    floorPlanImage:    (row.floor_plan_image_url as string | null) ?? null,
    notes:             (row.notes as string) ?? "",
    consultantSummary: (row.consultant_summary as string) ?? "",
    consultantActions: (row.consultant_actions as string) ?? "",
    zoomLevel,
    panX,
    panY,
  };
}

function dbRowToProject(row: Record<string, unknown>): Project {
  return {
    id:              row.id as string,
    consultantId:    row.consultant_id as string,
    name:            row.name as string,
    clientName:      (row.client_name as string) ?? "",
    clientContact:   row.client_contact as string | undefined,
    clientEmail:     row.client_email as string | undefined,
    propertyAddress: row.property_address as string | undefined,
    propertyType:    (row.property_type as PropertyType) ?? "Residential",
    areaSqFt:        row.area_sq_ft as number | undefined,
    notes:           row.notes as string | undefined,
    status:          (row.status as ProjectStatus) ?? "draft",
    floors:          Array.isArray(row.floors) ? row.floors.map(dbFloorToFloor) : [],
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    lastOpenedAt:    row.last_opened_at as string | undefined,
  };
}

export default function ProjectCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const projectStore = useProjectStore();
  const loadCanvasState = useCanvasStore((s) => s.loadCanvasState);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const loadedIdRef = useRef<string | null>(null);

  // Wait for Zustand to finish rehydrating from localStorage before loading from DB.
  // Without this, loadCanvasState (which sets floorPlanImage) runs first, then
  // Zustand rehydration overwrites the store and clears floorPlanImage back to null.
  const [hydrated, setHydrated] = useState(() => isCanvasStoreHydrated());
  useEffect(() => {
    if (hydrated) return;
    const unsub = onCanvasStoreHydrated(() => setHydrated(true));
    return unsub;
  }, [hydrated]);

  const storeProject = projectStore.projects.find((p) => p.id === id);

  useEffect(() => {
    if (!hydrated) return;
    if (loadedIdRef.current === id) return;

    async function init() {
      let project: Project | undefined;

      // Always fetch fresh from DB so floors are never stale
      try {
        const res = await fetch(`/api/projects/${id}`);
        const { data } = await res.json();
        if (data) {
          project = dbRowToProject(data);
          projectStore.addProject(project);
        }
      } catch {
        // Offline fallback — use whatever is in the store
        project = storeProject;
      }

      if (!project) {
        setNotFound(true);
        return;
      }

      loadedIdRef.current = id;
      loadCanvasState(
        project.canvasState ?? {},
        project.id,
        project.name,
        project.clientName,
        project.floors,
      );
      setLoaded(true);
    }

    init();
  }, [id, hydrated, storeProject, projectStore, loadCanvasState]);

  if (notFound) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[36px] opacity-30 mb-3">◫</div>
            <div className="text-[12px] text-vastu-text-3">Project not found.</div>
            <button
              onClick={() => router.push("/projects")}
              className="mt-3 text-[11px] text-gold-3 hover:text-gold cursor-pointer"
            >
              ← Back to projects
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!loaded) {
    return (
      <AppShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[11px] text-vastu-text-3 font-mono">Loading project…</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <CanvasWorkspace />
    </AppShell>
  );
}
