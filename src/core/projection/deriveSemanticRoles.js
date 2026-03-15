/**
 * Step 4 of projection pipeline.
 *
 * Formula:
 *   Roles = D(G, VS, FocusState)
 *
 * Meaning:
 *   Assigns a semantic role to every node in the graph based on its
 *   relationship to the focus node and its position in the subgraph.
 *
 * Definitions:
 *   G          = valid typed graph (GraphModel)
 *   VS         = VisibleSubgraph (from Step 3)
 *   FocusState = resolved focus (from Step 2)
 *   Roles      = Map<nodeId, SemanticRole>
 *   SemanticRole = focus | neighbor | structural | context | peripheral | hidden
 *
 * Role assignment priority (highest to lowest):
 *   1. focus      — the current focus node
 *   2. neighbor   — directly connected to focus
 *   3. structural — root/hub ancestor of focus
 *   4. peripheral — on BFS boundary
 *   5. context    — within BFS scope but not above
 *   6. hidden     — outside scope
 *
 * Guarantees:
 *   - every node gets exactly one role (exhaustive, non-overlapping)
 *   - if no focus → no node gets 'focus' or 'neighbor' role
 *   - deterministic: same inputs → same role map
 *   - no side effects
 *
 * Phase:
 *   Engine Phase 2 — Projection Engine
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md (Step 4)
 */

import { SemanticRole } from './types';

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types').VisibleSubgraph} subgraph
 * @param {import('./types').FocusState} focusState
 * @returns {Map<string, string>}
 */
export function deriveSemanticRoles(graph, subgraph, focusState) {
  /** @type {Map<string, string>} */
  const roles = new Map();

  const neighborIds = focusState.current
    ? new Set(focusState.neighbors.map((n) => n.id))
    : new Set();

  const structuralAncestors = focusState.current
    ? collectStructuralAncestors(graph, focusState)
    : new Set();

  for (const nodeId of subgraph.nodeIds) {
    if (focusState.current && nodeId === focusState.current.id) {
      roles.set(nodeId, SemanticRole.FOCUS);
    } else if (neighborIds.has(nodeId)) {
      roles.set(nodeId, SemanticRole.NEIGHBOR);
    } else if (structuralAncestors.has(nodeId)) {
      roles.set(nodeId, SemanticRole.STRUCTURAL);
    } else if (subgraph.boundary.has(nodeId)) {
      roles.set(nodeId, SemanticRole.PERIPHERAL);
    } else if (subgraph.scope.has(nodeId)) {
      roles.set(nodeId, SemanticRole.CONTEXT);
    } else {
      roles.set(nodeId, SemanticRole.HIDDEN);
    }
  }

  return roles;
}

/**
 * Walks up parent edges from focus to find structural ancestors
 * (nodes of type 'root' or 'hub' that are parents of focus).
 */
function collectStructuralAncestors(graph, focusState) {
  const ancestors = new Set();
  const visited = new Set();
  const queue = [...focusState.parents.map((p) => p.id)];

  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);

    const node = graph.getNodeById(id);
    if (!node) continue;

    if (node.type === 'root' || node.type === 'hub') {
      ancestors.add(id);
    }

    const edges = graph.getEdges();
    for (const edge of edges) {
      const tgtId = resolveId(edge.target);
      const srcId = resolveId(edge.source);
      if (tgtId === id && !visited.has(srcId)) {
        queue.push(srcId);
      }
    }
  }

  return ancestors;
}

function resolveId(endpoint) {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object' && endpoint.id) return endpoint.id;
  return String(endpoint);
}
