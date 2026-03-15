/**
 * Navigation invariant tests.
 * Runs on test-world (10 nodes, 16 edges).
 *
 * Tests prove:
 * - NAV-1: Valid transition → valid focus
 * - NAV-2: DrillDown reversibility
 * - NAV-3: History integrity
 * - NAV-4: Determinism
 * - NAV-5: Projection compatibility
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { applyTransition } from '../applyTransition.js';
import { select, drillDown, drillUp, reset } from '../types';
import { projectGraph } from '../../projection/projectGraph.js';
import { emptyFocus, defaultParams } from '../../projection/types';

const testWorldPath = resolve(import.meta.dirname, '../../../../worlds/test-world/universe.json');
const raw = JSON.parse(readFileSync(testWorldPath, 'utf-8'));

function loadGraph() {
  return new GraphModel({ nodes: raw.nodes, links: raw.edges });
}

const schema = raw.schema;

// ── NAV-1: Transition Validity ───────────────────────────────────────────────

describe('NAV-1: Valid transition produces valid focus', () => {
  it('select on valid node returns ok:true', () => {
    const graph = loadGraph();
    const result = applyTransition(emptyFocus(), select('alice'), graph);
    expect(result.ok).toBe(true);
    expect(result.focus.nodeId).toBe('alice');
  });

  it('select on nonexistent node returns ok:false', () => {
    const graph = loadGraph();
    const result = applyTransition(emptyFocus(), select('ghost'), graph);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('drillDown on valid node from valid focus returns ok:true', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: [] };
    const result = applyTransition(focus, drillDown('hub-people'), graph);
    expect(result.ok).toBe(true);
    expect(result.focus.nodeId).toBe('hub-people');
  });

  it('drillDown from empty focus returns ok:false', () => {
    const graph = loadGraph();
    const result = applyTransition(emptyFocus(), drillDown('alice'), graph);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('cannot drill down from empty focus');
  });

  it('drillDown on nonexistent node returns ok:false', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: [] };
    const result = applyTransition(focus, drillDown('ghost'), graph);
    expect(result.ok).toBe(false);
  });

  it('drillUp from non-empty path returns ok:true', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root', 'hub-people'] };
    const result = applyTransition(focus, drillUp(), graph);
    expect(result.ok).toBe(true);
    expect(result.focus.nodeId).toBe('hub-people');
  });

  it('drillUp from empty path returns ok:true with null focus', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: [] };
    const result = applyTransition(focus, drillUp(), graph);
    expect(result.ok).toBe(true);
    expect(result.focus.nodeId).toBeNull();
    expect(result.focus.path).toEqual([]);
  });

  it('reset always returns ok:true with empty focus', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root', 'hub-people'] };
    const result = applyTransition(focus, reset(), graph);
    expect(result.ok).toBe(true);
    expect(result.focus.nodeId).toBeNull();
    expect(result.focus.path).toEqual([]);
  });
});

// ── NAV-2: DrillDown Reversibility ───────────────────────────────────────────

describe('NAV-2: DrillDown/DrillUp reversibility', () => {
  it('drillDown then drillUp restores original focus', () => {
    const graph = loadGraph();
    const original = { nodeId: 'root', path: [] };

    const afterDown = applyTransition(original, drillDown('hub-people'), graph);
    expect(afterDown.ok).toBe(true);

    const afterUp = applyTransition(afterDown.focus, drillUp(), graph);
    expect(afterUp.ok).toBe(true);
    expect(afterUp.focus).toEqual(original);
  });

  it('two drillDowns then two drillUps restores original', () => {
    const graph = loadGraph();
    const f0 = { nodeId: 'root', path: [] };

    const f1 = applyTransition(f0, drillDown('hub-people'), graph).focus;
    const f2 = applyTransition(f1, drillDown('alice'), graph).focus;
    expect(f2.nodeId).toBe('alice');
    expect(f2.path).toEqual(['root', 'hub-people']);

    const f3 = applyTransition(f2, drillUp(), graph).focus;
    expect(f3).toEqual(f1);

    const f4 = applyTransition(f3, drillUp(), graph).focus;
    expect(f4).toEqual(f0);
  });

  it('drillDown → select → drillUp returns to pre-drillDown node', () => {
    const graph = loadGraph();
    const f0 = { nodeId: 'root', path: [] };

    const f1 = applyTransition(f0, drillDown('hub-people'), graph).focus;
    const f2 = applyTransition(f1, select('bob'), graph).focus;
    expect(f2.nodeId).toBe('bob');
    expect(f2.path).toEqual(['root']);

    const f3 = applyTransition(f2, drillUp(), graph).focus;
    expect(f3.nodeId).toBe('root');
    expect(f3.path).toEqual([]);
  });
});

// ── NAV-3: History Integrity ─────────────────────────────────────────────────

describe('NAV-3: History integrity', () => {
  it('drillDown adds current nodeId to path', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: [] };
    const result = applyTransition(focus, drillDown('hub-people'), graph);
    expect(result.focus.path).toEqual(['root']);
  });

  it('drillUp removes last element from path', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root', 'hub-people'] };
    const result = applyTransition(focus, drillUp(), graph);
    expect(result.focus.path).toEqual(['root']);
  });

  it('select does not change path', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: ['hub-people'] };
    const result = applyTransition(focus, select('bob'), graph);
    expect(result.focus.path).toEqual(['hub-people']);
  });

  it('reset clears path', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root', 'hub-people'] };
    const result = applyTransition(focus, reset(), graph);
    expect(result.focus.path).toEqual([]);
  });

  it('path length grows by exactly 1 on drillDown', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: ['x', 'y'] };
    const result = applyTransition(focus, drillDown('hub-people'), graph);
    expect(result.focus.path.length).toBe(3);
  });
});

// ── NAV-4: Determinism ───────────────────────────────────────────────────────

describe('NAV-4: Navigation determinism', () => {
  it('same focus + same transition → same result', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: [] };
    const t = drillDown('hub-people');
    const r1 = applyTransition(focus, t, graph);
    const r2 = applyTransition(focus, t, graph);
    expect(r1).toEqual(r2);
  });

  it('100 repeated calls return the same result', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root'] };
    const t = select('bob');
    const first = applyTransition(focus, t, graph);
    for (let i = 0; i < 100; i++) {
      expect(applyTransition(focus, t, graph)).toEqual(first);
    }
  });

  it('all transition types are deterministic', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'hub-people', path: ['root'] };
    const transitions = [
      select('alice'),
      drillDown('bob'),
      drillUp(),
      reset(),
    ];
    for (const t of transitions) {
      const r1 = applyTransition(focus, t, graph);
      const r2 = applyTransition(focus, t, graph);
      expect(r1).toEqual(r2);
    }
  });
});

// ── NAV-5: Projection Compatibility ──────────────────────────────────────────

describe('NAV-5: Navigation → Projection compatibility', () => {
  it('after select, projection produces valid ViewModel', () => {
    const graph = loadGraph();
    const nav = applyTransition(emptyFocus(), select('alice'), graph);
    expect(nav.ok).toBe(true);
    const proj = projectGraph(graph, nav.focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('alice');
  });

  it('after drillDown, projection produces valid ViewModel', () => {
    const graph = loadGraph();
    const f0 = { nodeId: 'root', path: [] };
    const nav = applyTransition(f0, drillDown('hub-ideas'), graph);
    expect(nav.ok).toBe(true);
    const proj = projectGraph(graph, nav.focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('hub-ideas');
    expect(proj.viewModel.navigation.canDrillUp).toBe(true);
  });

  it('after drillUp, projection produces valid ViewModel', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root', 'hub-people'] };
    const nav = applyTransition(focus, drillUp(), graph);
    expect(nav.ok).toBe(true);
    const proj = projectGraph(graph, nav.focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('hub-people');
  });

  it('after reset, projection produces valid ViewModel', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: ['root'] };
    const nav = applyTransition(focus, reset(), graph);
    expect(nav.ok).toBe(true);
    const proj = projectGraph(graph, nav.focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode).toBeNull();
  });

  it('full navigation sequence produces consistent projections', () => {
    const graph = loadGraph();
    let focus = emptyFocus();

    focus = applyTransition(focus, select('root'), graph).focus;
    let proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.meta.totalNodes).toBe(10);

    focus = applyTransition(focus, drillDown('hub-people'), graph).focus;
    proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('hub-people');
    expect(proj.viewModel.navigation.path).toEqual(['root']);

    focus = applyTransition(focus, drillDown('alice'), graph).focus;
    proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('alice');

    focus = applyTransition(focus, drillUp(), graph).focus;
    proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode.id).toBe('hub-people');

    focus = applyTransition(focus, reset(), graph).focus;
    proj = projectGraph(graph, focus, schema, defaultParams());
    expect(proj.ok).toBe(true);
    expect(proj.viewModel.panels.focusNode).toBeNull();
  });
});
