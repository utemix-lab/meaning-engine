/**
 * Code Artifact Extractor — Documentation World
 *
 * Scans src/ for source files, parses local import statements to build
 * a dependency graph, links code artifacts to specs/invariants via
 * specToCodeMap.json.
 *
 * Usage:
 *   node worlds/documentation-world/tools/extractCodeArtifacts.js
 *
 * Outputs:
 *   worlds/documentation-world/tools/extracted.nodes.json
 *   worlds/documentation-world/tools/extracted.edges.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, relative, extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dir, '..', '..', '..');

const SCAN_DIRS = [
  'src',
];

const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const IGNORE_PATTERNS = ['node_modules', 'dist', '.d.ts'];

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (IGNORE_PATTERNS.some((p) => full.includes(p))) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkDir(full));
    } else if (EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

function parseImports(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const imports = [];
  const importRegex = /(?:import|export)\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const specifier = match[1];
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      imports.push(specifier);
    }
  }
  return imports;
}

function resolveImport(fromFile, importSpecifier, allFiles) {
  const fromDir = dirname(fromFile);
  let target = resolve(fromDir, importSpecifier);
  const relTarget = relative(repoRoot, target).replace(/\\/g, '/');

  for (const f of allFiles) {
    const relF = relative(repoRoot, f).replace(/\\/g, '/');
    if (relF === relTarget) return relF;
    const withoutExt = relF.replace(/\.(ts|tsx|js|jsx)$/, '');
    if (withoutExt === relTarget) return relF;
    if (relF === relTarget + '/index.ts' || relF === relTarget + '/index.js' ||
        relF === relTarget + '/index.tsx' || relF === relTarget + '/index.jsx') {
      return relF;
    }
  }
  return null;
}

function toCodeId(repoPath) {
  return `code:file:${repoPath}`;
}

function isTestFile(repoPath) {
  return repoPath.includes('__tests__') || repoPath.includes('.test.') || repoPath.includes('.spec.');
}

function classifyFile(repoPath) {
  if (isTestFile(repoPath)) return 'test';
  if (repoPath.includes('/stores/')) return 'store';
  if (repoPath.includes('/surfaces/') || repoPath.includes('/scene/')) return 'surface';
  if (repoPath.includes('/core/projection/')) return 'projection';
  if (repoPath.includes('/core/navigation/')) return 'navigation';
  if (repoPath.includes('/core/knowledge/')) return 'knowledge';
  if (repoPath.includes('/core/types/')) return 'types';
  if (repoPath.includes('/engine/')) return 'engine-layer';
  return 'module';
}

console.log('Scanning repository...');

const allFiles = [];
for (const dir of SCAN_DIRS) {
  const absDir = resolve(repoRoot, dir);
  allFiles.push(...walkDir(absDir));
}

console.log(`Found ${allFiles.length} source files`);

const nodes = [];
const edges = [];
const existingCodeArtifactId = 'code_artifact:protocol-ts';
const existingCodePath = 'src/core/types/protocol.ts';

for (const absFile of allFiles) {
  const repoPath = relative(repoRoot, absFile).replace(/\\/g, '/');
  const id = toCodeId(repoPath);

  if (repoPath === existingCodePath) continue;

  const tags = [classifyFile(repoPath)];
  if (repoPath.startsWith('src/engine/')) tags.push('engine-adapter');
  if (repoPath.startsWith('src/core/')) tags.push('core');

  nodes.push({
    id,
    type: 'code_artifact',
    title: repoPath.split('/').pop(),
    source: 'repo',
    path: repoPath,
    tags,
    status: 'active',
  });
}

for (const absFile of allFiles) {
  const repoPath = relative(repoRoot, absFile).replace(/\\/g, '/');
  const fromId = repoPath === existingCodePath ? existingCodeArtifactId : toCodeId(repoPath);
  const imports = parseImports(absFile);

  for (const imp of imports) {
    const resolved = resolveImport(absFile, imp, allFiles);
    if (!resolved) continue;
    const toId = resolved === existingCodePath ? existingCodeArtifactId : toCodeId(resolved);
    edges.push({
      source: fromId,
      target: toId,
      type: 'depends_on',
      layer: 'provenance',
    });
  }
}

const specToCodeMap = JSON.parse(readFileSync(resolve(__dir, 'specToCodeMap.json'), 'utf-8'));

for (const [specId, entry] of Object.entries(specToCodeMap)) {
  for (const codePath of entry.implements) {
    const codeId = codePath === existingCodePath ? existingCodeArtifactId : toCodeId(codePath);
    const nodeExists = nodes.some((n) => n.id === codeId) || codeId === existingCodeArtifactId;
    if (!nodeExists) continue;
    edges.push({
      source: codeId,
      target: specId,
      type: 'implements',
      layer: 'provenance',
      note: `${codePath} implements ${entry.title}`,
    });
  }
}

// Evidence test files (grounding experiments) live in vovaipetrova/packages/render,
// not in this repository. Cross-repo traceability is out of scope for now.

const uniqueEdges = [];
const edgeSet = new Set();
for (const e of edges) {
  const key = `${e.source}→${e.target}→${e.type}`;
  if (!edgeSet.has(key)) {
    edgeSet.add(key);
    uniqueEdges.push(e);
  }
}

writeFileSync(resolve(__dir, 'extracted.nodes.json'), JSON.stringify(nodes, null, 2), 'utf-8');
writeFileSync(resolve(__dir, 'extracted.edges.json'), JSON.stringify(uniqueEdges, null, 2), 'utf-8');

console.log(`\nExtracted:`);
console.log(`  Nodes: ${nodes.length} code_artifact`);
console.log(`  Edges: ${uniqueEdges.length} total`);
console.log(`    depends_on: ${uniqueEdges.filter((e) => e.type === 'depends_on').length}`);
console.log(`    implements: ${uniqueEdges.filter((e) => e.type === 'implements').length}`);
console.log(`\nWritten to:`);
console.log(`  extracted.nodes.json`);
console.log(`  extracted.edges.json`);
