/**
 * Enrichment Robustness Tests — Phase 4.5
 *
 * Proves that engine and presentation contracts survive
 * the transition from sparse to semantically rich graphs.
 *
 * Three fixture levels:
 *   sparse     — minimal graph, no metadata, simple hierarchy
 *   rich       — full/partial metadata layers, multiple relation types
 *   cross-axis — nodes belong to multiple ontological axes simultaneously
 *
 * What is proven:
 *   1. Projection works identically across all density levels
 *   2. Partial metadata does not break ViewModel
 *   3. Cross-axis nodes do not break projection or navigation
 *   4. Multi-relation navigation stays valid
 *   5. ViewModel.system is consistent across densities
 *   6. Node metadata degrades gracefully
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { projectGraph } from '../projectGraph.js';
import { defaultParams, emptyFocus } from '../types';
import { applyTransition } from '../../navigation/applyTransition.js';
import { select, drillDown, drillUp, reset } from '../../navigation/types';

// ── Load fixtures ────────────────────────────────────────────────────────────

const fixturesDir = resolve(import.meta.dirname, '../../../../worlds/test-world/fixtures');

function loadFixture(name) {
  const raw = JSON.parse(readFileSync(resolve(fixturesDir, `${name}.json`), 'utf-8'));
  return {
    graph: new GraphModel({ nodes: raw.nodes, links: raw.edges }),
    schema: raw.schema,
    raw,
  };
}

const sparse = loadFixture('sparse');
const rich = loadFixture('rich');
const crossAxis = loadFixture('cross-axis');

const ALL_FIXTURES = [
  { name: 'sparse', ...sparse },
  { name: 'rich', ...rich },
  { name: 'cross-axis', ...crossAxis },
];

// ── 1. Projection works across all density levels ────────────────────────────

describe('Projection across density levels', () => {
  for (const { name, graph, schema } of ALL_FIXTURES) {
    it(`[${name}] no-focus projection returns ok:true`, () => {
      const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
      expect(result.ok).toBe(true);
      expect(result.viewModel.scene.nodes.length).toBe(graph.getNodes().length);
      expect(result.viewModel.scene.edges.length).toBe(graph.getEdges().length);
    });

    it(`[${name}] focused projection returns ok:true`, () => {
      const firstNode = graph.getNodes()[0];
      const focus = { nodeId: firstNode.id, path: [] };
      const result = projectGraph(graph, focus, schema, defaultParams());
      expect(result.ok).toBe(true);
      expect(result.viewModel.panels.focusNode).not.toBeNull();
      expect(result.viewModel.panels.focusNode.id).toBe(firstNode.id);
    });

    it(`[${name}] determinism holds`, () => {
      const focus = { nodeId: graph.getNodes()[1].id, path: [] };
      const r1 = projectGraph(graph, focus, schema, defaultParams());
      const r2 = projectGraph(graph, focus, schema, defaultParams());
      expect(r1).toEqual(r2);
    });
  }
});

// ── 2. Partial metadata does not break ViewModel ─────────────────────────────

describe('Partial metadata robustness', () => {
  it('[rich] nodes with full metadata carry all layers', () => {
    const result = projectGraph(rich.graph, { nodeId: 'synth-alpha', path: [] }, rich.schema, defaultParams());
    expect(result.ok).toBe(true);
    const synthNode = result.viewModel.scene.nodes.find(n => n.id === 'synth-alpha');
    expect(synthNode.metadata.label).toBe('Synth Alpha');
    expect(synthNode.metadata.shortDescription).toBeDefined();
    expect(synthNode.metadata.narrative).toBeDefined();
    expect(synthNode.metadata.formal).toBeDefined();
    expect(synthNode.metadata.formula).toBeDefined();
    expect(synthNode.metadata.machine).toBeDefined();
  });

  it('[rich] nodes with partial metadata carry only available layers', () => {
    const result = projectGraph(rich.graph, { nodeId: 'carol', path: [] }, rich.schema, defaultParams());
    expect(result.ok).toBe(true);
    const carolNode = result.viewModel.scene.nodes.find(n => n.id === 'carol');
    expect(carolNode.metadata.label).toBe('Carol');
    expect(carolNode.metadata.shortDescription).toBeDefined();
    expect(carolNode.metadata.narrative).toBeUndefined();
    expect(carolNode.metadata.formal).toBeUndefined();
    expect(carolNode.metadata.formula).toBeUndefined();
  });

  it('[sparse] nodes with no metadata still have label', () => {
    const result = projectGraph(sparse.graph, emptyFocus(), sparse.schema, defaultParams());
    expect(result.ok).toBe(true);
    for (const node of result.viewModel.scene.nodes) {
      expect(node.metadata).toBeDefined();
      expect(node.metadata.label).toBeTruthy();
      expect(node.metadata.shortDescription).toBeUndefined();
      expect(node.metadata.narrative).toBeUndefined();
    }
  });

  it('[rich] mixed completeness: all nodes have metadata.label', () => {
    const result = projectGraph(rich.graph, emptyFocus(), rich.schema, defaultParams());
    expect(result.ok).toBe(true);
    for (const node of result.viewModel.scene.nodes) {
      expect(node.metadata.label).toBeTruthy();
    }
  });
});

// ── 3. Cross-axis nodes do not break projection ──────────────────────────────

describe('Cross-axis projection stability', () => {
  it('node connected to multiple axes projects correctly', () => {
    const result = projectGraph(crossAxis.graph, { nodeId: 'eve', path: [] }, crossAxis.schema, defaultParams());
    expect(result.ok).toBe(true);
    const eveNode = result.viewModel.scene.nodes.find(n => n.id === 'eve');
    expect(eveNode.role).toBe('focus');
    expect(result.viewModel.panels.neighbors.length).toBeGreaterThan(3);
  });

  it('project from different axis hubs yields consistent ViewModel', () => {
    const axes = ['axis-people', 'axis-tools', 'axis-knowledge', 'axis-output'];
    for (const axisId of axes) {
      const result = projectGraph(crossAxis.graph, { nodeId: axisId, path: [] }, crossAxis.schema, defaultParams());
      expect(result.ok).toBe(true);
      expect(result.viewModel.panels.focusNode.id).toBe(axisId);
      expect(result.viewModel.scene.nodes.length).toBeGreaterThan(0);
      expect(result.viewModel.scene.nodes.length).toBeLessThanOrEqual(crossAxis.graph.getNodes().length);
    }
  });

  it('node belonging to multiple projects (cross-cutting) is stable', () => {
    const r1 = projectGraph(crossAxis.graph, { nodeId: 'fm-y', path: [] }, crossAxis.schema, defaultParams());
    expect(r1.ok).toBe(true);
    const fmNeighbors = r1.viewModel.panels.neighbors.map(n => n.id);
    expect(fmNeighbors).toContain('axis-tools');
    expect(fmNeighbors.length).toBeGreaterThan(2);
  });
});

// ── 4. Multi-relation navigation stability ───────────────────────────────────

describe('Multi-relation navigation', () => {
  it('[rich] navigation through multiple relation types', () => {
    const { graph } = rich;
    let focus = emptyFocus();

    focus = applyTransition(focus, select('alice'), graph).focus;
    expect(focus.nodeId).toBe('alice');

    focus = applyTransition(focus, drillDown('synth-alpha'), graph).focus;
    expect(focus.nodeId).toBe('synth-alpha');
    expect(focus.path).toEqual(['alice']);

    focus = applyTransition(focus, drillUp(), graph).focus;
    expect(focus.nodeId).toBe('alice');
    expect(focus.path).toEqual([]);
  });

  it('[cross-axis] full navigation sequence across axes', () => {
    const { graph, schema } = crossAxis;
    let focus = emptyFocus();

    focus = applyTransition(focus, select('root'), graph).focus;
    focus = applyTransition(focus, drillDown('axis-people'), graph).focus;
    focus = applyTransition(focus, drillDown('eve'), graph).focus;
    expect(focus.nodeId).toBe('eve');
    expect(focus.path).toEqual(['root', 'axis-people']);

    const proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.navigation.canDrillUp).toBe(true);

    focus = applyTransition(focus, select('wavetable-x'), graph).focus;
    expect(focus.nodeId).toBe('wavetable-x');

    const proj2 = projectGraph(graph, focus, schema, defaultParams());
    expect(proj2.ok).toBe(true);
    expect(proj2.viewModel.panels.focusNode.id).toBe('wavetable-x');

    focus = applyTransition(focus, drillUp(), graph).focus;
    expect(focus.nodeId).toBe('axis-people');

    focus = applyTransition(focus, reset(), graph).focus;
    expect(focus.nodeId).toBeNull();
    expect(focus.path).toEqual([]);
  });

  it('[cross-axis] determinism after multi-relation navigation', () => {
    const { graph, schema } = crossAxis;
    const focus = { nodeId: 'eve', path: ['root', 'axis-people'] };
    const r1 = projectGraph(graph, focus, schema, defaultParams());
    const r2 = projectGraph(graph, focus, schema, defaultParams());
    expect(r1).toEqual(r2);
  });
});

// ── 5. ViewModel.system consistency across densities ─────────────────────────

describe('System info consistency', () => {
  for (const { name, graph, schema } of ALL_FIXTURES) {
    it(`[${name}] system section is present and well-formed`, () => {
      const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
      expect(result.ok).toBe(true);
      const { system } = result.viewModel;
      expect(system).toBeDefined();
      expect(system.enginePhase).toBeTruthy();
      expect(system.activeFormula).toBeTruthy();
      expect(Array.isArray(system.satisfiedInvariants)).toBe(true);
      expect(Array.isArray(system.relatedSpecs)).toBe(true);
      expect(system.transitions).toBeDefined();
      expect(typeof system.transitions.select).toBe('boolean');
    });

    it(`[${name}] focused system section includes navigation invariants`, () => {
      const nodeId = graph.getNodes()[1].id;
      const result = projectGraph(graph, { nodeId, path: ['root'] }, schema, defaultParams());
      expect(result.ok).toBe(true);
      const inv = result.viewModel.system.satisfiedInvariants;
      expect(inv.some(i => i.includes('NAV-1'))).toBe(true);
      expect(inv.some(i => i.includes('NAV-2'))).toBe(true);
    });
  }
});

// ── 6. Surface degradation integrity ─────────────────────────────────────────

describe('Surface degradation: metadata absence', () => {
  it('sparse graph ViewModel has same structure as rich graph ViewModel', () => {
    const rs = projectGraph(sparse.graph, emptyFocus(), sparse.schema, defaultParams());
    const rr = projectGraph(rich.graph, emptyFocus(), rich.schema, defaultParams());
    expect(rs.ok).toBe(true);
    expect(rr.ok).toBe(true);

    const keysS = Object.keys(rs.viewModel).sort();
    const keysR = Object.keys(rr.viewModel).sort();
    expect(keysS).toEqual(keysR);

    const nodeKeysS = Object.keys(rs.viewModel.scene.nodes[0]).sort();
    const nodeKeysR = Object.keys(rr.viewModel.scene.nodes[0]).sort();
    expect(nodeKeysS).toEqual(nodeKeysR);
  });

  it('metadata object always exists even for bare nodes', () => {
    const result = projectGraph(sparse.graph, emptyFocus(), sparse.schema, defaultParams());
    for (const node of result.viewModel.scene.nodes) {
      expect(node.metadata).toBeDefined();
      expect(typeof node.metadata).toBe('object');
      expect(node.metadata.label).toBeTruthy();
    }
  });

  it('rich metadata does not change ViewModel shape', () => {
    const synthResult = projectGraph(rich.graph, { nodeId: 'synth-alpha', path: [] }, rich.schema, defaultParams());
    const carolResult = projectGraph(rich.graph, { nodeId: 'carol', path: [] }, rich.schema, defaultParams());
    expect(synthResult.ok).toBe(true);
    expect(carolResult.ok).toBe(true);

    const synthKeys = Object.keys(synthResult.viewModel).sort();
    const carolKeys = Object.keys(carolResult.viewModel).sort();
    expect(synthKeys).toEqual(carolKeys);
  });
});
