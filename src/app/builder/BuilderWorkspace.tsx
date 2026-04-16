'use client';

import { useState, useEffect, useRef } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { useCadStore } from '@/store/cadStore';
import { useProjectStore } from '@/store/projectStore';
import PaperCanvas from '@/components/cad/PaperCanvas';
import ToolPanel from '@/components/cad/ToolPanel';
import RightPanel from '@/components/panels/RightPanel';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { Floor, Project } from '@/lib/types';
import type { CADTool } from '@/lib/paper-geometry/types';

interface ExportModalState { open: boolean }

export default function BuilderWorkspace() {
  const store = useCanvasStore();
  const cadStore = useCadStore();
  const projectStore = useProjectStore();
  const [exportModal, setExportModal] = useState<ExportModalState>({ open: false });
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const autoCreatedRef = useRef(false);

  const {
    northDeg, projectName, clientName, projectId,
    chakraVisible, undoStack,
    setNorth, toggleChakra, setChakraOpacity, chakraOpacity,
    undo,
    floors, currentFloorId, addFloor, switchFloor, deleteFloor, renameFloor,
  } = store;

  // Persist floors to projectStore whenever floors change
  const persistFloors = () => {
    const pid = store.projectId;
    if (pid) {
      projectStore.updateProject(pid, { floors: store.getProjectFloors() });
    }
  };

  // Auto-create project when first wall is drawn
  useEffect(() => {
    if (cadStore.walls.length === 1 && !projectId && !autoCreatedRef.current) {
      autoCreatedRef.current = true;
      const now = new Date().toISOString();
      const id = `proj-${Date.now()}`;
      const project: Project = {
        id,
        consultantId: 'local',
        name: projectName || 'Untitled Project',
        clientName: clientName || '',
        propertyType: 'Residential',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      projectStore.addProject(project);
      store.setProjectId(id);
    }
  }, [cadStore.walls.length, projectId, projectName, clientName, projectStore, store]);

  const startEditingName = () => {
    setNameValue(projectName || 'Untitled Project');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  };

  const commitName = () => {
    const trimmed = nameValue.trim() || 'Untitled Project';
    store.setProjectName(trimmed);
    if (projectId) {
      projectStore.updateProject(projectId, { name: trimmed });
    } else if (!autoCreatedRef.current) {
      autoCreatedRef.current = true;
      const now = new Date().toISOString();
      const id = `proj-${Date.now()}`;
      const project: Project = {
        id,
        consultantId: 'local',
        name: trimmed,
        clientName: clientName || '',
        propertyType: 'Residential',
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      };
      projectStore.addProject(project);
      store.setProjectId(id);
    }
    setEditingName(false);
  };

  // CAD quick-access tool buttons for topbar
  const CAD_QUICK_TOOLS: { id: CADTool; icon: string; title: string }[] = [
    { id: 'select',    icon: '⊹', title: 'Select / Pan' },
    { id: 'wall_line', icon: '╱', title: 'Line Wall (draw walls)' },
    { id: 'wall_arc',  icon: '⌒', title: 'Arc Wall' },
    { id: 'door',      icon: '⌐', title: 'Place Door' },
    { id: 'window',    icon: '▯', title: 'Place Window' },
    { id: 'split',     icon: '⊣', title: 'Split Wall' },
    { id: 'delete',    icon: '✕', title: 'Delete Element' },
    { id: 'cut',       icon: '◌', title: 'Draw Vastu Cut' },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Topbar */}
      <div className="h-[42px] bg-bg-2 border-b border-[rgba(200,175,120,0.15)] flex items-center px-[11px] gap-[7px] flex-shrink-0 overflow-hidden">
        {/* Project name */}
        <div className="min-w-0 flex-shrink-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              autoFocus
              className="font-serif text-[14px] font-medium text-vastu-text bg-bg-3 border border-gold-3 rounded-[3px] px-1 outline-none max-w-[200px]"
            />
          ) : (
            <div
              className="font-serif text-[14px] font-medium text-vastu-text whitespace-nowrap truncate max-w-[180px] cursor-text hover:text-gold-2 transition-colors group flex items-center gap-[4px]"
              onClick={startEditingName}
              title="Click to rename"
            >
              {projectName || 'Untitled Project'}
              <span className="text-[9px] text-vastu-text-3 opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
            </div>
          )}
          {clientName && (
            <div className="text-[9px] text-vastu-text-3 whitespace-nowrap">{clientName}</div>
          )}
        </div>

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        {/* North input */}
        <span className="text-[10px] text-vastu-text-3 whitespace-nowrap flex-shrink-0">🧭 N:</span>
        <input
          type="number"
          value={northDeg.toFixed(1)}
          min={0}
          max={360}
          step={0.5}
          onChange={(e) => setNorth(parseFloat(e.target.value) || 0)}
          className="w-[54px] px-[6px] py-[3px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[4px] text-gold-2 font-mono text-[11px] font-semibold outline-none focus:border-gold-3 flex-shrink-0"
        />

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        {/* Quick tool buttons */}
        <div className="flex gap-[2px]">
          {CAD_QUICK_TOOLS.map((t) => (
            <button
              key={t.id}
              title={t.title}
              onClick={() => cadStore.setActiveTool(t.id)}
              className={`w-[27px] h-[27px] flex items-center justify-center rounded-[5px] text-[12px] cursor-pointer transition-all duration-[120ms] border font-sans ${
                cadStore.activeTool === t.id
                  ? 'bg-[rgba(200,175,120,0.15)] border-gold text-gold-2'
                  : 'bg-bg-3 border-[rgba(200,175,120,0.15)] text-vastu-text-2 hover:border-gold-3 hover:text-gold-2'
              }`}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Unit selector */}
        <select
          value={cadStore.unit}
          onChange={(e) =>
            cadStore.setUnit(e.target.value as 'ft' | 'm', cadStore.pixelsPerUnit)
          }
          className="px-[6px] py-[3px] bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[4px] text-vastu-text-2 font-mono text-[10px] outline-none focus:border-gold-3 cursor-pointer"
        >
          <option value="ft">ft</option>
          <option value="m">m</option>
        </select>

        {/* Import floor plan image */}
        <label className="cursor-pointer flex-shrink-0">
          <input
            type="file"
            accept="image/*,.svg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              store.setFloorPlanImage(url);
              e.target.value = '';
            }}
          />
          <span className="inline-flex items-center gap-1 text-[10px] px-[9px] py-[5px] bg-bg-3 border border-[rgba(200,175,120,0.15)] text-vastu-text-2 rounded-md hover:border-gold-3 hover:text-gold-2 cursor-pointer font-sans transition-colors">
            📂 Import
          </span>
        </label>

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        {/* Undo / Redo */}
        <button
          onClick={() => { cadStore.undo(); undo(); }}
          disabled={!cadStore.canUndo() && undoStack.length === 0}
          title="Undo (Ctrl+Z)"
          className="text-[10px] px-[5px] py-[2px] rounded-[3px] cursor-pointer text-vastu-text-3 hover:text-gold-2 disabled:opacity-30 disabled:cursor-default bg-transparent border-none transition-colors"
        >
          ↩ Undo
        </button>

        <button
          onClick={() => cadStore.redo()}
          disabled={!cadStore.canRedo()}
          title="Redo"
          className="text-[10px] px-[5px] py-[2px] rounded-[3px] cursor-pointer text-vastu-text-3 hover:text-gold-2 disabled:opacity-30 disabled:cursor-default bg-transparent border-none transition-colors"
        >
          ↪ Redo
        </button>

        <div className="w-[1px] h-4 bg-[rgba(200,175,120,0.15)] flex-shrink-0" />

        <Button
          variant="ghost"
          className="text-[10px] py-1 px-[9px]"
          onClick={toggleChakra}
        >
          ◎ {chakraVisible ? 'Hide' : 'Show'} Chakra
        </Button>

        {/* Chakra opacity slider (inline) */}
        {chakraVisible && (
          <input
            type="range"
            min={10}
            max={80}
            value={Math.round(chakraOpacity * 100)}
            onChange={(e) => setChakraOpacity(parseInt(e.target.value))}
            className="w-[60px] accent-gold cursor-pointer"
            title={`Chakra opacity: ${Math.round(chakraOpacity * 100)}%`}
          />
        )}

        <Button
          variant="primary"
          className="text-[10px] py-1 px-[9px]"
          onClick={() => setExportModal({ open: true })}
        >
          ⎙ Export
        </Button>
      </div>

      {/* Floor Tabs */}
      <FloorTabs
        floors={floors}
        currentFloorId={currentFloorId}
        onSwitch={(id) => { switchFloor(id); persistFloors(); }}
        onAdd={() => { addFloor(); persistFloors(); }}
        onDelete={(id) => { deleteFloor(id); persistFloors(); }}
        onRename={(id, name) => { renameFloor(id, name); persistFloors(); }}
      />

      {/* Main workspace: ToolPanel | Canvas | RightPanel */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        <ToolPanel />
        <PaperCanvas />
        <RightPanel onExport={() => setExportModal({ open: true })} />
      </div>

      {/* Export Modal */}
      <Modal
        open={exportModal.open}
        onClose={() => setExportModal({ open: false })}
        title="⎙ Export Report"
        subtitle="Select what to include in the PDF report for your client."
        wide
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportModal({ open: false })}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setExportModal({ open: false })}
            >
              ⎙ Generate PDF
            </Button>
          </>
        }
      >
        {[
          {
            section: 'Cover Page',
            items: [
              'Project name, client name, consultant name, date',
              'Company logo (upload in Settings)',
            ],
          },
          {
            section: 'Floor Plan',
            items: [
              'Floor plan image (clean, no overlay)',
              'Floor plan with Vastu Shakti Chakra overlay',
              'Floor plan with cuts highlighted',
            ],
          },
          {
            section: 'Analysis',
            items: [
              'Zone area table (all 16 zones)',
              'Bar Graph: Zone area distribution',
              'Bar Graph: Cut area by zone',
            ],
          },
          {
            section: 'Recommendations',
            items: [
              'AI-generated zone-by-zone recommendations',
              'Remedy suggestions (non-demolition)',
              'Classical text references (Vishwakarma Prakash)',
            ],
          },
        ].map(({ section, items }) => (
          <div key={section}>
            <div className="text-[9px] text-vastu-text-3 uppercase tracking-[1px] my-[9px] pb-[3px] border-b border-[rgba(200,175,120,0.08)]">
              {section}
            </div>
            <div className="flex flex-col gap-[5px]">
              {items.map((item, i) => (
                <label
                  key={i}
                  className="flex items-center gap-2 px-[7px] py-[5px] rounded-[4px] bg-bg-3 cursor-pointer text-[11px] text-vastu-text-2"
                >
                  <input
                    type="checkbox"
                    defaultChecked={i === 0}
                    className="accent-gold cursor-pointer"
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="mt-[10px] p-[9px] bg-bg-3 border border-[rgba(200,175,120,0.08)] rounded-[6px] text-[9px] text-vastu-text-3">
          PDF generation requires completing the floor plan analysis first. Draw your
          walls, auto-detect Brahmasthan, and confirm to unlock full export.
        </div>
      </Modal>
    </div>
  );
}

// ── Floor Tabs ────────────────────────────────────────────────────────────────

interface FloorTabsProps {
  floors: Floor[];
  currentFloorId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function FloorTabs({
  floors,
  currentFloorId,
  onSwitch,
  onAdd,
  onDelete,
  onRename,
}: FloorTabsProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const startRename = (floor: Floor) => {
    setRenamingId(floor.id);
    setRenameValue(floor.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (renamingId) {
      const trimmed = renameValue.trim();
      if (trimmed) onRename(renamingId, trimmed);
    }
    setRenamingId(null);
  };

  return (
    <div className="h-[30px] bg-bg-2 border-b border-[rgba(200,175,120,0.15)] flex items-center px-[9px] gap-[2px] flex-shrink-0 overflow-x-auto">
      {floors
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((floor) => {
          const isActive = floor.id === currentFloorId;
          return (
            <div
              key={floor.id}
              onClick={() => !isActive && onSwitch(floor.id)}
              className={`flex items-center gap-[5px] px-[8px] h-[22px] rounded-[4px] text-[10px] font-mono flex-shrink-0 cursor-pointer select-none transition-all duration-[120ms] border ${
                isActive
                  ? 'bg-[rgba(200,175,120,0.12)] border-[rgba(200,175,120,0.4)] text-gold-2'
                  : 'bg-transparent border-transparent text-vastu-text-3 hover:bg-[rgba(200,175,120,0.06)] hover:text-vastu-text-2'
              }`}
            >
              <span className="text-[8px] opacity-50">◫</span>
              {renamingId === floor.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-bg-3 border border-gold-3 rounded-[3px] px-[4px] text-[10px] font-mono text-vastu-text outline-none w-[80px]"
                  autoFocus
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startRename(floor);
                  }}
                >
                  {floor.name}
                </span>
              )}
              {floors.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(floor.id);
                  }}
                  className="ml-[1px] text-[9px] text-vastu-text-3 hover:text-red-400 transition-colors leading-none cursor-pointer bg-transparent border-none"
                  title={`Delete ${floor.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}

      <button
        onClick={onAdd}
        title="Add new floor"
        className="flex items-center gap-[3px] px-[6px] h-[22px] rounded-[4px] text-[10px] font-mono text-vastu-text-3 hover:text-gold-2 hover:bg-[rgba(200,175,120,0.06)] transition-all border border-transparent hover:border-[rgba(200,175,120,0.15)] cursor-pointer bg-transparent flex-shrink-0"
      >
        <span className="text-[11px] leading-none">+</span>
        <span>Floor</span>
      </button>
    </div>
  );
}
