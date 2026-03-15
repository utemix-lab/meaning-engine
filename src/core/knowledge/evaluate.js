/**
 * Knowledge Log evaluator — Phase 4.5 / 5c
 *
 * Formula: Evaluate(Log) → Map<statementId, Statement>
 *
 * Reduces an append-only event log into the current state of all statements.
 * The graph is then built only from canonical statements:
 *   Graph = BuildGraph(Statements where status = canonical)
 *
 * Lifecycle: proposed → verified → canonical | rejected
 *            proposed → canonical | rejected  (direct approval)
 *
 * Determinism invariant: same log always produces the same result.
 */

import { StatementStatus, EpistemicEventType } from './types';

const VERIFIABLE = new Set([StatementStatus.PROPOSED]);
const APPROVABLE = new Set([StatementStatus.PROPOSED, StatementStatus.VERIFIED]);
const REJECTABLE = new Set([StatementStatus.PROPOSED, StatementStatus.VERIFIED]);
const TERMINAL = new Set([StatementStatus.CANONICAL, StatementStatus.REJECTED]);

/**
 * Evaluate a KnowledgeLog into a StatementsState.
 *
 * @param {import('./types').KnowledgeLog} log
 * @returns {{ statements: Map<string, import('./types').Statement>, errors: string[] }}
 */
export function evaluate(log) {
  /** @type {Map<string, import('./types').Statement>} */
  const statements = new Map();
  /** @type {string[]} */
  const errors = [];

  for (const event of log) {
    switch (event.type) {
      case EpistemicEventType.PROPOSE: {
        const stmt = event.statement;
        if (!stmt || !stmt.id) {
          errors.push('propose event missing statement or statement.id');
          break;
        }
        if (statements.has(stmt.id)) {
          errors.push(`duplicate statement id: ${stmt.id}`);
          break;
        }
        statements.set(stmt.id, {
          ...stmt,
          status: StatementStatus.PROPOSED,
        });
        break;
      }

      case EpistemicEventType.VERIFY: {
        const id = event.statementId;
        if (!id) {
          errors.push('verify event missing statementId');
          break;
        }
        const existing = statements.get(id);
        if (!existing) {
          errors.push(`verify: unknown statementId "${id}"`);
          break;
        }
        if (!VERIFIABLE.has(existing.status)) {
          errors.push(`verify: statement "${id}" is ${existing.status}, expected proposed`);
          break;
        }
        statements.set(id, {
          ...existing,
          status: StatementStatus.VERIFIED,
        });
        break;
      }

      case EpistemicEventType.APPROVE: {
        const id = event.statementId;
        if (!id) {
          errors.push('approve event missing statementId');
          break;
        }
        const existing = statements.get(id);
        if (!existing) {
          errors.push(`approve: unknown statementId "${id}"`);
          break;
        }
        if (existing.status === StatementStatus.CANONICAL) break;
        if (!APPROVABLE.has(existing.status)) {
          errors.push(`approve: statement "${id}" is ${existing.status}, expected proposed or verified`);
          break;
        }
        statements.set(id, {
          ...existing,
          status: StatementStatus.CANONICAL,
        });
        break;
      }

      case EpistemicEventType.REJECT: {
        const id = event.statementId;
        if (!id) {
          errors.push('reject event missing statementId');
          break;
        }
        const existing = statements.get(id);
        if (!existing) {
          errors.push(`reject: unknown statementId "${id}"`);
          break;
        }
        if (existing.status === StatementStatus.REJECTED) break;
        if (!REJECTABLE.has(existing.status)) {
          errors.push(`reject: statement "${id}" is ${existing.status}, expected proposed or verified`);
          break;
        }
        statements.set(id, {
          ...existing,
          status: StatementStatus.REJECTED,
        });
        break;
      }

      default:
        errors.push(`unknown event type: ${event.type}`);
    }
  }

  return { statements, errors };
}

/**
 * Filter a StatementsState to only canonical statements.
 *
 * Formula: CanonicalStatements = { s ∈ Statements | s.status = canonical }
 *
 * @param {Map<string, import('./types').Statement>} statements
 * @returns {import('./types').Statement[]}
 */
export function getCanonicalStatements(statements) {
  const result = [];
  for (const stmt of statements.values()) {
    if (stmt.status === StatementStatus.CANONICAL) {
      result.push(stmt);
    }
  }
  return result;
}
