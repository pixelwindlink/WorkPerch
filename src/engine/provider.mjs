import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(reference) {
  return JSON.parse(await fs.readFile(path.join(ENGINE_ROOT, reference), "utf8"));
}

export class PerchEngineProvider {
  constructor({ createEngine }) {
    this.createEngineFactory = createEngine;
  }

  async manifest() {
    return readJson("engine.manifest.json");
  }

  async actionCatalog() {
    return readJson("contracts/action-catalog.json");
  }

  async createEngine(dependencies = {}) {
    return this.createEngineFactory(dependencies);
  }
}

export async function createProvider(defaultOptions = {}) {
  const { createPerchEngine } = await import("../composition/create-perch-engine.mjs");
  return new PerchEngineProvider({
    createEngine: (dependencies = {}) => createPerchEngine({ ...defaultOptions, ...dependencies })
  });
}

export default createProvider;
