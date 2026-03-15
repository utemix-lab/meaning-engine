/**
 * Step 2 of projection pipeline.
 *
 * Formula:
 *   FocusState = R(G, F)
 *
 * Meaning:
 *   Resolves a Focus descriptor into a rich FocusState by looking up
 *   the node, its neighbors, parents, children, and path in the graph.
 *
 * Definitions:
 *   G          = valid typed graph (GraphModel)
 *   F          = Focus { nodeId, path }
 *   FocusState = { current, parents, children, neighbors, path, status }
 *   status     = 'valid' | 'invalid' | 'empty'
 *
 * Guarantees:
 *   - if F.nodeId is null → status = 'empty', all arrays empty
 *   - if F.nodeId not in G → status = 'invalid'
 *   - if F.nodeId in G → status = 'valid', relations populated
 *   - no side effects
 *
 * Phase:
 *   Engine Phase 2 — Projection Engine
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md (Step 2)
 */

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types.js').Focus} focus
 * @returns {import('./types.js').FocusState}
 */
export function resolveFocus(graph, focus) {
  if (!focus || focus.nodeId === null || focus.nodeId === undefined) {
    return {
      current: null,
      parents: [],
      children: [],
      neighbors: [],
      path: [],
      status: 'empty',
    };
  }

  const current = graph.getNodeById(focus.nodeId);
  if (!current) {
    return {
      current: null,
      parents: [],
      children: [],
      neighbors: [],
      path: [],
      status: 'invalid',
    };
  }

  const edges = graph.getEdges();
  const parents = [];
  const children = [];
  const neighborIds = graph.getNeighbors(focus.nodeId);
  const neighbors = [];

  for (const nId of neighborIds) {
    const node = graph.getNodeById(nId);
    if (node) neighbors.push(node);
  }

  for (const edge of edges) {
    const srcId = resolveId(edge.source);
    const tgtId = resolveId(edge.target);

    if (tgtId === focus.nodeId) {
      const parent = graph.getNodeById(srcId);
      if (parent) parents.push(parent);
    }
    if (srcId === focus.nodeId) {
      const child = graph.getNodeById(tgtId);
      if (child) children.push(child);
    }
  }

  const path = (focus.path || [])
    .map((id) => graph.getNodeById(id))
    .filter(Boolean);

  return {
    current,
    parents,
    children,
    neighbors,
    path,
    status: 'valid',
  };
}

function resolveId(endpoint) {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object' && endpoint.id) return endpoint.id;
  return String(endpoint);
}
