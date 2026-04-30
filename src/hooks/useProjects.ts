"use client";

import { useCallback, useEffect, useRef } from "react";
import { useProjectStore } from "@/store/projectStore";
import type { Project, ProjectStatus, PropertyType, Floor } from "@/lib/types";

// Map DB snake_case row → TS Project
function dbRowToProject(row: Record<string, unknown>): Project {
  const rawFloors = row.floors as Array<Record<string, unknown>> | undefined;
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
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    lastOpenedAt:    row.last_opened_at as string | undefined,
    floors:          rawFloors?.map((f) => ({
      id:         f.id as string,
      name:       f.name as string,
      order:      f.order as number,
      canvasState: (f.canvas_state ?? undefined) as Floor["canvasState"],
    })) ?? [],
  };
}

export function useProjects() {
  const store = useProjectStore();
  const loadedRef = useRef(false);

  // Load projects from DB once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetch("/api/projects")
      .then((r) => r.json())
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          store.setProjects(data.map(dbRowToProject));
        }
      })
      .catch(() => {/* network error — leave store as-is */});
  }, [store]);

  const createProject = useCallback(
    async (data: {
      name: string;
      clientName: string;
      clientContact?: string;
      propertyAddress?: string;
      propertyType: PropertyType;
      areaSqFt?: number;
      notes?: string;
    }): Promise<Project> => {
      try {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const { data: row } = await res.json();
        if (row) {
          const project = dbRowToProject(row);
          store.addProject(project);
          return project;
        }
      } catch { /* fall through to local */ }

      // Fallback: local-only project (unauthenticated or offline)
      const now = new Date().toISOString();
      const project: Project = {
        id: `proj-${Date.now()}`,
        consultantId: "local",
        name: data.name,
        clientName: data.clientName,
        clientContact: data.clientContact,
        propertyAddress: data.propertyAddress,
        propertyType: data.propertyType,
        areaSqFt: data.areaSqFt,
        notes: data.notes,
        status: "draft",
        createdAt: now,
        updatedAt: now,
      };
      store.addProject(project);
      return project;
    },
    [store]
  );

  const toggleStatus = useCallback(
    async (id: string) => {
      const project = store.projects.find((p) => p.id === id);
      if (!project) return;
      const next: ProjectStatus =
        project.status === "draft" ? "active" : project.status === "active" ? "done" : "draft";
      store.setStatus(id, next);

      // Persist to DB if real project
      if (!id.startsWith("proj-")) {
        fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }).catch(() => {});
      }
    },
    [store]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      store.deleteProject(id);
      if (!id.startsWith("proj-")) {
        fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(() => {});
      }
    },
    [store]
  );

  return {
    projects: store.projects,
    filteredProjects: store.filteredProjects(),
    loading: store.loading,
    searchQuery: store.searchQuery,
    statusFilter: store.statusFilter,
    setSearchQuery: store.setSearchQuery,
    setStatusFilter: store.setStatusFilter,
    createProject,
    updateProject: store.updateProject,
    deleteProject,
    toggleStatus,
    setActiveProject: store.setActiveProject,
  };
}
