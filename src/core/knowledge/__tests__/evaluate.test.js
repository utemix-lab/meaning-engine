import { describe, it, expect } from 'vitest';
import { evaluate, getCanonicalStatements } from '../evaluate.js';
import { propose, approve, reject } from '../operators.js';
import { StatementStatus } from '../types';

function entity(id) {
  return { kind: 'entity', id };
}
function literal(value) {
  return { kind: 'literal', value };
}

describe('evaluate — Knowledge Log reducer', () => {
  it('empty log → empty state', () => {
    const { statements, errors } = evaluate([]);
    expect(statements.size).toBe(0);
    expect(errors).toEqual([]);
  });

  it('propose → statement with status proposed', () => {
    const evt = propose({ subject: 'serum', predicate: 'type', object: literal('synth') });
    const { statements, errors } = evaluate([evt]);

    expect(errors).toEqual([]);
    expect(statements.size).toBe(1);
    const stmt = statements.get(evt.statement.id);
    expect(stmt.status).toBe(StatementStatus.PROPOSED);
    expect(stmt.subject).toBe('serum');
    expect(stmt.predicate).toBe('type');
    expect(stmt.object).toEqual({ kind: 'literal', value: 'synth' });
  });

  it('propose + approve → status canonical', () => {
    const evt = propose({ subject: 'serum', predicate: 'uses', object: entity('wavetable') });
    const approveEvt = approve(evt.statement.id);
    const { statements, errors } = evaluate([evt, approveEvt]);

    expect(errors).toEqual([]);
    const stmt = statements.get(evt.statement.id);
    expect(stmt.status).toBe(StatementStatus.CANONICAL);
  });

  it('propose + reject → status rejected', () => {
    const evt = propose({ subject: 'serum', predicate: 'type', object: literal('effect') });
    const rejectEvt = reject(evt.statement.id);
    const { statements, errors } = evaluate([evt, rejectEvt]);

    expect(errors).toEqual([]);
    const stmt = statements.get(evt.statement.id);
    expect(stmt.status).toBe(StatementStatus.REJECTED);
  });

  it('approve on already canonical → idempotent', () => {
    const evt = propose({ subject: 'a', predicate: 'p', object: literal('v') });
    const a1 = approve(evt.statement.id);
    const a2 = approve(evt.statement.id);
    const { statements, errors } = evaluate([evt, a1, a2]);

    expect(errors).toEqual([]);
    expect(statements.get(evt.statement.id).status).toBe(StatementStatus.CANONICAL);
  });

  it('approve of unknown statementId → error recorded', () => {
    const { statements, errors } = evaluate([
      approve('nonexistent-id'),
    ]);
    expect(statements.size).toBe(0);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('nonexistent-id');
  });

  it('determinism: same log evaluated twice → identical result', () => {
    const e1 = propose({ subject: 'a', predicate: 'type', object: literal('concept') });
    const e2 = propose({ subject: 'b', predicate: 'knows', object: entity('a') });
    const e3 = approve(e1.statement.id);
    const log = [e1, e2, e3];

    const r1 = evaluate(log);
    const r2 = evaluate(log);

    expect(r1.errors).toEqual(r2.errors);
    expect(r1.statements.size).toBe(r2.statements.size);
    for (const [id, stmt] of r1.statements) {
      const other = r2.statements.get(id);
      expect(other).toBeDefined();
      expect(stmt.status).toBe(other.status);
      expect(stmt.subject).toBe(other.subject);
      expect(stmt.predicate).toBe(other.predicate);
      expect(stmt.object).toEqual(other.object);
    }
  });
});

describe('getCanonicalStatements', () => {
  it('filters only canonical statements', () => {
    const e1 = propose({ subject: 'a', predicate: 'type', object: literal('x') });
    const e2 = propose({ subject: 'b', predicate: 'type', object: literal('y') });
    const e3 = propose({ subject: 'c', predicate: 'type', object: literal('z') });
    const log = [
      e1, e2, e3,
      approve(e1.statement.id),
      reject(e2.statement.id),
    ];
    const { statements } = evaluate(log);
    const canonical = getCanonicalStatements(statements);

    expect(canonical.length).toBe(1);
    expect(canonical[0].id).toBe(e1.statement.id);
    expect(canonical[0].status).toBe(StatementStatus.CANONICAL);
  });
});
