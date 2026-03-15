/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROJECTION — Абстракция адаптера рендеринга
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Phase 2: Core → Multi-Projection
 * См. repair-shop/ROADMAP.md
 * 
 * ПРИНЦИП:
 * - Projection = адаптер между Core и конкретным рендерером
 * - Core ничего не знает о рендеринге
 * - Projection знает только как отобразить состояние
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * const projection = new VisitorProjection(container);
 * projection.render(graphModel, context);
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * @typedef {Object} RenderContext
 * @property {string|null} selectedNodeId
 * @property {string|null} hoveredNodeId
 * @property {import("../highlight/highlightModel.js").HighlightState} highlightState
 */

/**
 * Базовый класс проекции.
 * Все проекции должны наследовать от этого класса.
 * @abstract
 */
export class Projection {
  /**
   * @param {string} name - Имя проекции
   */
  constructor(name) {
    /** @type {string} */
    this.name = name;
    
    /** @type {boolean} */
    this.initialized = false;
  }
  
  /**
   * Инициализировать проекцию.
   * @abstract
   * @param {HTMLElement} container
   */
  init(container) {
    throw new Error("Projection.init() must be implemented");
  }
  
  /**
   * Отрендерить граф.
   * @abstract
   * @param {import("./GraphModel.js").GraphModel} graphModel
   * @param {RenderContext} context
   */
  render(graphModel, context) {
    throw new Error("Projection.render() must be implemented");
  }
  
  /**
   * Обновить подсветку.
   * @abstract
   * @param {import("../highlight/highlightModel.js").HighlightState} highlightState
   */
  updateHighlight(highlightState) {
    throw new Error("Projection.updateHighlight() must be implemented");
  }
  
  /**
   * Уничтожить проекцию.
   * @abstract
   */
  destroy() {
    throw new Error("Projection.destroy() must be implemented");
  }
}

/**
 * Реестр проекций.
 */
export class ProjectionRegistry {
  constructor() {
    /** @type {Map<string, Projection>} */
    this.projections = new Map();
    
    /** @type {Projection|null} */
    this.activeProjection = null;
  }
  
  /**
   * Зарегистрировать проекцию.
   * @param {Projection} projection
   */
  register(projection) {
    this.projections.set(projection.name, projection);
  }
  
  /**
   * Получить проекцию по имени.
   * @param {string} name
   * @returns {Projection|undefined}
   */
  get(name) {
    return this.projections.get(name);
  }
  
  /**
   * Активировать проекцию.
   * @param {string} name
   * @param {HTMLElement} container
   */
  activate(name, container) {
    const projection = this.projections.get(name);
    if (!projection) {
      throw new Error(`Projection "${name}" not found`);
    }
    
    // Деактивировать текущую
    if (this.activeProjection) {
      this.activeProjection.destroy();
    }
    
    // Активировать новую
    projection.init(container);
    this.activeProjection = projection;
  }
  
  /**
   * Получить активную проекцию.
   * @returns {Projection|null}
   */
  getActive() {
    return this.activeProjection;
  }
  
  /**
   * Получить список имён проекций.
   * @returns {Array<string>}
   */
  getNames() {
    return [...this.projections.keys()];
  }
}

// Глобальный реестр
export const projectionRegistry = new ProjectionRegistry();
