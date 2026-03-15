/**
 * Documentation World — Smoke Tests
 *
 * Verifies that the documentation world seed:
 *   1) loads correctly via the loader
 *   2) produces valid projections
 *   3) supports navigation (select, drillDown, drillUp, reset)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import {
  projectGraph,
  applyTransition,
  select,
  drillDown,
  drillUp,
  reset,
} from '../../src/core/index.js';
import { loadDocumentationWorld } from '../../worlds/documentation-world/loader.js';

let graph;
let meta;

const SYSTEM_OVERVIEW_ID = 'https://www.notion.so/e688cc28b25c40fabf27b2ab2577ab82';
const CONCEPT_FOCUS_ID = 'concept:focus';
const INVARIANT_PROJECTION_ID = 'invariant:projection-determinism';

beforeAll(() => {
  const result = loadDocumentationWorld();
  graph = result.graph;
  meta = result.meta;
});

describe('Documentation World — Smoke Tests', () => {
  describe('Load', () => {
    test('loader returns graph and meta', () => {
      expect(graph).toBeDefined();
      expect(meta).toBeDefined();
      expect(meta.nodeCount).toBe(116);
      expect(meta.edgeCount).toBe(267);

      console.log('\n[Doc World Load]');
      console.log(`  nodes: ${meta.nodeCount}`);
      console.log(`  edges: ${meta.edgeCount}`);
      console.log(`  nodeTypes: [${meta.nodeTypes.join(', ')}]`);
      console.log(`  edgeTypes: [${meta.edgeTypes.join(', ')}]`);
    });

    test('all node types recognized by GraphModel', () => {
      for (const t of meta.nodeTypes) {
        const nodesOfType = graph.getNodesByType(t);
        expect(nodesOfType.length).toBeGreaterThan(0);
      }
    });

    test('key nodes exist in graph', () => {
      expect(graph.getNodeById(SYSTEM_OVERVIEW_ID)).toBeDefined();
      expect(graph.getNodeById(CONCEPT_FOCUS_ID)).toBeDefined();
      expect(graph.getNodeById(INVARIANT_PROJECTION_ID)).toBeDefined();
    });
  });

  describe('Projection', () => {
    test('projectGraph with focus=null returns ok', () => {
      const focus = { nodeId: null, path: [] };
      const result = projectGraph(graph, focus, null, { depth: 1, visibilityMode: 'all' });

      expect(result.ok).toBe(true);
      expect(result.viewModel.scene.nodes.length).toBeGreaterThan(0);

      console.log(`\n[Doc World Projection] focus=null → ${result.viewModel.scene.nodes.length} nodes, ${result.viewModel.scene.edges.length} edges`);
    });

    test('projectGraph with focus=SYSTEM_OVERVIEW returns ok', () => {
      const focus = { nodeId: SYSTEM_OVERVIEW_ID, path: [] };
      const result = projectGraph(graph, focus, null, { depth: 1, visibilityMode: 'all' });

      expect(result.ok).toBe(true);
      expect(result.viewModel.panels.focusNode).toBeDefined();
      expect(result.viewModel.panels.focusNode.id).toBe(SYSTEM_OVERVIEW_ID);
      expect(result.viewModel.panels.neighbors.length).toBeGreaterThan(0);

      console.log(`\n[Doc World Projection] focus=SYSTEM_OVERVIEW → ${result.viewModel.scene.nodes.length} nodes, ${result.viewModel.panels.neighbors.length} neighbors`);
    });

    test('projectGraph with focus=concept:focus returns ok', () => {
      const focus = { nodeId: CONCEPT_FOCUS_ID, path: [] };
      const result = projectGraph(graph, focus, null, { depth: 1, visibilityMode: 'all' });

      expect(result.ok).toBe(true);
      expect(result.viewModel.panels.focusNode.id).toBe(CONCEPT_FOCUS_ID);

      console.log(`\n[Doc World Projection] focus=concept:focus → ${result.viewModel.scene.nodes.length} nodes, ${result.viewModel.panels.neighbors.length} neighbors`);
    });
  });

  describe('Navigation', () => {
    test('select → drillDown → drillUp → reset', () => {
      let focus = { nodeId: null, path: [] };

      const r1 = applyTransition(focus, select(SYSTEM_OVERVIEW_ID), graph);
      expect(r1.ok).toBe(true);
      focus = r1.focus;
      expect(focus.nodeId).toBe(SYSTEM_OVERVIEW_ID);

      const p1 = projectGraph(graph, focus, null, { depth: 1, visibilityMode: 'all' });
      expect(p1.ok).toBe(true);

      const neighbors = p1.viewModel.panels.neighbors;
      expect(neighbors.length).toBeGreaterThan(0);
      const drillTarget = neighbors[0].id;

      const r2 = applyTransition(focus, drillDown(drillTarget), graph);
      expect(r2.ok).toBe(true);
      focus = r2.focus;
      expect(focus.nodeId).toBe(drillTarget);
      expect(focus.path.length).toBeGreaterThan(0);

      const p2 = projectGraph(graph, focus, null, { depth: 1, visibilityMode: 'all' });
      expect(p2.ok).toBe(true);

      const r3 = applyTransition(focus, drillUp(), graph);
      expect(r3.ok).toBe(true);
      focus = r3.focus;
      expect(focus.nodeId).toBe(SYSTEM_OVERVIEW_ID);

      const r4 = applyTransition(focus, reset(), graph);
      expect(r4.ok).toBe(true);
      focus = r4.focus;
      expect(focus.nodeId).toBeNull();

      console.log(`\n[Doc World Navigation] select→drillDown(${drillTarget})→drillUp→reset: ✓`);
    });
  });
});
