/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GRAPH MODEL — Абстрактная модель графа
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Phase 2: Core → Multi-Projection
 * См. repair-shop/ROADMAP.md
 * 
 * ПРИНЦИП:
 * - Хранит nodes, edges
 * - Знает типы сущностей
 * - Знает допустимые отношения
 * - Предоставляет API для вычислений
 * - Ничего не знает о DOM, Three.js, ReactFlow
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * const model = new GraphModel(graphData);
 * const highlight = model.computeHighlight(context);
 * const scope = model.computeScope(hubId);
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { computeHighlight, createContextFromState, createEmptyContext, INTENSITY } from "../highlight/highlightModel.js";

/**
 * @typedef {Object} NodeData
 * @property {string} id
 * @property {string} type
 * @property {string} [label]
 * @property {boolean} [isStart]
 */

/**
 * @typedef {Object} EdgeData
 * @property {string} id
 * @property {string} source
 * @property {string} target
 */

/**
 * Абстрактная модель графа.
 * Ничего не знает о рендеринге.
 */
export class GraphModel {
  /**
   * @param {Object} data - Данные графа из universe.json
   * @param {Array<NodeData>} data.nodes
   * @param {Array<EdgeData>} data.links
   */
  constructor(data = { nodes: [], links: [] }) {
    /** @type {Map<string, NodeData>} */
    this.nodesById = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.neighborsById = new Map();
    
    /** @type {Array<EdgeData>} */
    this.edges = [];
    
    /** @type {Set<string>} */
    this.nodeTypes = new Set();
    
    /** @type {Map<string, Set<string>>} */
    this.nodesByType = new Map();
    
    this._loadData(data);
  }
  
  /**
   * Загрузить данные графа.
   * @private
   */
  _loadData(data) {
    // Очистить
    this.nodesById.clear();
    this.neighborsById.clear();
    this.edges = [];
    this.nodeTypes.clear();
    this.nodesByType.clear();
    
    // Загрузить узлы
    for (const node of data.nodes || []) {
      this.nodesById.set(node.id, node);
      this.neighborsById.set(node.id, new Set());
      
      // Индекс по типам
      if (node.type) {
        this.nodeTypes.add(node.type);
        if (!this.nodesByType.has(node.type)) {
          this.nodesByType.set(node.type, new Set());
        }
        this.nodesByType.get(node.type).add(node.id);
      }
    }
    
    // Загрузить рёбра
    for (const link of data.links || []) {
      const edge = {
        id: link.id || `${link.source}-${link.target}`,
        source: link.source,
        target: link.target,
        type: link.type || null,
      };
      this.edges.push(edge);
      
      // Обновить соседей
      const sourceId = this._getNodeId(link.source);
      const targetId = this._getNodeId(link.target);
      
      if (this.neighborsById.has(sourceId)) {
        this.neighborsById.get(sourceId).add(targetId);
      }
      if (this.neighborsById.has(targetId)) {
        this.neighborsById.get(targetId).add(sourceId);
      }
    }
  }
  
  /**
   * Получить ID узла из endpoint (может быть объектом или строкой).
   * @private
   */
  _getNodeId(endpoint) {
    if (typeof endpoint === "string") return endpoint;
    if (endpoint && typeof endpoint === "object" && endpoint.id) return endpoint.id;
    return String(endpoint);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // API: Доступ к данным
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Получить все узлы.
   * @returns {Array<NodeData>}
   */
  getNodes() {
    return [...this.nodesById.values()];
  }
  
  /**
   * Получить все рёбра.
   * @returns {Array<EdgeData>}
   */
  getEdges() {
    return this.edges;
  }
  
  /**
   * Получить узел по ID.
   * @param {string} nodeId
   * @returns {NodeData|undefined}
   */
  getNodeById(nodeId) {
    return this.nodesById.get(nodeId);
  }
  
  /**
   * Получить соседей узла.
   * @param {string} nodeId
   * @returns {Set<string>}
   */
  getNeighbors(nodeId) {
    return this.neighborsById.get(nodeId) || new Set();
  }
  
  /**
   * Получить узлы по типу.
   * @param {string} type
   * @returns {Array<NodeData>}
   */
  getNodesByType(type) {
    const ids = this.nodesByType.get(type) || new Set();
    return [...ids].map(id => this.nodesById.get(id)).filter(Boolean);
  }
  
  /**
   * Получить все типы узлов.
   * @returns {Array<string>}
   */
  getNodeTypes() {
    return [...this.nodeTypes];
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // API: Вычисления
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Вычислить состояние подсветки.
   * @param {Object} context - Контекст подсветки
   * @returns {import("../highlight/highlightModel.js").HighlightState}
   */
  computeHighlight(context) {
    const graphData = {
      nodesById: this.nodesById,
      neighborsById: this.neighborsById,
      edges: this.edges
    };
    return computeHighlight(context, graphData);
  }
  
  /**
   * Вычислить scope для хаба.
   * @param {string} hubId - ID хаба
   * @returns {Set<string>} - ID узлов в scope
   */
  computeScope(hubId) {
    const scope = new Set();
    const hub = this.nodesById.get(hubId);
    if (!hub) return scope;
    
    // Хаб в scope
    scope.add(hubId);
    
    // Все соседи хаба в scope
    const neighbors = this.neighborsById.get(hubId) || new Set();
    for (const neighborId of neighbors) {
      scope.add(neighborId);
    }
    
    return scope;
  }
  
  /**
   * Получить связанные узлы по типу.
   * @param {string} nodeId
   * @param {string} type
   * @returns {Array<string>}
   */
  getRelatedNodeIdsByType(nodeId, type) {
    const neighbors = this.neighborsById.get(nodeId);
    if (!neighbors) return [];
    
    const related = [];
    for (const neighborId of neighbors) {
      const node = this.nodesById.get(neighborId);
      if (node?.type === type) {
        related.push(neighborId);
      }
    }
    return related;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // API: Сериализация
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Экспортировать в JSON.
   * @returns {Object}
   */
  toJSON() {
    return {
      nodes: this.getNodes(),
      links: this.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target
      }))
    };
  }
  
  /**
   * Создать модель из JSON.
   * @param {Object} json
   * @returns {GraphModel}
   */
  static fromJSON(json) {
    return new GraphModel(json);
  }
}

// Re-export для удобства
export { createContextFromState, createEmptyContext, INTENSITY };
