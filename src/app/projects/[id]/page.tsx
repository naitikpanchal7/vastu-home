"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useProjectStore } from "@/store/projectStore";
import { useCanvasStore } from "@/store/canvasStore";
import CanvasWorkspace from "@/app/canvas/CanvasWorkspace";

export default function ProjectCanvasPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const loadCanvasState = useCanvasStore((s) => s.loadCanvasState);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!project) return;

    // Builder projects must open in the builder — never in the canvas workspace
    if (project.workspaceMode === "builder") {
      router.replace(`/builder?project=${project.id}`);
      return;
    }

    loadCanvasState(
      project.canvasState ?? {},
      project.id,
      project.name,
      project.clientName,
      project.floors
    );
    setLoaded(true);
  }, [project, loadCanvasState, router]);

  if (!project) {
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

  // Show nothing while redirecting builder projects
  if (project.workspaceMode === "builder") return null;

  if (!loaded) return null;

  return (
    <AppShell>
      <CanvasWorkspace />
    </AppShell>
  );
}
