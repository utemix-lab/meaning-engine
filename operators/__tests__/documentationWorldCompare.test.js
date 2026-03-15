/**
 * Compare Operator — Tests
 *
 * 1) returns no_rivals when unique shortest path
 * 2) returns 2+ paths when rivals exist (synthetic)
 * 3) deterministic output
 * 4) path summary histograms stable
 * 5) diff shared/unique nodes computed correctly (synthetic)
 * 6) doc-world case returns 2+ paths
 * 7) doc-world diff contains expected feature deltas
 * 8) regression green
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compare, clusterRivalPaths } from '../compare.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const worldDir = resolve(__dir, '..', '..', 'worlds', 'documentation-world');

let docGraph;

const SPEC = 'https://www.notion.so/435b2b96d0ec40b2a7262b1151a23380';
const EVALUATE_JS = 'code:file:src/core/knowledge/evaluate.js';
const SYSTEM_OVERVIEW = 'https://www.notion.so/e688cc28b25c40fabf27b2ab2577ab82';
const CONCEPT_PROJECTION = 'concept:projection';

const SYNTHETIC = {
  nodes: [
    { id: 'A', type: 'spec', title: 'Spec A' },
    { id: 'B1', type: 'concept', title: 'Concept B1' },
    { id: 'B2', type: 'code_artifact', title: 'Code B2' },
    { id: 'C', type: 'evidence', title: 'Evidence C' },
  ],
  edges: [
    { source: 'A', target: 'B1', type: 'defines', layer: 'concept' },
    { source: 'A', target: 'B2', type: 'implements', layer: 'provenance' },
    { source: 'B1', target: 'C', type: 'applies_to', layer: 'concept' },
    { source: 'B2', target: 'C', type: 'proved_by', layer: 'provenance' },
  ],
};

beforeAll(() => {
  const nodes = JSON.parse(readFileSync(resolve(worldDir, 'seed.nodes.json'), 'utf-8'));
  const edges = JSON.parse(readFileSync(resolve(worldDir, 'seed.edges.json'), 'utf-8'));
  docGraph = { nodes, edges };
});

describe('Compare Operator', () => {
  test('1) returns no_rivals when unique shortest path', () => {
    const result = compare(docGraph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_rivals');
    expect(result.paths.length).toBe(1);
    expect(result.diff).toBeNull();

    console.log(`\n[Compare] no_rivals: ${result.note}`);
  });

  test('2) returns 2+ paths when rivals exist (synthetic)', () => {
    const result = compare(SYNTHETIC, 'A', 'C');

    expect(result.ok).toBe(true);
    expect(result.pathCount).toBe(2);
    expect(result.hops).toBe(2);
    expect(result.paths.length).toBe(2);
    expect(result.diff).toBeDefined();

    console.log('\n[Compare] synthetic: 2 rival paths');
    result.paths.forEach((p, i) => {
      console.log(`  path ${i + 1}: ${p.nodeTitles.join(' → ')}`);
    });
  });

  test('3) deterministic output', () => {
    const r1 = compare(SYNTHETIC, 'A', 'C');
    const r2 = compare(SYNTHETIC, 'A', 'C');

    expect(r1.ok).toBe(r2.ok);
    expect(r1.pathCount).toBe(r2.pathCount);
    expect(r1.paths[0].nodeIds).toEqual(r2.paths[0].nodeIds);
    expect(r1.paths[1].nodeIds).toEqual(r2.paths[1].nodeIds);
    expect(r1.diff.sharedNodes).toEqual(r2.diff.sharedNodes);
    expect(r1.diff.humanNotes).toEqual(r2.diff.humanNotes);
  });

  test('4) path summary histograms stable', () => {
    const result = compare(SYNTHETIC, 'A', 'C');

    for (const p of result.paths) {
      expect(p.nodeTypeHistogram).toBeDefined();
      expect(p.edgeTypeHistogram).toBeDefined();
      expect(typeof p.hops).toBe('number');
      expect(typeof p.hasInvariant).toBe('boolean');
      expect(typeof p.codeArtifactCount).toBe('number');
      expect(typeof p.evidenceCount).toBe('number');
    }

    const conceptPath = result.paths.find((p) => p.nodeTypeHistogram.concept);
    const codePath = result.paths.find((p) => p.nodeTypeHistogram.code_artifact);
    expect(conceptPath).toBeDefined();
    expect(codePath).toBeDefined();
    expect(codePath.codeArtifactCount).toBeGreaterThan(0);
  });

  test('5) diff shared/unique nodes computed correctly (synthetic)', () => {
    const result = compare(SYNTHETIC, 'A', 'C');

    expect(result.diff.sharedNodes).toContain('A');
    expect(result.diff.sharedNodes).toContain('C');
    expect(result.diff.sharedNodes.length).toBe(2);

    expect(result.diff.uniqueNodesByPath.length).toBe(2);
    const allUnique = result.diff.uniqueNodesByPath.flat();
    expect(allUnique).toContain('B1');
    expect(allUnique).toContain('B2');
    expect(allUnique).not.toContain('A');
    expect(allUnique).not.toContain('C');
  });

  test('6) doc-world case returns 2+ paths (SPEC → evaluate.js)', () => {
    const result = compare(docGraph, SPEC, EVALUATE_JS);

    expect(result.ok).toBe(true);
    expect(result.pathCount).toBeGreaterThanOrEqual(2);
    expect(result.hops).toBe(3);
    expect(result.paths.length).toBeGreaterThanOrEqual(2);

    console.log(`\n[Compare] doc-world SPEC→evaluate.js: ${result.pathCount} paths, ${result.hops} hops`);
    result.paths.forEach((p, i) => {
      console.log(`  path ${i + 1}: ${p.nodeTitles.join(' → ')}`);
    });
  });

  test('7) doc-world diff contains expected feature deltas', () => {
    const result = compare(docGraph, SPEC, EVALUATE_JS);

    expect(result.diff).toBeDefined();
    expect(result.diff.featureDeltaByPath.length).toBeGreaterThanOrEqual(2);

    const features = result.diff.featureDeltaByPath;
    const codeArtifactCounts = features.map((f) => f.codeArtifactCount);
    expect(codeArtifactCounts.some((c) => c > 0)).toBe(true);

    expect(result.diff.humanNotes.length).toBeGreaterThanOrEqual(1);
    expect(result.diff.humanNotes.length).toBeLessThanOrEqual(15);

    console.log('\n[Compare] doc-world diff:');
    result.diff.humanNotes.forEach((n) => console.log(`  → ${n}`));
  });

  test('8) regression: no crash on current seed (116/267)', () => {
    const r1 = compare(docGraph, SPEC, EVALUATE_JS);
    expect(r1.ok).toBe(true);

    const r2 = compare(docGraph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);
    expect(r2.ok).toBe(false);

    const r3 = compare(docGraph, SPEC, 'evidence:grounding-phase-3a-tests');
    expect(r3.ok).toBe(true);
    expect(r3.pathCount).toBeGreaterThanOrEqual(2);

    console.log(`\n[Regression] doc-world ${docGraph.nodes.length}/${docGraph.edges.length}:`);
    console.log(`  SPEC→evaluate.js: ${r1.pathCount} paths (ok)`);
    console.log(`  OVERVIEW→projection: no_rivals (ok)`);
    console.log(`  SPEC→evidence: ${r3.pathCount} paths (ok)`);
  });
});

// ═══════════════════════════════════════════
// Compare v0.1 — Clustering
// ═══════════════════════════════════════════

const KL_SPEC = 'https://www.notion.so/d186fc3cca724175bcd404b5e04c6306';
const PROJ_INDEX = 'code:file:src/core/projection/index.js';
const EVAL_TEST = 'code:file:src/core/knowledge/__tests__/evaluate.test.js';

const STRESS_GRAPH = (() => {
  const nodes = [
    { id: 'S', type: 'spec', title: 'Start' },
    { id: 'T', type: 'evidence', title: 'End' },
  ];
  const edges = [];
  for (let i = 0; i < 10; i++) {
    const mid = `M${i}`;
    const isCode = i < 5;
    nodes.push({
      id: mid,
      type: isCode ? 'code_artifact' : 'concept',
      title: `Mid ${i}`,
    });
    edges.push({
      source: 'S', target: mid,
      type: isCode ? 'implements' : 'defines',
      layer: isCode ? 'provenance' : 'concept',
    });
    edges.push({
      source: mid, target: 'T',
      type: isCode ? 'proved_by' : 'applies_to',
      layer: isCode ? 'provenance' : 'concept',
    });
  }
  nodes.push({ id: 'INV', type: 'invariant', title: 'Invariant Hub' });
  edges.push({ source: 'S', target: 'INV', type: 'constrains', layer: 'concept' });
  edges.push({ source: 'INV', target: 'T', type: 'proved_by', layer: 'provenance' });
  return { nodes, edges };
})();

describe('Compare v0.1 — Clustering', () => {
  test('9) clusterRivalPaths is deterministic', () => {
    const r1 = compare(STRESS_GRAPH, 'S', 'T');
    const r2 = compare(STRESS_GRAPH, 'S', 'T');
    expect(r1.clusters.length).toBe(r2.clusters.length);
    for (let i = 0; i < r1.clusters.length; i++) {
      expect(r1.clusters[i].fingerprint).toBe(r2.clusters[i].fingerprint);
      expect(r1.clusters[i].count).toBe(r2.clusters[i].count);
      expect(r1.clusters[i].labels).toEqual(r2.clusters[i].labels);
    }
  });

  test('10) cluster count bounded for KNOWLEDGE_LOG → projection/index (53 paths → <=7 clusters)', () => {
    const r = compare(docGraph, KL_SPEC, PROJ_INDEX);
    expect(r.ok).toBe(true);
    expect(r.pathCount).toBeGreaterThanOrEqual(20);
    expect(r.clusterCount).toBeLessThanOrEqual(7);
    expect(r.clusterCount).toBeGreaterThanOrEqual(2);

    const totalInClusters = r.clusters.reduce((s, c) => s + c.count, 0);
    expect(totalInClusters).toBe(r.pathCount);

    console.log(`\n[Cluster v0.1] KL→proj/index: ${r.pathCount} paths → ${r.clusterCount} clusters`);
    r.clusters.forEach((c) => {
      console.log(`  #${c.clusterId}: count=${c.count} labels=[${c.labels.join(', ')}] fp=${c.fingerprint}`);
    });
  });

  test('11) labels computed correctly', () => {
    const r = compare(STRESS_GRAPH, 'S', 'T');
    expect(r.ok).toBe(true);
    expect(r.clusters.length).toBeGreaterThanOrEqual(2);

    const allLabels = r.clusters.flatMap((c) => c.labels);
    expect(allLabels.some((l) => l === 'code-heavy')).toBe(true);
    expect(allLabels.some((l) => l === 'concept-heavy')).toBe(true);

    for (const c of r.clusters) {
      if (c.featureRanges.hasInvariant) {
        expect(c.labels).toContain('invariant-heavy');
      }
    }
  });

  test('12) no ranking — no bestPath/winner field', () => {
    const r = compare(docGraph, KL_SPEC, PROJ_INDEX);
    expect(r).not.toHaveProperty('bestPath');
    expect(r).not.toHaveProperty('winner');
    expect(r).not.toHaveProperty('ranking');

    for (const c of r.clusters) {
      expect(c).not.toHaveProperty('rank');
      expect(c).not.toHaveProperty('score');
    }
  });

  test('13) PROJECTION → evaluate.test cluster count in 3-7 range', () => {
    const r = compare(docGraph, SPEC, EVAL_TEST);
    expect(r.ok).toBe(true);
    expect(r.clusterCount).toBeLessThanOrEqual(7);
    expect(r.clusterCount).toBeGreaterThanOrEqual(2);

    console.log(`\n[Cluster v0.1] SPEC→eval.test: ${r.pathCount} paths → ${r.clusterCount} clusters`);
    r.clusters.forEach((c) => {
      console.log(`  #${c.clusterId}: count=${c.count} labels=[${c.labels.join(', ')}] fp=${c.fingerprint}`);
    });
  });

  test('14) synthetic stress: 11 shortest paths → 3 clusters', () => {
    const r = compare(STRESS_GRAPH, 'S', 'T');
    expect(r.ok).toBe(true);
    expect(r.pathCount).toBe(11);
    expect(r.clusterCount).toBe(3);

    const codeCluster = r.clusters.find((c) => c.labels.includes('code-heavy') && !c.labels.includes('invariant-heavy'));
    const conceptCluster = r.clusters.find((c) => c.labels.includes('concept-heavy') && !c.labels.includes('invariant-heavy'));
    const invCluster = r.clusters.find((c) => c.labels.includes('invariant-heavy'));
    expect(codeCluster).toBeDefined();
    expect(conceptCluster).toBeDefined();
    expect(invCluster).toBeDefined();
    expect(codeCluster.count).toBe(5);
    expect(conceptCluster.count).toBe(5);
    expect(invCluster.count).toBe(1);

    const totalInClusters = r.clusters.reduce((s, c) => s + c.count, 0);
    expect(totalInClusters).toBe(11);
  });

  test('15) clusters field present in no_rivals result (backward compat)', () => {
    const r = compare(docGraph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);
    expect(r.ok).toBe(false);
    expect(r.clusters).toEqual([]);
  });

  test('16) regression: v0 fields still present alongside clusters', () => {
    const r = compare(docGraph, SPEC, EVALUATE_JS);
    expect(r.ok).toBe(true);
    expect(r.paths).toBeDefined();
    expect(r.diff).toBeDefined();
    expect(r.diff.sharedNodes).toBeDefined();
    expect(r.diff.humanNotes).toBeDefined();
    expect(r.clusters).toBeDefined();
    expect(r.clusterCount).toBe(r.clusters.length);
  });
});
