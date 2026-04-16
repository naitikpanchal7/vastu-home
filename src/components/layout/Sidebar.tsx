"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⊞", href: "/dashboard", section: "Workspace" },
  { label: "Projects",  icon: "◫", href: "/projects",  section: null },
  { label: "Canvas",    icon: "◈", href: "/canvas",    section: null },
  { label: "Builder",   icon: "⬜", href: "/builder",   section: null },
  { label: "Analysis",  icon: "◉", href: "/canvas?tab=analysis", section: "Tools" },
  { label: "Vastu AI",  icon: "◎", href: "/canvas?tab=chatbot",  section: null },
  { label: "Reports",   icon: "◌", href: "#reports",   section: "Account" },
  { label: "Settings",  icon: "⚙", href: "#settings",  section: null },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState("Rajesh Sharma");
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState("Rajesh Sharma");
  const pathname = usePathname();
  const router = useRouter();

  const saveUserName = () => {
    setUserName(editVal.trim() || userName);
    setEditing(false);
  };

  let lastSection = "";

  return (
    <nav
      className={cn(
        "bg-bg-2 border-r border-[rgba(200,175,120,0.15)] flex flex-col flex-shrink-0 transition-[width] duration-[220ms] ease-[cubic-bezier(.4,0,.2,1)] overflow-hidden z-20 relative",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute top-[14px] -right-[11px] w-[22px] h-[22px] rounded-full bg-bg-3 border border-[rgba(200,175,120,0.15)] flex items-center justify-center z-30 text-[10px] text-vastu-text-3 hover:border-gold-3 hover:text-gold-2 transition-all duration-150 cursor-pointer"
      >
        {collapsed ? "▶" : "◀"}
      </button>

      {/* Logo */}
      <div className="px-3 py-[15px] border-b border-[rgba(200,175,120,0.08)] flex items-center gap-[9px] flex-shrink-0 min-h-[54px] overflow-hidden whitespace-nowrap">
        <div className="w-[28px] h-[28px] bg-gradient-to-br from-gold-3 to-saffron rounded-[7px] flex items-center justify-center font-serif text-[15px] font-semibold text-bg flex-shrink-0">
          V
        </div>
        <div className={cn("overflow-hidden transition-[opacity,width] duration-[220ms]", collapsed && "opacity-0 w-0")}>
          <div className="font-serif text-[18px] font-semibold text-gold-2">
            vastu<span className="text-gold-3">@home</span>
          </div>
          <div className="text-[9px] text-vastu-text-3 tracking-[2px] uppercase mt-[1px]">Consultant</div>
        </div>
      </div>

      {/* Nav */}
      <div className="py-[7px] flex-1 overflow-hidden">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split("?")[0]));

          return (
            <div key={item.href + item.label}>
              {showSection && (
                <div
                  className={cn(
                    "px-[14px] py-[9px_14px_3px] text-[9px] tracking-[2px] text-vastu-text-3 uppercase whitespace-nowrap transition-[opacity,height,padding] duration-150",
                    collapsed && "opacity-0 h-0 overflow-hidden py-0"
                  )}
                >
                  {item.section}
                </div>
              )}
              <div
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex items-center gap-[10px] px-[14px] py-2 cursor-pointer text-vastu-text-2 text-[12px] transition-all duration-[120ms] border-l-2 border-transparent whitespace-nowrap overflow-hidden",
                  "hover:text-vastu-text hover:bg-[rgba(200,175,120,0.05)]",
                  isActive && "text-gold-2 bg-[rgba(200,175,120,0.08)] border-l-gold"
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

      {/* User chip */}
      <div className="p-[9px] border-t border-[rgba(200,175,120,0.08)] flex-shrink-0 overflow-hidden">
        <div
          className="flex items-center gap-2 px-2 py-[7px] bg-bg-3 rounded-[7px] cursor-pointer overflow-hidden"
          onClick={() => { setEditing(true); setEditVal(userName); }}
        >
          <div className="w-[27px] h-[27px] bg-gradient-to-br from-gold-3 to-saffron rounded-full flex items-center justify-center font-serif text-[13px] font-semibold text-bg flex-shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={cn("overflow-hidden transition-[opacity] duration-150 flex-1 min-w-0", collapsed && "opacity-0 w-0")}>
            {editing ? (
              <input
                autoFocus
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onBlur={saveUserName}
                onKeyDown={(e) => e.key === "Enter" && saveUserName()}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] text-vastu-text font-medium bg-transparent border-none border-b border-gold-3 outline-none font-sans w-full p-0"
              />
            ) : (
              <div className="text-[11px] text-vastu-text font-medium flex items-center gap-1 whitespace-nowrap">
                <span>{userName}</span>
                <span className="text-[9px] text-vastu-text-3 opacity-50">✏</span>
              </div>
            )}
            <div className="text-[9px] text-gold-3 whitespace-nowrap">Professional Plan</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
