import { describe, it, expect } from 'vitest';
import { propose, approve, reject } from '../operators.js';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { buildGraphFromStatements } from '../buildGraph.js';
import { projectGraph } from '../../projection/projectGraph.js';
import { applyTransition } from '../../navigation/applyTransition.js';
import { defaultParams } from '../../projection/types';
import { select, drillDown, drillUp } from '../../navigation/types';
import { StatementStatus } from '../types';

function entity(id) {
  return { kind: 'entity', id };
}
function literal(value) {
  return { kind: 'literal', value };
}

describe('Knowledge Substrate — end-to-end', () => {
  /**
   * Full pipeline: propose → approve → evaluate → buildGraph → projectGraph
   *
   * Formula chain:
   *   Log → Evaluate(Log) → CanonicalStatements → BuildGraph → GraphModel
   *   GraphModel → projectGraph(G, F, S, P) → ViewModel
   */
  it('complete cycle: propose → approve → evaluate → buildGraph → projectGraph → ok', () => {
    const log = [];

    const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root') });
    const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root') });
    const p3 = propose({ subject: 'hub-people', predicate: 'type', object: literal('hub') });
    const p4 = propose({ subject: 'hub-people', predicate: 'label', object: literal('People') });
    const p5 = propose({ subject: 'alice', predicate: 'type', object: literal('person') });
    const p6 = propose({ subject: 'alice', predicate: 'label', object: literal('Alice') });
    const p7 = propose({ subject: 'root', predicate: 'structural', object: entity('hub-people') });
    const p8 = propose({ subject: 'hub-people', predicate: 'contains', object: entity('alice') });

    log.push(p1, p2, p3, p4, p5, p6, p7, p8);
    log.push(
      approve(p1.statement.id),
      approve(p2.statement.id),
      approve(p3.statement.id),
      approve(p4.statement.id),
      approve(p5.statement.id),
      approve(p6.statement.id),
      approve(p7.statement.id),
      approve(p8.statement.id),
    );

    const { statements, errors } = evaluate(log);
    expect(errors).toEqual([]);

    const canonical = getCanonicalStatements(statements);
    expect(canonical.length).toBe(8);

    const graph = buildGraphFromStatements(canonical);
    expect(graph.getNodes().length).toBe(3);
    expect(graph.getEdges().length).toBe(2);

    const focus = { nodeId: 'root', path: [] };
    const result = projectGraph(graph, focus, null, defaultParams());

    expect(result.ok).toBe(true);
    expect(result.viewModel.panels.focusNode.id).toBe('root');
    // depth=1: root + hub-people visible (alice is 2 hops away)
    expect(result.viewModel.scene.nodes.length).toBe(2);
    expect(result.viewModel.scene.edges.length).toBe(1);
    expect(result.viewModel.system.enginePhase).toBeDefined();
  });

  it('rejected statements do not appear in graph or projection', () => {
    const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root') });
    const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root') });
    const p3 = propose({ subject: 'ghost', predicate: 'type', object: literal('concept') });
    const p4 = propose({ subject: 'ghost', predicate: 'label', object: literal('Ghost') });
    const p5 = propose({ subject: 'root', predicate: 'contains', object: entity('ghost') });

    const log = [
      p1, p2, p3, p4, p5,
      approve(p1.statement.id),
      approve(p2.statement.id),
      reject(p3.statement.id),
      reject(p4.statement.id),
      reject(p5.statement.id),
    ];

    const { statements } = evaluate(log);
    const canonical = getCanonicalStatements(statements);
    const graph = buildGraphFromStatements(canonical);

    expect(graph.getNodes().length).toBe(1);
    expect(graph.getNodeById('ghost')).toBeUndefined();
    expect(graph.getEdges().length).toBe(0);
  });

  it('navigation works on graph built from statements', () => {
    const proposals = [
      propose({ subject: 'root', predicate: 'type', object: literal('root') }),
      propose({ subject: 'root', predicate: 'label', object: literal('Root') }),
      propose({ subject: 'child', predicate: 'type', object: literal('concept') }),
      propose({ subject: 'child', predicate: 'label', object: literal('Child') }),
      propose({ subject: 'root', predicate: 'structural', object: entity('child') }),
    ];

    const log = [];
    for (const p of proposals) {
      log.push(p);
      log.push(approve(p.statement.id));
    }

    const { statements } = evaluate(log);
    const graph = buildGraphFromStatements(getCanonicalStatements(statements));

    const focus = { nodeId: 'root', path: [] };
    const nav1 = applyTransition(focus, drillDown('child'), graph);
    expect(nav1.ok).toBe(true);
    expect(nav1.focus.nodeId).toBe('child');
    expect(nav1.focus.path).toEqual(['root']);

    const nav2 = applyTransition(nav1.focus, drillUp(), graph);
    expect(nav2.ok).toBe(true);
    expect(nav2.focus.nodeId).toBe('root');
    expect(nav2.focus.path).toEqual([]);
  });

  it('incremental log: adding statements rebuilds graph correctly', () => {
    const p1 = propose({ subject: 'root', predicate: 'type', object: literal('root') });
    const p2 = propose({ subject: 'root', predicate: 'label', object: literal('Root') });

    const log1 = [p1, p2, approve(p1.statement.id), approve(p2.statement.id)];
    const { statements: s1 } = evaluate(log1);
    const g1 = buildGraphFromStatements(getCanonicalStatements(s1));
    expect(g1.getNodes().length).toBe(1);

    const p3 = propose({ subject: 'new-node', predicate: 'type', object: literal('concept') });
    const p4 = propose({ subject: 'new-node', predicate: 'label', object: literal('New') });
    const p5 = propose({ subject: 'root', predicate: 'contains', object: entity('new-node') });

    const log2 = [...log1, p3, p4, p5, approve(p3.statement.id), approve(p4.statement.id), approve(p5.statement.id)];
    const { statements: s2 } = evaluate(log2);
    const g2 = buildGraphFromStatements(getCanonicalStatements(s2));
    expect(g2.getNodes().length).toBe(2);
    expect(g2.getEdges().length).toBe(1);
    expect(g2.getNodeById('new-node').label).toBe('New');
  });
});
