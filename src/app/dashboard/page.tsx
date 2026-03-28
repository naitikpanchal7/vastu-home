"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";
import StatsBar from "@/components/dashboard/StatsBar";
import RecentProjects from "@/components/dashboard/RecentProjects";
import AnalyticsCard from "@/components/dashboard/AnalyticsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useProjects } from "@/hooks/useProjects";
import { useRouter } from "next/navigation";
import type { PropertyType } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { projects, createProject } = useProjects();
  const [showNewProject, setShowNewProject] = useState(false);

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

  const handleCreateProject = () => {
    if (!npName.trim() || !npClient.trim()) return;
    const project = createProject({
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
  };

  return (
    <AppShell>
      <Topbar
        title="Dashboard"
        subtitle={`${greeting}`}
        actions={
          <>
            <Button variant="ghost" size="sm">📥 Import</Button>
            <Button variant="primary" size="sm" onClick={() => setShowNewProject(true)}>＋ New Project</Button>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto p-[18px]">
        <StatsBar />

        <RecentProjects onNewProject={() => setShowNewProject(true)} />

        <AnalyticsCard />

        <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 280px" }}>
          <ActivityFeed />

          <div className="flex flex-col gap-3">
            {/* Subscription card */}
            <CollapsibleCard title={<>◌ Subscription</>}>
              <div className="font-serif text-[17px] text-gold-2 mb-[2px]">Professional</div>
              <div className="text-[9px] text-vastu-text-3 mb-[10px]">Renews May 1, 2026</div>
              <div className="mb-[9px]">
                <div className="flex justify-between text-[9px] text-vastu-text-2 mb-[3px]">
                  <span>Projects</span>
                  <span className="font-mono">{projects.length}/30</span>
                </div>
                <div className="h-[3px] bg-bg-4 rounded-[2px] overflow-hidden">
                  <div
                    className="h-full rounded-[2px]"
                    style={{
                      width: `${Math.min((projects.length / 30) * 100, 100)}%`,
                      background: "linear-gradient(90deg, var(--gold-3), var(--saffron))",
                    }}
                  />
                </div>
              </div>
              <div className="mb-[9px]">
                <div className="flex justify-between text-[9px] text-vastu-text-2 mb-[3px]">
                  <span>Reports</span>
                  <span className="font-mono">0/∞</span>
                </div>
                <div className="h-[3px] bg-bg-4 rounded-[2px]" />
              </div>
              <Button variant="ghost" className="w-full justify-center text-[10px] py-[5px]">
                Manage
              </Button>
            </CollapsibleCard>

            {/* Quick actions */}
            <CollapsibleCard title={<>⚡ Quick Actions</>}>
              <div className="grid grid-cols-2 gap-[6px]">
                {[
                  { icon: "＋", label: "New Project",    action: () => setShowNewProject(true) },
                  { icon: "↑",  label: "Upload Plan",    action: () => router.push("/canvas") },
                  { icon: "⊙",  label: "Open Canvas",    action: () => router.push("/canvas") },
                  { icon: "⎙",  label: "Export Report",  action: () => {} },
                ].map((qa) => (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="py-2 px-[9px] bg-bg-4 border border-[rgba(200,175,120,0.08)] rounded-[6px] cursor-pointer hover:border-gold-3 hover:text-gold-2 transition-all duration-[130ms] text-vastu-text-2 text-[10px] font-sans text-center"
                  >
                    <span className="text-[15px] block mb-[2px]">{qa.icon}</span>
                    {qa.label}
                  </button>
                ))}
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
            <Button variant="ghost" size="sm" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject}>Create Project →</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-[9px]">
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Project Name</label>
            <input value={npName} onChange={(e) => setNpName(e.target.value)} placeholder="e.g. Kapoor Residence — 2BHK"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Client Name</label>
            <input value={npClient} onChange={(e) => setNpClient(e.target.value)} placeholder="Full name"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Client Contact</label>
            <input value={npContact} onChange={(e) => setNpContact(e.target.value)} placeholder="+91 98…"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Address</label>
            <input value={npAddress} onChange={(e) => setNpAddress(e.target.value)} placeholder="Address or Google Maps URL"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Type</label>
            <select value={npType} onChange={(e) => setNpType(e.target.value as PropertyType)}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3">
              {["Residential", "Commercial", "Industrial", "Plot"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Area (sq ft)</label>
            <input type="number" value={npArea} onChange={(e) => setNpArea(e.target.value)} placeholder="e.g. 1840"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Initial Notes</label>
            <textarea value={npNotes} onChange={(e) => setNpNotes(e.target.value)}
              placeholder="Client concerns, special requirements…"
              rows={3}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3 resize-none leading-relaxed" />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
