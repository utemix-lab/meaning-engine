import { describe, it, expect } from 'vitest';
import { propose, approve, reject } from '../operators.js';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { buildGraphFromStatements } from '../buildGraph.js';
import { projectGraph } from '../../projection/projectGraph.js';
import { defaultParams } from '../../projection/types';
import { StatementStatus } from '../types';

/**
 * Phase 5b — Proposal Review Workflow Tests
 *
 * These tests verify the full review workflow:
 *   propose → pending queue → inspect → approve/reject
 *   → graph updates only on canonicalization
 *
 * Architectural boundary:
 *   Review layer reads from Evaluate(Log), not from GraphModel.
 *   GraphModel shows canonical knowledge only (KE1).
 */

function entity(id) { return { kind: 'entity', id }; }
function literal(v) { return { kind: 'literal', value: v }; }

function seedLog() {
  const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root'), author: 'seed' });
  const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root'), author: 'seed' });
  return [p1, approve(p1.statement.id, { author: 'seed' }), p2, approve(p2.statement.id, { author: 'seed' })];
}

function getPending(statements) {
  const result = [];
  for (const stmt of statements.values()) {
    if (stmt.status === StatementStatus.PROPOSED) result.push(stmt);
  }
  return result;
}

describe('Phase 5b — Proposal Review Workflow', () => {

  it('RW1: propose creates a pending item visible in review queue', () => {
    const log = [
      ...seedLog(),
      propose({ subject: 'new-node', predicate: 'type', object: literal('concept'), author: 'user' }),
    ];

    const { statements } = evaluate(log);
    const pending = getPending(statements);

    expect(pending.length).toBe(1);
    expect(pending[0].subject).toBe('new-node');
    expect(pending[0].status).toBe(StatementStatus.PROPOSED);
  });

  it('RW2: pending items are NOT in the graph', () => {
    const log = [
      ...seedLog(),
      propose({ subject: 'invisible', predicate: 'type', object: literal('concept'), author: 'user' }),
      propose({ subject: 'invisible', predicate: 'label', object: literal('Invisible'), author: 'user' }),
    ];

    const { statements } = evaluate(log);
    const canonical = getCanonicalStatements(statements);
    const graph = buildGraphFromStatements(canonical);

    expect(graph.getNodeById('invisible')).toBeUndefined();
    expect(graph.getNodeById('root')).toBeDefined();
  });

  it('RW3: approve removes item from pending and adds to graph', () => {
    const p1 = propose({ subject: 'new', predicate: 'type', object: literal('concept'), author: 'user' });
    const p2 = propose({ subject: 'new', predicate: 'label', object: literal('New'), author: 'user' });

    const logBefore = [...seedLog(), p1, p2];
    const { statements: sBefore } = evaluate(logBefore);
    expect(getPending(sBefore).length).toBe(2);

    const logAfter = [
      ...logBefore,
      approve(p1.statement.id, { author: 'reviewer' }),
      approve(p2.statement.id, { author: 'reviewer' }),
    ];
    const { statements: sAfter } = evaluate(logAfter);
    expect(getPending(sAfter).length).toBe(0);

    const graph = buildGraphFromStatements(getCanonicalStatements(sAfter));
    expect(graph.getNodeById('new')).toBeDefined();
    expect(graph.getNodeById('new').label).toBe('New');
  });

  it('RW4: reject removes item from pending and does NOT affect graph', () => {
    const p1 = propose({ subject: 'bad', predicate: 'type', object: literal('concept'), author: 'user' });
    const p2 = propose({ subject: 'bad', predicate: 'label', object: literal('Bad'), author: 'user' });

    const logBefore = [...seedLog(), p1, p2];
    const { statements: sBefore } = evaluate(logBefore);
    expect(getPending(sBefore).length).toBe(2);

    const logAfter = [
      ...logBefore,
      reject(p1.statement.id, { author: 'reviewer' }),
      reject(p2.statement.id, { author: 'reviewer' }),
    ];
    const { statements: sAfter } = evaluate(logAfter);
    expect(getPending(sAfter).length).toBe(0);

    const graph = buildGraphFromStatements(getCanonicalStatements(sAfter));
    expect(graph.getNodeById('bad')).toBeUndefined();
    expect(graph.getNodes().length).toBe(1);
  });

  it('RW5: mixed workflow — some approved, some rejected, some pending', () => {
    const pA = propose({ subject: 'approved', predicate: 'type', object: literal('concept'), author: 'user' });
    const pR = propose({ subject: 'rejected', predicate: 'type', object: literal('concept'), author: 'user' });
    const pP = propose({ subject: 'pending', predicate: 'type', object: literal('concept'), author: 'user' });

    const log = [
      ...seedLog(),
      pA, pR, pP,
      approve(pA.statement.id, { author: 'reviewer' }),
      reject(pR.statement.id, { author: 'reviewer' }),
    ];

    const { statements } = evaluate(log);

    expect(statements.get(pA.statement.id).status).toBe(StatementStatus.CANONICAL);
    expect(statements.get(pR.statement.id).status).toBe(StatementStatus.REJECTED);
    expect(statements.get(pP.statement.id).status).toBe(StatementStatus.PROPOSED);

    const pending = getPending(statements);
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(pP.statement.id);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('approved')).toBeDefined();
    expect(graph.getNodeById('rejected')).toBeUndefined();
    expect(graph.getNodeById('pending')).toBeUndefined();
  });

  it('RW6: graph updates ONLY on canonicalization, not on propose', () => {
    const base = seedLog();
    const g1 = buildGraphFromStatements(getCanonicalStatements(evaluate(base).statements));
    const nodeCount1 = g1.getNodes().length;

    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'user' });
    const withPropose = [...base, p];
    const g2 = buildGraphFromStatements(getCanonicalStatements(evaluate(withPropose).statements));

    expect(g2.getNodes().length).toBe(nodeCount1);

    const withApprove = [...withPropose, approve(p.statement.id)];
    const g3 = buildGraphFromStatements(getCanonicalStatements(evaluate(withApprove).statements));

    expect(g3.getNodes().length).toBe(nodeCount1 + 1);
  });

  it('RW7: projection remains stable throughout review workflow', () => {
    const p1 = propose({ subject: 'item', predicate: 'type', object: literal('concept'), author: 'user' });
    const p2 = propose({ subject: 'item', predicate: 'label', object: literal('Item'), author: 'user' });
    const p3 = propose({ subject: 'root', predicate: 'contains', object: entity('item'), author: 'user' });

    const logPending = [...seedLog(), p1, p2, p3];
    const gPending = buildGraphFromStatements(getCanonicalStatements(evaluate(logPending).statements));
    const rPending = projectGraph(gPending, { nodeId: 'root', path: [] }, null, defaultParams());
    expect(rPending.ok).toBe(true);
    expect(rPending.viewModel.scene.nodes.length).toBe(1);

    const logApproved = [
      ...logPending,
      approve(p1.statement.id), approve(p2.statement.id), approve(p3.statement.id),
    ];
    const gApproved = buildGraphFromStatements(getCanonicalStatements(evaluate(logApproved).statements));
    const rApproved = projectGraph(gApproved, { nodeId: 'root', path: [] }, null, defaultParams());
    expect(rApproved.ok).toBe(true);
    expect(rApproved.viewModel.scene.nodes.length).toBe(2);
  });

  it('RW8: event history tracks the full lifecycle of a statement', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const a = approve(p.statement.id, { author: 'bob' });

    const log = [...seedLog(), p, a];

    const history = log.filter(
      (e) =>
        (e.type === 'propose' && e.statement?.id === p.statement.id) ||
        (e.type !== 'propose' && e.statementId === p.statement.id),
    );

    expect(history.length).toBe(2);
    expect(history[0].type).toBe('propose');
    expect(history[0].author).toBe('alice');
    expect(history[1].type).toBe('approve');
    expect(history[1].author).toBe('bob');
  });

  it('RW9: multiple proposals for different entities maintain independent lifecycle', () => {
    const pA = propose({ subject: 'alpha', predicate: 'type', object: literal('concept'), author: 'user' });
    const pB = propose({ subject: 'beta', predicate: 'type', object: literal('concept'), author: 'user' });

    const log = [
      ...seedLog(),
      pA, pB,
      approve(pA.statement.id),
    ];

    const { statements } = evaluate(log);
    expect(statements.get(pA.statement.id).status).toBe(StatementStatus.CANONICAL);
    expect(statements.get(pB.statement.id).status).toBe(StatementStatus.PROPOSED);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('alpha')).toBeDefined();
    expect(graph.getNodeById('beta')).toBeUndefined();
  });

  it('RW10: edge proposals only become graph edges after approval', () => {
    const pNode = propose({ subject: 'child', predicate: 'type', object: literal('concept'), author: 'user' });
    const pLabel = propose({ subject: 'child', predicate: 'label', object: literal('Child'), author: 'user' });
    const pEdge = propose({ subject: 'root', predicate: 'contains', object: entity('child'), author: 'user' });

    const logPending = [...seedLog(), pNode, pLabel, pEdge];
    const gPending = buildGraphFromStatements(getCanonicalStatements(evaluate(logPending).statements));
    expect(gPending.getEdges().length).toBe(0);

    const logApproved = [
      ...logPending,
      approve(pNode.statement.id),
      approve(pLabel.statement.id),
      approve(pEdge.statement.id),
    ];
    const gApproved = buildGraphFromStatements(getCanonicalStatements(evaluate(logApproved).statements));
    expect(gApproved.getEdges().length).toBe(1);
    expect(gApproved.getEdges()[0].source).toBe('root');
    expect(gApproved.getEdges()[0].target).toBe('child');
  });
});
