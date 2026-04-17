"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useProjects } from "@/hooks/useProjects";
import type { ProjectStatus, PropertyType } from "@/lib/types";

const FILTERS: { label: string; value: "all" | ProjectStatus }[] = [
  { label: "All",         value: "all" },
  { label: "Draft",       value: "draft" },
  { label: "In Analysis", value: "active" },
  { label: "Done",        value: "done" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { filteredProjects, searchQuery, statusFilter, setSearchQuery, setStatusFilter, createProject, toggleStatus, deleteProject } = useProjects();

  const [showNewProject, setShowNewProject] = useState(false);
  const [npName, setNpName]       = useState("");
  const [npClient, setNpClient]   = useState("");
  const [npContact, setNpContact] = useState("");
  const [npAddress, setNpAddress] = useState("");
  const [npType, setNpType]       = useState<PropertyType>("Residential");
  const [npArea, setNpArea]       = useState("");
  const [npNotes, setNpNotes]     = useState("");

  const handleCreate = () => {
    if (!npName.trim() || !npClient.trim()) return;
    const project = createProject({
      name: npName, clientName: npClient, clientContact: npContact || undefined,
      propertyAddress: npAddress || undefined, propertyType: npType,
      areaSqFt: npArea ? parseFloat(npArea) : undefined, notes: npNotes || undefined,
    });
    setShowNewProject(false);
    setNpName(""); setNpClient(""); setNpContact(""); setNpAddress(""); setNpArea(""); setNpNotes("");
    router.push(`/projects/${project.id}`);
  };

  return (
    <AppShell>
      <Topbar
        title="All Projects"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowNewProject(true)}>＋ New Project</Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-[18px]">
        {/* Search + filters */}
        <div className="flex items-center gap-[9px] mb-[14px] flex-wrap">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search client, project name…"
            className="flex-1 max-w-[300px] px-[11px] py-[7px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[6px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3"
          />
          <div className="flex gap-[5px]">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-[10px] py-[5px] rounded-[5px] text-[10px] cursor-pointer font-sans transition-all duration-[130ms] border ${
                  statusFilter === f.value
                    ? "bg-[rgba(100,70,20,0.15)] border-gold text-gold-2"
                    : "border-[rgba(100,70,20,0.20)] bg-transparent text-vastu-text-2 hover:border-gold-3 hover:text-gold-2"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects grid */}
        <div className="grid gap-[11px]" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          {filteredProjects.length === 0 ? (
            <div className="col-span-4 text-center py-[60px] px-5">
              <div className="text-[36px] opacity-30 mb-3">◫</div>
              <div className="text-[12px] text-vastu-text-3">
                {searchQuery ? "No projects match your search." : "No projects yet. "}
                {!searchQuery && (
                  <span className="text-gold-3 cursor-pointer hover:text-gold" onClick={() => setShowNewProject(true)}>
                    Create one →
                  </span>
                )}
              </div>
            </div>
          ) : (
            filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/projects/${p.id}`)}
                className="bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[8px] overflow-hidden cursor-pointer transition-all duration-150 hover:border-gold-3 hover:-translate-y-[2px] hover:shadow-[0_4px_16px_rgba(100,70,20,0.12)]"
              >
                <div className="h-[90px] bg-bg-2 flex items-center justify-center border-b border-[rgba(100,70,20,0.12)]">
                  <span className="text-[36px] opacity-20">🏠</span>
                </div>
                <div className="px-3 py-[10px]">
                  <div className="text-[11px] font-medium text-vastu-text mb-[2px] truncate">{p.name}</div>
                  <div className="text-[9px] text-vastu-text-3 mb-[6px] truncate">{p.clientName}</div>
                  <div className="flex items-center justify-between">
                    <Badge status={p.status} />
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[8px] text-vastu-text-3 font-mono">
                        ◫ {p.floors?.length ?? 1}F
                      </span>
                      <span className="text-[8px] text-vastu-text-3 font-mono">
                        {new Date(p.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
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
            <Button variant="primary" size="sm" onClick={handleCreate}>Create Project →</Button>
          </>
        }
      >
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
            <input value={npAddress} onChange={(e) => setNpAddress(e.target.value)} placeholder="Address"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Property Type</label>
            <select value={npType} onChange={(e) => setNpType(e.target.value as PropertyType)}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3">
              {["Residential", "Commercial", "Industrial", "Plot"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Area (sq ft)</label>
            <input type="number" value={npArea} onChange={(e) => setNpArea(e.target.value)} placeholder="e.g. 1840"
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3" />
          </div>
          <div className="col-span-2">
            <label className="block text-[8px] text-vastu-text-3 uppercase tracking-[1px] mb-1">Initial Notes</label>
            <textarea value={npNotes} onChange={(e) => setNpNotes(e.target.value)} placeholder="Client concerns…" rows={3}
              className="w-full px-[9px] py-[6px] bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[5px] text-vastu-text font-sans text-[12px] outline-none focus:border-gold-3 resize-none leading-relaxed" />
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
