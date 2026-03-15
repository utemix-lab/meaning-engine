/**
 * Merge extracted code artifacts into seed.
 * Supports ADR-013: legacy preservation and redirect creation.
 *
 * Usage:
 *   node worlds/documentation-world/tools/mergeSeed.js
 *
 * Reads: seed.nodes.json, seed.edges.json, extracted.nodes.json, extracted.edges.json, rename-map.json
 * Writes: seed.nodes.json, seed.edges.json (updated in-place)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const worldDir = resolve(__dir, '..');

const seedNodes = JSON.parse(readFileSync(resolve(worldDir, 'seed.nodes.json'), 'utf-8'));
const seedEdges = JSON.parse(readFileSync(resolve(worldDir, 'seed.edges.json'), 'utf-8'));
const extNodes = JSON.parse(readFileSync(resolve(__dir, 'extracted.nodes.json'), 'utf-8'));
const extEdges = JSON.parse(readFileSync(resolve(__dir, 'extracted.edges.json'), 'utf-8'));

// ── ADR-013: Load rename map ────────────────────────────────────────────
const renameMapPath = resolve(__dir, 'rename-map.json');
const renameMap = new Map();
if (existsSync(renameMapPath)) {
  const raw = JSON.parse(readFileSync(renameMapPath, 'utf-8'));
  for (const entry of raw.renames) {
    renameMap.set(`code:file:${entry.old}`, entry.new ? `code:file:${entry.new}` : null);
  }
}

const existingIds = new Set(seedNodes.map((n) => n.id));
const activeExtIds = new Set(extNodes.map((n) => n.id));

// ── Merge new extracted nodes ───────────────────────────────────────────
let addedNodes = 0;
for (const n of extNodes) {
  if (!existingIds.has(n.id)) {
    seedNodes.push(n);
    existingIds.add(n.id);
    addedNodes++;
  }
}

// ── ADR-013: Apply redirects for renamed nodes ──────────────────────────
let redirectCount = 0;
for (const [oldId, newId] of renameMap) {
  if (!newId) continue;
  if (!existingIds.has(newId)) continue;

  const existingNode = seedNodes.find((n) => n.id === oldId);
  if (existingNode) {
    if (existingNode.status !== 'legacy') {
      existingNode.status = 'legacy';
      existingNode.redirect_to = newId;
      existingNode.missing = true;
      redirectCount++;
    }
  }

  const edgeKey = `${oldId}→${newId}→redirects_to`;
  const edgeExists = seedEdges.some(
    (e) => e.source === oldId && e.target === newId && e.type === 'redirects_to',
  );
  if (!edgeExists && existingIds.has(oldId)) {
    seedEdges.push({
      source: oldId,
      target: newId,
      type: 'redirects_to',
      layer: 'provenance',
      note: 'ADR-013 identity redirect',
    });
  }
}

// ── Merge new extracted edges (skip dangling) ───────────────────────────
const existingEdgeKeys = new Set(seedEdges.map((e) => `${e.source}→${e.target}→${e.type}`));

let addedEdges = 0;
let skippedDangling = 0;
for (const e of extEdges) {
  const key = `${e.source}→${e.target}→${e.type}`;
  if (existingEdgeKeys.has(key)) continue;
  if (!existingIds.has(e.source) || !existingIds.has(e.target)) {
    skippedDangling++;
    continue;
  }
  seedEdges.push(e);
  existingEdgeKeys.add(key);
  addedEdges++;
}

writeFileSync(resolve(worldDir, 'seed.nodes.json'), JSON.stringify(seedNodes, null, 2), 'utf-8');
writeFileSync(resolve(worldDir, 'seed.edges.json'), JSON.stringify(seedEdges, null, 2), 'utf-8');

console.log(`Merge complete:`);
console.log(`  Nodes: ${seedNodes.length} total (+${addedNodes} new)`);
console.log(`  Edges: ${seedEdges.length} total (+${addedEdges} new, ${skippedDangling} skipped dangling)`);
console.log(`  Redirects applied: ${redirectCount} (ADR-013)`);
