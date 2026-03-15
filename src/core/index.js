/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE — Формальное ядро платформы (World-Agnostic)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * MeaningEngine Core — универсальные компоненты для работы с семантическими графами.
 * 
 * ПРИНЦИП:
 * - Core НЕ ЗНАЕТ о конкретных мирах (vovaipetrova, etc.)
 * - Типы узлов/рёбер инжектируются через WorldAdapter
 * - Проекции, специфичные для UI мира, НЕ входят в Core
 * 
 * ЭКСПОРТЫ:
 * - GraphModel — абстрактная модель графа
 * - Projection — базовый класс проекции
 * - DevProjection — dev-линза (универсальная)
 * - Инварианты, снапшоты, протоколы изменений
 * 
 * НЕ ЭКСПОРТИРУЕТСЯ (World-specific):
 * - VisitorProjection — это UI конкретного мира
 * - NODE_TYPES, EDGE_TYPES — это схема конкретного мира
 * - WorldSchemaLoader — это загрузчик конкретного мира
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Graph Model
export { GraphModel, createContextFromState, createEmptyContext, INTENSITY } from "./GraphModel.js";

// Projections (универсальные)
export { Projection, ProjectionRegistry, projectionRegistry } from "./Projection.js";
export { DevProjection } from "./DevProjection.js";
export { OWLProjection, NAMESPACES } from "./OWLProjection.js";
export { GraphRAGProjection } from "./GraphRAGProjection.js";
export { ReflectiveProjection } from "./ReflectiveProjection.js";

// Structural Invariants
export {
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
} from "./StructuralInvariants.js";

// Snapshots
export {
  GraphSnapshot,
  SnapshotHistory,
  diffSnapshots,
  CHANGE_TYPE,
  SNAPSHOT_VERSION,
} from "./GraphSnapshot.js";

// Performance
export {
  SyntheticGraphGenerator,
  PerformanceAuditor,
  benchmark,
  benchmarkAsync,
  formatTime,
  formatSize,
  analyzeScalability,
} from "./PerformanceAudit.js";

// Change Protocol
export {
  ChangeProtocol,
  ProposalValidator,
  createProposal,
  MUTATION_TYPE,
  AUTHOR_TYPE,
  PROPOSAL_STATUS,
} from "./ChangeProtocol.js";

// LLM Reflection
export {
  LLMReflectionEngine,
  ContextAssembler,
  PromptBuilder,
  SuggestionParser,
  ENGINE_MODE,
  PROMPT_TYPE,
} from "./LLMReflectionEngine.js";

// Ownership
export { OwnershipGraph, ownershipGraph } from "./OwnershipGraph.js";

// Navigation (Engine Phase 3)
export {
  applyTransition,
  TransitionType,
  select,
  drillDown,
  drillUp,
  reset,
} from "./navigation/index.js";

// Projection Pipeline (Engine Phase 2)
export {
  projectGraph,
  validateInputs,
  resolveFocus,
  computeVisibleSubgraph,
  deriveSemanticRoles,
  buildViewModel,
  SemanticRole,
  defaultParams,
  emptyFocus,
} from "./projection/index.js";

// Knowledge Substrate (Engine Phase 4.5 / 5c)
export {
  StatementStatus,
  EpistemicEventType,
  propose,
  verify,
  approve,
  reject,
  evaluate,
  getCanonicalStatements,
  buildGraphFromStatements,
} from "./knowledge/index.js";

// Identity
export {
  createIdentity,
  getDisplayName,
  generateSlug,
  validateIdImmutability,
  updateCanonicalName,
  addAlias,
  matchesName,
  extractIdentityFromNode,
  serializeIdentity
} from "./Identity.js";
