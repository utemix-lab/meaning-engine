import { describe, it, expect } from 'vitest';
import { buildGraphFromStatements } from '../buildGraph.js';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { propose, approve, reject } from '../operators.js';
import { StatementStatus } from '../types';
import { projectGraph } from '../../projection/projectGraph.js';
import { defaultParams, emptyFocus } from '../../projection/types';

function entity(id) {
  return { kind: 'entity', id };
}
function literal(value) {
  return { kind: 'literal', value };
}

function makeCanonical(proposals) {
  const log = [];
  for (const p of proposals) {
    log.push(p);
    log.push(approve(p.statement.id));
  }
  const { statements } = evaluate(log);
  return getCanonicalStatements(statements);
}

describe('buildGraphFromStatements', () => {
  it('canonical statements → valid GraphModel with correct nodes and edges', () => {
    const stmts = makeCanonical([
      propose({ subject: 'root', predicate: 'type', object: literal('root') }),
      propose({ subject: 'root', predicate: 'label', object: literal('Root') }),
      propose({ subject: 'alice', predicate: 'type', object: literal('person') }),
      propose({ subject: 'alice', predicate: 'label', object: literal('Alice') }),
      propose({ subject: 'logic', predicate: 'type', object: literal('concept') }),
      propose({ subject: 'logic', predicate: 'label', object: literal('Logic') }),
      propose({ subject: 'root', predicate: 'contains', object: entity('alice') }),
      propose({ subject: 'alice', predicate: 'knows', object: entity('logic') }),
    ]);

    const graph = buildGraphFromStatements(stmts);

    expect(graph.getNodes().length).toBe(3);
    expect(graph.getEdges().length).toBe(2);

    const root = graph.getNodeById('root');
    expect(root.type).toBe('root');
    expect(root.label).toBe('Root');

    const alice = graph.getNodeById('alice');
    expect(alice.type).toBe('person');
    expect(alice.label).toBe('Alice');

    const edges = graph.getEdges();
    const containsEdge = edges.find(e => e.source === 'root' && e.target === 'alice');
    expect(containsEdge).toBeDefined();
    expect(containsEdge.type).toBe('contains');

    const knowsEdge = edges.find(e => e.source === 'alice' && e.target === 'logic');
    expect(knowsEdge).toBeDefined();
    expect(knowsEdge.type).toBe('knows');
  });

  it('only canonical statements enter the graph (proposed and rejected are excluded)', () => {
    const p1 = propose({ subject: 'a', predicate: 'type', object: literal('concept') });
    const p2 = propose({ subject: 'b', predicate: 'type', object: literal('concept') });
    const p3 = propose({ subject: 'c', predicate: 'type', object: literal('concept') });

    const log = [
      p1, approve(p1.statement.id),
      p2,
      p3, reject(p3.statement.id),
    ];
    const { statements } = evaluate(log);
    const canonical = getCanonicalStatements(statements);
    const graph = buildGraphFromStatements(canonical);

    expect(graph.getNodes().length).toBe(1);
    expect(graph.getNodeById('a')).toBeDefined();
    expect(graph.getNodeById('b')).toBeUndefined();
    expect(graph.getNodeById('c')).toBeUndefined();
  });

  it('graph from statements passes projectGraph (projection pipeline compatibility)', () => {
    const stmts = makeCanonical([
      propose({ subject: 'root', predicate: 'type', object: literal('root') }),
      propose({ subject: 'root', predicate: 'label', object: literal('Root') }),
      propose({ subject: 'hub', predicate: 'type', object: literal('hub') }),
      propose({ subject: 'hub', predicate: 'label', object: literal('Ideas') }),
      propose({ subject: 'item', predicate: 'type', object: literal('concept') }),
      propose({ subject: 'item', predicate: 'label', object: literal('Logic') }),
      propose({ subject: 'root', predicate: 'structural', object: entity('hub') }),
      propose({ subject: 'hub', predicate: 'contains', object: entity('item') }),
    ]);

    const graph = buildGraphFromStatements(stmts);
    const focus = { nodeId: 'root', path: [] };
    const result = projectGraph(graph, focus, null, defaultParams());

    expect(result.ok).toBe(true);
    expect(result.viewModel).toBeDefined();
    expect(result.viewModel.scene.nodes.length).toBeGreaterThan(0);
    expect(result.viewModel.panels.focusNode).toBeDefined();
    expect(result.viewModel.panels.focusNode.id).toBe('root');
  });
});
