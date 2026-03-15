/**
 * Workbench Projection Tests — Phase 4c
 *
 * Proves: P_workbench(G, F, Wb) — workbench as composite operational context.
 *
 * Workbench Lens Theorem:
 *   For any valid graph G and valid WorkbenchConfig Wb,
 *   the engine computes a deterministic projection P_wb(G, F, Wb),
 *   where Wb defines an operational context as a composition of domain lenses:
 *     P_wb(G) = ⋃ DomainMembership(G, D_i) for D_i ∈ Wb.domains
 *
 * What is proven:
 *   1. Workbench with single domain = same as domain projection (composability base)
 *   2. Workbench with multiple domains = union (broader than any single domain)
 *   3. Different workbenches produce different scopes
 *   4. Workbench is orthogonal to focus (same focus, different wb → different result)
 *   5. Backward compatibility: no workbench = no filter
 *   6. Graceful degradation: unknown workbenchId, empty domains
 *   7. Determinism under workbench lens
 *   8. Workbench subsumes domain: workbenchId takes priority over domainId
 *
 * Fixture: world/test-world/fixtures/domain-projection.json
 *   Two domains (Science, Art), two characters, three workbenches,
 *   concepts connected through workbenches.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { projectGraph } from '../projectGraph.js';
import { defaultParams, emptyFocus } from '../types';

const fixturePath = resolve(
  import.meta.dirname,
  '../../../../worlds/test-world/fixtures/domain-projection.json',
);
const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
const nodes = data.nodes;
const links = data.edges.map((e) => ({ ...e }));

function makeGraph() {
  return new GraphModel({ nodes, links });
}

const WB_LAB = { id: 'wb-lab', label: 'Lab', domains: ['domain-science'] };
const WB_STUDIO = { id: 'wb-studio', label: 'Studio', domains: ['domain-art'] };
const WB_HYBRID = {
  id: 'wb-hybrid',
  label: 'Hybrid',
  domains: ['domain-science', 'domain-art'],
};
const ALL_WORKBENCHES = [WB_LAB, WB_STUDIO, WB_HYBRID];

function wbParams(workbenchId, overrides = {}) {
  return {
    ...defaultParams(),
    workbenchId,
    workbenches: ALL_WORKBENCHES,
    ...overrides,
  };
}

describe('Workbench Projection — P_wb(G, F, Wb)', () => {
  describe('Theorem 1: Single-domain workbench ≡ domain projection', () => {
    it('Lab workbench (science only) matches domain-science projection', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const wbResult = projectGraph(graph, focus, null, wbParams('wb-lab'));
      const domainResult = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-science',
      });

      expect(wbResult.ok).toBe(true);
      expect(domainResult.ok).toBe(true);

      const wbIds = new Set(wbResult.viewModel.scene.nodes.map((n) => n.id));
      const domIds = new Set(domainResult.viewModel.scene.nodes.map((n) => n.id));
      expect(wbIds).toEqual(domIds);
    });
  });

  describe('Theorem 2: Multi-domain workbench = union', () => {
    it('Hybrid workbench scope ⊇ Lab scope AND ⊇ Studio scope', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const hybridResult = projectGraph(graph, focus, null, wbParams('wb-hybrid'));
      const labResult = projectGraph(graph, focus, null, wbParams('wb-lab'));
      const studioResult = projectGraph(graph, focus, null, wbParams('wb-studio'));

      expect(hybridResult.ok).toBe(true);
      expect(labResult.ok).toBe(true);
      expect(studioResult.ok).toBe(true);

      const hybridIds = new Set(hybridResult.viewModel.scene.nodes.map((n) => n.id));
      const labIds = labResult.viewModel.scene.nodes.map((n) => n.id);
      const studioIds = studioResult.viewModel.scene.nodes.map((n) => n.id);

      for (const id of labIds) {
        expect(hybridIds.has(id)).toBe(true);
      }
      for (const id of studioIds) {
        expect(hybridIds.has(id)).toBe(true);
      }
    });

    it('Hybrid scope is strictly larger than either single-domain workbench', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const hybridResult = projectGraph(graph, focus, null, wbParams('wb-hybrid'));
      const labResult = projectGraph(graph, focus, null, wbParams('wb-lab'));
      const studioResult = projectGraph(graph, focus, null, wbParams('wb-studio'));

      const hybridCount = hybridResult.viewModel.scene.nodes.length;
      const labCount = labResult.viewModel.scene.nodes.length;
      const studioCount = studioResult.viewModel.scene.nodes.length;

      expect(hybridCount).toBeGreaterThan(labCount);
      expect(hybridCount).toBeGreaterThan(studioCount);
    });
  });

  describe('Theorem 3: Different workbenches produce different scopes', () => {
    it('Lab ≠ Studio', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const labResult = projectGraph(graph, focus, null, wbParams('wb-lab'));
      const studioResult = projectGraph(graph, focus, null, wbParams('wb-studio'));

      const labIds = new Set(labResult.viewModel.scene.nodes.map((n) => n.id));
      const studioIds = new Set(studioResult.viewModel.scene.nodes.map((n) => n.id));

      expect(labIds).not.toEqual(studioIds);
    });

    it('Lab includes physics, not painting; Studio includes painting, not physics', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const labIds = new Set(
        projectGraph(graph, focus, null, wbParams('wb-lab'))
          .viewModel.scene.nodes.map((n) => n.id),
      );
      const studioIds = new Set(
        projectGraph(graph, focus, null, wbParams('wb-studio'))
          .viewModel.scene.nodes.map((n) => n.id),
      );

      expect(labIds.has('physics')).toBe(true);
      expect(labIds.has('painting')).toBe(false);
      expect(studioIds.has('painting')).toBe(true);
      expect(studioIds.has('physics')).toBe(false);
    });
  });

  describe('Theorem 4: Workbench is orthogonal to focus', () => {
    it('same focus, different workbench → different scope', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'root', path: [] };

      const labResult = projectGraph(graph, focus, null, wbParams('wb-lab', { depth: 3 }));
      const studioResult = projectGraph(graph, focus, null, wbParams('wb-studio', { depth: 3 }));

      expect(labResult.ok).toBe(true);
      expect(studioResult.ok).toBe(true);

      const labIds = new Set(labResult.viewModel.scene.nodes.map((n) => n.id));
      const studioIds = new Set(studioResult.viewModel.scene.nodes.map((n) => n.id));

      expect(labIds).not.toEqual(studioIds);
    });
  });

  describe('Theorem 5: Backward compatibility', () => {
    it('no workbenchId, no domainId = no filter', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const noFilter = projectGraph(graph, focus, null, defaultParams());
      const explicitNull = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: null,
      });

      expect(noFilter.ok).toBe(true);
      expect(explicitNull.ok).toBe(true);
      expect(noFilter.viewModel.scene.nodes.length).toBe(
        explicitNull.viewModel.scene.nodes.length,
      );
    });
  });

  describe('Theorem 6: Graceful degradation', () => {
    it('unknown workbenchId falls back to no filter', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const unknown = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-nonexistent',
        workbenches: ALL_WORKBENCHES,
      });
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(unknown.ok).toBe(true);
      expect(unknown.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });

    it('workbench with empty domains array falls back to no filter', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const emptyWb = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-empty',
        workbenches: [{ id: 'wb-empty', label: 'Empty', domains: [] }],
      });
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(emptyWb.ok).toBe(true);
      expect(emptyWb.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });
  });

  describe('Theorem 7: Determinism', () => {
    it('same inputs → same workbench-filtered output', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'char-alice', path: [] };
      const params = wbParams('wb-hybrid');

      const r1 = projectGraph(graph, focus, null, params);
      const r2 = projectGraph(graph, focus, null, params);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);

      const ids1 = r1.viewModel.scene.nodes.map((n) => n.id).sort();
      const ids2 = r2.viewModel.scene.nodes.map((n) => n.id).sort();
      expect(ids1).toEqual(ids2);
    });
  });

  describe('Theorem 8: Workbench subsumes domain', () => {
    it('workbenchId takes priority over domainId', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const wbOnly = projectGraph(graph, focus, null, wbParams('wb-lab'));
      const wbAndDomain = projectGraph(graph, focus, null, {
        ...wbParams('wb-lab'),
        domainId: 'domain-art',
      });

      expect(wbOnly.ok).toBe(true);
      expect(wbAndDomain.ok).toBe(true);

      const wbIds = new Set(wbOnly.viewModel.scene.nodes.map((n) => n.id));
      const bothIds = new Set(wbAndDomain.viewModel.scene.nodes.map((n) => n.id));

      expect(wbIds).toEqual(bothIds);
    });
  });
});
