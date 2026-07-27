export class DashboardEngine {
  constructor({ dispatcher, repository, ownershipLock, clock, lifecycle }) {
    this.dispatcher = dispatcher;
    this.repository = repository;
    this.ownershipLock = ownershipLock;
    this.clock = clock;
    this.lifecycle = lifecycle;
    this.inFlight = new Set();
  }

  async start() {
    if (this.lifecycle.phase === "ready") return;
    this.lifecycle.phase = "starting";
    try {
      await this.ownershipLock.acquire();
      await this.repository.initialize();
      this.lifecycle.phase = "ready";
      this.lifecycle.lastError = null;
    } catch (error) {
      this.lifecycle.phase = "failed";
      this.lifecycle.lastError = error;
      await this.ownershipLock.release().catch(() => {});
      throw error;
    }
  }

  async readiness() {
    return { ready: this.lifecycle.phase === "ready", phase: this.lifecycle.phase };
  }

  async health() {
    return this.lifecycle.healthPayload();
  }

  async handle(message) {
    const operation = this.dispatcher.dispatch(message);
    this.inFlight.add(operation);
    try {
      return await operation;
    } finally {
      this.inFlight.delete(operation);
    }
  }

  async quiesce() {
    if (this.lifecycle.phase === "ready") this.lifecycle.phase = "quiescing";
  }

  async shutdown() {
    this.lifecycle.phase = "stopping";
    await Promise.allSettled([...this.inFlight]);
    await this.ownershipLock.release();
    this.lifecycle.phase = "stopped";
  }
}
