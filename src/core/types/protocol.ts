/**
 * Focus Node Protocol + Attachment Protocol — type definitions.
 *
 * These types formalize the two core protocols:
 * 1. How any node can be "opened" as a unit of work (Focus Node Protocol)
 * 2. How external subgraphs connect to nodes (Attachment Protocol)
 *
 * See docs/FOCUS_NODE_PROTOCOL.md, docs/ATTACHMENT_PROTOCOL.md
 */

// ── Focus Node Protocol ─────────────────────────────────────────────────

/** How a node is opened by the system */
export type FocusRole =
  | 'entry'       // workspace root (universe)
  | 'hub'         // folder / aggregator (characters, domains)
  | 'lens'        // operational mode (workbench)
  | 'perspective' // cognitive agent (character)
  | 'area'        // subject area (domain)
  | 'space'       // shared workspace (collab)
  | 'none';       // data node, not a focus

/** What the node focuses on when opened */
export type FocusTarget =
  | 'subject-area'       // domain of knowledge
  | 'operational-lens'   // workbench filter/mode
  | 'perspective'        // cognitive lens
  | 'relational-space'   // multi-agent space
  | 'attached-knowledge' // external subgraph
  | 'data';              // concrete entity

/** Where the node appears in the interface */
export type SceneVisibility =
  | 'scene'   // 3D object in the scene
  | 'panel'   // only in panels (catalogs, lists)
  | 'both'    // scene + panels
  | 'hidden'; // invisible by default

// ── Attachment Protocol ─────────────────────────────────────────────────

/** Whether external subgraphs can connect */
export type AttachmentPolicy =
  | 'open'   // any subgraph
  | 'typed'  // only specific types
  | 'none';  // no attachments

/** Where attached data is projected */
export type SurfacePolicy =
  | 'scene'   // attached data in 3D
  | 'panels'  // attached data in panels only
  | 'mixed'   // split by per-node sceneVisibility
  | 'hidden'; // loaded but not shown

/** Type of attachment source */
export type AttachmentSourceType =
  | 'ontology'
  | 'catalog'
  | 'dataset'
  | 'service';

/** How the attachment connects */
export type AttachmentMode =
  | 'direct'            // immediate
  | 'typed'             // by edge type
  | 'deferred'          // lazy-loaded
  | 'hidden-by-default'; // loaded, not shown

/** Descriptor for an attached subgraph */
export interface AttachmentDescriptor {
  source: string;
  sourceType: AttachmentSourceType;
  attachTo: string;
  edgeType: string;
  nodeMapping: {
    defaultType: string;
    defaultSceneVisibility: SceneVisibility;
  };
  relationMapping: {
    defaultEdgeType: string;
  };
  surfacePolicy: SurfacePolicy;
  detachable: boolean;
}

// ── Node with protocol attributes ───────────────────────────────────────

/** Protocol attributes that can be assigned to any graph node */
export interface ProtocolAttributes {
  focusRole?: FocusRole;
  focusTarget?: FocusTarget;
  sceneVisibility?: SceneVisibility;
  attachmentPolicy?: AttachmentPolicy;
  surfacePolicy?: SurfacePolicy;
}
