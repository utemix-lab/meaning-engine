/**
 * Knowledge Substrate — Phase 4.5 / 5c
 *
 * Formula: Log → Evaluate(Log) → CanonicalStatements → BuildGraph → GraphModel
 *
 * Lifecycle: proposed → verified → canonical | rejected
 */

export {
  StatementStatus,
  EpistemicEventType,
} from './types';

export {
  propose,
  verify,
  approve,
  reject,
} from './operators.js';

export {
  evaluate,
  getCanonicalStatements,
} from './evaluate.js';

export {
  buildGraphFromStatements,
} from './buildGraph.js';
