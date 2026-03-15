import { describe, it, expect } from 'vitest';
import { propose, verify, approve, reject } from '../operators.js';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { buildGraphFromStatements } from '../buildGraph.js';
import { projectGraph } from '../../projection/projectGraph.js';
import { defaultParams } from '../../projection/types';
import { StatementStatus } from '../types';

/**
 * Phase 5c — Verification Workflow Tests
 *
 * Lifecycle:
 *   proposed → verified → canonical | rejected
 *   proposed → canonical | rejected  (direct path preserved)
 *
 * Key invariant: verified does NOT affect the graph.
 * Only canonical statements enter the graph (KE1 preserved).
 */

function entity(id) { return { kind: 'entity', id }; }
function literal(v) { return { kind: 'literal', value: v }; }

function seedLog() {
  const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root'), author: 'seed' });
  const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root'), author: 'seed' });
  return [p1, approve(p1.statement.id, { author: 'seed' }), p2, approve(p2.statement.id, { author: 'seed' })];
}

describe('Phase 5c — Verification Workflow', () => {

  it('VW1: verify transitions proposed → verified', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [...seedLog(), p, verify(p.statement.id, { author: 'bob' })];

    const { statements } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.VERIFIED);
  });

  it('VW2: verified does NOT add to graph (only canonical does)', () => {
    const p1 = propose({ subject: 'item', predicate: 'type', object: literal('concept'), author: 'alice' });
    const p2 = propose({ subject: 'item', predicate: 'label', object: literal('Item'), author: 'alice' });
    const log = [
      ...seedLog(),
      p1, p2,
      verify(p1.statement.id, { author: 'bob' }),
      verify(p2.statement.id, { author: 'bob' }),
    ];

    const { statements } = evaluate(log);
    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('item')).toBeUndefined();
    expect(graph.getNodeById('root')).toBeDefined();
  });

  it('VW3: verified → approve adds to graph', () => {
    const p1 = propose({ subject: 'item', predicate: 'type', object: literal('concept'), author: 'alice' });
    const p2 = propose({ subject: 'item', predicate: 'label', object: literal('Item'), author: 'alice' });
    const log = [
      ...seedLog(),
      p1, p2,
      verify(p1.statement.id, { author: 'bob' }),
      verify(p2.statement.id, { author: 'bob' }),
      approve(p1.statement.id, { author: 'carol' }),
      approve(p2.statement.id, { author: 'carol' }),
    ];

    const { statements } = evaluate(log);
    expect(statements.get(p1.statement.id).status).toBe(StatementStatus.CANONICAL);
    expect(statements.get(p2.statement.id).status).toBe(StatementStatus.CANONICAL);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('item')).toBeDefined();
    expect(graph.getNodeById('item').label).toBe('Item');
  });

  it('VW4: verified → reject removes from queue, no graph effect', () => {
    const p = propose({ subject: 'bad', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [
      ...seedLog(),
      p,
      verify(p.statement.id, { author: 'bob' }),
      reject(p.statement.id, { author: 'carol' }),
    ];

    const { statements } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.REJECTED);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('bad')).toBeUndefined();
  });

  it('VW5: direct approve still works (proposed → canonical)', () => {
    const p = propose({ subject: 'direct', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [...seedLog(), p, approve(p.statement.id, { author: 'bob' })];

    const { statements } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.CANONICAL);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('direct')).toBeDefined();
  });

  it('VW6: cannot verify already canonical statement', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [
      ...seedLog(),
      p,
      approve(p.statement.id, { author: 'bob' }),
      verify(p.statement.id, { author: 'carol' }),
    ];

    const { statements, errors } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.CANONICAL);
    expect(errors.some((e) => e.includes('verify') && e.includes('canonical'))).toBe(true);
  });

  it('VW7: cannot verify already rejected statement', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [
      ...seedLog(),
      p,
      reject(p.statement.id, { author: 'bob' }),
      verify(p.statement.id, { author: 'carol' }),
    ];

    const { statements, errors } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.REJECTED);
    expect(errors.some((e) => e.includes('verify') && e.includes('rejected'))).toBe(true);
  });

  it('VW8: cannot approve already rejected statement', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [
      ...seedLog(),
      p,
      reject(p.statement.id, { author: 'bob' }),
      approve(p.statement.id, { author: 'carol' }),
    ];

    const { statements, errors } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.REJECTED);
    expect(errors.some((e) => e.includes('approve') && e.includes('rejected'))).toBe(true);
  });

  it('VW9: mixed lifecycle — proposed, verified, canonical, rejected coexist', () => {
    const pA = propose({ subject: 'a', predicate: 'type', object: literal('concept'), author: 'user' });
    const pB = propose({ subject: 'b', predicate: 'type', object: literal('concept'), author: 'user' });
    const pC = propose({ subject: 'c', predicate: 'type', object: literal('concept'), author: 'user' });
    const pD = propose({ subject: 'd', predicate: 'type', object: literal('concept'), author: 'user' });

    const log = [
      ...seedLog(),
      pA, pB, pC, pD,
      verify(pB.statement.id),
      verify(pC.statement.id),
      approve(pC.statement.id),
      reject(pD.statement.id),
    ];

    const { statements } = evaluate(log);
    expect(statements.get(pA.statement.id).status).toBe(StatementStatus.PROPOSED);
    expect(statements.get(pB.statement.id).status).toBe(StatementStatus.VERIFIED);
    expect(statements.get(pC.statement.id).status).toBe(StatementStatus.CANONICAL);
    expect(statements.get(pD.statement.id).status).toBe(StatementStatus.REJECTED);

    const graph = buildGraphFromStatements(getCanonicalStatements(statements));
    expect(graph.getNodeById('c')).toBeDefined();
    expect(graph.getNodeById('a')).toBeUndefined();
    expect(graph.getNodeById('b')).toBeUndefined();
    expect(graph.getNodeById('d')).toBeUndefined();
  });

  it('VW10: event history records full verification lifecycle', () => {
    const p = propose({ subject: 'item', predicate: 'type', object: literal('concept'), author: 'alice' });
    const v = verify(p.statement.id, { author: 'bob' });
    const a = approve(p.statement.id, { author: 'carol' });

    const log = [...seedLog(), p, v, a];

    const history = log.filter(
      (e) =>
        (e.type === 'propose' && e.statement?.id === p.statement.id) ||
        (e.type !== 'propose' && e.statementId === p.statement.id),
    );

    expect(history.length).toBe(3);
    expect(history[0].type).toBe('propose');
    expect(history[0].author).toBe('alice');
    expect(history[1].type).toBe('verify');
    expect(history[1].author).toBe('bob');
    expect(history[2].type).toBe('approve');
    expect(history[2].author).toBe('carol');
  });

  it('VW11: projection remains total through full verification lifecycle', () => {
    const pNode = propose({ subject: 'item', predicate: 'type', object: literal('concept'), author: 'user' });
    const pLabel = propose({ subject: 'item', predicate: 'label', object: literal('Item'), author: 'user' });
    const pEdge = propose({ subject: 'root', predicate: 'contains', object: entity('item'), author: 'user' });

    const stages = [
      [...seedLog(), pNode, pLabel, pEdge],
      [...seedLog(), pNode, pLabel, pEdge, verify(pNode.statement.id), verify(pLabel.statement.id), verify(pEdge.statement.id)],
      [...seedLog(), pNode, pLabel, pEdge, verify(pNode.statement.id), verify(pLabel.statement.id), verify(pEdge.statement.id), approve(pNode.statement.id), approve(pLabel.statement.id), approve(pEdge.statement.id)],
    ];

    for (const log of stages) {
      const graph = buildGraphFromStatements(getCanonicalStatements(evaluate(log).statements));
      const result = projectGraph(graph, { nodeId: 'root', path: [] }, null, defaultParams());
      expect(result.ok).toBe(true);
    }
  });

  it('VW12 (Invariant): double verify on same statement is an error', () => {
    const p = propose({ subject: 'x', predicate: 'type', object: literal('concept'), author: 'alice' });
    const log = [
      ...seedLog(),
      p,
      verify(p.statement.id, { author: 'bob' }),
      verify(p.statement.id, { author: 'carol' }),
    ];

    const { statements, errors } = evaluate(log);
    expect(statements.get(p.statement.id).status).toBe(StatementStatus.VERIFIED);
    expect(errors.some((e) => e.includes('verify') && e.includes('verified'))).toBe(true);
  });
});
