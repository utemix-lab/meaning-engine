/**
 * Step 3 of projection pipeline.
 *
 * Formula:
 *   VS = BFS(G, FocusState, depth) ∩ SemanticFilter(G, Params)
 *
 *   SemanticFilter resolves to one of:
 *     - CharacterFilter: P_char(G, F, Char, selected=Wb_k) = P_wb(G, F, Wb_k)
 *     - WorkbenchFilter: P_wb(G) = ⋃ DomainMembership(G, D_i) for D_i ∈ Wb.domains
 *     - DomainFilter:    DomainMembership(G, D)
 *     - NoFilter:        all nodes pass
 *
 *   Priority: characterId > workbenchId > domainId > none.
 *   Character has menu semantics: it constrains which workbenches are valid,
 *   but delegates actual filtering to the selected workbench.
 *   If characterId is set but no valid workbench is selected → no filter.
 *
 * Definitions:
 *   G          = valid typed graph (GraphModel)
 *   FocusState = resolved focus (from Step 2)
 *   depth      = max BFS distance from focus (ProjectionParams.depth)
 *   D          = domainId (single semantic lens)
 *   Wb         = WorkbenchConfig { id, label, domains[] } (composite lens)
 *   Char       = CharacterConfig { id, label, workbenches[] } (context organizer)
 *   VS         = VisibleSubgraph { nodeIds, edgeIds, scope, boundary }
 *
 * Domain membership rule (via MEMBERSHIP_EDGE_TYPES):
 *   Level 0: node.id === D (the domain node itself)
 *   Level 1: ∃ edge(node, D, type ∈ MEMBERSHIP_EDGE_TYPES) — direct semantic association
 *   Level 2: ∃ edge(node, M) where M ∈ Level 1 — one hop from membership-neighbor
 *   Level 3: ∃ edge(node, N) where N ∈ Level 2 — two hops from membership-neighbor
 *   Structural 'contains' edges to domain are ignored to prevent hub flooding.
 *
 * Guarantees:
 *   - character constrains valid workbenches, does not merge them
 *   - workbench filter = union of its domain memberships
 *   - if no valid context selected → no filter
 *   - deterministic: same inputs → same partition
 *   - no side effects
 *
 * Phase:
 *   Engine Phase 4d — Character Context
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md (Step 3)
 */

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types.js').FocusState} focusState
 * @param {import('./types.js').ProjectionParams} params
 * @returns {import('./types.js').VisibleSubgraph}
 */
export function computeVisibleSubgraph(graph, focusState, params) {
  const allNodeIds = new Set(graph.getNodes().map((n) => n.id));
  const allEdgeIds = new Set(graph.getEdges().map((e) => e.id));

  const domainMembers = resolveSemanticFilter(graph, params);

  if (focusState.status !== 'valid' || !focusState.current) {
    const scope = domainMembers
      ? new Set([...allNodeIds].filter((id) => domainMembers.has(id)))
      : new Set(allNodeIds);
    return {
      nodeIds: allNodeIds,
      edgeIds: allEdgeIds,
      scope,
      boundary: new Set(),
    };
  }

  const scope = new Set();
  const boundary = new Set();
  const depth = params.depth;

  const queue = [{ id: focusState.current.id, dist: 0 }];
  const visited = new Set();
  visited.add(focusState.current.id);

  while (queue.length > 0) {
    const { id, dist } = queue.shift();

    const passesFilter = !domainMembers || domainMembers.has(id);
    if (passesFilter) {
      scope.add(id);
    }

    if (dist === depth) {
      if (passesFilter) boundary.add(id);
      continue;
    }

    const neighborIds = graph.getNeighbors(id);
    for (const nId of neighborIds) {
      if (!visited.has(nId)) {
        visited.add(nId);
        queue.push({ id: nId, dist: dist + 1 });
      }
    }
  }

  return {
    nodeIds: allNodeIds,
    edgeIds: allEdgeIds,
    scope,
    boundary,
  };
}

