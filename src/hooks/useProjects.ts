"use client";

import { useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";
import type { Project, ProjectStatus, PropertyType } from "@/lib/types";

let idCounter = Date.now();

export function useProjects() {
  const store = useProjectStore();

  const createProject = useCallback(
    (data: {
      name: string;
      clientName: string;
      clientContact?: string;
      propertyAddress?: string;
      propertyType: PropertyType;
      areaSqFt?: number;
      notes?: string;
    }): Project => {
      const now = new Date().toISOString();
      const project: Project = {
        id: `proj-${++idCounter}`,
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
    (id: string) => {
      const project = store.projects.find((p) => p.id === id);
      if (!project) return;
      const next: ProjectStatus =
        project.status === "draft" ? "active" : project.status === "active" ? "done" : "draft";
      store.setStatus(id, next);
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
    deleteProject: store.deleteProject,
    toggleStatus,
    setActiveProject: store.setActiveProject,
  };
}
