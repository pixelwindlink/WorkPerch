import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DashboardApplication } from "../application/dashboard-application.mjs";
import { dashboardError } from "../domain/errors.mjs";
import { DashboardEngine } from "../engine/dashboard-engine.mjs";
import { DashboardEngineProvider } from "../engine/provider.mjs";
import { loadContractRegistry, resolveGenericEnginesRoot } from "../inbound/contract-registry.mjs";
import { DashboardDispatcher } from "../inbound/dispatcher.mjs";
import { ConfiguredProjectSeed } from "../outbound/configured-project-seed.mjs";
import { JsonDashboardRepository } from "../outbound/json-dashboard-repository.mjs";
import { LocalEndpointProbe } from "../outbound/local-endpoint-probe.mjs";
import { RandomIdGenerator } from "../outbound/random-id.mjs";
import { StateOwnershipLock } from "../outbound/state-lock.mjs";
import { SystemClock } from "../outbound/system-clock.mjs";

export const DASHBOARD_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function resolveRuntimeDir({ mode, runtimeDir, environment }) {
  const configured = runtimeDir || environment.DASHBOARD_RUNTIME_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) throw dashboardError("INVALID_CONFIGURATION", "DASHBOARD_RUNTIME_DIR 必须是绝对路径。");
    return path.resolve(configured);
  }
  if (mode === "standalone") throw dashboardError("INVALID_CONFIGURATION", "Standalone CLI 必须显式提供 DASHBOARD_RUNTIME_DIR。");
  return path.join(os.homedir(), ".local", "share", "dashboard-engine");
}

function createLifecycle({ clock, ownershipLock }) {
  return {
    phase: "created",
    lastError: null,
    canDispatch() { return this.phase === "ready"; },
    healthPayload() {
      const ready = this.phase === "ready";
      const checks = [
        { name: "lifecycle", status: ready ? "pass" : this.phase === "failed" ? "fail" : "warn", message: this.phase },
        { name: "state-ownership", status: ownershipLock.isOwned() ? "pass" : "warn", message: ownershipLock.isOwned() ? "exclusive lock held" : "lock not held" }
      ];
      return {
        state: ready ? "ready" : this.phase === "failed" ? "not_ready" : "degraded",
        checkedAt: clock.now(),
        checks
      };
    }
  };
}

export async function createDashboardEngine(options = {}) {
  const environment = options.environment || process.env;
  const mode = options.mode || "server";
  const runtimeDir = resolveRuntimeDir({ mode, runtimeDir: options.runtimeDir, environment });
  const genericEnginesRoot = resolveGenericEnginesRoot({ genericEnginesRoot: options.genericEnginesRoot, environment });
  const clock = options.clock || new SystemClock();
  const idGenerator = options.idGenerator || new RandomIdGenerator();
  const seed = options.seed || new ConfiguredProjectSeed({ genericEnginesRoot, dashboardRoot: DASHBOARD_ROOT });
  const ownershipLock = options.ownershipLock || new StateOwnershipLock({ runtimeDir, ownerMode: mode, clock });
  const repository = options.repository || new JsonDashboardRepository({ runtimeDir, clock, idGenerator, seed });
  const endpointProbe = options.endpointProbe || new LocalEndpointProbe({ concurrency: 4 });
  const contracts = options.contracts || await loadContractRegistry({ genericEnginesRoot, environment, envelopeSchemaPath: options.envelopeSchemaPath });
  const application = options.application || new DashboardApplication({ repository, clock, idGenerator, endpointProbe });
  const lifecycle = createLifecycle({ clock, ownershipLock });
  const dispatcher = new DashboardDispatcher({ contracts, application, lifecycle });
  return new DashboardEngine({ dispatcher, repository, ownershipLock, clock, lifecycle });
}

export function createDashboardProvider(defaultOptions = {}) {
  return new DashboardEngineProvider({
    createEngine: (dependencies = {}) => createDashboardEngine({ ...defaultOptions, ...dependencies })
  });
}
