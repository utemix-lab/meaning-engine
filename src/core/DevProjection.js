/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEV PROJECTION — Прототип dev-линзы
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Phase 2: Core → Multi-Projection
 * P3.5b: Boundary Freeze — Core не использует DOM
 * См. repair-shop/ROADMAP.md
 * 
 * ПРИНЦИП:
 * - Показывает ownership
 * - Показывает вычислительные зависимости
 * - Показывает поток данных highlight
 * - Возвращает данные (не DOM) — рендеринг делает UI-адаптер
 * 
 * ЦЕЛЬ: Доказать, что Core можно смотреть иначе.
 * 
 * BOUNDARY FREEZE:
 * - Этот модуль НЕ использует DOM
 * - Этот модуль НЕ использует document/window
 * - Рендеринг в DOM делает UI-адаптер (вне Core)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Projection } from "./Projection.js";
import { INTENSITY } from "../highlight/highlightModel.js";

/**
 * Dev-проекция для отладки и анализа.
 * Возвращает данные в виде текста/JSON — рендеринг делает UI-адаптер.
 * 
 * @pure Не использует DOM, не имеет side effects
 */
export class DevProjection extends Projection {
  constructor() {
    super("dev");
  }
  
  /**
   * Сгенерировать текстовый вывод для графа.
   * @param {import("./GraphModel.js").GraphModel} graphModel
   * @param {Object} context
   * @returns {string} Текстовый вывод
   */
  renderText(graphModel, context) {
    const output = [];
    
    // Заголовок
    output.push("═══════════════════════════════════════════════════════════════");
    output.push("                    DEV PROJECTION");
    output.push("═══════════════════════════════════════════════════════════════");
    output.push("");
    
    // Статистика графа
    output.push("## GRAPH STATS");
    output.push(`Nodes: ${graphModel.nodesById.size}`);
    output.push(`Edges: ${graphModel.edges.length}`);
    output.push(`Types: ${[...graphModel.nodeTypes].join(", ")}`);
    output.push("");
    
    // Узлы по типам
    output.push("## NODES BY TYPE");
    for (const type of graphModel.nodeTypes) {
      const nodes = graphModel.getNodesByType(type);
      output.push(`  ${type}: ${nodes.map(n => n.id).join(", ")}`);
    }
    output.push("");
    
    // Текущий контекст
    output.push("## CONTEXT");
    output.push(`  selectedNodeId: ${context.selectedNodeId || "null"}`);
    output.push(`  hoveredNodeId: ${context.hoveredNodeId || "null"}`);
    output.push(`  scopeActive: ${context.scopeActive}`);
    output.push(`  typeHighlightActive: ${context.typeHighlightActive}`);
    output.push("");
    
    // Вычислить подсветку
    const highlightState = graphModel.computeHighlight(context);
    
    // Состояние подсветки
    output.push("## HIGHLIGHT STATE");
    output.push(`  mode: ${highlightState.mode}`);
    output.push("");
    
    // Узлы с интенсивностью
    output.push("## NODE INTENSITIES");
    const intensityGroups = { FULL: [], HALF: [], DIM: [], NONE: [] };
    for (const [nodeId, intensity] of highlightState.nodeIntensities) {
      if (intensity === INTENSITY.FULL) intensityGroups.FULL.push(nodeId);
      else if (intensity === INTENSITY.HALF) intensityGroups.HALF.push(nodeId);
      else if (intensity === INTENSITY.DIM) intensityGroups.DIM.push(nodeId);
      else intensityGroups.NONE.push(nodeId);
    }
    output.push(`  FULL (1.0): ${intensityGroups.FULL.join(", ") || "none"}`);
    output.push(`  HALF (0.5): ${intensityGroups.HALF.join(", ") || "none"}`);
    output.push(`  DIM (0.15): ${intensityGroups.DIM.length} nodes`);
    output.push("");
    
    // Рёбра с интенсивностью
    output.push("## EDGE INTENSITIES");
    const edgeGroups = { FULL: [], HALF: [], DIM: [] };
    for (const [edgeId, intensity] of highlightState.edgeIntensities) {
      if (intensity === INTENSITY.FULL) edgeGroups.FULL.push(edgeId);
      else if (intensity === INTENSITY.HALF) edgeGroups.HALF.push(edgeId);
      else edgeGroups.DIM.push(edgeId);
    }
    output.push(`  FULL: ${edgeGroups.FULL.length} edges`);
    output.push(`  HALF: ${edgeGroups.HALF.length} edges`);
    output.push(`  DIM: ${edgeGroups.DIM.length} edges`);
    output.push("");
    
    // Ownership (если есть selected)
    if (context.selectedNodeId) {
      output.push("## OWNERSHIP (selected node)");
      const node = graphModel.getNodeById(context.selectedNodeId);
      if (node) {
        output.push(`  Node: ${node.id}`);
        output.push(`  Type: ${node.type}`);
        output.push(`  Neighbors: ${[...graphModel.getNeighbors(node.id)].join(", ")}`);
      }
    }
    output.push("");
    
    // Вычислительный поток
    output.push("## COMPUTATION FLOW");
    output.push("  context → computeHighlight() → HighlightState → render");
    output.push("");
    output.push("  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐");
    output.push("  │   Context   │ ──▶ │  GraphModel │ ──▶ │   State     │");
    output.push("  └─────────────┘     └─────────────┘     └─────────────┘");
    output.push("                            │");
    output.push("                            ▼");
    output.push("                     ┌─────────────┐");
    output.push("                     │ Projection  │");
    output.push("                     └─────────────┘");
    output.push("");
    
    return output.join("\n");
  }
  
  /**
   * Экспортировать состояние в JSON.
   * @param {import("./GraphModel.js").GraphModel} graphModel
   * @param {Object} context
   * @returns {Object}
   */
  exportJSON(graphModel, context) {
    const highlightState = graphModel.computeHighlight(context);
    
    return {
      graph: graphModel.toJSON(),
      context: {
        selectedNodeId: context.selectedNodeId,
        hoveredNodeId: context.hoveredNodeId,
        scopeActive: context.scopeActive,
        typeHighlightActive: context.typeHighlightActive
      },
      highlight: {
        mode: highlightState.mode,
        nodeIntensities: Object.fromEntries(highlightState.nodeIntensities),
        edgeIntensities: Object.fromEntries(highlightState.edgeIntensities)
      },
      stats: {
        nodes: graphModel.nodesById.size,
        edges: graphModel.edges.length,
        types: [...graphModel.nodeTypes]
      }
    };
  }
  
  /**
   * Экспортировать состояние в Markdown.
   * @param {import("./GraphModel.js").GraphModel} graphModel
   * @param {Object} context
   * @returns {string}
   */
  exportMarkdown(graphModel, context) {
    const json = this.exportJSON(graphModel, context);
    
    let md = "# Graph State Export\n\n";
    md += `## Stats\n`;
    md += `- Nodes: ${json.stats.nodes}\n`;
    md += `- Edges: ${json.stats.edges}\n`;
    md += `- Types: ${json.stats.types.join(", ")}\n\n`;
    
    md += `## Context\n`;
    md += `- Selected: ${json.context.selectedNodeId || "none"}\n`;
    md += `- Hovered: ${json.context.hoveredNodeId || "none"}\n`;
    md += `- Scope Active: ${json.context.scopeActive}\n`;
    md += `- Type Highlight: ${json.context.typeHighlightActive}\n\n`;
    
    md += `## Highlight\n`;
    md += `- Mode: ${json.highlight.mode}\n`;
    
    return md;
  }
}
