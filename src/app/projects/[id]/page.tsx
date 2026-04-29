"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useProjectStore } from "@/store/projectStore";
import { useCanvasStore } from "@/store/canvasStore";
import CanvasWorkspace from "@/app/canvas/CanvasWorkspace";
import type { Floor, Project, PropertyType, ProjectStatus } from "@/lib/types";

function dbFloorToFloor(row: Record<string, unknown>): Floor {
  return {
    id:                row.id as string,
    name:              row.name as string,
    order:             row.order as number,
    canvasState:       (row.canvas_state as Floor["canvasState"]) ?? {},
    floorPlanImage:    (row.floor_plan_image_url as string | null) ?? null,
    notes:             (row.notes as string) ?? "",
    consultantSummary: (row.consultant_summary as string) ?? "",
    consultantActions: (row.consultant_actions as string) ?? "",
    zoomLevel:         (row.zoom_level as number) ?? 100,
    panX:              (row.pan_x as number) ?? 0,
    panY:              (row.pan_y as number) ?? 0,
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

  const storeProject = projectStore.projects.find((p) => p.id === id);

  useEffect(() => {
    if (loadedIdRef.current === id) return;

    async function init() {
      let project: Project | undefined = storeProject;

      // If not in store, try loading from DB
      if (!project) {
        try {
          const res = await fetch(`/api/projects/${id}`);
          const { data } = await res.json();
          if (data) {
            project = dbRowToProject(data);
            projectStore.addProject(project);
          }
        } catch { /* ignore */ }
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
  }, [id, storeProject, projectStore, loadCanvasState]);

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
