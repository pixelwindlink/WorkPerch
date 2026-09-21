import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSupportedSchema } from "./json-schema-validator.mjs";

export const ENGINE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function resolveInside(base, reference) {
  const target = path.resolve(base, reference);
  const relative = path.relative(base, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`Contract reference escapes Perch root: ${reference}`);
  return target;
}

export function resolveGenericEnginesRoot({ genericEnginesRoot, environment = process.env } = {}) {
  return path.resolve(genericEnginesRoot || environment.GENERIC_ENGINES_ROOT || path.join(ENGINE_ROOT, "../.."));
}

function standardSchemaPath(reference, genericRoot) {
  const mapping = new Map([
    ["https://generic-engines.local/schemas/actions/engine.describe/1.0/request-payload.json", "engine.describe.request-payload.schema.json"],
    ["https://generic-engines.local/schemas/actions/engine.describe/1.0/success-payload.json", "engine.describe.success-payload.schema.json"],
    ["https://generic-engines.local/schemas/actions/system.health/1.0/request-payload.json", "system.health.request-payload.schema.json"],
    ["https://generic-engines.local/schemas/actions/system.health/1.0/success-payload.json", "system.health.success-payload.schema.json"]
  ]);
  const fileName = mapping.get(reference);
  return fileName ? path.join(genericRoot, "governance/protocol/actions/system", fileName) : null;
}

async function loadSchema(reference, { genericRoot }) {
  const filePath = standardSchemaPath(reference, genericRoot) || resolveInside(ENGINE_ROOT, reference);
  const schema = await readJson(filePath);
  assertSupportedSchema(schema);
  return { reference, filePath, schema };
}

export async function loadContractRegistry(options = {}) {
  const environment = options.environment || process.env;
  const genericRoot = resolveGenericEnginesRoot(options);
  const envelopePath = path.resolve(options.envelopeSchemaPath || environment.GENERIC_ENGINES_ENVELOPE_SCHEMA || path.join(genericRoot, "governance/protocol/engine-message/v1.0/envelope.schema.json"));
  const manifest = await readJson(path.join(ENGINE_ROOT, "engine.manifest.json"));
  const catalog = await readJson(path.join(ENGINE_ROOT, manifest.actions.catalog));
  const envelope = await readJson(envelopePath);
  assertSupportedSchema(envelope);

  const actions = new Map();
  for (const action of catalog.actions) {
    const request = await loadSchema(action.requestPayloadSchema, { genericRoot });
    const success = await loadSchema(action.successPayloadSchema, { genericRoot });
    actions.set(action.name, { ...action, request, success });
  }

  return {
    manifest,
    catalog,
    envelope: { reference: manifest.protocol.envelopeSchema, filePath: envelopePath, schema: envelope },
    actions,
    genericRoot
  };
}
