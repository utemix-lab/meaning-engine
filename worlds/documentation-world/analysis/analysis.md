# Documentation World — Analysis Report

Generated: 2026-03-15T18:18:01.954Z
Graph: 116 nodes, 267 edges

## D1. Centrality (Top-10)

| # | Title | Type | Degree | Betweenness | Score |
|---|-------|------|--------|-------------|-------|
| 1 | GraphModel.js | code_artifact | 10 | 1267.55 | 1277.6 |
| 2 | projectGraph.js | code_artifact | 21 | 931.69 | 952.7 |
| 3 | PROJECTION_SPEC | spec | 15 | 713.04 | 728 |
| 4 | LLMReflectionEngine.js | code_artifact | 6 | 565.51 | 571.5 |
| 5 | Context | concept | 7 | 550.17 | 557.2 |
| 6 | Context Does Not Mutate Graph | invariant | 5 | 525.61 | 530.6 |
| 7 | Focus Preservation Rule | invariant | 6 | 504.65 | 510.7 |
| 8 | Workbench | concept | 12 | 478.38 | 490.4 |
| 9 | Focus | concept | 10 | 473.78 | 483.8 |
| 10 | index.js | code_artifact | 7 | 448.47 | 455.5 |

## D2. Weak Bridges (Top-10 by edge betweenness)

| # | Node A | Node B | Betweenness | Cross-type |
|---|--------|--------|-------------|------------|
| 1 | GraphModel.js (code_artifact) | LLMReflectionEngine.js (code_artifact) | 614.98 | no |
| 2 | GraphModel.js (code_artifact) | index.js (code_artifact) | 513.79 | no |
| 3 | projectGraph.js (code_artifact) | Context Does Not Mutate Graph (invariant) | 498.35 | yes |
| 4 | Context (concept) | Context Does Not Mutate Graph (invariant) | 479.93 | yes |
| 5 | GraphModel.js (code_artifact) | buildGraph.js (code_artifact) | 439.32 | no |
| 6 | resolveFocus.js (code_artifact) | Focus Preservation Rule (invariant) | 336.79 | yes |
| 7 | Context (concept) | Workbench (concept) | 267.39 | no |
| 8 | GraphModel.js (code_artifact) | projectGraph.test.js (code_artifact) | 252.79 | no |
| 9 | CanonicalGraphSchema.js (code_artifact) | LLMReflectionEngine.js (code_artifact) | 230 | no |
| 10 | GraphModel.js (code_artifact) | domainProjection.test.js (code_artifact) | 204.41 | no |

## D3. Cycles (found: 0)

No cycles of length 3–6 detected in the directed graph.

## D4. Distance Anomalies (10 found)

1. **PROJECTION_SPEC** (spec) ↔ **index.js** (code_artifact) — distance: ∞ (unreachable)
2. **PROJECTION_SPEC** (spec) ↔ **CatalogLoader.js** (code_artifact) — distance: ∞ (unreachable)
3. **PROJECTION_SPEC** (spec) ↔ **CatalogRegistry.js** (code_artifact) — distance: ∞ (unreachable)
4. **PROJECTION_SPEC** (spec) ↔ **index.js** (code_artifact) — distance: ∞ (unreachable)
5. **PROJECTION_SPEC** (spec) ↔ **OperatorEngine.js** (code_artifact) — distance: ∞ (unreachable)
6. **PROJECTION_SPEC** (spec) ↔ **Schema.js** (code_artifact) — distance: ∞ (unreachable)
7. **PROJECTION_SPEC** (spec) ↔ **SpecificationReader.js** (code_artifact) — distance: ∞ (unreachable)
8. **PROJECTION_SPEC** (spec) ↔ **WorldAdapter.js** (code_artifact) — distance: ∞ (unreachable)
9. **PROJECTION_SPEC** (spec) ↔ **WorldInterface.js** (code_artifact) — distance: ∞ (unreachable)
10. **PROJECTION_SPEC** (spec) ↔ **CatalogLoader.test.js** (code_artifact) — distance: ∞ (unreachable)

## Missing Concept Candidates (1)

1. **evidence ↔ code_artifact** — No direct or concept-bridged path between evidence and code_artifact. Consider adding a bridging concept.
