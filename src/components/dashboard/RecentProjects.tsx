"use client";

import { useRouter } from "next/navigation";
import { useProjectStore } from "@/store/projectStore";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import Badge from "@/components/ui/Badge";

interface RecentProjectsProps {
  onNewProject: () => void;
}

export default function RecentProjects({ onNewProject }: RecentProjectsProps) {
  const projects = useProjectStore((s) => s.projects).slice(0, 6);
  const router = useRouter();

  return (
    <CollapsibleCard
      title={<>◫ Recent Projects</>}
      right={
        <span
          className="text-[10px] text-vastu-text-3 cursor-pointer hover:text-gold-3 transition-colors"
          onClick={() => router.push("/projects")}
        >
          View all →
        </span>
      }
    >
      {projects.length === 0 ? (
        <div className="text-[11px] text-vastu-text-3 text-center py-4">
          No projects yet.{" "}
          <span
            className="text-gold-3 cursor-pointer hover:text-gold transition-colors"
            onClick={onNewProject}
          >
            Create one →
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[9px]">
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => router.push(`/projects/${p.id}`)}
              className="bg-bg-4 border border-[rgba(200,175,120,0.08)] rounded-[7px] overflow-hidden cursor-pointer transition-all duration-150 hover:border-gold-3 hover:-translate-y-[1px]"
            >
              <div className="h-[70px] bg-bg-2 flex items-center justify-center">
                <span className="text-[28px] opacity-20">🏠</span>
              </div>
              <div className="px-[10px] py-2">
                <div className="text-[11px] font-medium text-vastu-text mb-[2px] truncate">{p.name}</div>
                <div className="text-[10px] text-vastu-text-3 truncate">{p.clientName}</div>
                <div className="flex items-center justify-between mt-[6px]">
                  <Badge status={p.status} />
                  <span className="text-[8px] text-vastu-text-3 font-mono">
                    {new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
