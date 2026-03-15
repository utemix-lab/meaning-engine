import { describe, it, expect } from 'vitest';
import { propose, approve, reject } from '../operators.js';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { buildGraphFromStatements } from '../buildGraph.js';
import { projectGraph } from '../../projection/projectGraph.js';
import { defaultParams } from '../../projection/types';

/**
 * Knowledge Evolution Invariants (KE1–KE5)
 *
 * These invariants protect the system during transition
 * from read-only graph to event-sourced knowledge.
 *
 * All invariants must hold for any valid event sequence.
 */

function entity(id) { return { kind: 'entity', id }; }
function literal(v) { return { kind: 'literal', value: v }; }

function buildTestLog() {
  const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root') });
  const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root') });
  const p3 = propose({ subject: 'node-a', predicate: 'type', object: literal('concept') });
  const p4 = propose({ subject: 'node-a', predicate: 'label', object: literal('A') });
  const p5 = propose({ subject: 'root', predicate: 'contains', object: entity('node-a') });
  const p6 = propose({ subject: 'ghost', predicate: 'type', object: literal('concept') });
  const p7 = propose({ subject: 'ghost', predicate: 'label', object: literal('Ghost') });

  return {
    log: [
      p1, p2, p3, p4, p5, p6, p7,
      approve(p1.statement.id),
      approve(p2.statement.id),
      approve(p3.statement.id),
      approve(p4.statement.id),
      approve(p5.statement.id),
      reject(p6.statement.id),
      reject(p7.statement.id),
    ],
    ids: {
      root: { type: p1.statement.id, label: p2.statement.id },
      nodeA: { type: p3.statement.id, label: p4.statement.id },
      edge: p5.statement.id,
      ghost: { type: p6.statement.id, label: p7.statement.id },
    },
  };
}

describe('Knowledge Evolution Invariants', () => {

  /**
   * KE1: Canonical-Only Graph Build
   *
   * Graph = BuildGraph(Statements where status = canonical)
   *
   * Only canonical statements enter the graph.
   * Proposed and rejected statements are invisible to the graph layer.
   */
  it('KE1: only canonical statements build the graph', () => {
    const { log } = buildTestLog();
    const { statements } = evaluate(log);
    const canonical = getCanonicalStatements(statements);
    const graph = buildGraphFromStatements(canonical);

    expect(graph.getNodeById('root')).toBeDefined();
    expect(graph.getNodeById('node-a')).toBeDefined();
    expect(graph.getNodeById('ghost')).toBeUndefined();
    expect(graph.getEdges().length).toBe(1);
  });

  /**
   * KE2: Reject Does Not Affect Graph
   *
   * reject(statementId) → statement.status = rejected
   * rejected statements ∉ canonicalStatements
   * ∴ reject never adds nodes or edges to the graph
   */
  it('KE2: reject does not affect the graph', () => {
    const p1 = propose({ subject: 'only', predicate: 'type', object: literal('root') });
    const p2 = propose({ subject: 'only', predicate: 'label', object: literal('Only') });
    const p3 = propose({ subject: 'bad', predicate: 'type', object: literal('x') });

    const logBefore = [p1, p2, approve(p1.statement.id), approve(p2.statement.id)];
    const logAfter = [...logBefore, p3, reject(p3.statement.id)];

    const g1 = buildGraphFromStatements(getCanonicalStatements(evaluate(logBefore).statements));
    const g2 = buildGraphFromStatements(getCanonicalStatements(evaluate(logAfter).statements));

    expect(g1.getNodes().length).toBe(g2.getNodes().length);
    expect(g1.getEdges().length).toBe(g2.getEdges().length);
  });

  /**
   * KE3: Approve Deterministically Affects Graph
   *
   * approve(statementId) → statement.status = canonical
   * canonical statement with entity object → new edge
   * canonical statement with literal object → node property
   *
   * The effect is deterministic: same approve → same graph change.
   */
  it('KE3: approve deterministically adds to the graph', () => {
    const p1 = propose({ subject: 'r', predicate: 'type', object: literal('root') });
    const p2 = propose({ subject: 'r', predicate: 'label', object: literal('R') });
    const p3 = propose({ subject: 'x', predicate: 'type', object: literal('concept') });
    const p4 = propose({ subject: 'x', predicate: 'label', object: literal('X') });
    const p5 = propose({ subject: 'r', predicate: 'relates', object: entity('x') });

    const logBase = [p1, p2, approve(p1.statement.id), approve(p2.statement.id)];
    const logWithNode = [...logBase, p3, p4, approve(p3.statement.id), approve(p4.statement.id)];
    const logWithEdge = [...logWithNode, p5, approve(p5.statement.id)];

    const gBase = buildGraphFromStatements(getCanonicalStatements(evaluate(logBase).statements));
    const gNode = buildGraphFromStatements(getCanonicalStatements(evaluate(logWithNode).statements));
    const gEdge = buildGraphFromStatements(getCanonicalStatements(evaluate(logWithEdge).statements));

    expect(gBase.getNodes().length).toBe(1);
    expect(gNode.getNodes().length).toBe(2);
    expect(gEdge.getNodes().length).toBe(2);
    expect(gEdge.getEdges().length).toBe(gNode.getEdges().length + 1);
  });

  /**
   * KE4: Repeated Evaluate Is Stable (Idempotent)
   *
   * evaluate(log) called N times on the same log
   * → identical StatementsState every time
   */
  it('KE4: repeated evaluate(log) is stable', () => {
    const { log } = buildTestLog();

    const r1 = evaluate(log);
    const r2 = evaluate(log);
    const r3 = evaluate(log);

    expect(r1.statements.size).toBe(r2.statements.size);
    expect(r2.statements.size).toBe(r3.statements.size);
    expect(r1.errors).toEqual(r2.errors);
    expect(r2.errors).toEqual(r3.errors);

    for (const [id, s1] of r1.statements) {
      expect(r2.statements.get(id).status).toBe(s1.status);
      expect(r3.statements.get(id).status).toBe(s1.status);
    }
  });

  /**
   * KE5: Projection Remains Total After Any Valid Event Sequence
   *
   * For any valid KnowledgeLog:
   *   evaluate(log) → canonical → buildGraph → projectGraph → ok
   *
   * Projection never crashes regardless of log content.
   */
  it('KE5: projection remains total after any valid event sequence', () => {
    const { log } = buildTestLog();
    const canonical = getCanonicalStatements(evaluate(log).statements);
    const graph = buildGraphFromStatements(canonical);
    const focus = { nodeId: 'root', path: [] };
    const result = projectGraph(graph, focus, null, defaultParams());

    expect(result.ok).toBe(true);
    expect(result.viewModel).toBeDefined();
    expect(result.viewModel.panels.focusNode.id).toBe('root');
  });

  it('KE5 (edge case): empty canonical set → projection on empty graph still total', () => {
    const p1 = propose({ subject: 'a', predicate: 'type', object: literal('x') });
    const log = [p1, reject(p1.statement.id)];

    const canonical = getCanonicalStatements(evaluate(log).statements);
    expect(canonical.length).toBe(0);

    const graph = buildGraphFromStatements(canonical);
    expect(graph.getNodes().length).toBe(0);
  });
});
