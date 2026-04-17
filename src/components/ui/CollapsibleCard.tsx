"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  title: React.ReactNode;
  defaultOpen?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export default function CollapsibleCard({
  title,
  defaultOpen = true,
  right,
  children,
  className,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[9px] mb-3 overflow-hidden",
        className
      )}
    >
      <div
        className="flex items-center justify-between px-[14px] py-[10px] cursor-pointer select-none hover:bg-[rgba(100,70,20,0.05)]"
        style={{ borderBottom: open ? "1px solid rgba(100,70,20,0.12)" : "none" }}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="font-serif text-[14px] font-medium text-vastu-text flex items-center gap-[7px]">
          {title}
        </div>
        <div className="flex items-center gap-[9px]">
          {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
          <span
            className="text-[9px] text-vastu-text-3 transition-transform duration-200"
            style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            ▾
          </span>
        </div>
      </div>
      {open && <div className="p-[12px_14px]">{children}</div>}
    </div>
  );
}
