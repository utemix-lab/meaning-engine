/**
 * Trace Operator — Documentation World
 *
 * Builds a directed shortest-path trace between two nodes.
 * When no path exists within maxHops, returns a gap with candidate bridges.
 *
 * Pure, deterministic function — no side effects, no engine changes.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeGraphByRedirects } from './normalizeGraphByRedirects.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const worldDir = resolve(__dir, '..', 'worlds', 'documentation-world');

let _nodes = null;
let _edges = null;

function loadSeed() {
  if (_nodes && _edges) return { nodes: _nodes, edges: _edges };
  const rawNodes = JSON.parse(readFileSync(resolve(worldDir, 'seed.nodes.json'), 'utf-8'));
  const rawEdges = JSON.parse(readFileSync(resolve(worldDir, 'seed.edges.json'), 'utf-8'));
  const normalized = normalizeGraphByRedirects({ nodes: rawNodes, edges: rawEdges });
  _nodes = normalized.nodes;
  _edges = normalized.edges;
  return { nodes: _nodes, edges: _edges };
}

const CANDIDATE_BRIDGE_MAP = [
  {
    gapPattern: { fromType: 'spec', toType: 'evidence' },
    candidateConceptId: 'concept:test-coverage',
    candidateEdges: [
      { source: '{from}', target: 'concept:test-coverage', type: 'constrains' },
      { source: 'concept:test-coverage', target: '{to}', type: 'applies_to' },
    ],
    note: 'spec↔evidence gap: specs should constrain test-coverage, which applies_to evidence',
  },
  {
    gapPattern: { fromType: 'evidence', toType: 'spec' },
    candidateConceptId: 'concept:test-coverage',
    candidateEdges: [
      { source: '{from}', target: 'concept:test-coverage', type: 'proved_by' },
      { source: 'concept:test-coverage', target: '{to}', type: 'refines' },
    ],
    note: 'evidence↔spec gap: evidence proves test-coverage which refines spec',
  },
  {
    gapPattern: { fromType: 'evidence', toType: 'code_artifact' },
    candidateConceptId: 'concept:code-spec-alignment',
    candidateEdges: [
      { source: '{from}', target: 'concept:code-spec-alignment', type: 'proved_by' },
      { source: 'concept:code-spec-alignment', target: '{to}', type: 'applies_to' },
    ],
    note: 'evidence↔code_artifact gap: evidence proves alignment, which applies_to artifact',
  },
  {
    gapPattern: { fromType: 'code_artifact', toType: 'evidence' },
    candidateConceptId: 'concept:code-spec-alignment',
    candidateEdges: [
      { source: '{from}', target: 'concept:code-spec-alignment', type: 'implements' },
      { source: 'concept:code-spec-alignment', target: '{to}', type: 'constrains' },
    ],
    note: 'code_artifact↔evidence gap: artifact implements alignment, which constrains evidence',
  },
  {
    gapPattern: { fromType: 'concept', toType: 'page' },
    candidateConceptId: 'concept:context-anchor',
    candidateEdges: [
      { source: '{from}', target: 'concept:context-anchor', type: 'refines' },
      { source: 'concept:context-anchor', target: '{to}', type: 'applies_to' },
    ],
    note: 'concept↔page gap: add context-anchor as bridge between abstract concept and page',
  },
  {
    gapPattern: { fromType: 'page', toType: 'concept' },
    candidateConceptId: 'concept:context-anchor',
    candidateEdges: [
      { source: '{from}', target: 'concept:context-anchor', type: 'defines' },
      { source: 'concept:context-anchor', target: '{to}', type: 'refines' },
    ],
    note: 'page↔concept gap: page defines context-anchor which refines the concept',
  },
];

/**
 * @param {Object} graph - { nodes: Array, edges: Array } (raw seed format or pre-loaded)
 * @param {string} fromId
 * @param {string} toId
 * @param {{ maxHops?: number, allowedEdgeTypes?: string[] }} [options]
 * @returns {TraceResult}
 */
