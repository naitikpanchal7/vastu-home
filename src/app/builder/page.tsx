"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import BuilderWorkspace from "@/components/builder/BuilderWorkspace";
import { useProjectStore } from "@/store/projectStore";
import { useBuilderStore } from "@/store/builderStore";

// Inner component reads search params (must be inside Suspense boundary)
function BuilderPageInner() {
  const searchParams    = useSearchParams();
  const router          = useRouter();
  const projectId       = searchParams.get("project");
  const projects        = useProjectStore((s) => s.projects);
  const loadProjectMeta = useBuilderStore((s) => s.loadProjectMeta);

  const project = projectId ? projects.find((p) => p.id === projectId) : null;

  useEffect(() => {
    if (!projectId) return; // standalone builder — no project context

    if (!project) {
      // ID provided but not found — bounce to projects list
      router.replace("/projects");
      return;
    }

    // Safety: canvas projects should never reach the builder
    if (project.workspaceMode === "canvas") {
      router.replace(`/projects/${project.id}`);
      return;
    }

    // Load project identity into builderStore
    loadProjectMeta(project.id, project.name, project.clientName);
  }, [project, projectId, loadProjectMeta, router]);

  // Show nothing while redirecting wrong-mode projects
  if (projectId && project?.workspaceMode === "canvas") return null;
  if (projectId && !project) return null;

  return <BuilderWorkspace />;
}

export default function BuilderPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <BuilderPageInner />
      </Suspense>
    </AppShell>
  );
}
