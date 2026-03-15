/**
 * ADR-013: Normalize graph by collapsing redirect chains.
 *
 * When code_artifact nodes are renamed, legacy nodes with `redirect_to`
 * and `redirects_to` edges remain in the seed for traceability.
 * This function produces a clean graph where all references point to
 * the canonical (active) node, without losing legacy provenance.
 *
 * Pure function — does not mutate the input.
 *
 * @param {{ nodes: object[], edges: object[] }} graph
 * @returns {{ nodes: object[], edges: object[], redirectMap: Map<string, string> }}
 */
export function normalizeGraphByRedirects(graph) {
  const redirectMap = new Map();

  for (const edge of graph.edges) {
    if (edge.type === 'redirects_to') {
      redirectMap.set(edge.source, edge.target);
    }
  }

  if (redirectMap.size === 0) {
    return { nodes: graph.nodes, edges: graph.edges, redirectMap };
  }

  function resolveId(id) {
    const seen = new Set();
    let current = id;
    while (redirectMap.has(current) && !seen.has(current)) {
      seen.add(current);
      current = redirectMap.get(current);
    }
    return current;
  }

  const legacyIds = new Set(redirectMap.keys());
  const nodes = graph.nodes.filter((n) => !legacyIds.has(n.id));

  const edgeSet = new Set();
  const edges = [];
  for (const e of graph.edges) {
    if (e.type === 'redirects_to') continue;

    const source = resolveId(e.source);
    const target = resolveId(e.target);
    const key = `${source}→${target}→${e.type}`;
    if (edgeSet.has(key)) continue;
    if (source === target) continue;
    edgeSet.add(key);
    edges.push({ ...e, source, target });
  }

  return { nodes, edges, redirectMap };
}
