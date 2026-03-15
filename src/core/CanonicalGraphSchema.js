/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL GRAPH SCHEMA — Абстрактные константы (World-Agnostic)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Этот файл предоставляет ДЕФОЛТНЫЕ значения для типов узлов и рёбер.
 * Конкретный мир должен переопределять их через WorldAdapter.
 * 
 * ПРИНЦИП:
 * - Engine использует эти константы как fallback
 * - Реальные типы приходят из WorldAdapter.getSchema()
 * - Валидация должна использовать Schema, а не эти константы
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT NODE TYPES (пустые — мир определяет свои)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Дефолтные типы узлов (пустой объект).
 * Реальные типы загружаются из World Schema.
 * @readonly
 */
export const NODE_TYPES = Object.freeze({});

/**
 * Дефолтные метаданные типов узлов.
 * @readonly
 */
export const NODE_TYPE_META = Object.freeze({});

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EDGE TYPES (пустые — мир определяет свои)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Дефолтные типы рёбер (пустой объект).
 * Реальные типы загружаются из World Schema.
 * @readonly
 */
export const EDGE_TYPES = Object.freeze({});

/**
 * Дефолтные метаданные типов рёбер.
 * @readonly
 */
export const EDGE_TYPE_META = Object.freeze({});

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT VISIBILITY & STATUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Дефолтные значения visibility.
 * @readonly
 */
export const VISIBILITY = Object.freeze({
  PUBLIC: "public",
  PRIVATE: "private",
  HIDDEN: "hidden",
});

/**
 * Дефолтные значения status.
 * @readonly
 */
export const STATUS = Object.freeze({
  CORE: "core",
  EXPANDABLE: "expandable",
  DRAFT: "draft",
  ARCHIVED: "archived",
});

// ═══════════════════════════════════════════════════════════════════════════
// IDENTITY FIELDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Обязательные поля идентичности.
 * @readonly
 */
export const IDENTITY_REQUIRED_FIELDS = Object.freeze(["id"]);

/**
 * Рекомендуемые поля идентичности.
 * @readonly
 */
export const IDENTITY_RECOMMENDED_FIELDS = Object.freeze([
  "label",
  "canonicalName",
  "aliases",
  "slug",
]);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA VERSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Версия схемы платформы.
 * @readonly
 */
export const SCHEMA_VERSION = "0.6.0";

/**
 * Метаданные схемы.
 * @readonly
 */
export const SCHEMA_META = Object.freeze({
  version: SCHEMA_VERSION,
  name: "MeaningEngine",
  description: "Universal Semantic Graph Engine",
  created: "2026-02-27",
  nodeTypes: 0,
  edgeTypes: 0,
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA VALIDATOR (абстрактный)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Абстрактный валидатор схемы.
 * Реальная валидация происходит через Schema класс.
 */
export class SchemaValidator {
  /**
   * Валидирует узел.
   * @param {object} node
   * @param {object} [schema] - Опциональная схема для валидации
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validateNode(node, schema = null) {
    const errors = [];
    
    if (!node) {
      errors.push("Node is null or undefined");
      return { valid: false, errors };
    }
    
    if (!node.id) {
      errors.push("Node must have an id");
    }
    
    if (!node.type) {
      errors.push("Node must have a type");
    }
    
    // Если есть схема, валидируем тип
    if (schema && node.type && !schema.isValidNodeType(node.type)) {
      errors.push(`Unknown node type: ${node.type}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
  
  /**
   * Валидирует ребро.
   * @param {object} edge
   * @param {object} [schema] - Опциональная схема для валидации
   * @returns {{ valid: boolean, errors: string[] }}
   */
  static validateEdge(edge, schema = null) {
    const errors = [];
    
    if (!edge) {
      errors.push("Edge is null or undefined");
      return { valid: false, errors };
    }
    
    if (!edge.source) {
      errors.push("Edge must have a source");
    }
    
    if (!edge.target) {
      errors.push("Edge must have a target");
    }
    
    if (!edge.type) {
      errors.push("Edge must have a type");
    }
    
    // Если есть схема, валидируем тип
    if (schema && edge.type && !schema.isValidEdgeType(edge.type)) {
      errors.push(`Unknown edge type: ${edge.type}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export default {
  NODE_TYPES,
  NODE_TYPE_META,
  EDGE_TYPES,
  EDGE_TYPE_META,
  VISIBILITY,
  STATUS,
  IDENTITY_REQUIRED_FIELDS,
  IDENTITY_RECOMMENDED_FIELDS,
  SCHEMA_VERSION,
  SCHEMA_META,
  SchemaValidator,
};
