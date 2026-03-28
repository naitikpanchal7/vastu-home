"use client";

import Button from "@/components/ui/Button";

interface TopbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="h-[44px] bg-bg-2 border-b border-[rgba(200,175,120,0.15)] flex items-center px-4 gap-[9px] flex-shrink-0">
      <div className="flex-1 min-w-0">
        <span className="font-serif text-[16px] font-medium text-vastu-text">
          {title}
        </span>
        {subtitle && (
          <span className="text-vastu-text-3 font-light text-[11px] ml-[7px]">
            {subtitle}
          </span>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
