// src/store/projectStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Project, ProjectStatus } from "@/lib/types";

interface ProjectStore {
  projects: Project[];
  loading: boolean;
  activeProjectId: string | null;

  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setStatus: (id: string, status: ProjectStatus) => void;

  // Search / filter
  searchQuery: string;
  statusFilter: "all" | ProjectStatus;
  setSearchQuery: (q: string) => void;
  setStatusFilter: (f: "all" | ProjectStatus) => void;
  filteredProjects: () => Project[];
}

export const useProjectStore = create<ProjectStore>()(
  devtools(
    (set, get) => ({
      projects: [],
      loading: false,
      activeProjectId: null,
      searchQuery: "",
      statusFilter: "all",

      setProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((s) => ({ projects: [project, ...s.projects] })),

      updateProject: (id, updates) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      setStatus: (id, status) => get().updateProject(id, { status }),

      setSearchQuery: (q) => set({ searchQuery: q }),
      setStatusFilter: (f) => set({ statusFilter: f }),

      filteredProjects: () => {
        const { projects, searchQuery, statusFilter } = get();
        return projects.filter((p) => {
          const matchesSearch =
            !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.propertyAddress ?? "").toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus =
            statusFilter === "all" || p.status === statusFilter;
          return matchesSearch && matchesStatus;
        });
      },
    }),
    { name: "vastu-project-store" }
  )
);
