import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/types";

interface BadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  draft:  "bg-amber-900/40 text-amber-400",
  active: "bg-blue-900/40 text-blue-300",
  done:   "bg-green-900/40 text-green-400",
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
