/**
 * Epistemic operator factories — Phase 4.5 / 5c
 *
 * Each operator creates an EpistemicEvent for the KnowledgeLog.
 * The log is append-only; operators never mutate existing state.
 *
 * Formula: Δ ∈ { propose, verify, approve, reject }
 *
 * Lifecycle:
 *   proposed → verified → canonical | rejected
 *   proposed → canonical | rejected  (direct approval still valid)
 */

import { StatementStatus, EpistemicEventType } from './types';

let _counter = 0;

function generateStatementId() {
  const ts = Date.now().toString(36);
  const seq = (_counter++).toString(36);
  return `stmt-${ts}-${seq}`;
}

/**
 * Create a propose event that introduces a new statement.
 *
 * @param {{ subject: string, predicate: string, object: import('./types').StatementObject, author?: string }} params
 * @returns {import('./types').EpistemicEvent}
 */
export function propose({ subject, predicate, object, author }) {
  if (!subject || !predicate || !object) {
    throw new Error('propose requires subject, predicate, and object');
  }
  if (object.kind !== 'entity' && object.kind !== 'literal') {
    throw new Error('object.kind must be "entity" or "literal"');
  }

  const now = new Date().toISOString();
  /** @type {import('./types').Statement} */
  const statement = {
    id: generateStatementId(),
    subject,
    predicate,
    object,
    status: StatementStatus.PROPOSED,
    author: author || undefined,
    timestamp: now,
  };

  return {
    type: EpistemicEventType.PROPOSE,
    statement,
    author: author || undefined,
    timestamp: now,
  };
}

/**
 * Create a verify event that marks a statement as verified (reviewed but not yet canonical).
 *
 * @param {string} statementId
 * @param {{ author?: string }} [options]
 * @returns {import('./types').EpistemicEvent}
 */
export function verify(statementId, options = {}) {
  if (!statementId) {
    throw new Error('verify requires a statementId');
  }
  return {
    type: EpistemicEventType.VERIFY,
    statementId,
    author: options.author || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an approve event that promotes a statement to canonical.
 * Works on both proposed and verified statements.
 *
 * @param {string} statementId
 * @param {{ author?: string }} [options]
 * @returns {import('./types').EpistemicEvent}
 */
export function approve(statementId, options = {}) {
  if (!statementId) {
    throw new Error('approve requires a statementId');
  }
  return {
    type: EpistemicEventType.APPROVE,
    statementId,
    author: options.author || undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a reject event that marks a statement as rejected.
 * Works on both proposed and verified statements.
 *
 * @param {string} statementId
 * @param {{ author?: string }} [options]
 * @returns {import('./types').EpistemicEvent}
 */
export function reject(statementId, options = {}) {
  if (!statementId) {
    throw new Error('reject requires a statementId');
  }
  return {
    type: EpistemicEventType.REJECT,
    statementId,
    author: options.author || undefined,
    timestamp: new Date().toISOString(),
  };
}
