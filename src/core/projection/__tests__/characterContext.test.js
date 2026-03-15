/**
 * Character Context Tests — Phase 4d
 *
 * Proves: Character Context Theorem
 *   For any valid Character Char, the system determines a finite set of
 *   available Workbench contexts. Selection of a Character does not merge
 *   scopes — it constrains which workbenches are valid, then delegates
 *   filtering to the selected workbench.
 *
 * Formula:
 *   WbSet(Char) = {Wb₁, Wb₂, ..., Wbₙ}
 *   selected(Char) ∈ WbSet(Char) ∪ {null}
 *   if selected(Char) = Wb_k then P_char = P_wb(G, F, Wb_k)
 *   if selected(Char) = null  then no filter (full graph)
 *
 * Character ≠ union lens. Character = context organizer (menu semantics).
 *
 * What is proven:
 *   1. Character with selected workbench = that workbench's projection
 *   2. Character without selected workbench = no filter (full graph)
 *   3. Character constrains: out-of-character workbench is ignored
 *   4. Different characters → different available workbenches
 *   5. Character is orthogonal to focus
 *   6. Backward compatibility: no characterId = existing behavior
 *   7. Graceful degradation: unknown characterId
 *   8. Determinism under character context
 *   9. Character subsumes standalone workbench/domain
 *
 * Fixture: world/test-world/fixtures/domain-projection.json
 *   - char-alice has workbenches: wb-lab, wb-hybrid
 *   - char-bob has workbenches: wb-studio, wb-hybrid
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { GraphModel } from '../../GraphModel.js';
import { projectGraph } from '../projectGraph.js';
import { defaultParams, emptyFocus } from '../types';

const fixturePath = resolve(
  import.meta.dirname,
  '../../../../worlds/test-world/fixtures/domain-projection.json',
);
const data = JSON.parse(readFileSync(fixturePath, 'utf8'));
const nodes = data.nodes;
const links = data.edges.map((e) => ({ ...e }));

function makeGraph() {
  return new GraphModel({ nodes, links });
}

const WB_LAB = { id: 'wb-lab', label: 'Lab', domains: ['domain-science'] };
const WB_STUDIO = { id: 'wb-studio', label: 'Studio', domains: ['domain-art'] };
const WB_HYBRID = {
  id: 'wb-hybrid',
  label: 'Hybrid',
  domains: ['domain-science', 'domain-art'],
};
const ALL_WORKBENCHES = [WB_LAB, WB_STUDIO, WB_HYBRID];

const CHAR_ALICE = { id: 'char-alice', label: 'Alice', workbenches: ['wb-lab', 'wb-hybrid'] };
const CHAR_BOB = { id: 'char-bob', label: 'Bob', workbenches: ['wb-studio', 'wb-hybrid'] };
const ALL_CHARACTERS = [CHAR_ALICE, CHAR_BOB];

function charParams(characterId, workbenchId = null, overrides = {}) {
  return {
    ...defaultParams(),
    characterId,
    characters: ALL_CHARACTERS,
    workbenchId,
    workbenches: ALL_WORKBENCHES,
    ...overrides,
  };
}

describe('Character Context — P_char(G, F, Char, selected=Wb_k)', () => {
  describe('Theorem 1: Character + selected workbench = workbench projection', () => {
    it('Alice + wb-lab = same as standalone wb-lab', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const charResult = projectGraph(graph, focus, null, charParams('char-alice', 'wb-lab'));
      const wbResult = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-lab',
        workbenches: ALL_WORKBENCHES,
      });

      expect(charResult.ok).toBe(true);
      expect(wbResult.ok).toBe(true);

      const charIds = new Set(charResult.viewModel.scene.nodes.map((n) => n.id));
      const wbIds = new Set(wbResult.viewModel.scene.nodes.map((n) => n.id));
      expect(charIds).toEqual(wbIds);
    });

    it('Bob + wb-studio = same as standalone wb-studio', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const charResult = projectGraph(graph, focus, null, charParams('char-bob', 'wb-studio'));
      const wbResult = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-studio',
        workbenches: ALL_WORKBENCHES,
      });

      expect(charResult.ok).toBe(true);
      expect(wbResult.ok).toBe(true);

      const charIds = new Set(charResult.viewModel.scene.nodes.map((n) => n.id));
      const wbIds = new Set(wbResult.viewModel.scene.nodes.map((n) => n.id));
      expect(charIds).toEqual(wbIds);
    });
  });

  describe('Theorem 2: Character without selected workbench = no filter', () => {
    it('Alice selected, no workbench → full graph', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const charOnly = projectGraph(graph, focus, null, charParams('char-alice'));
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(charOnly.ok).toBe(true);
      expect(noFilter.ok).toBe(true);
      expect(charOnly.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });
  });

  describe('Theorem 3: Character constrains workbench validity', () => {
    it('Alice + wb-studio (not hers) → no filter (workbench ignored)', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const invalid = projectGraph(graph, focus, null, charParams('char-alice', 'wb-studio'));
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(invalid.ok).toBe(true);
      expect(invalid.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });

    it('Bob + wb-lab (not his) → no filter (workbench ignored)', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const invalid = projectGraph(graph, focus, null, charParams('char-bob', 'wb-lab'));
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(invalid.ok).toBe(true);
      expect(invalid.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });
  });

  describe('Theorem 4: Different characters → different workbench sets', () => {
    it('Alice owns wb-lab, Bob does not; Bob owns wb-studio, Alice does not', () => {
      expect(CHAR_ALICE.workbenches).toContain('wb-lab');
      expect(CHAR_ALICE.workbenches).not.toContain('wb-studio');
      expect(CHAR_BOB.workbenches).toContain('wb-studio');
      expect(CHAR_BOB.workbenches).not.toContain('wb-lab');
    });

    it('shared workbench wb-hybrid produces same scope from either character', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const aliceHybrid = projectGraph(graph, focus, null, charParams('char-alice', 'wb-hybrid'));
      const bobHybrid = projectGraph(graph, focus, null, charParams('char-bob', 'wb-hybrid'));

      expect(aliceHybrid.ok).toBe(true);
      expect(bobHybrid.ok).toBe(true);

      const aliceIds = new Set(aliceHybrid.viewModel.scene.nodes.map((n) => n.id));
      const bobIds = new Set(bobHybrid.viewModel.scene.nodes.map((n) => n.id));
      expect(aliceIds).toEqual(bobIds);
    });
  });

  describe('Theorem 5: Character is orthogonal to focus', () => {
    it('same focus, different character+workbench → different scope', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'root', path: [] };

      const aliceLab = projectGraph(graph, focus, null, charParams('char-alice', 'wb-lab', { depth: 3 }));
      const bobStudio = projectGraph(graph, focus, null, charParams('char-bob', 'wb-studio', { depth: 3 }));

      expect(aliceLab.ok).toBe(true);
      expect(bobStudio.ok).toBe(true);

      const aliceIds = new Set(aliceLab.viewModel.scene.nodes.map((n) => n.id));
      const bobIds = new Set(bobStudio.viewModel.scene.nodes.map((n) => n.id));
      expect(aliceIds).not.toEqual(bobIds);
    });
  });

  describe('Theorem 6: Backward compatibility', () => {
    it('no characterId = existing workbench behavior preserved', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const noChar = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-lab',
        workbenches: ALL_WORKBENCHES,
      });
      const withChars = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-lab',
        workbenches: ALL_WORKBENCHES,
        characterId: null,
        characters: ALL_CHARACTERS,
      });

      expect(noChar.ok).toBe(true);
      expect(withChars.ok).toBe(true);

      const ids1 = new Set(noChar.viewModel.scene.nodes.map((n) => n.id));
      const ids2 = new Set(withChars.viewModel.scene.nodes.map((n) => n.id));
      expect(ids1).toEqual(ids2);
    });

    it('no characterId, no workbenchId = domain filter still works', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const domainOnly = projectGraph(graph, focus, null, {
        ...defaultParams(),
        domainId: 'domain-science',
        characters: ALL_CHARACTERS,
      });

      expect(domainOnly.ok).toBe(true);
      const ids = new Set(domainOnly.viewModel.scene.nodes.map((n) => n.id));
      expect(ids.has('domain-science')).toBe(true);
      expect(ids.has('domain-art')).toBe(false);
    });
  });

  describe('Theorem 7: Graceful degradation', () => {
    it('unknown characterId (no workbench) → no filter', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const unknown = projectGraph(graph, focus, null, charParams('char-nonexistent'));
      const noFilter = projectGraph(graph, focus, null, defaultParams());

      expect(unknown.ok).toBe(true);
      expect(unknown.viewModel.scene.nodes.length).toBe(
        noFilter.viewModel.scene.nodes.length,
      );
    });

    it('unknown characterId + workbenchId → falls back to workbench filter', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const unknownChar = projectGraph(graph, focus, null, charParams('char-nonexistent', 'wb-lab'));
      const standaloneWb = projectGraph(graph, focus, null, {
        ...defaultParams(),
        workbenchId: 'wb-lab',
        workbenches: ALL_WORKBENCHES,
      });

      expect(unknownChar.ok).toBe(true);
      expect(standaloneWb.ok).toBe(true);

      const unknownIds = new Set(unknownChar.viewModel.scene.nodes.map((n) => n.id));
      const wbIds = new Set(standaloneWb.viewModel.scene.nodes.map((n) => n.id));
      expect(unknownIds).toEqual(wbIds);
    });
  });

  describe('Theorem 8: Determinism', () => {
    it('same character + workbench + focus → same output', () => {
      const graph = makeGraph();
      const focus = { nodeId: 'char-alice', path: [] };
      const params = charParams('char-alice', 'wb-hybrid');

      const r1 = projectGraph(graph, focus, null, params);
      const r2 = projectGraph(graph, focus, null, params);

      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);

      const ids1 = r1.viewModel.scene.nodes.map((n) => n.id).sort();
      const ids2 = r2.viewModel.scene.nodes.map((n) => n.id).sort();
      expect(ids1).toEqual(ids2);
    });
  });

  describe('Theorem 9: Character subsumes standalone workbench/domain', () => {
    it('characterId active → domainId is ignored even without workbenchId', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const charWithDomain = projectGraph(graph, focus, null, {
        ...charParams('char-alice'),
        domainId: 'domain-art',
      });
      const charNoDomain = projectGraph(graph, focus, null, charParams('char-alice'));

      expect(charWithDomain.ok).toBe(true);
      expect(charNoDomain.ok).toBe(true);

      expect(charWithDomain.viewModel.scene.nodes.length).toBe(
        charNoDomain.viewModel.scene.nodes.length,
      );
    });

    it('characterId active → standalone workbenchId (not in char) is ignored', () => {
      const graph = makeGraph();
      const focus = emptyFocus();

      const charWithBadWb = projectGraph(graph, focus, null, charParams('char-alice', 'wb-studio'));
      const charAlone = projectGraph(graph, focus, null, charParams('char-alice'));

      expect(charWithBadWb.ok).toBe(true);
      expect(charAlone.ok).toBe(true);

      expect(charWithBadWb.viewModel.scene.nodes.length).toBe(
        charAlone.viewModel.scene.nodes.length,
      );
    });
  });
});
