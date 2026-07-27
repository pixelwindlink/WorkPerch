import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { DASHBOARD_ROOT } from "../helpers.mjs";

test("project entry onboarding Skill references the public Dashboard contract", async () => {
  const skillRoot = path.join(DASHBOARD_ROOT, ".agents/skills/register-project-entry");
  const [skill, metadata] = await Promise.all([
    fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8"),
    fs.readFile(path.join(skillRoot, "agents/openai.yaml"), "utf8"),
  ]);

  assert.match(skill, /^---\nname: register-project-entry\ndescription: .+\n---/);
  assert.match(skill, /dashboard\.snapshot\.get/);
  assert.match(skill, /dashboard\.project\.upsert/);
  assert.match(skill, /DASHBOARD_REVISION_CONFLICT/);
  assert.match(skill, /STATE_OWNERSHIP_CONFLICT/);
  assert.match(skill, /Do not execute the project's command/);
  assert.match(skill, /engine\.manifest\.json/);
  assert.match(skill, /id.*dashboard/i);
  assert.doesNotMatch(skill, /directory two levels above/i);
  assert.match(metadata, /\$register-project-entry/);

  for (const reference of [
    "engine.manifest.json",
    "contracts/actions/dashboard.snapshot.get.request-payload.schema.json",
    "contracts/actions/dashboard.snapshot.get.success-payload.schema.json",
    "contracts/actions/dashboard.project.upsert.request-payload.schema.json",
    "contracts/actions/dashboard.project.upsert.success-payload.schema.json",
  ]) {
    await fs.access(path.join(DASHBOARD_ROOT, reference));
  }
});

test("legacy project entry Skill delegates to the canonical workflow", async () => {
  const legacyRoot = path.join(DASHBOARD_ROOT, "skills/register-project-entry");
  const [legacy, metadata] = await Promise.all([
    fs.readFile(path.join(legacyRoot, "SKILL.md"), "utf8"),
    fs.readFile(path.join(legacyRoot, "agents/openai.yaml"), "utf8"),
  ]);
  assert.match(legacy, /compatibility adapter/i);
  assert.match(legacy, /\.agents\/skills\/register-project-entry\/SKILL\.md/);
  assert.match(legacy, /dashboard\.snapshot\.get/);
  assert.match(legacy, /dashboard\.project\.upsert/);
  assert.match(legacy, /read-back verification/i);
  assert.match(metadata, /\$register-project-entry/);
});

test("Dashboard operations Skill exposes safe state-owner and validation commands", async () => {
  const root = path.join(DASHBOARD_ROOT, ".agents/skills/operate-dashboard");
  const [skill, metadata, reference] = await Promise.all([
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "agents/openai.yaml"), "utf8"),
    fs.readFile(path.join(root, "references/operations-contract.md"), "utf8"),
  ]);
  assert.match(skill, /^---\nname: operate-dashboard\ndescription: .+\n---/);
  for (const marker of ["npm run check", "npm test", "DASHBOARD_RUNTIME_DIR", "STATE_OWNERSHIP_CONFLICT", "Never delete"]) assert.match(skill, new RegExp(marker));
  assert.match(metadata, /\$operate-dashboard/);
  for (const marker of ["127.0.0.1:4173", "npm run test:contract", "conformance/runner.mjs --engine dashboard", "Server Client CLI", "Standalone CLI"]) {
    assert.ok(reference.includes(marker), marker);
  }
});

test("standalone project entry Prompt delegates to the Skill and requires read-back verification", async () => {
  const prompt = await fs.readFile(path.join(DASHBOARD_ROOT, "prompts/register-project-entry.prompt.md"), "utf8");
  assert.match(prompt, /\.agents\/skills\/register-project-entry\/SKILL\.md/);
  assert.match(prompt, /旧路径.*skills\/register-project-entry\/SKILL\.md/);
  assert.match(prompt, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(prompt, /dashboard\.snapshot\.get/);
  assert.match(prompt, /dashboard\.project\.upsert/);
  assert.match(prompt, /aggregateRevision/);
  assert.match(prompt, /回读验证/);
  assert.match(prompt, /禁止执行/);
});
