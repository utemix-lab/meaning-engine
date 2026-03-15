/**
 * Formula:
 *   F' = T(F, a, G)
 *
 * Meaning:
 *   Computes the next valid focus F' by applying navigation transition a
 *   to current focus F over graph G.
 *
 * Definitions:
 *   F  = current Focus { nodeId, path }
 *   a  = FocusTransition (select | drillDown | drillUp | reset)
 *   G  = valid typed graph (GraphModel)
 *   F' = next Focus, guaranteed valid if inputs are valid
 *
 * Guarantees:
 *   - deterministic output (NAV-4)
 *   - valid transition on valid focus → valid focus (NAV-1)
 *   - drillDown reversible by drillUp (NAV-2)
 *   - history integrity preserved (NAV-3)
 *   - formal error on invalid transition
 *
 * Phase:
 *   Engine Phase 3 — Navigation Model
 *
 * Related specs:
 *   - docs/spec/NAVIGATION_SPEC.md
 *   - docs/spec/PROJECTION_SPEC.md
 */

import { TransitionType } from './types';

/**
 * @param {import('../projection/types.js').Focus} focus
 * @param {import('./types').FocusTransition} transition
 * @param {import('../GraphModel.js').GraphModel} graph
 * @returns {import('./types').TransitionResult}
 */
export function applyTransition(focus, transition, graph) {
  switch (transition.type) {
    case TransitionType.SELECT:
      return applySelect(focus, transition, graph);
    case TransitionType.DRILL_DOWN:
      return applyDrillDown(focus, transition, graph);
    case TransitionType.DRILL_UP:
      return applyDrillUp(focus);
    case TransitionType.RESET:
      return applyReset();
    default:
      return { ok: false, error: `unknown transition type: ${transition.type}` };
  }
}

function applySelect(focus, transition, graph) {
  const { nodeId } = transition;
  if (!graph.getNodeById(nodeId)) {
    return { ok: false, error: `select: node "${nodeId}" not found in graph` };
  }
  return {
    ok: true,
    focus: { nodeId, path: focus.path },
  };
}

function applyDrillDown(focus, transition, graph) {
  const { nodeId } = transition;
  if (!graph.getNodeById(nodeId)) {
    return { ok: false, error: `drillDown: node "${nodeId}" not found in graph` };
  }
  if (focus.nodeId === null) {
    return { ok: false, error: 'drillDown: cannot drill down from empty focus' };
  }
  return {
    ok: true,
    focus: { nodeId, path: [...focus.path, focus.nodeId] },
  };
}

function applyDrillUp(focus) {
  if (focus.path.length === 0) {
    return {
      ok: true,
      focus: { nodeId: null, path: [] },
    };
  }
  const newPath = focus.path.slice(0, -1);
  return {
    ok: true,
    focus: { nodeId: focus.path[focus.path.length - 1], path: newPath },
  };
}

function applyReset() {
  return {
    ok: true,
    focus: { nodeId: null, path: [] },
  };
}