export function trace(graph, fromId, toId, options = {}) {
  const { maxHops = 6, allowedEdgeTypes = null } = options;

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(fromId)) {
    return { ok: false, reason: 'unknown_node', detail: `fromId not in graph: ${fromId}` };
  }
  if (!nodeMap.has(toId)) {
    return { ok: false, reason: 'unknown_node', detail: `toId not in graph: ${toId}` };
  }

  const outAdj = new Map();
  for (const n of graph.nodes) outAdj.set(n.id, []);
  for (const e of graph.edges) {
    if (allowedEdgeTypes && !allowedEdgeTypes.includes(e.type)) continue;
    outAdj.get(e.source)?.push(e);
  }

  const visited = new Set([fromId]);
  const parent = new Map();
  const queue = [{ id: fromId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (id === toId) {
      const path = reconstructPath(parent, fromId, toId, nodeMap);
      return { ok: true, path, hops: depth };
    }
    if (depth >= maxHops) continue;
    for (const edge of outAdj.get(id) || []) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        parent.set(edge.target, { from: id, edgeType: edge.type });
        queue.push({ id: edge.target, depth: depth + 1 });
      }
    }
  }

  // Also try undirected BFS for gap boundary detection
  const undirAdj = new Map();
  for (const n of graph.nodes) undirAdj.set(n.id, []);
  for (const e of graph.edges) {
    if (allowedEdgeTypes && !allowedEdgeTypes.includes(e.type)) continue;
    undirAdj.get(e.source)?.push({ target: e.target, type: e.type });
    undirAdj.get(e.target)?.push({ target: e.source, type: e.type });
  }

  const fromReachable = bfsReachable(undirAdj, fromId, maxHops);
  const toReachable = bfsReachable(undirAdj, toId, maxHops);

  const fromType = nodeMap.get(fromId)?.type;
  const toType = nodeMap.get(toId)?.type;

  const candidates = findCandidateBridges(fromId, fromType, toId, toType);

  return {
    ok: false,
    reason: 'no_path',
    gap: {
      fromId,
      toId,
      boundary: {
        fromReachableCount: fromReachable.size,
        toReachableCount: toReachable.size,
        overlap: [...fromReachable].filter((id) => toReachable.has(id)).length,
      },
    },
    candidates,
  };
}

function reconstructPath(parent, fromId, toId, nodeMap) {
  const path = [];
  let current = toId;
  while (current !== fromId) {
    const p = parent.get(current);
    path.unshift({
      nodeId: current,
      nodeType: nodeMap.get(current)?.type,
      nodeTitle: nodeMap.get(current)?.title,
      viaEdgeType: p.edgeType,
    });
    current = p.from;
  }
  path.unshift({
    nodeId: fromId,
    nodeType: nodeMap.get(fromId)?.type,
    nodeTitle: nodeMap.get(fromId)?.title,
    viaEdgeType: null,
  });
  return path;
}

function bfsReachable(adj, startId, maxHops) {
  const visited = new Set([startId]);
  const queue = [{ id: startId, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift();
    if (depth >= maxHops) continue;
    for (const { target } of adj.get(id) || []) {
      if (!visited.has(target)) {
        visited.add(target);
        queue.push({ id: target, depth: depth + 1 });
      }
    }
  }
  return visited;
}

function findCandidateBridges(fromId, fromType, toId, toType) {
  const candidates = [];
  for (const entry of CANDIDATE_BRIDGE_MAP) {
    if (entry.gapPattern.fromType === fromType && entry.gapPattern.toType === toType) {
      candidates.push({
        candidateConceptId: entry.candidateConceptId,
        candidateEdges: entry.candidateEdges.map((e) => ({
          source: e.source.replace('{from}', fromId).replace('{to}', toId),
          target: e.target.replace('{from}', fromId).replace('{to}', toId),
          type: e.type,
        })),
        note: entry.note,
      });
    }
  }
  return candidates;
}

/**
 * Convenience: load seed and run trace.
 */
export function traceFromSeed(fromId, toId, options = {}) {
  const { nodes, edges } = loadSeed();
  return trace({ nodes, edges }, fromId, toId, options);
}