/**
 * Resolves the semantic filter from ProjectionParams.
 *
 * Formula:
 *   Priority: characterId > workbenchId > domainId > null
 *
 *   Character (menu semantics):
 *     WbSet(Char) = {Wb₁, ..., Wbₙ}
 *     selected(Char) ∈ WbSet(Char) ∪ {null}
 *     if selected(Char) = Wb_k then P_char = P_wb(G, Wb_k)
 *     if selected(Char) = null  then no filter
 *
 *   Workbench: P_wb(G) = ⋃ DomainMembership(G, D_i) for D_i ∈ Wb.domains
 *   Domain:    DomainMembership(G, D)
 *
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types.js').ProjectionParams} params
 * @returns {Set<string>|null}
 */
function resolveSemanticFilter(graph, params) {
  if (params.characterId && params.characters?.length) {
    const char = params.characters.find((c) => c.id === params.characterId);
    if (char) {
      if (params.workbenchId && char.workbenches.includes(params.workbenchId)) {
        const wb = params.workbenches?.find((w) => w.id === params.workbenchId);
        if (wb && wb.domains.length > 0) {
          return computeWorkbenchMembership(graph, wb);
        }
      }
      return null;
    }
  }

  if (params.workbenchId && params.workbenches?.length) {
    const wb = params.workbenches.find((w) => w.id === params.workbenchId);
    if (wb && wb.domains.length > 0) {
      return computeWorkbenchMembership(graph, wb);
    }
  }

  if (params.domainId) {
    return computeDomainMembership(graph, params.domainId);
  }

  return null;
}

/**
 * Computes workbench membership as union of its domain memberships.
 *
 * Formula:
 *   Members(Wb) = ⋃ DomainMembership(G, D_i)  for D_i ∈ Wb.domains
 *
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types.js').WorkbenchConfig} wb
 * @returns {Set<string>}
 */
function computeWorkbenchMembership(graph, wb) {
  const members = new Set();
  for (const domainId of wb.domains) {
    const domainMembers = computeDomainMembership(graph, domainId);
    for (const id of domainMembers) {
      members.add(id);
    }
  }
  return members;
}

const MEMBERSHIP_EDGE_TYPES = new Set([
  'relates',
  'works-in',
  'operates',
  'member-of',
  'reflects',
  'intersects',
]);

/**
 * Computes the set of node IDs that belong to a given domain.
 *
 * Membership rules (using MEMBERSHIP_EDGE_TYPES, not structural 'contains'):
 *   Level 0: the domain node itself
 *   Level 1: nodes directly connected to domain via a membership edge type
 *   Level 2: nodes connected to level-1 members via any edge
 *
 * This prevents membership from flooding through structural hubs
 * (e.g., 'domains' → 'contains' → all domains → all characters).
 *
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {string} domainId
 * @returns {Set<string>}
 */
function computeDomainMembership(graph, domainId) {
  const members = new Set();

  if (!graph.getNodeById(domainId)) return members;

  members.add(domainId);

  const edges = graph.getEdges();
  const relatesNeighbors = new Set();

  for (const edge of edges) {
    const src = typeof edge.source === 'object' ? edge.source.id : edge.source;
    const tgt = typeof edge.target === 'object' ? edge.target.id : edge.target;

    if (MEMBERSHIP_EDGE_TYPES.has(edge.type)) {
      if (src === domainId) relatesNeighbors.add(tgt);
      if (tgt === domainId) relatesNeighbors.add(src);
    }
  }

  for (const nId of relatesNeighbors) {
    members.add(nId);
  }

  const hop2 = new Set();
  for (const nId of relatesNeighbors) {
    for (const sId of graph.getNeighbors(nId)) {
      members.add(sId);
      hop2.add(sId);
    }
  }

  for (const nId of hop2) {
    for (const sId of graph.getNeighbors(nId)) {
      members.add(sId);
    }
  }

  return members;
}
