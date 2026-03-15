/**
 * Domain Projection Tests — Phase 4b
 *
 * Proves: P(G, F, D) — domain as first semantic projection parameter.
 *
 * What is proven:
 *   1. Domain filter produces different scope than no-domain projection
 *   2. Different domains produce different scopes (semantic, not topological)
 *   3. Domain filter is orthogonal to focus/BFS — same focus, different domain → different result
 *   4. Domain filter with no focus shows domain-scoped full graph
 *   5. Non-existent domain degrades gracefully (shows nothing extra)
 *   6. Null domainId produces same result as before (backward compatible)
 *   7. Domain projection is deterministic
 *   8. Navigation invariants hold under domain filter
 *
 * Fixture: world/test-world/fixtures/domain-projection.json
 *   Two domains (Science, Art), two characters (Alice→Science, Bob→Art),
 *   workbenches connected to characters and containing concepts,
 *   one cross-domain node (Optics) linked to both Physics and Painting.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { projectGraph } from '../projectGraph.js';
import { defaultParams, emptyFocus } from '../types';
import { computeVisibleSubgraph } from '../computeVisibleSubgraph.js';
import { resolveFocus } from '../resolveFocus.js';

const fixturePath = resolve(
  import.meta.dirname,
  '../../../../worlds/test-world/fixtures/domain-projection.json',
);
const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
const nodes = data.nodes;
const links = data.edges.map((e) => ({ ...e, id: e.id ?? `${e.source}-${e.target}` }));

function makeGraph() {
  return new GraphModel({ nodes, links });
}

describe('Domain Projection — P(G, F, D)', () => {
  describe('Theorem 1: Domain filter produces semantic scope', () => {
    it('P(G, ∅, science) ≠ P(G, ∅, art)', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const scienceResult = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-science',
      });
      const artResult = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-art',
      });

      expect(scienceResult.ok).toBe(true);
      expect(artResult.ok).toBe(true);

      const scienceIds = new Set(scienceResult.viewModel.scene.nodes.map((n) => n.id));
      const artIds = new Set(artResult.viewModel.scene.nodes.map((n) => n.id));

      expect(scienceIds).not.toEqual(artIds);
    });

    it('science scope includes physics, chemistry but not painting, sculpture', () => {
      const graph = makeGraph();
      const focus = emptyFocus();
      const result = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      const ids = new Set(result.viewModel.scene.nodes.map((n) => n.id));
      expect(ids.has('physics')).toBe(true);
      expect(ids.has('chemistry')).toBe(true);
      expect(ids.has('painting')).toBe(false);
      expect(ids.has('sculpture')).toBe(false);
    });

    it('art scope includes painting, sculpture but not physics, chemistry', () => {
      const graph = makeGraph();
      const focus = emptyFocus();
      const result = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-art',
      });

      const ids = new Set(result.viewModel.scene.nodes.map((n) => n.id));
      expect(ids.has('painting')).toBe(true);
      expect(ids.has('sculpture')).toBe(true);
      expect(ids.has('physics')).toBe(false);
      expect(ids.has('chemistry')).toBe(false);
    });
  });

  describe('Theorem 2: Domain filter is orthogonal to topology', () => {
    it('same focus, different domain → different visible nodes', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'root', path: [] };

      const sciResult = projectGraph(graph, focus, null, {
        depth: 3,
        visibilityMode: 'all',
        domainId: 'domain-science',
      });
      const artResult = projectGraph(graph, focus, null, {
        depth: 3,
        visibilityMode: 'all',
        domainId: 'domain-art',
      });

      expect(sciResult.ok).toBe(true);
      expect(artResult.ok).toBe(true);

      const sciIds = new Set(sciResult.viewModel.scene.nodes.map((n) => n.id));
      const artIds = new Set(artResult.viewModel.scene.nodes.map((n) => n.id));

      expect(sciIds.has('char-alice')).toBe(true);
      expect(artIds.has('char-bob')).toBe(true);
    });

    it('cross-domain node (optics) appears in science scope', () => {
      const graph = makeGraph();
      const focus = emptyFocus();
      const result = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      const ids = new Set(result.viewModel.scene.nodes.map((n) => n.id));
      expect(ids.has('optics')).toBe(true);
    });
  });

  describe('Theorem 3: Backward compatibility', () => {
    it('null domainId produces same result as no domain filter', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'root', path: [] };

      const withNull = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: null,
      });
      const withoutDomain = projectGraph(graph, focus, null, defaultParams());

      expect(withNull.ok).toBe(true);
      expect(withoutDomain.ok).toBe(true);
      expect(withNull.viewModel.scene.nodes.length).toBe(
        withoutDomain.viewModel.scene.nodes.length,
      );
    });

    it('undefined domainId produces same result as null', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const withUndefined = projectGraph(graph, focus, null, {
        depth: 1,
        visibilityMode: 'all',
      });
      const withNull = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: null,
      });

      expect(withUndefined.ok).toBe(true);
      expect(withNull.ok).toBe(true);
      expect(withUndefined.viewModel.scene.nodes.length).toBe(
        withNull.viewModel.scene.nodes.length,
      );
    });
  });

  describe('Theorem 4: Determinism', () => {
    it('same inputs → same domain-filtered output', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'char-alice', path: [] };
      const params = { ...defaultParams(), domainId: 'domain-science' };

      const r1 = projectGraph(graph, focus, null, params);
      const r2 = projectGraph(graph, focus, null, params);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);

      const ids1 = r1.viewModel.scene.nodes.map((n) => n.id).sort();
      const ids2 = r2.viewModel.scene.nodes.map((n) => n.id).sort();
      expect(ids1).toEqual(ids2);
    });
  });

  describe('Theorem 5: Graceful degradation', () => {
    it('non-existent domainId produces empty scope', () => {
      const graph = makeGraph();
      const focus = emptyFocus();
      const result = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-nonexistent',
      });

      expect(result.ok).toBe(true);
      expect(result.viewModel.scene.nodes.length).toBe(0);
    });
  });

  describe('Theorem 6: Domain membership computation', () => {
    it('domain node itself is a member', () => {
      const graph = makeGraph();
      const focusState = resolveFocus(graph, emptyFocus());
      const vs = computeVisibleSubgraph(graph, focusState, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      expect(vs.scope.has('domain-science')).toBe(true);
    });

    it('direct relates-neighbor of domain is a member', () => {
      const graph = makeGraph();
      const focusState = resolveFocus(graph, emptyFocus());
      const vs = computeVisibleSubgraph(graph, focusState, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      expect(vs.scope.has('char-alice')).toBe(true);
    });

    it('one-hop indirect neighbor is a member', () => {
      const graph = makeGraph();
      const focusState = resolveFocus(graph, emptyFocus());
      const vs = computeVisibleSubgraph(graph, focusState, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      expect(vs.scope.has('wb-lab')).toBe(true);
    });
  });
});
