import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PerchApplication } from "../application/perch-application.mjs";
import { perchError } from "../domain/errors.mjs";
import { PerchEngine } from "../engine/perch-engine.mjs";
import { PerchEngineProvider } from "../engine/provider.mjs";
import { loadContractRegistry, resolveGenericEnginesRoot } from "../inbound/contract-registry.mjs";
import { PerchDispatcher } from "../inbound/dispatcher.mjs";
import { ConfiguredProjectSeed } from "../outbound/configured-project-seed.mjs";
import { JsonPerchRepository } from "../outbound/json-perch-repository.mjs";
import { LocalEndpointProbe } from "../outbound/local-endpoint-probe.mjs";
import { LocalPathInspector } from "../outbound/local-path-inspector.mjs";
import { RandomIdGenerator } from "../outbound/random-id.mjs";
import { StateOwnershipLock } from "../outbound/state-lock.mjs";
import { SystemClock } from "../outbound/system-clock.mjs";

export const PERCH_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function resolveRuntimeDir({ mode, runtimeDir, environment }) {
  const configured = runtimeDir || environment.PERCH_RUNTIME_DIR || environment.RUNTIME_DATA_DIR;
  if (configured) {
    if (!path.isAbsolute(configured)) throw perchError("INVALID_CONFIGURATION", "PERCH_RUNTIME_DIR 必须是绝对路径。");
    return path.resolve(configured);
  }
  if (mode === "standalone") throw perchError("INVALID_CONFIGURATION", "Standalone CLI 必须显式提供 PERCH_RUNTIME_DIR。");
  return path.join(os.homedir(), ".local", "share", "perch-engine");
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

export async function createPerchEngine(options = {}) {
  const environment = options.environment || process.env;
  const mode = options.mode || "server";
  const runtimeDir = resolveRuntimeDir({ mode, runtimeDir: options.runtimeDir, environment });
  const genericEnginesRoot = resolveGenericEnginesRoot({ genericEnginesRoot: options.genericEnginesRoot, environment });
  const clock = options.clock || new SystemClock();
  const idGenerator = options.idGenerator || new RandomIdGenerator();
  const seed = options.seed || new ConfiguredProjectSeed({ genericEnginesRoot, perchRoot: PERCH_ROOT });
  const ownershipLock = options.ownershipLock || new StateOwnershipLock({ runtimeDir, ownerMode: mode, clock });
  const repository = options.repository || new JsonPerchRepository({ runtimeDir, clock, idGenerator, seed });
  const endpointProbe = options.endpointProbe || new LocalEndpointProbe({ concurrency: 4 });
  const pathInspector = options.pathInspector || new LocalPathInspector({ clock, concurrency: 6 });
  const contracts = options.contracts || await loadContractRegistry({ genericEnginesRoot, environment, envelopeSchemaPath: options.envelopeSchemaPath });
  const application = options.application || new PerchApplication({ repository, clock, idGenerator, endpointProbe, pathInspector, engineClient: options.engineClient });
  const lifecycle = createLifecycle({ clock, ownershipLock });
  const dispatcher = new PerchDispatcher({ contracts, application, lifecycle });
  return new PerchEngine({ dispatcher, repository, ownershipLock, clock, lifecycle });
}

export function createPerchProvider(defaultOptions = {}) {
  return new PerchEngineProvider({
    createEngine: (dependencies = {}) => createPerchEngine({ ...defaultOptions, ...dependencies })
  });
}
