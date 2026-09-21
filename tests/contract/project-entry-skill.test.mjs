import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { PERCH_ROOT } from "../helpers.mjs";

test("project entry onboarding Skill references the public Perch contract", async () => {
  const skillRoot = path.join(PERCH_ROOT, ".agents/skills/register-project-entry");
  const [skill, metadata] = await Promise.all([
    fs.readFile(path.join(skillRoot, "SKILL.md"), "utf8"),
    fs.readFile(path.join(skillRoot, "agents/openai.yaml"), "utf8"),
  ]);

  assert.match(skill, /^---\nname: register-project-entry\ndescription: .+\n---/);
  assert.match(skill, /perch\.snapshot\.get/);
  assert.match(skill, /perch\.project\.upsert/);
  assert.match(skill, /PERCH_REVISION_CONFLICT/);
  assert.match(skill, /STATE_OWNERSHIP_CONFLICT/);
  assert.match(skill, /Do not execute the project's command/);
  assert.match(skill, /engine\.manifest\.json/);
  assert.match(skill, /id.*perch/i);
  assert.doesNotMatch(skill, /directory two levels above/i);
  assert.match(metadata, /\$register-project-entry/);

  for (const reference of [
    "engine.manifest.json",
    "contracts/actions/perch.snapshot.get.request-payload.schema.json",
    "contracts/actions/perch.snapshot.get.success-payload.schema.json",
    "contracts/actions/perch.project.upsert.request-payload.schema.json",
    "contracts/actions/perch.project.upsert.success-payload.schema.json",
  ]) {
    await fs.access(path.join(PERCH_ROOT, reference));
  }
});

test("legacy project entry Skill delegates to the canonical workflow", async () => {
  const legacyRoot = path.join(PERCH_ROOT, "skills/register-project-entry");
  const [legacy, metadata] = await Promise.all([
    fs.readFile(path.join(legacyRoot, "SKILL.md"), "utf8"),
    fs.readFile(path.join(legacyRoot, "agents/openai.yaml"), "utf8"),
  ]);
  assert.match(legacy, /compatibility adapter/i);
  assert.match(legacy, /\.agents\/skills\/register-project-entry\/SKILL\.md/);
  assert.match(legacy, /perch\.snapshot\.get/);
  assert.match(legacy, /perch\.project\.upsert/);
  assert.match(legacy, /read-back verification/i);
  assert.match(metadata, /\$register-project-entry/);
});

test("Perch operations Skill exposes safe state-owner and validation commands", async () => {
  const root = path.join(PERCH_ROOT, ".agents/skills/operate-perch");
  const [skill, metadata, reference] = await Promise.all([
    fs.readFile(path.join(root, "SKILL.md"), "utf8"),
    fs.readFile(path.join(root, "agents/openai.yaml"), "utf8"),
    fs.readFile(path.join(root, "references/operations-contract.md"), "utf8"),
  ]);
  assert.match(skill, /^---\nname: operate-perch\ndescription: .+\n---/);
  for (const marker of ["npm run check", "npm test", "PERCH_RUNTIME_DIR", "STATE_OWNERSHIP_CONFLICT", "Never delete"]) assert.match(skill, new RegExp(marker));
  assert.match(metadata, /\$operate-perch/);
  for (const marker of ["127.0.0.1:4173", "npm run test:contract", "conformance/runner.mjs --engine work-perch", "Server Client CLI", "Standalone CLI"]) {
    assert.ok(reference.includes(marker), marker);
  }
});

test("standalone project entry Prompt delegates to the Skill and requires read-back verification", async () => {
  const prompt = await fs.readFile(path.join(PERCH_ROOT, "prompts/register-project-entry.prompt.md"), "utf8");
  assert.match(prompt, /\.agents\/skills\/register-project-entry\/SKILL\.md/);
  assert.match(prompt, /旧路径.*skills\/register-project-entry\/SKILL\.md/);
  assert.match(prompt, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(prompt, /perch\.snapshot\.get/);
  assert.match(prompt, /perch\.project\.upsert/);
  assert.match(prompt, /aggregateRevision/);
  assert.match(prompt, /回读验证/);
  assert.match(prompt, /禁止执行/);
});
