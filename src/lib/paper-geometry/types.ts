// src/lib/paper-geometry/types.ts
// CAD entity types for the Paper.js-based floor plan builder

export type CADTool =
  | 'select'         // selection, pan, move
  | 'wall_line'      // draw straight wall chain
  | 'wall_arc'       // draw 3-point arc wall
  | 'wall_bezier'    // draw bezier curve wall
  | 'door'           // place door on wall
  | 'window'         // place window on wall
  | 'split'          // split wall segment at click point
  | 'delete'         // delete element at click
  | 'extend'         // extend / trim wall to another wall
  | 'cut'            // draw Vastu cut region (polygon)
  | 'furniture';     // place furniture from library

export interface CADNode {
  id: string;
  x: number;
  y: number;
}

export type WallType = 'line' | 'arc' | 'bezier';

export interface CADWall {
  id: string;
  type: WallType;
  startNodeId: string;
  endNodeId: string;
  // Visual thickness in project pixels
  thickness: number;
  color: string;
  material?: string;
  name?: string;
  locked: boolean;
  // Arc wall: through-point (stored inline, not a CADNode)
  arcThroughX?: number;
  arcThroughY?: number;
  // Bezier wall: control handles
  cp1x?: number;
  cp1y?: number;
  cp2x?: number;
  cp2y?: number;
}

export type OpeningType =
  | 'door'
  | 'main_door'
  | 'window'
  | 'sliding_door'
  | 'opening';

export interface CADOpening {
  id: string;
  wallId: string;
  type: OpeningType;
  /** Position along wall: 0 = start node, 1 = end node */
  positionAlongWall: number;
  /** Opening width in project pixels */
  widthPx: number;
  swingDirection?: 'left' | 'right' | 'both';
  /** Swing arc angle in degrees (0-180) */
  swingAngle?: number;
  isMainEntrance?: boolean;
  locked: boolean;
}

export interface FurnitureTemplate {
  id: string;
  label: string;
  defaultWidthPx: number;
  defaultHeightPx: number;
  color: string;
  category: 'bedroom' | 'kitchen' | 'bathroom' | 'living' | 'dining' | 'office' | 'other';
}

export interface CADFurniture {
  id: string;
  templateId: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  widthPx: number;
  heightPx: number;
  locked: boolean;
  visible: boolean;
  color: string;
}

export interface CADCut {
  id: string;
  label: string;
  points: { x: number; y: number }[];
}

export type CADSelectedItem =
  | { type: 'wall'; id: string }
  | { type: 'node'; id: string }
  | { type: 'opening'; id: string }
  | { type: 'furniture'; id: string }
  | { type: 'cut'; id: string };

export interface SnapResult {
  x: number;
  y: number;
  type: 'endpoint' | 'midpoint' | 'grid' | 'intersection';
  nodeId?: string;
  wallId?: string;
}

// ── Furniture library ──────────────────────────────────────────────────────────

export const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
  // Bedroom
  { id: 'bed_double', label: 'Double Bed', defaultWidthPx: 90, defaultHeightPx: 120, color: '#8B7355', category: 'bedroom' },
  { id: 'bed_single', label: 'Single Bed', defaultWidthPx: 60, defaultHeightPx: 100, color: '#8B7355', category: 'bedroom' },
  { id: 'wardrobe', label: 'Wardrobe', defaultWidthPx: 80, defaultHeightPx: 30, color: '#6B5E4C', category: 'bedroom' },
  // Living
  { id: 'sofa_3', label: '3-Seat Sofa', defaultWidthPx: 100, defaultHeightPx: 40, color: '#7B6F5A', category: 'living' },
  { id: 'sofa_2', label: '2-Seat Sofa', defaultWidthPx: 70, defaultHeightPx: 40, color: '#7B6F5A', category: 'living' },
  { id: 'tv_unit', label: 'TV Unit', defaultWidthPx: 100, defaultHeightPx: 20, color: '#5A4E3C', category: 'living' },
  { id: 'coffee_table', label: 'Coffee Table', defaultWidthPx: 60, defaultHeightPx: 40, color: '#6B5E4C', category: 'living' },
  // Dining
  { id: 'dining_4', label: 'Dining (4)', defaultWidthPx: 80, defaultHeightPx: 60, color: '#7B6150', category: 'dining' },
  { id: 'dining_6', label: 'Dining (6)', defaultWidthPx: 100, defaultHeightPx: 60, color: '#7B6150', category: 'dining' },
  // Kitchen
  { id: 'kitchen_island', label: 'Kitchen Island', defaultWidthPx: 80, defaultHeightPx: 40, color: '#7A7060', category: 'kitchen' },
  { id: 'counter_l', label: 'L-Counter', defaultWidthPx: 80, defaultHeightPx: 20, color: '#7A7060', category: 'kitchen' },
  // Bathroom
  { id: 'toilet', label: 'Toilet', defaultWidthPx: 30, defaultHeightPx: 40, color: '#B0A898', category: 'bathroom' },
  { id: 'bathtub', label: 'Bathtub', defaultWidthPx: 70, defaultHeightPx: 36, color: '#B0A898', category: 'bathroom' },
  { id: 'wash_basin', label: 'Wash Basin', defaultWidthPx: 30, defaultHeightPx: 20, color: '#B0A898', category: 'bathroom' },
  // Office
  { id: 'desk', label: 'Desk', defaultWidthPx: 80, defaultHeightPx: 40, color: '#6B5E4C', category: 'office' },
  { id: 'chair_office', label: 'Office Chair', defaultWidthPx: 30, defaultHeightPx: 30, color: '#5A4E3C', category: 'office' },
];
