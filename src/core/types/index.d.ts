/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CORE TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * P3.5: TypeScript для Core
 * 
 * Центральный экспорт всех типов Core.
 * 
 * АРХИТЕКТУРА:
 * - Core не импортирует ничего из visitor
 * - visitor импортирует только из Core
 * - Core → Projection → Renderer (никогда наоборот)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// Identity types
export type {
  IdentityMeta,
  EntityIdentity,
  LocalizedName,
  CreateIdentityOptions
} from "./identity";

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
} from "./identity";

// Graph types
export type {
  NodeData,
  EdgeData,
  GraphData,
  ScopeResult,
  IGraphModel,
  GraphModelConstructor
} from "./graph";

export { GraphModel } from "./graph";

// Highlight types
export type {
  HighlightMode,
  IntensityConstants,
  HighlightContext,
  NodeIntensity,
  EdgeIntensity,
  HighlightState,
  HighlightGraphData
} from "./highlight";

export {
  INTENSITY,
  computeHighlight,
  createContextFromState,
  createEmptyContext
} from "./highlight";

// Projection types
export type {
  RenderContext,
  IProjection,
  IProjectionRegistry,
  ProjectionConstructor
} from "./projection";

export {
  Projection,
  ProjectionRegistry,
  projectionRegistry
} from "./projection";

// Protocol types (Focus Node + Attachment)
export type {
  FocusRole,
  FocusTarget,
  SceneVisibility,
  AttachmentPolicy,
  SurfacePolicy,
  AttachmentSourceType,
  AttachmentMode,
  AttachmentDescriptor,
  ProtocolAttributes,
} from "./protocol";
