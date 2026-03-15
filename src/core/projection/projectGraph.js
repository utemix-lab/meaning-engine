/**
 * Formula:
 *   V = P(G, F, S, Params)
 *
 * Meaning:
 *   Computes a deterministic ViewModel V from graph G, focus F,
 *   schema S, and projection parameters Params.
 *
 * Definitions:
 *   G      = valid typed graph (GraphModel)
 *   F      = current focus { nodeId, path }
 *   S      = schema { nodeTypes, edgeTypes }
 *   Params = projection parameters { depth, visibilityMode }
 *   V      = render-ready ViewModel
 *
 * Pipeline:
 *   validate → resolveFocus → computeSubgraph → deriveRoles → buildViewModel
 *
 * Guarantees:
 *   - deterministic output (INV-3)
 *   - total: always returns ViewModel or typed error (INV-7)
 *   - no side effects, no external state
 *
 * Phase:
 *   Engine Phase 2 — Projection Engine
 *
 * Related specs:
 *   - docs/spec/PROJECTION_SPEC.md
 *   - FORMAL_CORE.md (INV-3, INV-7)
 */

import { defaultParams, emptyFocus } from './types';
import { validateInputs } from './validateInputs.js';
import { resolveFocus } from './resolveFocus.js';
import { computeVisibleSubgraph } from './computeVisibleSubgraph.js';
import { deriveSemanticRoles } from './deriveSemanticRoles.js';
import { buildViewModel } from './buildViewModel.js';

/**
 * @param {import('../GraphModel.js').GraphModel} graph
 * @param {import('./types').Focus} [focus]
 * @param {Object} [schema]
 * @param {import('./types').ProjectionParams} [params]
 * @returns {import('./types').ProjectionResult}
 */
export function projectGraph(graph, focus, schema, params) {
  const f = focus || emptyFocus();
  const p = { ...defaultParams(), ...params };
  const s = schema || null;

  const validation = validateInputs(graph, f, s, p);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const focusState = resolveFocus(graph, f);
  const subgraph = computeVisibleSubgraph(graph, focusState, p);
  const roles = deriveSemanticRoles(graph, subgraph, focusState);
  const viewModel = buildViewModel(graph, subgraph, roles, focusState, p);

  return { ok: true, viewModel };
}
