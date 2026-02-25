/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SPECIFICATION READER — Адаптер чтения/валидации спецификации платформы
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * P6.0b: Machine-readable Platform Specification
 * 
 * SpecificationReader обеспечивает:
 * - Загрузку specification.json
 * - Валидацию против JSON Schema
 * - Запросы к спецификации
 * - Генерацию проекций (для LLM, UI, Markdown)
 * 
 * Принцип:
 *   specification.json = canonical source of truth
 *   SpecificationReader = operator reading spec
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import specificationData from "../../specification/specification.json" with { type: "json" };
import specificationSchema from "../../specification/specification.schema.json" with { type: "json" };

/**
 * Результат валидации.
 * @typedef {{ valid: boolean, errors: string[] }} ValidationResult
 */

/**
 * Адаптер для чтения и валидации спецификации платформы.
 */
export class SpecificationReader {
  /**
   * @param {object} [spec] - Спецификация (по умолчанию загружается из specification.json)
   * @param {object} [schema] - JSON Schema (по умолчанию загружается из specification.schema.json)
   */
  constructor(spec = null, schema = null) {
    this._spec = spec || specificationData;
    this._schema = schema || specificationSchema;
    this._engine = this._spec.engine;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STATIC FACTORY
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Создаёт SpecificationReader из JSON объектов.
   * @param {object} spec - Спецификация
   * @param {object} [schema] - JSON Schema
   * @returns {SpecificationReader}
   */
  static fromJSON(spec, schema = null) {
    return new SpecificationReader(spec, schema);
  }
  
  /**
   * Создаёт SpecificationReader с дефолтной спецификацией.
   * @returns {SpecificationReader}
   */
  static load() {
    return new SpecificationReader();
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Версия Engine.
   * @returns {string}
   */
  getVersion() {
    return this._engine.version;
  }
  
  /**
   * Описание Engine.
   * @returns {string}
   */
  getDescription() {
    return this._engine.description;
  }
  
  /**
   * Полная спецификация.
   * @returns {object}
   */
  getSpecification() {
    return this._spec;
  }
  
  /**
   * JSON Schema.
   * @returns {object}
   */
  getSchema() {
    return this._schema;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTRACTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Список всех контрактов.
   * @returns {string[]}
   */
  getContractNames() {
    return Object.keys(this._engine.contracts);
  }
  
  /**
   * Получить контракт по имени.
   * @param {string} name - Имя контракта
   * @returns {object|null}
   */
  getContract(name) {
    return this._engine.contracts[name] || null;
  }
  
  /**
   * Получить все методы контракта.
   * @param {string} contractName - Имя контракта
   * @returns {string[]}
   */
  getMethodNames(contractName) {
    const contract = this.getContract(contractName);
    return contract ? Object.keys(contract.methods) : [];
  }
  
  /**
   * Получить метод контракта.
   * @param {string} contractName - Имя контракта
   * @param {string} methodName - Имя метода
   * @returns {object|null}
   */
  getMethod(contractName, methodName) {
    const contract = this.getContract(contractName);
    return contract?.methods?.[methodName] || null;
  }
  
  /**
   * Получить реализацию метода (путь к файлу).
   * @param {string} contractName - Имя контракта
   * @param {string} methodName - Имя метода
   * @returns {string|null}
   */
  getImplementation(contractName, methodName) {
    const key = `${contractName}.${methodName}`;
    return this._engine.implementation_map[key] || null;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAPABILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Все capabilities.
   * @returns {object}
   */
  getCapabilities() {
    return { ...this._engine.capabilities };
  }
  
  /**
   * Проверить наличие capability.
   * @param {string} name - Имя capability
   * @returns {boolean}
   */
  hasCapability(name) {
    return this._engine.capabilities[name] === true;
  }
  
  /**
   * Список активных capabilities.
   * @returns {string[]}
   */
  getActiveCapabilities() {
    return Object.entries(this._engine.capabilities)
      .filter(([, value]) => value === true)
      .map(([key]) => key);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Все ограничения.
   * @returns {object}
   */
  getConstraints() {
    return { ...this._engine.constraints };
  }
  
  /**
   * Получить ограничение по имени.
   * @param {string} name - Имя ограничения
   * @returns {object|null}
   */
  getConstraint(name) {
    return this._engine.constraints[name] || null;
  }
  
  /**
   * Проверить, активно ли ограничение.
   * @param {string} name - Имя ограничения
   * @returns {boolean}
   */
  isConstraintEnforced(name) {
    return this._engine.constraints[name]?.enforced === true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // IMPLEMENTATION MAP
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Полная карта реализаций.
   * @returns {object}
   */
  getImplementationMap() {
    return { ...this._engine.implementation_map };
  }
  
  /**
   * Найти реализацию по ключу.
   * @param {string} key - Ключ (Contract.method)
   * @returns {string|null}
   */
  findImplementation(key) {
    return this._engine.implementation_map[key] || null;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Валидирует спецификацию против JSON Schema.
   * Простая валидация без внешних зависимостей.
   * @returns {ValidationResult}
   */
  validate() {
    const errors = [];
    const spec = this._spec;
    
    // Проверка корневого объекта
    if (!spec || typeof spec !== "object") {
      errors.push("Specification must be an object");
      return { valid: false, errors };
    }
    
    // Проверка engine
    if (!spec.engine || typeof spec.engine !== "object") {
      errors.push("engine is required and must be an object");
      return { valid: false, errors };
    }
    
    const engine = spec.engine;
    
    // Обязательные поля engine
    const requiredFields = ["version", "description", "contracts", "capabilities", "constraints", "implementation_map"];
    for (const field of requiredFields) {
      if (!(field in engine)) {
        errors.push(`engine.${field} is required`);
      }
    }
    
    // Проверка version
    if (typeof engine.version !== "string") {
      errors.push("engine.version must be a string");
    }
    
    // Проверка description
    if (typeof engine.description !== "string") {
      errors.push("engine.description must be a string");
    }
    
    // Проверка contracts
    if (engine.contracts && typeof engine.contracts === "object") {
      for (const [contractName, contract] of Object.entries(engine.contracts)) {
        if (!contract.description) {
          errors.push(`engine.contracts.${contractName}.description is required`);
        }
        if (!contract.methods || typeof contract.methods !== "object") {
          errors.push(`engine.contracts.${contractName}.methods is required and must be an object`);
        } else {
          for (const [methodName, method] of Object.entries(contract.methods)) {
            if (!method.description) {
              errors.push(`engine.contracts.${contractName}.methods.${methodName}.description is required`);
            }
            if (!Array.isArray(method.inputs)) {
              errors.push(`engine.contracts.${contractName}.methods.${methodName}.inputs must be an array`);
            }
            if (!Array.isArray(method.outputs)) {
              errors.push(`engine.contracts.${contractName}.methods.${methodName}.outputs must be an array`);
            }
            if (typeof method.implementation !== "string") {
              errors.push(`engine.contracts.${contractName}.methods.${methodName}.implementation must be a string`);
            }
          }
        }
      }
    }
    
    // Проверка capabilities
    if (engine.capabilities && typeof engine.capabilities === "object") {
      const requiredCaps = ["multi_world", "schema_validation", "graph_validation", "world_injection"];
      for (const cap of requiredCaps) {
        if (typeof engine.capabilities[cap] !== "boolean") {
          errors.push(`engine.capabilities.${cap} must be a boolean`);
        }
      }
    }
    
    // Проверка constraints
    if (engine.constraints && typeof engine.constraints === "object") {
      for (const [constraintName, constraint] of Object.entries(engine.constraints)) {
        if (!constraint.description) {
          errors.push(`engine.constraints.${constraintName}.description is required`);
        }
        if (typeof constraint.enforced !== "boolean") {
          errors.push(`engine.constraints.${constraintName}.enforced must be a boolean`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Универсальный запрос к спецификации.
   * @param {string} path - Путь (например, "contracts.MeaningEngine.methods.getVersion")
   * @returns {*}
   */
  query(path) {
    const parts = path.split(".");
    let current = this._engine;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return null;
      }
      current = current[part];
    }
    
    return current ?? null;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PROJECTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Генерирует сжатую версию спецификации для LLM.
   * @returns {object}
   */
  toLLMContext() {
    return {
      engine_version: this._engine.version,
      description: this._engine.description,
      contracts: this.getContractNames().map(name => ({
        name,
        methods: this.getMethodNames(name),
      })),
      capabilities: this.getActiveCapabilities(),
      constraints: Object.keys(this._engine.constraints),
    };
  }
  
  /**
   * Генерирует таблицу методов для Markdown.
   * @returns {string}
   */
  toMarkdownTable() {
    const lines = [
      "| Contract | Method | Inputs | Outputs | Implementation |",
      "|----------|--------|--------|---------|----------------|",
    ];
    
    for (const contractName of this.getContractNames()) {
      for (const methodName of this.getMethodNames(contractName)) {
        const method = this.getMethod(contractName, methodName);
        const inputs = method.inputs.join(", ") || "-";
        const outputs = method.outputs.join(", ") || "-";
        const impl = method.implementation;
        lines.push(`| ${contractName} | ${methodName} | ${inputs} | ${outputs} | \`${impl}\` |`);
      }
    }
    
    return lines.join("\n");
  }
  
  /**
   * Генерирует статистику спецификации.
   * @returns {object}
   */
  getStats() {
    const contracts = this.getContractNames();
    let totalMethods = 0;
    
    for (const name of contracts) {
      totalMethods += this.getMethodNames(name).length;
    }
    
    return {
      version: this._engine.version,
      contracts: contracts.length,
      methods: totalMethods,
      capabilities: Object.keys(this._engine.capabilities).length,
      activeCapabilities: this.getActiveCapabilities().length,
      constraints: Object.keys(this._engine.constraints).length,
    };
  }
}

export default SpecificationReader;
