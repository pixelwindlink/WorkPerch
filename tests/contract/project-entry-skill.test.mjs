import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { DASHBOARD_ROOT } from "../helpers.mjs";

test("project entry onboarding Skill references the public Dashboard contract", async () => {
  const skillRoot = path.join(DASHBOARD_ROOT, "skills/register-project-entry");
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

test("standalone project entry Prompt delegates to the Skill and requires read-back verification", async () => {
  const prompt = await fs.readFile(path.join(DASHBOARD_ROOT, "prompts/register-project-entry.prompt.md"), "utf8");
  assert.match(prompt, /skills\/register-project-entry\/SKILL\.md/);
  assert.match(prompt, /http:\/\/127\.0\.0\.1:4173/);
  assert.match(prompt, /dashboard\.snapshot\.get/);
  assert.match(prompt, /dashboard\.project\.upsert/);
  assert.match(prompt, /aggregateRevision/);
  assert.match(prompt, /回读验证/);
  assert.match(prompt, /禁止执行/);
});
