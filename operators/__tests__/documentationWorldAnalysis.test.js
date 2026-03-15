/**
 * Documentation World — Analysis Operator Tests
 *
 * Verifies that the analysis script:
 *   1) runs and produces valid output
 *   2) contains all required sections
 *   3) is deterministic on the same seed
 *   4) does not crash on current seed (51/108)
 */

import { describe, test, expect } from 'vitest';
import { runAnalysis } from '../../worlds/documentation-world/analysis/runAnalysis.js';

let result;

describe('Documentation World — Analysis Operators', () => {
  test('analysis runs and returns valid JSON structure', () => {
    result = runAnalysis();
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
    expect(result.meta).toBeDefined();
    expect(result.meta.nodeCount).toBe(116);
    expect(result.meta.edgeCount).toBe(267);
  });

  test('output contains all required sections: centrality, bridges, cycles, anomalies', () => {
    expect(Array.isArray(result.centrality)).toBe(true);
    expect(result.centrality.length).toBe(10);

    expect(Array.isArray(result.bridges)).toBe(true);
    expect(result.bridges.length).toBe(10);

    expect(Array.isArray(result.cycles)).toBe(true);

    expect(Array.isArray(result.anomalies)).toBe(true);

    expect(Array.isArray(result.missingConcepts)).toBe(true);

    for (const c of result.centrality) {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('type');
      expect(c).toHaveProperty('title');
      expect(c).toHaveProperty('degree');
      expect(c).toHaveProperty('betweenness');
      expect(c).toHaveProperty('score');
      expect(c).toHaveProperty('topEdges');
    }

    for (const b of result.bridges) {
      expect(b).toHaveProperty('nodeA');
      expect(b).toHaveProperty('nodeB');
      expect(b).toHaveProperty('betweenness');
      expect(b).toHaveProperty('crossType');
    }
  });

  test('output is deterministic (two runs produce same data)', () => {
    const r1 = runAnalysis();
    const r2 = runAnalysis();

    expect(r1.centrality.map((c) => c.id)).toEqual(r2.centrality.map((c) => c.id));
    expect(r1.centrality.map((c) => c.score)).toEqual(r2.centrality.map((c) => c.score));
    expect(r1.bridges.map((b) => b.betweenness)).toEqual(r2.bridges.map((b) => b.betweenness));
    expect(r1.cycles.length).toBe(r2.cycles.length);
    expect(r1.anomalies.length).toBe(r2.anomalies.length);
    expect(r1.missingConcepts.length).toBe(r2.missingConcepts.length);
  });

  test('no crash on current seed (51/108) — all operators return valid data', () => {
    expect(result.meta.nodeTypes.length).toBeGreaterThan(0);
    expect(result.meta.edgeTypes.length).toBeGreaterThan(0);

    expect(result.centrality[0].score).toBeGreaterThan(0);
    expect(result.bridges[0].betweenness).toBeGreaterThan(0);

    const topNode = result.centrality[0];
    expect(topNode.degree).toBeGreaterThan(0);
    expect(topNode.betweenness).toBeGreaterThan(0);

    console.log('\n[Analysis Operators]');
    console.log(`  Top central: ${topNode.title} (${topNode.type}) — degree=${topNode.degree}, betweenness=${topNode.betweenness}`);
    console.log(`  Cycles: ${result.cycles.length}`);
    console.log(`  Distance anomalies: ${result.anomalies.length}`);
    console.log(`  Missing concept candidates: ${result.missingConcepts.length}`);
  });
});
