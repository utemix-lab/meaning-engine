/**
 * Documentation World — Trace Operator Tests
 *
 * Verifies:
 *   1) path found when directed path exists
 *   2) no_path returned when absent
 *   3–5) candidate bridges for spec↔evidence, evidence↔code_artifact, concept↔page
 *   6) deterministic output
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { trace } from '../trace.js';
import { normalizeGraphByRedirects } from '../normalizeGraphByRedirects.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const worldDir = resolve(__dir, '..', '..', 'worlds', 'documentation-world');

let graph;

const SYSTEM_OVERVIEW = 'https://www.notion.so/e688cc28b25c40fabf27b2ab2577ab82';
const CONCEPT_PROJECTION = 'concept:projection';
const CONCEPT_FOCUS = 'concept:focus';
const CONCEPT_CONTEXT = 'concept:context';
const PROJECTION_SPEC = 'https://www.notion.so/435b2b96d0ec40b2a7262b1151a23380';
const EVIDENCE_3A = 'evidence:grounding-phase-3a-tests';
const CODE_ARTIFACT_PROTOCOL = 'code_artifact:protocol-ts';

beforeAll(() => {
  const rawNodes = JSON.parse(readFileSync(resolve(worldDir, 'seed.nodes.json'), 'utf-8'));
  const rawEdges = JSON.parse(readFileSync(resolve(worldDir, 'seed.edges.json'), 'utf-8'));
  graph = normalizeGraphByRedirects({ nodes: rawNodes, edges: rawEdges });
});

describe('Documentation World — Trace Operator', () => {
  test('returns path when directed path exists (SYSTEM_OVERVIEW → concept:projection)', () => {
    const result = trace(graph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);

    expect(result.ok).toBe(true);
    expect(result.hops).toBeGreaterThan(0);
    expect(result.path.length).toBe(result.hops + 1);
    expect(result.path[0].nodeId).toBe(SYSTEM_OVERVIEW);
    expect(result.path[result.path.length - 1].nodeId).toBe(CONCEPT_PROJECTION);

    console.log(`\n[Trace] SYSTEM_OVERVIEW → concept:projection: ${result.hops} hops`);
    console.log(`  Path: ${result.path.map((p) => p.nodeTitle).join(' → ')}`);
  });

  test('returns no_path when no directed path exists (concept:focus → SYSTEM_OVERVIEW)', () => {
    const result = trace(graph, CONCEPT_FOCUS, SYSTEM_OVERVIEW);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_path');
    expect(result.gap).toBeDefined();
    expect(result.gap.fromId).toBe(CONCEPT_FOCUS);
    expect(result.gap.toId).toBe(SYSTEM_OVERVIEW);
  });

  test('returns path for spec → evidence (bridged after ambiguity experiment)', () => {
    const result = trace(graph, PROJECTION_SPEC, EVIDENCE_3A);

    expect(result.ok).toBe(true);
    expect(result.hops).toBe(2);
    expect(result.path.length).toBe(3);
    expect(result.path[0].nodeId).toBe(PROJECTION_SPEC);
    expect(result.path[2].nodeId).toBe(EVIDENCE_3A);

    console.log(`\n[Trace] spec → evidence: PATH found (${result.hops} hops via ${result.path[1].nodeId})`);
  });

  test('returns candidate bridge for evidence → code_artifact gap', () => {
    const result = trace(graph, EVIDENCE_3A, CODE_ARTIFACT_PROTOCOL);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_path');
    expect(result.candidates.length).toBeGreaterThan(0);

    const candidate = result.candidates[0];
    expect(candidate.candidateConceptId).toBe('concept:code-spec-alignment');
    expect(candidate.note).toContain('evidence');
    expect(candidate.note).toContain('code_artifact');

    console.log(`\n[Trace] evidence → code_artifact gap: candidate = ${candidate.candidateConceptId}`);
  });

  test('returns candidate bridge for concept:context → SYSTEM_OVERVIEW gap', () => {
    const result = trace(graph, CONCEPT_CONTEXT, SYSTEM_OVERVIEW);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_path');
    expect(result.candidates.length).toBeGreaterThan(0);

    const candidate = result.candidates[0];
    expect(candidate.candidateConceptId).toBe('concept:context-anchor');

    console.log(`\n[Trace] concept:context → SYSTEM_OVERVIEW gap: candidate = ${candidate.candidateConceptId}`);
  });

  test('deterministic output (same inputs → same result)', () => {
    const r1 = trace(graph, PROJECTION_SPEC, EVIDENCE_3A);
    const r2 = trace(graph, PROJECTION_SPEC, EVIDENCE_3A);

    expect(r1.ok).toBe(r2.ok);
    expect(r1.hops).toBe(r2.hops);
    expect(r1.path.map((p) => p.nodeId)).toEqual(r2.path.map((p) => p.nodeId));

    const r3 = trace(graph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);
    const r4 = trace(graph, SYSTEM_OVERVIEW, CONCEPT_PROJECTION);
    expect(r3.ok).toBe(r4.ok);
    expect(r3.hops).toBe(r4.hops);
    expect(r3.path.map((p) => p.nodeId)).toEqual(r4.path.map((p) => p.nodeId));
  });
});
