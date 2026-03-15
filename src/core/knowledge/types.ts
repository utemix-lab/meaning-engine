/**
 * Knowledge Substrate types — Phase 4.5 / 5c
 *
 * Formula: Log → Statements → Graph → Projection → ViewModel → UI
 *
 * Knowledge lives in statements (S, P, O), not in the graph.
 * The graph is a derived structure built from canonical statements.
 */

// ── Statement Status ────────────────────────────────────────────────────

export const StatementStatus = {
  PROPOSED: 'proposed',
  VERIFIED: 'verified',
  CANONICAL: 'canonical',
  REJECTED: 'rejected',
} as const;

export type StatementStatus = typeof StatementStatus[keyof typeof StatementStatus];

// ── Epistemic Event Type ────────────────────────────────────────────────

export const EpistemicEventType = {
  PROPOSE: 'propose',
  VERIFY: 'verify',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type EpistemicEventType = typeof EpistemicEventType[keyof typeof EpistemicEventType];

// ── Statement Object (discriminated union) ──────────────────────────────

export type StatementObject =
  | { kind: 'entity'; id: string }
  | { kind: 'literal'; value: string | number | boolean };

// ── Statement ───────────────────────────────────────────────────────────

/**
 * A single knowledge atom — the (Subject, Predicate, Object) triple.
 *
 * Lifecycle: proposed → verified → canonical | rejected
 *            proposed → canonical | rejected  (direct approval still valid)
 */
export interface Statement {
  readonly id: string;
  subject: string;
  predicate: string;
  object: StatementObject;
  status: StatementStatus;
  author?: string;
  timestamp?: string;
}

// ── Epistemic Event (discriminated union) ───────────────────────────────

export type EpistemicEvent =
  | { type: 'propose'; statement: Statement; author?: string; timestamp: string }
  | { type: 'verify'; statementId: string; author?: string; timestamp: string }
  | { type: 'approve'; statementId: string; author?: string; timestamp: string }
  | { type: 'reject'; statementId: string; author?: string; timestamp: string };

// ── Knowledge Log ───────────────────────────────────────────────────────

export type KnowledgeLog = EpistemicEvent[];
