/**
 * Build GraphModel from canonical statements — Phase 4.5
 *
 * Formula: G = BuildGraph(Statements where status = canonical)
 *
 * Mapping rules:
 *   (S, 'type',  {literal: v})  → node S gets type = v
 *   (S, 'label', {literal: v})  → node S gets label = v
 *   (S, P,       {entity: id})  → edge S → id with type = P
 *
 * All entity IDs (subjects + entity objects) become nodes.
 * Literal-predicate statements become node properties.
 * Entity-to-entity statements become edges.
 */

import { GraphModel } from '../GraphModel.js';

/**
 * Reserved predicates that map to node properties rather than edges.
 * @type {Set<string>}
 */
const NODE_PROPERTY_PREDICATES = new Set(['type', 'label', 'isStart']);

/**
 * Build a GraphModel from an array of canonical statements.
 *
 * @param {import('./types.js').Statement[]} statements - should all be canonical
 * @returns {GraphModel}
 */
export function buildGraphFromStatements(statements) {
  /** @type {Map<string, { id: string, type: string, label: string, [k: string]: any }>} */
  const nodeMap = new Map();
  /** @type {Array<{ id: string, source: string, target: string, type: string }>} */
  const edges = [];

  function ensureNode(id) {
    if (!nodeMap.has(id)) {
      nodeMap.set(id, { id, type: 'unknown', label: id });
    }
  }

  let edgeIdx = 0;

  for (const stmt of statements) {
    ensureNode(stmt.subject);

    if (stmt.object.kind === 'literal') {
      if (NODE_PROPERTY_PREDICATES.has(stmt.predicate)) {
        const node = nodeMap.get(stmt.subject);
        node[stmt.predicate] = stmt.object.value;
      }
    } else if (stmt.object.kind === 'entity') {
      ensureNode(stmt.object.id);

      if (!NODE_PROPERTY_PREDICATES.has(stmt.predicate)) {
        edges.push({
          id: stmt.id || `e-${edgeIdx++}`,
          source: stmt.subject,
          target: stmt.object.id,
          type: stmt.predicate,
        });
      }
    }
  }

  const nodes = Array.from(nodeMap.values());
  return new GraphModel({ nodes, links: edges });
}
