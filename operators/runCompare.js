/**
 * CLI runner for Compare operator.
 *
 * Usage:
 *   node operators/runCompare.js
 *
 * Outputs: compare.examples.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { compare } from './compare.js';
import { normalizeGraphByRedirects } from './normalizeGraphByRedirects.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const worldDir = resolve(__dir, '..', 'worlds', 'documentation-world');

const rawNodes = JSON.parse(readFileSync(resolve(worldDir, 'seed.nodes.json'), 'utf-8'));
const rawEdges = JSON.parse(readFileSync(resolve(worldDir, 'seed.edges.json'), 'utf-8'));
const graph = normalizeGraphByRedirects({ nodes: rawNodes, edges: rawEdges });

const SPEC = 'https://www.notion.so/435b2b96d0ec40b2a7262b1151a23380';
const CONCEPT_PROJECTION = 'concept:projection';
const SYSTEM_OVERVIEW = 'https://www.notion.so/e688cc28b25c40fabf27b2ab2577ab82';
const EVIDENCE_3A = 'evidence:grounding-phase-3a-tests';

const EVALUATE_JS = 'code:file:src/core/knowledge/evaluate.js';

const SCENARIOS = [
  { name: 'SPEC → evaluate.js (natural rival)', fromId: SPEC, toId: EVALUATE_JS },
  { name: 'SPEC → evidence (controlled ambiguity)', fromId: SPEC, toId: EVIDENCE_3A },
  { name: 'SYSTEM_OVERVIEW → concept:projection (no rival)', fromId: SYSTEM_OVERVIEW, toId: CONCEPT_PROJECTION },
];

const examples = [];

for (const sc of SCENARIOS) {
  const result = compare(graph, sc.fromId, sc.toId);
  examples.push({ scenario: sc.name, from: sc.fromId, to: sc.toId, result });

  console.log(`\n[${sc.name}]`);
  if (result.ok) {
    console.log(`  ✓ COMPARE: ${result.pathCount} rival paths → ${result.clusterCount} clusters, ${result.hops} hops`);
    if (result.clusters) {
      result.clusters.forEach((c) => {
        console.log(`  cluster #${c.clusterId}: count=${c.count} labels=[${c.labels.join(', ')}] fp=${c.fingerprint}`);
      });
    }
    console.log(`  diff:`);
    console.log(`    shared nodes: ${result.diff.sharedNodes.length}`);
    result.diff.humanNotes.forEach((n) => console.log(`    → ${n}`));
  } else {
    console.log(`  ✗ ${result.reason}: ${result.note}`);
  }
}

writeFileSync(resolve(__dir, 'compare.examples.json'), JSON.stringify(examples, null, 2), 'utf-8');
console.log(`\n✓ compare.examples.json written (${SCENARIOS.length} scenarios)`);
