"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⊞", href: "/dashboard",        section: "Workspace", panel: null, exact: false },
  { label: "Projects",  icon: "◫", href: "/projects",          section: null,        panel: null, exact: false },
  { label: "Canvas",    icon: "◈", href: "/canvas",            section: null,        panel: null, exact: false },
  { label: "Reports",   icon: "◌", href: "/reports",           section: "Account",   panel: null, exact: false },
  { label: "Settings",  icon: "⚙", href: "/settings",          section: null,        panel: null, exact: true  },
  { label: "Billing",   icon: "◎", href: "/settings/billing",  section: null,        panel: null, exact: false },
];

function UsageBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const unlimited = limit < 0;
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const nearLimit = !unlimited && pct >= 80;

  return (
    <div className="mb-[7px]">
      <div className="flex justify-between text-[8px] text-vastu-text-3 mb-[4px]">
        <span>{label}</span>
        <span className={cn("font-mono", nearLimit && "text-saffron")}>
          {unlimited ? `${used} / ∞` : `${used}/${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="h-[2px] bg-bg-4 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct >= 100 ? "bg-[#b43218]" : nearLimit ? "bg-saffron" : "bg-gradient-to-r from-gold-3 to-saffron"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const { user, profile, subscription, planFeatures, loading } = useUser();

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Consultant";
  const planLabel   = subscription?.plan
    ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) + " Plan"
    : "Starter Plan";

  let lastSection = "";

  return (
    <nav
      className={cn(
        "bg-bg-2 border-r border-[rgba(100,70,20,0.20)] flex flex-col flex-shrink-0 transition-[width] duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)] overflow-hidden z-20 relative",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute top-[14px] -right-[11px] w-[22px] h-[22px] rounded-full bg-bg-3 border border-[rgba(100,70,20,0.20)] flex items-center justify-center z-30 text-[10px] text-vastu-text-3 hover:border-gold-3 hover:text-gold-2 transition-all duration-150 cursor-pointer"
      >
        {collapsed ? "▶" : "◀"}
      </button>

      {/* Logo */}
      <div className="px-3 py-[15px] border-b border-[rgba(100,70,20,0.12)] flex items-center gap-[9px] flex-shrink-0 min-h-[54px] overflow-hidden whitespace-nowrap">
        <div className="w-[28px] h-[28px] bg-gradient-to-br from-gold-3 to-saffron rounded-[7px] flex items-center justify-center font-serif text-[15px] font-semibold text-[#faf7f0] flex-shrink-0">
          A
        </div>
        <div className={cn("overflow-hidden transition-[opacity,width] duration-[220ms]", collapsed && "opacity-0 w-0")}>
          <div className="font-serif text-[18px] font-semibold text-gold-2">
            Astraa Vastu
          </div>
          <div className="text-[9px] text-vastu-text-3 tracking-[2px] uppercase mt-[1px]">Consultant</div>
        </div>
      </div>

      {/* Nav */}
      <div className="py-[7px] flex-1 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const isActive = item.panel
            ? searchParams.get("panel") === item.panel
            : item.href
            ? item.exact
              ? pathname === item.href
              : pathname === item.href || (item.href !== "/" && item.href !== "#settings" && pathname.startsWith(item.href))
            : false;

          const handleClick = () => {
            if (item.panel) {
              const current = searchParams.get("panel");
              const params = new URLSearchParams(searchParams.toString());
              if (current === item.panel) params.delete("panel");
              else params.set("panel", item.panel);
              router.push(`${pathname}?${params.toString()}`);
            } else if (item.href && item.href !== "#settings") {
              router.push(item.href);
            }
          };

          return (
            <div key={(item.href ?? item.panel ?? "") + item.label}>
              {showSection && (
                <div className={cn(
                  "px-[14px] py-[9px_14px_3px] text-[9px] tracking-[2px] text-vastu-text-3 uppercase whitespace-nowrap transition-[opacity,height,padding] duration-150",
                  collapsed && "opacity-0 h-0 overflow-hidden py-0"
                )}>
                  {item.section}
                </div>
              )}
              <div
                onClick={handleClick}
                className={cn(
                  "flex items-center gap-[10px] px-[14px] py-2 cursor-pointer text-vastu-text-2 text-[12px] transition-all duration-[120ms] border-l-2 border-transparent whitespace-nowrap overflow-hidden",
                  "hover:text-vastu-text hover:bg-[rgba(100,70,20,0.07)]",
                  isActive && "text-gold-2 bg-[rgba(100,70,20,0.12)] border-l-gold"
                )}
              >
                <span className="text-[16px] w-6 text-center flex-shrink-0">{item.icon}</span>
                <span className={cn("transition-[opacity] duration-150", collapsed && "opacity-0 w-0 overflow-hidden")}>
                  {item.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Usage bars — only when expanded */}
      {!collapsed && subscription && (
        <div className={cn(
          "px-[14px] pb-[8px] transition-[opacity] duration-[220ms]",
          collapsed && "opacity-0"
        )}>
          <div className="text-[8px] text-vastu-text-3 uppercase tracking-[2px] mb-[7px]">Usage</div>
          <UsageBar
            used={subscription.projects_used}
            limit={subscription.projects_limit}
            label="Projects"
          />
          {planFeatures.pdf_export_enabled ? (
            <UsageBar
              used={subscription.reports_used}
              limit={subscription.reports_limit}
              label="Reports"
            />
          ) : (
            <div className="flex justify-between text-[9px] mb-[8px]">
              <span className="text-vastu-text-3">Reports</span>
              <span className="text-vastu-text-3 italic">Not included</span>
            </div>
          )}
        </div>
      )}

      {/* User chip */}
      <div className="p-[9px] border-t border-[rgba(100,70,20,0.12)] flex-shrink-0 overflow-hidden">
        <div
          className="flex items-center gap-2 px-2 py-[7px] bg-bg-3 rounded-[7px] cursor-pointer overflow-hidden hover:bg-bg-4 transition-colors duration-150"
          onClick={() => router.push("/settings")}
        >
          <div className="w-[27px] h-[27px] bg-gradient-to-br from-gold-3 to-saffron rounded-full flex items-center justify-center font-serif text-[13px] font-semibold text-[#faf7f0] flex-shrink-0">
            {loading ? "…" : displayName.charAt(0).toUpperCase()}
          </div>
          <div className={cn("overflow-hidden transition-[opacity] duration-150 flex-1 min-w-0", collapsed && "opacity-0 w-0")}>
            <div className="text-[11px] text-vastu-text font-medium whitespace-nowrap truncate">
              {loading ? "Loading…" : displayName}
            </div>
            <div className="text-[9px] text-gold-3 whitespace-nowrap">{planLabel}</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
