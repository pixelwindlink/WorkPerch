import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { createDashboardEngine } from "../../src/composition/create-dashboard-engine.mjs";
import { loadContractRegistry } from "../../src/inbound/contract-registry.mjs";
import { validateJsonSchema } from "../../src/inbound/json-schema-validator.mjs";
import { DASHBOARD_ROOT, GENERIC_ENGINES_ROOT, removeRuntime, request, runCli, tempRuntime } from "../helpers.mjs";

async function readJson(reference) {
  return JSON.parse(await fs.readFile(reference, "utf8"));
}

test("manifest 1.2 consumers match Dashboard-owned facts", async () => {
  const manifest = await readJson(path.join(DASHBOARD_ROOT, "engine.manifest.json"));
  const packageJson = await readJson(path.join(DASHBOARD_ROOT, "package.json"));
  const catalog = await readJson(path.join(DASHBOARD_ROOT, manifest.actions.catalog));
  const manifestSchema = await readJson(path.join(GENERIC_ENGINES_ROOT, "governance/manifests/engine-manifest-1.2.schema.json"));

  assert.deepEqual(validateJsonSchema(manifestSchema, manifest), []);
  assert.equal(manifest.schemaVersion, "1.2");
  assert.equal(manifest.version, "2.2.0");
  assert.equal(packageJson.version, manifest.version);
  assert.deepEqual(
    [...manifest.consumers.program.actions].sort(),
    catalog.actions.map((action) => action.name).sort(),
  );
  assert.deepEqual(manifest.consumers.program.protocol, catalog.protocol);

  for (const reference of Object.values(manifest.consumers.human)) {
    const resolved = path.resolve(DASHBOARD_ROOT, reference);
    const relative = path.relative(DASHBOARD_ROOT, resolved);
    assert.ok(relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative));
    await fs.access(resolved);
  }

  const canonicalSkills = [];
  for (const entry of await fs.readdir(path.join(DASHBOARD_ROOT, ".agents/skills"), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skill = await fs.readFile(path.join(DASHBOARD_ROOT, ".agents/skills", entry.name, "SKILL.md"), "utf8");
    const name = skill.match(/^name:\s*(.+)$/m)?.[1]?.trim();
    assert.ok(name);
    canonicalSkills.push({ name, path: `.agents/skills/${entry.name}/SKILL.md` });
  }
  assert.deepEqual(
    manifest.consumers.agent.skills.map(({ name, path: skillPath }) => ({ name, path: skillPath })).sort((a, b) => a.name.localeCompare(b.name)),
    canonicalSkills.sort((a, b) => a.name.localeCompare(b.name)),
  );
  for (const skill of manifest.consumers.agent.skills) {
    await fs.access(path.join(DASHBOARD_ROOT, skill.path));
    for (const compatibilityPath of skill.compatibilityPaths ?? []) await fs.access(path.join(DASHBOARD_ROOT, compatibilityPath));
  }
});

test("in-process and CLI describe expose the same schema-safe consumers", async () => {
  const runtimeDir = await tempRuntime("dashboard-consumers-");
  const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });
  const engine = await createDashboardEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  try {
    await engine.start();
    const inProcess = await engine.handle(request("engine.describe", {}, { id: "consumer-in-process" }));
    assert.equal(inProcess.status, "ok");
    assert.deepEqual(validateJsonSchema(contracts.actions.get("engine.describe").success.schema, inProcess.payload), []);
    assert.equal(inProcess.payload.version, "2.2.0");
    assert.deepEqual(
      inProcess.payload.consumers.agent.skills.find((skill) => skill.name === "register-project-entry").compatibilityPaths,
      ["skills/register-project-entry/SKILL.md"],
    );

    await engine.shutdown();
    const cli = await runCli({
      runtimeDir,
      input: `${JSON.stringify(request("engine.describe", {}, { id: "consumer-cli" }))}\n`,
      environment: { DASHBOARD_SERVER_URL: "" },
    });
    assert.equal(cli.code, 0);
    const cliResponse = JSON.parse(cli.stdout.trim());
    assert.equal(cliResponse.status, "ok");
    assert.deepEqual(cliResponse.payload.consumers, inProcess.payload.consumers);
  } finally {
    await engine.shutdown().catch(() => {});
    await removeRuntime(runtimeDir);
  }
});
