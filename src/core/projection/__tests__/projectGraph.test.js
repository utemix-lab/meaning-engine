/**
 * Projection pipeline invariant tests.
 * Runs on test-world (10 nodes, 16 edges).
 *
 * Tests prove:
 * - INV-3: Determinism — same inputs → same output
 * - INV-7: Totality   — always returns result or typed error
 * - Focus resolution correctness
 * - Semantic role assignment correctness
 * - Render contract (ViewModel structure)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { projectGraph } from '../projectGraph.js';
import { validateInputs } from '../validateInputs.js';
import { resolveFocus } from '../resolveFocus.js';
import { computeVisibleSubgraph } from '../computeVisibleSubgraph.js';
import { deriveSemanticRoles } from '../deriveSemanticRoles.js';
import { SemanticRole, defaultParams, emptyFocus } from '../types';

// ── Load test world ──────────────────────────────────────────────────────────

const testWorldPath = resolve(import.meta.dirname, '../../../../worlds/test-world/universe.json');
const raw = JSON.parse(readFileSync(testWorldPath, 'utf-8'));

function loadGraph() {
  return new GraphModel({ nodes: raw.nodes, links: raw.edges });
}

const schema = raw.schema;

// ── INV-3: Determinism ───────────────────────────────────────────────────────

describe('INV-3: Projection Determinism', () => {
  it('same inputs produce identical output (no focus)', () => {
    const graph = loadGraph();
    const r1 = projectGraph(graph, emptyFocus(), schema, defaultParams());
    const r2 = projectGraph(graph, emptyFocus(), schema, defaultParams());
    expect(r1).toEqual(r2);
  });

  it('same inputs produce identical output (focus on alice)', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'alice', path: [] };
    const r1 = projectGraph(graph, focus, schema, defaultParams());
    const r2 = projectGraph(graph, focus, schema, defaultParams());
    expect(r1).toEqual(r2);
  });

  it('same inputs produce identical output (focus on root, depth 2)', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'root', path: [] };
    const params = { depth: 2, visibilityMode: 'all' };
    const r1 = projectGraph(graph, focus, schema, params);
    const r2 = projectGraph(graph, focus, schema, params);
    expect(r1).toEqual(r2);
  });

  it('100 repeated calls return the same result', () => {
    const graph = loadGraph();
    const focus = { nodeId: 'bob', path: ['root', 'hub-people'] };
    const first = projectGraph(graph, focus, schema, defaultParams());
    for (let i = 0; i < 100; i++) {
      expect(projectGraph(graph, focus, schema, defaultParams())).toEqual(first);
    }
  });
});

// ── INV-7: Totality ──────────────────────────────────────────────────────────

describe('INV-7: Projection Totality', () => {
  it('returns ok:true for valid input with no focus', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
    expect(result.ok).toBe(true);
  });

  it('returns ok:true for valid input with valid focus', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: [] }, schema, defaultParams());
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with errors for invalid graph', () => {
    const result = projectGraph(null, emptyFocus(), schema, defaultParams());
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns ok:false when focus references non-existent node', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'nonexistent', path: [] }, schema, defaultParams());
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('focus nodeId "nonexistent" not found in graph');
  });

  it('returns ok:false for negative depth', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, emptyFocus(), schema, { depth: -1, visibilityMode: 'all' });
    expect(result.ok).toBe(false);
  });
});

// ── Validation ───────────────────────────────────────────────────────────────

describe('Step 1: validateInputs', () => {
  it('validates test-world without errors', () => {
    const graph = loadGraph();
    const result = validateInputs(graph, emptyFocus(), schema, defaultParams());
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects unknown node types', () => {
    const badData = {
      nodes: [{ id: 'x', type: 'alien', label: 'X' }],
      links: [],
    };
    const graph = new GraphModel(badData);
    const result = validateInputs(graph, emptyFocus(), schema, defaultParams());
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('unknown type "alien"');
  });
});

// ── Focus resolution ─────────────────────────────────────────────────────────

describe('Step 2: resolveFocus', () => {
  it('returns status=empty for null focus', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, emptyFocus());
    expect(state.status).toBe('empty');
    expect(state.current).toBeNull();
  });

  it('returns status=valid for alice', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'alice', path: [] });
    expect(state.status).toBe('valid');
    expect(state.current.id).toBe('alice');
  });

  it('finds alice neighbors: hub-people, logic, math', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const neighborIds = state.neighbors.map((n) => n.id).sort();
    expect(neighborIds).toEqual(['hub-people', 'logic', 'math']);
  });

  it('finds alice parents: hub-people', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const parentIds = state.parents.map((n) => n.id);
    expect(parentIds).toEqual(['hub-people']);
  });

  it('finds alice children: logic, math', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const childIds = state.children.map((n) => n.id).sort();
    expect(childIds).toEqual(['logic', 'math']);
  });

  it('resolves path nodes', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'alice', path: ['root', 'hub-people'] });
    expect(state.path.map((n) => n.id)).toEqual(['root', 'hub-people']);
  });

  it('returns status=invalid for missing node', () => {
    const graph = loadGraph();
    const state = resolveFocus(graph, { nodeId: 'ghost', path: [] });
    expect(state.status).toBe('invalid');
  });
});

// ── Visible subgraph ─────────────────────────────────────────────────────────

describe('Step 3: computeVisibleSubgraph', () => {
  it('without focus, scope = all nodes', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, emptyFocus());
    const sub = computeVisibleSubgraph(graph, focusState, defaultParams());
    expect(sub.scope.size).toBe(10);
    expect(sub.boundary.size).toBe(0);
  });

  it('focus on alice depth=1: scope = alice + neighbors', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, { depth: 1, visibilityMode: 'all' });
    expect(sub.scope.has('alice')).toBe(true);
    expect(sub.scope.has('hub-people')).toBe(true);
    expect(sub.scope.has('logic')).toBe(true);
    expect(sub.scope.has('math')).toBe(true);
    expect(sub.scope.size).toBe(4);
  });

  it('focus on root depth=0: scope = only root', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'root', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, { depth: 0, visibilityMode: 'all' });
    expect(sub.scope.size).toBe(1);
    expect(sub.scope.has('root')).toBe(true);
    expect(sub.boundary.has('root')).toBe(true);
  });
});

// ── Semantic roles ───────────────────────────────────────────────────────────

describe('Step 4: deriveSemanticRoles', () => {
  it('assigns focus role to focused node', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, defaultParams());
    const roles = deriveSemanticRoles(graph, sub, focusState);
    expect(roles.get('alice')).toBe(SemanticRole.FOCUS);
  });

  it('assigns neighbor role to direct neighbors', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, defaultParams());
    const roles = deriveSemanticRoles(graph, sub, focusState);
    expect(roles.get('hub-people')).toBe(SemanticRole.NEIGHBOR);
    expect(roles.get('logic')).toBe(SemanticRole.NEIGHBOR);
    expect(roles.get('math')).toBe(SemanticRole.NEIGHBOR);
  });

  it('assigns hidden role to distant nodes at depth=1', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'alice', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, defaultParams());
    const roles = deriveSemanticRoles(graph, sub, focusState);
    expect(roles.get('harmony')).toBe(SemanticRole.HIDDEN);
  });

  it('every node gets exactly one role', () => {
    const graph = loadGraph();
    const focusState = resolveFocus(graph, { nodeId: 'root', path: [] });
    const sub = computeVisibleSubgraph(graph, focusState, { depth: 2, visibilityMode: 'all' });
    const roles = deriveSemanticRoles(graph, sub, focusState);
    expect(roles.size).toBe(10);
    const validRoles = new Set(Object.values(SemanticRole));
    for (const role of roles.values()) {
      expect(validRoles.has(role)).toBe(true);
    }
  });
});

// ── ViewModel structure ──────────────────────────────────────────────────────

describe('Step 5+6: ViewModel structure (render contract)', () => {
  it('viewModel has required top-level keys', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: [] }, schema, defaultParams());
    expect(result.ok).toBe(true);
    const vm = result.viewModel;
    expect(vm).toHaveProperty('scene');
    expect(vm).toHaveProperty('panels');
    expect(vm).toHaveProperty('navigation');
    expect(vm).toHaveProperty('meta');
  });

  it('scene.nodes has all 10 nodes', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
    expect(result.viewModel.scene.nodes.length).toBe(10);
  });

  it('scene.edges has all 16 edges', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
    expect(result.viewModel.scene.edges.length).toBe(16);
  });

  it('visual nodes have id, label, type, role, opacity', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: [] }, schema, defaultParams());
    const node = result.viewModel.scene.nodes.find((n) => n.id === 'alice');
    expect(node).toBeDefined();
    expect(node.role).toBe('focus');
    expect(node.opacity).toBe(1.0);
    expect(node.label).toBe('Alice');
    expect(node.type).toBe('person');
  });

  it('edges touching focus have touchesFocus=true', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: [] }, schema, defaultParams());
    const touchingEdges = result.viewModel.scene.edges.filter((e) => e.touchesFocus);
    expect(touchingEdges.length).toBeGreaterThan(0);
    for (const e of touchingEdges) {
      expect(e.source === 'alice' || e.target === 'alice').toBe(true);
    }
  });

  it('panels.focusNode matches focused node', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'bob', path: [] }, schema, defaultParams());
    expect(result.viewModel.panels.focusNode.id).toBe('bob');
  });

  it('navigation.canDrillUp is true when path is non-empty', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: ['root'] }, schema, defaultParams());
    expect(result.viewModel.navigation.canDrillUp).toBe(true);
  });

  it('navigation.canDrillUp is false when path is empty', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, { nodeId: 'alice', path: [] }, schema, defaultParams());
    expect(result.viewModel.navigation.canDrillUp).toBe(false);
  });

  it('meta.totalNodes is 10', () => {
    const graph = loadGraph();
    const result = projectGraph(graph, emptyFocus(), schema, defaultParams());
    expect(result.viewModel.meta.totalNodes).toBe(10);
  });
});
