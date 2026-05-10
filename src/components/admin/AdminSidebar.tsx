"use client";

import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Overview",  icon: "⊞", href: "/admin/overview"  },
  { label: "Users",     icon: "◫", href: "/admin/users"     },
  { label: "AI Usage",  icon: "◈", href: "/admin/ai-usage"  },
  { label: "Tiers",     icon: "◌", href: "/admin/tiers"     },
  { label: "Activity",  icon: "≡", href: "/admin/activity"  },
  { label: "Settings",  icon: "⚙", href: "/admin/settings"  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  return (
    <nav className="w-[200px] flex-shrink-0 bg-bg-2 border-r border-[rgba(100,70,20,0.20)] flex flex-col">
      {/* Logo */}
      <div className="px-4 py-[15px] border-b border-[rgba(100,70,20,0.12)] flex items-center gap-[9px]">
        <div className="w-[28px] h-[28px] bg-gradient-to-br from-gold-3 to-saffron rounded-[7px] flex items-center justify-center font-serif text-[15px] font-semibold text-[#faf7f0] flex-shrink-0">
          V
        </div>
        <div>
          <div className="font-serif text-[16px] font-semibold text-gold-2 leading-tight">
            vastu<span className="text-gold-3">@home</span>
          </div>
          <div className="text-[8px] text-vastu-text-3 tracking-[2px] uppercase">Admin</div>
        </div>
      </div>

      {/* Nav items */}
      <div className="py-2 flex-1">
        <div className="px-3 py-2 text-[8px] tracking-[2px] text-vastu-text-3 uppercase">Console</div>
        {NAV.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <div
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex items-center gap-[10px] px-4 py-[7px] cursor-pointer text-[12px] transition-all duration-[120ms] border-l-2",
                "hover:text-vastu-text hover:bg-[rgba(100,70,20,0.07)]",
                isActive
                  ? "text-gold-2 bg-[rgba(100,70,20,0.10)] border-l-gold-2 font-medium"
                  : "text-vastu-text-2 border-l-transparent"
              )}
            >
              <span className="text-[15px] w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Back to app */}
      <div className="p-3 border-t border-[rgba(100,70,20,0.12)]">
        <button
          onClick={() => router.push("/dashboard")}
          className="w-full flex items-center gap-2 px-3 py-[7px] rounded-[6px] text-[11px] text-vastu-text-3 hover:text-vastu-text-2 hover:bg-[rgba(100,70,20,0.07)] transition-colors duration-150 cursor-pointer"
        >
          <span>←</span>
          <span>Back to App</span>
        </button>
      </div>
    </nav>
  );
}
