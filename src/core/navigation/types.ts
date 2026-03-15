/**
 * Navigation types.
 * See docs/spec/NAVIGATION_SPEC.md
 */

import type { Focus } from '../projection/types';

// ── Transition Type ─────────────────────────────────────────────────────

export const TransitionType = {
  SELECT: 'select',
  DRILL_DOWN: 'drillDown',
  DRILL_UP: 'drillUp',
  RESET: 'reset',
} as const;

export type TransitionType = typeof TransitionType[keyof typeof TransitionType];

// ── Focus Transition (discriminated union) ──────────────────────────────

export type FocusTransition =
  | { type: 'select'; nodeId: string }
  | { type: 'drillDown'; nodeId: string }
  | { type: 'drillUp' }
  | { type: 'reset' };

// ── Transition Result ───────────────────────────────────────────────────

export type TransitionResult =
  | { ok: true; focus: Focus }
  | { ok: false; error: string };

// ── Factory functions ───────────────────────────────────────────────────

export function select(nodeId: string): FocusTransition {
  return { type: TransitionType.SELECT, nodeId };
}

export function drillDown(nodeId: string): FocusTransition {
  return { type: TransitionType.DRILL_DOWN, nodeId };
}

export function drillUp(): FocusTransition {
  return { type: TransitionType.DRILL_UP };
}

export function reset(): FocusTransition {
  return { type: TransitionType.RESET };
}
