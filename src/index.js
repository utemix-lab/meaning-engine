/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEANING ENGINE v0.6.0 — Universal Semantic Graph Engine
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Универсальный движок для работы с семантическими графами.
 * 
 * ПРИНЦИП World-Agnostic:
 * - Engine не знает о конкретных мирах
 * - Типы узлов/рёбер инжектируются через WorldAdapter
 * - Мир = schema.json + seed.json + config
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * ```javascript
 * import { MeaningEngine, WorldAdapter } from 'meaning-engine';
 * 
 * const adapter = WorldAdapter.fromJSON(schemaData, seedData);
 * const engine = new MeaningEngine(adapter);
 * 
 * engine.isValidNodeType("character");  // зависит от схемы мира
 * engine.getNodeById("vova");           // зависит от seed мира
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE — Главные классы платформы
// ═══════════════════════════════════════════════════════════════════════════

export {
  MeaningEngine,
  ENGINE_VERSION,
  WorldInterface,
  SchemaValidator,
  GraphValidator,
  WorldValidator,
  CatalogValidator,
  Schema,
  WorldAdapter,
  SpecificationReader,
  CatalogRegistry,
  OperatorEngine,
  CatalogLoader,
} from "./engine/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// CORE — Универсальные компоненты (World-Agnostic)
// ═══════════════════════════════════════════════════════════════════════════

export {
  // Graph Model
  GraphModel,
  createContextFromState,
  createEmptyContext,
  INTENSITY,
  
  // Projections (универсальные)
  Projection,
  ProjectionRegistry,
  projectionRegistry,
  DevProjection,
  OWLProjection,
  NAMESPACES,
  GraphRAGProjection,
  ReflectiveProjection,
  
  // Structural Invariants
  checkUniqueNodeIds,
  checkUniqueEdgeIds,
  checkNoDanglingEdges,
  checkNoSelfLoops,
  checkAllNodesHaveId,
  checkAllNodesHaveType,
  checkKnownNodeTypes,
  checkAllNodesHaveLabel,
  checkAllEdgesHaveType,
  checkKnownEdgeTypes,
  checkNoDuplicateEdges,
  checkGraphConnected,
  checkNoIsolatedNodes,
  checkHasRootNode,
  checkNoContainsCycles,
  checkSingleParent,
  InvariantChecker,
  STRICTNESS,
  
  // Snapshots
  GraphSnapshot,
  SnapshotHistory,
  diffSnapshots,
  CHANGE_TYPE,
  SNAPSHOT_VERSION,
  
  // Performance
  SyntheticGraphGenerator,
  PerformanceAuditor,
  benchmark,
  benchmarkAsync,
  formatTime,
  formatSize,
  analyzeScalability,
  
  // Change Protocol
  ChangeProtocol,
  ProposalValidator,
  createProposal,
  MUTATION_TYPE,
  AUTHOR_TYPE,
  PROPOSAL_STATUS,
  
  // LLM Reflection
  LLMReflectionEngine,
  ContextAssembler,
  PromptBuilder,
  SuggestionParser,
  ENGINE_MODE,
  PROMPT_TYPE,
  
  // Ownership
  OwnershipGraph,
  ownershipGraph,
  
  // Navigation
  applyTransition,
  TransitionType,
  select,
  drillDown,
  drillUp,
  reset,

  // Projection Pipeline
  projectGraph,
  validateInputs,
  resolveFocus,
  computeVisibleSubgraph,
  deriveSemanticRoles,
  buildViewModel,
  SemanticRole,
  defaultParams,
  emptyFocus,

  // Identity
  createIdentity,
  getDisplayName,
  generateSlug,
  validateIdImmutability,
  updateCanonicalName,
  addAlias,
  matchesName,
  extractIdentityFromNode,
  serializeIdentity,

  // Knowledge Substrate (Phase 4.5 / 5c)
  StatementStatus,
  EpistemicEventType,
  propose,
  verify,
  approve,
  reject,
  evaluate,
  getCanonicalStatements,
  buildGraphFromStatements,
} from "./core/index.js";

// ═══════════════════════════════════════════════════════════════════════════
// HIGHLIGHT — Модель подсветки
// ═══════════════════════════════════════════════════════════════════════════

export {
  computeHighlight,
  INTENSITY as HIGHLIGHT_INTENSITY,
} from "./highlight/highlightModel.js";

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════════════════

export { MeaningEngine as default } from "./engine/index.js";
