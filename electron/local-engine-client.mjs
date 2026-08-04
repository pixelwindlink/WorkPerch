const PROTOCOL = "generic-engines/engine-message";
const VERSION = "1.0";

/**
 * Allowlisted EngineMessage client.
 * Prefer Host `engineClient.send` so traffic enters Runtime Observability.
 * Direct `engine.handle` remains available for unit fixtures only.
 */
export class LocalEngineClient {
  #send;

  constructor({ engine = null, engineId, allowedActions, send = null, sourceEngine = null }) {
    if (typeof send !== "function" && (!engine || typeof engine.handle !== "function")) {
      throw new TypeError("LocalEngineClient requires Host send() or an Engine handle(message) boundary.");
    }
    this.engine = engine;
    this.engineId = engineId;
    this.allowedActions = new Set(allowedActions);
    this.sourceEngine = sourceEngine;
    this.#send = typeof send === "function"
      ? send
      : (message) => engine.handle(structuredClone(message));
  }

  async send(message) {
    if (!message || message.protocol !== PROTOCOL || message.version !== VERSION || message.kind !== "request") {
      throw new TypeError("LocalEngineClient only accepts complete EngineMessage v1 requests.");
    }
    if (message.engine !== this.engineId || !this.allowedActions.has(message.action)) {
      throw new Error(`LocalEngineClient route is not allowed: ${message.engine}/${message.action}`);
    }
    return this.#send(message, this.sourceEngine ? { sourceEngine: this.sourceEngine } : {});
  }
}
