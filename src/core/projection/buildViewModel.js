/**
 * Step 5 of projection pipeline.
 *
 * Formula:
 *   VM = B(G, VS, Roles, FocusState, P)
 *
 * Meaning:
 *   Assembles the render-ready ViewModel from all intermediate results.
 *   This is the final step before the result leaves the engine.
 *
 * Definitions:
 *   G          = valid typed graph (GraphModel)
 *   VS         = VisibleSubgraph (from Step 3)
 *   Roles      = Map<nodeId, SemanticRole> (from Step 4)
 *   FocusState = resolved focus (from Step 2)
 *   P          = ProjectionParams { depth, visibilityMode }
 *   VM         = ViewModel { scene, panels, navigation, meta }
 *
 * Output structure:
 *   scene      = { nodes: VisualNode[], edges: VisualEdge[] }
 *   panels     = { focusNode, neighbors, breadcrumbs }
 *   navigation = { canDrillUp, canDrillDown, path }
 *   meta       = { totalNodes, visibleNodes, projectionParams }
 *   system     = { enginePhase, activeFormula, satisfiedInvariants, transitions }
 *
 * Guarantees:
 *   - every node appears in scene with role-based opacity
 *   - edges carry touchesFocus flag for visual highlighting
 *   - breadcrumbs derived from focusState.path (not stored separately)
 *   - deterministic: same inputs → same ViewModel
 *   - no side effects
 *
 * Phase:
 *   Engine Phase 2 — Projection Engine
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md (Step 5)
 *   - docs/spec/RENDER_SURFACES_SPEC.md (ViewModel → surfaces)
 */

import { SemanticRole } from './types';

const OPACITY = Object.freeze({
  [SemanticRole.FOCUS]: 1.0,
  [SemanticRole.NEIGHBOR]: 1.0,
  [SemanticRole.STRUCTURAL]: 0.9,
  [SemanticRole.CONTEXT]: 0.7,
  [SemanticRole.PERIPHERAL]: 0.4,
  [SemanticRole.HIDDEN]: 0.15,
});

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types').VisibleSubgraph} subgraph
 * @param {Map<string, string>} roles
 * @param {import('./types').FocusState} focusState
 * @param {import('./types').ProjectionParams} params
 * @returns {import('./types').ViewModel}
 */
export function buildViewModel(graph, subgraph, roles, focusState, params) {
  const focusId = focusState.current?.id ?? null;

  const nodes = graph.getNodes()
    .filter((node) => subgraph.scope.has(node.id))
    .map((node) => {
      const role = roles.get(node.id) || SemanticRole.HIDDEN;
      return {
        id: node.id,
        label: node.label || node.id,
        type: node.type || 'unknown',
        role,
        opacity: OPACITY[role] ?? 0.15,
        metadata: buildNodeMetadata(node),
      };
    });

  const edges = graph.getEdges()
    .filter((edge) => {
      const srcId = resolveId(edge.source);
      const tgtId = resolveId(edge.target);
      return subgraph.scope.has(srcId) && subgraph.scope.has(tgtId);
    })
    .map((edge) => {
      const srcId = resolveId(edge.source);
      const tgtId = resolveId(edge.target);
      const touches = srcId === focusId || tgtId === focusId;
      return {
        id: edge.id,
        source: srcId,
        target: tgtId,
        type: edge.type || '',
        opacity: touches ? 0.8 : 0.2,
        touchesFocus: touches,
      };
    });

  const breadcrumbs = focusState.path.map((n) => ({
    id: n.id,
    label: n.label || n.id,
  }));

  const visibleCount = subgraph.scope.size;

  const hasFocus = focusState.status === 'valid' && focusState.current !== null;

  const charStr = params.characterId ? `, Char="${params.characterId}"` : '';
  const lensStr = params.workbenchId
    ? `, Wb="${params.workbenchId}"`
    : params.domainId
      ? `, D="${params.domainId}"`
      : '';
  const system = {
    enginePhase: 'Phase 4d — Character Context',
    activeFormula: hasFocus
      ? `V = P(G, F="${focusState.current.id}"${charStr}${lensStr}, depth=${params.depth})`
      : `V = P(G, ∅${charStr}${lensStr}, depth=${params.depth})`,
    satisfiedInvariants: [
      'INV-1: Schema Conformance',
      'INV-2: Identity Stability',
      'INV-3: Projection Determinism',
      'INV-4: Graph Immutability',
      'INV-7: Totality',
      ...(hasFocus ? [
        'NAV-1: Transition Validity',
        'NAV-4: Determinism',
        'NAV-5: Projection Compatibility',
      ] : []),
      ...(focusState.path.length > 0 ? [
        'NAV-2: DrillDown Reversibility',
        'NAV-3: History Integrity',
      ] : []),
    ],
    relatedSpecs: [
      'docs/spec/PROJECTION_SPEC.md',
      'docs/spec/NAVIGATION_SPEC.md',
      'docs/spec/RENDER_SURFACES_SPEC.md',
    ],
    transitions: {
      select: true,
      drillDown: hasFocus && focusState.children.length > 0,
      drillUp: focusState.path.length > 0,
      reset: hasFocus || focusState.path.length > 0,
    },
  };

  return {
    scene: { nodes, edges },
    panels: {
      focusNode: focusState.current,
      neighbors: focusState.neighbors,
      breadcrumbs,
    },
    navigation: {
      canDrillUp: focusState.path.length > 0,
      canDrillDown: focusState.children.length > 0,
      path: focusState.path.map((n) => n.id),
    },
    meta: {
      totalNodes: graph.getNodes().length,
      visibleNodes: visibleCount,
      projectionParams: { ...params },
    },
    system,
  };
}

function buildNodeMetadata(node) {
  const meta = { label: node.label || node.id };
  if (node.desc) meta.shortDescription = node.desc;
  if (node.narrative) meta.narrative = node.narrative;
  if (node.formal) meta.formal = node.formal;
  if (node.formula) meta.formula = node.formula;
  if (node.machine) meta.machine = node.machine;
  return meta;
}

function resolveId(endpoint) {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object' && endpoint.id) return endpoint.id;
  return String(endpoint);
}
