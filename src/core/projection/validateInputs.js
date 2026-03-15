/**
 * Step 1 of projection pipeline.
 *
 * Formula:
 *   Valid(G, F, S, P) → { valid: bool, errors: string[] }
 *
 * Meaning:
 *   Validates that all projection inputs conform to expected structure
 *   before any computation begins.
 *
 * Definitions:
 *   G = GraphModel (must have getNodes, getEdges, getNodeById)
 *   F = Focus { nodeId, path } — nodeId must exist in G if not null
 *   S = Schema { nodeTypes, edgeTypes } — type allowlists
 *   P = ProjectionParams { depth ≥ 0 }
 *
 * Guarantees:
 *   - no side effects
 *   - returns { valid: true } only if all checks pass
 *   - returns { valid: false, errors } with every violation listed
 *   - dangling edge detection (source/target not in graph)
 *   - unknown node type detection (if schema.nodeTypes provided)
 *
 * Phase:
 *   Engine Phase 2 — Projection Engine
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md (Step 1)
 *   - FORMAL_CORE.md (INV-1: Schema Conformance)
 */

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types.js').Focus} focus
 * @param {Object} schema - { nodeTypes: string[], edgeTypes: string[] }
 * @param {import('./types.js').ProjectionParams} params
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateInputs(graph, focus, schema, params) {
  const errors = [];

  if (!graph || typeof graph.getNodes !== 'function') {
    errors.push('graph is not a valid GraphModel');
    return { valid: false, errors };
  }

  const nodes = graph.getNodes();
  const edges = graph.getEdges();

  if (nodes.length === 0) {
    errors.push('graph has no nodes');
  }

  for (const edge of edges) {
    const srcId = resolveEndpointId(edge.source);
    const tgtId = resolveEndpointId(edge.target);
    if (!graph.getNodeById(srcId)) {
      errors.push(`edge ${edge.id}: source "${srcId}" not found`);
    }
    if (!graph.getNodeById(tgtId)) {
      errors.push(`edge ${edge.id}: target "${tgtId}" not found`);
    }
  }

  if (schema && Array.isArray(schema.nodeTypes)) {
    const allowed = new Set(schema.nodeTypes);
    for (const node of nodes) {
      if (node.type && !allowed.has(node.type)) {
        errors.push(`node "${node.id}": unknown type "${node.type}"`);
      }
    }
  }

  if (focus && focus.nodeId !== null && focus.nodeId !== undefined) {
    if (!graph.getNodeById(focus.nodeId)) {
      errors.push(`focus nodeId "${focus.nodeId}" not found in graph`);
    }
  }

  if (params) {
    if (typeof params.depth !== 'number' || params.depth < 0) {
      errors.push(`params.depth must be a non-negative number, got ${params.depth}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function resolveEndpointId(endpoint) {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object' && endpoint.id) return endpoint.id;
  return String(endpoint);
}
