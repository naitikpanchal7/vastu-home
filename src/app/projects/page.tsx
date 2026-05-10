"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import Topbar from "@/components/layout/Topbar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useProjects } from "@/hooks/useProjects";
import { useUser } from "@/hooks/useUser";
import type { ProjectStatus, PropertyType } from "@/lib/types";

const FILTERS: { label: string; value: "all" | ProjectStatus }[] = [
  { label: "All",   value: "all" },
  { label: "Draft", value: "draft" },
];

export default function ProjectsPage() {
  const router = useRouter();
  const { filteredProjects, searchQuery, statusFilter, setSearchQuery, setStatusFilter, createProject, toggleStatus, deleteProject } = useProjects();
  const { subscription } = useUser();

  const [showNewProject, setShowNewProject] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [npName, setNpName]       = useState("");
  const [npClient, setNpClient]   = useState("");
  const [npContact, setNpContact] = useState("");
  const [npAddress, setNpAddress] = useState("");
  const [npType, setNpType]       = useState<PropertyType>("Residential");
  const [npArea, setNpArea]       = useState("");
  const [npNotes, setNpNotes]     = useState("");

  const projectsAtLimit = subscription && subscription.projects_limit !== -1 && subscription.projects_used >= subscription.projects_limit;

  const openNewProject = () => {
    if (projectsAtLimit) { setShowLimitModal(true); return; }
    setCreateError(null);
    setShowNewProject(true);
  };

  const handleCreate = async () => {
    if (!npName.trim() || !npClient.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const project = await createProject({
        name: npName, clientName: npClient, clientContact: npContact || undefined,
        propertyAddress: npAddress || undefined, propertyType: npType,
        areaSqFt: npArea ? parseFloat(npArea) : undefined, notes: npNotes || undefined,
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

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await deleteProject(id);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  return (
    <AppShell>
      <Topbar
        title="All Projects"
        actions={
          <Button variant="primary" size="sm" onClick={openNewProject}>＋ New Project</Button>
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
                className="bg-bg-3 border border-[rgba(100,70,20,0.20)] rounded-[8px] overflow-hidden cursor-pointer transition-all duration-150 hover:border-gold-3 hover:-translate-y-[2px] hover:shadow-[0_4px_16px_rgba(100,70,20,0.12)] relative group"
              >
                <div className="h-[90px] bg-bg-2 flex items-center justify-center border-b border-[rgba(100,70,20,0.12)]">
                  <span className="text-[36px] opacity-20">🏠</span>
                </div>
                {/* Delete button — appears on hover */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                  title="Delete project"
                  className="absolute top-[7px] right-[7px] w-[22px] h-[22px] rounded-[5px] bg-bg border border-[rgba(200,80,80,0.25)] text-[9px] text-red-400 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-150 hover:bg-red-950/40 hover:border-red-500/50 z-10"
                >
                  ✕
                </button>
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

      {/* Delete Confirmation Modal */}
      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Project"
        subtitle="This action cannot be undone. The project and all its floors will be permanently deleted."
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>Cancel</Button>
            <button
              onClick={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
              disabled={deleting}
              className="px-3 py-[5px] rounded-md bg-red-900/40 border border-red-700/40 text-red-300 font-sans font-medium text-[11px] hover:bg-red-900/60 hover:border-red-600/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete Project"}
            </button>
          </>
        }
      >
        <p className="text-[12px] text-vastu-text-2">
          Are you sure you want to delete{" "}
          <span className="text-vastu-text font-medium">
            {filteredProjects.find((p) => p.id === confirmDeleteId)?.name ?? "this project"}
          </span>
          ?
        </p>
      </Modal>

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
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create Project →"}
            </Button>
          </>
        }
      >
        {createError && (
          <div className="mb-3 px-3 py-2 bg-[rgba(200,60,40,0.08)] border border-[rgba(200,60,40,0.25)] rounded-[6px] text-[11px] text-red-400 flex items-center justify-between gap-3">
            <span>{createError}</span>
            {createError.toLowerCase().includes("limit") && (
              <a href="/settings/billing?reason=projects_limit" className="text-[10px] px-2 py-1 bg-gold-2 text-[#faf7f0] rounded-[4px] hover:bg-gold transition-colors whitespace-nowrap flex-shrink-0">Upgrade →</a>
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
              <a href="/settings/billing?reason=projects_limit" className="px-4 py-[7px] text-[11px] bg-gold-2 text-[#faf7f0] rounded-[7px] hover:bg-gold transition-colors font-medium">Upgrade Plan →</a>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
