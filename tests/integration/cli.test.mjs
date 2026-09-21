import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createPerchEngine } from "../../src/composition/create-perch-engine.mjs";
import { GENERIC_ENGINES_ROOT, removeRuntime, request, runCli, tempRuntime } from "../helpers.mjs";

function oneResponse(result) {
  assert.notEqual(result.stdout.trim(), "");
  return JSON.parse(result.stdout.trim());
}

test("CLI stdin emits exactly one success response with isolated stderr", async () => {
  const runtimeDir = await tempRuntime("perch-cli-stdin-");
  try {
    const message = request("engine.describe", {}, { id: "cli-stdin" });
    const result = await runCli({ runtimeDir, input: `${JSON.stringify(message)}\n`, environment: { PERCH_SERVER_URL: "" } });
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    const response = oneResponse(result);
    assert.equal(response.status, "ok");
    assert.equal(response.id, message.id);
    assert.equal(response.payload.id, "perch");
  } finally {
    await removeRuntime(runtimeDir);
  }
});

test("CLI message file supports system.health and returns exit zero", async () => {
  const runtimeDir = await tempRuntime("perch-cli-file-");
  const messagePath = path.join(runtimeDir, "health.json");
  const message = request("system.health", {}, { id: "cli-file" });
  await fs.writeFile(messagePath, JSON.stringify(message), "utf8");
  try {
    const result = await runCli({ runtimeDir, args: ["--message-file", messagePath], environment: { PERCH_SERVER_URL: "" } });
    assert.equal(result.code, 0);
    assert.equal(result.stderr, "");
    assert.equal(oneResponse(result).payload.state, "ready");
  } finally {
    await removeRuntime(runtimeDir);
  }
});

test("CLI protocol/business errors use nonzero exit and structured stdout", async () => {
  const runtimeDir = await tempRuntime("perch-cli-error-");
  try {
    const unsupported = request("perch.unsupported", {}, { id: "cli-error" });
    const result = await runCli({ runtimeDir, input: JSON.stringify(unsupported), environment: { PERCH_SERVER_URL: "" } });
    assert.notEqual(result.code, 0);
    assert.equal(result.stderr, "");
    const response = oneResponse(result);
    assert.equal(response.status, "error");
    assert.equal(response.error.code, "UNSUPPORTED_ACTION");

    const invalidJson = await runCli({ runtimeDir, input: "{invalid", environment: { PERCH_SERVER_URL: "" } });
    assert.notEqual(invalidJson.code, 0);
    assert.equal(oneResponse(invalidJson).error.code, "INVALID_PAYLOAD");
  } finally {
    await removeRuntime(runtimeDir);
  }
});

test("CLI reports ownership conflict and never becomes a second writer", async () => {
  const runtimeDir = await tempRuntime("perch-cli-lock-");
  const owner = await createPerchEngine({ mode: "standalone", runtimeDir, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  await owner.start();
  try {
    const message = request("perch.snapshot.get", {}, { id: "cli-lock" });
    const result = await runCli({ runtimeDir, input: JSON.stringify(message), environment: { PERCH_SERVER_URL: "" } });
    assert.notEqual(result.code, 0);
    const response = oneResponse(result);
    assert.equal(response.id, message.id);
    assert.equal(response.error.code, "STATE_OWNERSHIP_CONFLICT");
  } finally {
    await owner.shutdown();
    await removeRuntime(runtimeDir);
  }
});

test("configured unavailable Server returns Transport error without local fallback", async () => {
  const runtimeDir = await tempRuntime("perch-cli-client-");
  try {
    const message = request("perch.snapshot.get", {}, { id: "cli-client" });
    const result = await runCli({
      runtimeDir,
      input: JSON.stringify(message),
      environment: { PERCH_SERVER_URL: "http://127.0.0.1:1" },
    });
    assert.notEqual(result.code, 0);
    assert.equal(oneResponse(result).error.code, "TRANSPORT_ERROR");
    await assert.rejects(() => fs.access(path.join(runtimeDir, "perch-state.json")), (error) => error.code === "ENOENT");
  } finally {
    await removeRuntime(runtimeDir);
  }
});
