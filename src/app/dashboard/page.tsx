"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";
import StatsBar from "@/components/dashboard/StatsBar";
import RecentProjects from "@/components/dashboard/RecentProjects";
import AnalyticsCard from "@/components/dashboard/AnalyticsCard";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useProjects } from "@/hooks/useProjects";
import { useReports } from "@/hooks/useReports";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import type { PropertyType } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, createProject } = useProjects();
  const { reportCount } = useReports();
  const { subscription, planFeatures } = useUser();
  const [showNewProject, setShowNewProject] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // New project form state
  const [npName, setNpName] = useState("");
  const [npClient, setNpClient] = useState("");
  const [npContact, setNpContact] = useState("");
  const [npAddress, setNpAddress] = useState("");
  const [npType, setNpType] = useState<PropertyType>("Residential");
  const [npArea, setNpArea] = useState("");
  const [npNotes, setNpNotes] = useState("");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const projectsAtLimit = subscription && subscription.projects_limit !== -1 && subscription.projects_used >= subscription.projects_limit;

  const openNewProject = () => {
    if (projectsAtLimit) { setShowLimitModal(true); return; }
    setCreateError(null);
    openNewProject();
  };

  const handleCreateProject = async () => {
    if (!npName.trim() || !npClient.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const project = await createProject({
        name: npName,
        clientName: npClient,
        clientContact: npContact || undefined,
        propertyAddress: npAddress || undefined,
        propertyType: npType,
        areaSqFt: npArea ? parseFloat(npArea) : undefined,
        notes: npNotes || undefined,
      });
      setShowNewProject(false);
      setNpName(""); setNpClient(""); setNpContact(""); setNpAddress(""); setNpArea(""); setNpNotes("");
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell>
      <Topbar
        title="Dashboard"
        subtitle={`${greeting}`}
        actions={
          <Button variant="primary" size="sm" onClick={() => openNewProject()}>＋ New Project</Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <StatsBar />

        <RecentProjects onNewProject={() => openNewProject()} />

        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 252px" }}>
          <AnalyticsCard />

          <div className="flex flex-col gap-3">
            {/* Quick actions */}
            <CollapsibleCard title={<>⚡ Quick Actions</>}>
              <div className="grid grid-cols-2 gap-[6px]">
                {[
                  { icon: "＋", label: "New Project",   action: () => openNewProject() },
                  { icon: "↑",  label: "Upload Plan",   action: () => router.push("/canvas") },
                  { icon: "⊙",  label: "Open Canvas",   action: () => router.push("/canvas") },
                  { icon: "⎙",  label: "Export Report", action: () => router.push("/reports") },
                ].map((qa) => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="py-[10px] px-[9px] bg-bg-4 border border-[rgba(100,70,20,0.12)] rounded-[6px] cursor-pointer hover:border-gold-3 hover:text-gold-2 transition-all duration-[130ms] text-vastu-text-2 text-[10px] font-sans text-center"
                  >
                    <span className="text-[16px] block mb-[4px]">{qa.icon}</span>
                    {qa.label}
                  </button>
                ))}
              </div>
            </CollapsibleCard>

            {/* Workspace usage card */}
            <CollapsibleCard title={<>◌ Workspace</>}>
              <div className="flex flex-col gap-[10px]">
                {[
                  {
                    label: "Projects",
                    used: subscription?.projects_used ?? projects.length,
                    limit: subscription?.projects_limit ?? -1,
                  },
                  {
                    label: "Reports",
                    used: subscription?.reports_used ?? reportCount,
                    limit: subscription?.reports_limit ?? -1,
                  },
                ].map(({ label, used, limit }) => {
                  const isReports = label === "Reports";
                  const pdfDisabled = isReports && !planFeatures.pdf_export_enabled;
                  const unlimited = limit === -1;
                  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
                  const nearLimit = !unlimited && pct >= 80;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-[9px] text-vastu-text-3 mb-[6px]">
                        <span>{label}</span>
                        <span className={`font-mono ${pdfDisabled ? "italic" : nearLimit ? "text-saffron" : "text-vastu-text-2"}`}>
                          {pdfDisabled ? "Not included" : unlimited ? used : `${used} / ${limit}`}
                        </span>
                      </div>
                      {!pdfDisabled && (
                        <div className="h-[3px] bg-bg-4 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-[#b43218]" : nearLimit ? "bg-saffron" : "bg-gradient-to-r from-gold-3 to-saffron"}`}
                            style={{ width: unlimited ? "30%" : `${pct}%`, opacity: unlimited ? 0.4 : 1 }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-[2px]">
                  <div className="text-[8px] text-gold-3 capitalize">
                    {subscription?.plan ?? "starter"} plan
                  </div>
                  <button onClick={() => router.push("/settings")}
                    className="text-[8px] text-vastu-text-3 hover:text-gold-3 transition-colors cursor-pointer">
                    Manage →
                  </button>
                </div>
              </div>
            </CollapsibleCard>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      <Modal
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        title="◫ New Project"
        subtitle="Create a new Vastu analysis workspace for your client."
        wide
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowNewProject(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject} disabled={creating}>
              {creating ? "Creating…" : "Create Project →"}
            </Button>
          </>
        }
      >
        {createError && (
          <div className="mb-3 px-3 py-2 bg-[rgba(200,60,40,0.08)] border border-[rgba(200,60,40,0.25)] rounded-[6px] text-[11px] text-red-400 flex items-center justify-between gap-3">
            <span>{createError}</span>
            {createError.toLowerCase().includes("limit") && (
              <a href="/settings" className="text-[10px] px-2 py-1 bg-gold-2 text-[#faf7f0] rounded-[4px] hover:bg-gold transition-colors whitespace-nowrap flex-shrink-0">Upgrade →</a>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-[9px]">
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Project Name</label>
            <input value={npName} onChange={(e) => setNpName(e.target.value)} placeholder="e.g. Kapoor Residence — 2BHK"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Client Name</label>
            <input value={npClient} onChange={(e) => setNpClient(e.target.value)} placeholder="Full name"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Client Contact</label>
            <input value={npContact} onChange={(e) => setNpContact(e.target.value)} placeholder="+91 98…"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Address</label>
            <input value={npAddress} onChange={(e) => setNpAddress(e.target.value)} placeholder="Address or Google Maps URL"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Type</label>
            <select value={npType} onChange={(e) => setNpType(e.target.value as PropertyType)}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3">
              {["Residential", "Commercial", "Industrial", "Plot"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Area (sq ft)</label>
            <input type="number" value={npArea} onChange={(e) => setNpArea(e.target.value)} placeholder="e.g. 1840"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Initial Notes</label>
            <textarea value={npNotes} onChange={(e) => setNpNotes(e.target.value)}
              placeholder="Client concerns, special requirements…"
              rows={3}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3 resize-none leading-relaxed" />
          </div>
        </div>
      </Modal>

      {/* Limit reached modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowLimitModal(false)}>
          <div className="bg-bg border border-[rgba(100,70,20,0.20)] rounded-[12px] p-6 w-[360px] shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-[28px] mb-3">◫</div>
            <div className="font-serif text-[18px] text-gold-2 mb-2">Project Limit Reached</div>
            <div className="text-[12px] text-vastu-text-2 leading-relaxed mb-1">
              You&apos;ve used <span className="font-mono text-vastu-text">{subscription?.projects_used}/{subscription?.projects_limit}</span> projects on your current plan.
            </div>
            <div className="text-[11px] text-vastu-text-3 mb-5">Upgrade your plan to create more projects.</div>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setShowLimitModal(false)} className="px-4 py-[7px] text-[11px] border border-[rgba(100,70,20,0.20)] rounded-[7px] text-vastu-text-2 hover:border-gold-3 cursor-pointer">Cancel</button>
              <a href="/settings" className="px-4 py-[7px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[7px] hover:bg-gold transition-colors font-medium">Upgrade Plan →</a>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
