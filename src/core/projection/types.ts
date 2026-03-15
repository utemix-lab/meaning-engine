/**
 * Projection pipeline types.
 * See docs/spec/PROJECTION_SPEC.md
 */

import type { NodeData } from '../types/graph';

// ── Semantic Role ───────────────────────────────────────────────────────

export const SemanticRole = {
  FOCUS: 'focus',
  NEIGHBOR: 'neighbor',
  STRUCTURAL: 'structural',
  CONTEXT: 'context',
  PERIPHERAL: 'peripheral',
  HIDDEN: 'hidden',
} as const;

export type SemanticRole = typeof SemanticRole[keyof typeof SemanticRole];

// ── Focus ───────────────────────────────────────────────────────────────

export interface Focus {
  nodeId: string | null;
  path: string[];
}

// ── Context configs (Phase 4b–4d) ──────────────────────────────────────

export interface WorkbenchConfig {
  id: string;
  label: string;
  /** Domain IDs that compose this workbench lens */
  domains: string[];
}

export interface CharacterConfig {
  id: string;
  label: string;
  /** Workbench IDs this character has access to */
  workbenches: string[];
}

/**
 * Context hierarchy:
 *   Domain     = semantic entry axis
 *   Workbench  = configured operational context over domains
 *   Character  = organizer of available workbench contexts
 *
 * Character ≠ union lens. Character → {available workbenches}.
 * P_char(G, F, Char, selected=Wb_k) = P_wb(G, F, Wb_k)
 */
export interface ProjectionParams {
  depth: number;
  visibilityMode: 'all' | 'scope';
  domainId?: string | null;
  workbenchId?: string | null;
  workbenches?: WorkbenchConfig[];
  characterId?: string | null;
  characters?: CharacterConfig[];
}

// ── Projection intermediate structures ──────────────────────────────────

export interface FocusState {
  current: NodeData | null;
  parents: NodeData[];
  children: NodeData[];
  neighbors: NodeData[];
  path: NodeData[];
  status: 'valid' | 'invalid' | 'empty';
}

export interface VisibleSubgraph {
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  scope: Set<string>;
  boundary: Set<string>;
}

// ── ViewModel ───────────────────────────────────────────────────────────

export interface NodeMetadata {
  label: string;
  shortDescription?: string;
  narrative?: string;
  formal?: string;
  formula?: string;
  machine?: string;
}

export interface VisualNode {
  id: string;
  label: string;
  type: string;
  role: string;
  opacity: number;
  metadata: NodeMetadata;
}

export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  opacity: number;
  touchesFocus: boolean;
}

export interface SystemInfo {
  enginePhase: string;
  activeFormula: string;
  satisfiedInvariants: string[];
  relatedSpecs: string[];
  transitions: {
    select: boolean;
    drillDown: boolean;
    drillUp: boolean;
    reset: boolean;
  };
}

export interface ViewModel {
  scene: { nodes: VisualNode[]; edges: VisualEdge[] };
  panels: {
    focusNode: NodeData | null;
    neighbors: NodeData[];
    breadcrumbs: { id: string; label: string }[];
  };
  navigation: {
    canDrillUp: boolean;
    canDrillDown: boolean;
    path: string[];
  };
  meta: {
    totalNodes: number;
    visibleNodes: number;
    projectionParams: ProjectionParams;
  };
  system: SystemInfo;
}

export type ProjectionResult =
  | { ok: true; viewModel: ViewModel }
  | { ok: false; errors: string[] };

// ── Factory functions ───────────────────────────────────────────────────

export function defaultParams(): ProjectionParams {
  return {
    depth: 1,
    visibilityMode: 'all',
    domainId: null,
    workbenchId: null,
    workbenches: [],
    characterId: null,
    characters: [],
  };
}

export function emptyFocus(): Focus {
  return { nodeId: null, path: [] };
}
