import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

interface BadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft:  "bg-[rgba(160,110,10,0.12)] text-[#7a5808] border border-[rgba(160,110,10,0.20)]",
  active: "bg-[rgba(40,90,180,0.10)] text-[#2a5aad] border border-[rgba(40,90,180,0.18)]",
  done:   "bg-[rgba(30,110,60,0.10)] text-[#1e6e3a] border border-[rgba(30,110,60,0.18)]",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft:  "Draft",
  active: "Active",
  done:   "Done",
};

export default function Badge({ status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "text-[8px] px-[6px] py-[2px] rounded-full font-medium uppercase font-sans tracking-wide",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
