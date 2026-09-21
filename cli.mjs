#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPerchEngine } from "./src/composition/create-perch-engine.mjs";
import { isPerchError } from "./src/domain/errors.mjs";
import { errorResponse } from "./src/inbound/dispatcher.mjs";
import { loadContractRegistry } from "./src/inbound/contract-registry.mjs";
import { validateJsonSchema } from "./src/inbound/json-schema-validator.mjs";

const MAX_INPUT_BYTES = 1024 * 1024;

function parseArguments(argv) {
  const options = { messageFile: null, serverUrl: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--message-file" && argv[index + 1]) options.messageFile = argv[++index];
    else if (value === "--server-url" && argv[index + 1]) options.serverUrl = argv[++index];
    else throw new Error(`未知或不完整的参数：${value}`);
  }
  return options;
}

async function readStdin() {
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > MAX_INPUT_BYTES) throw new Error("输入消息超过 1 MiB 限制。");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readMessageText(messageFile) {
  if (!messageFile) return readStdin();
  const bytes = await fs.readFile(path.resolve(messageFile));
  if (bytes.length > MAX_INPUT_BYTES) throw new Error("消息文件超过 1 MiB 限制。");
  return bytes.toString("utf8");
}

function parseRequest(text) {
  if (!text.trim()) throw new Error("没有收到 EngineMessage。");
  return JSON.parse(text);
}

function normalizedEndpoint(serverUrl) {
  const url = new URL(serverUrl);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Server URL 必须使用 http 或 https。");
  if (url.pathname === "/" || url.pathname === "") url.pathname = "/engine-message";
  return url;
}

async function callServer(serverUrl, request, contracts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(normalizedEndpoint(serverUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Perch Server 返回 HTTP ${response.status}。`);
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_INPUT_BYTES) throw new Error("Perch Server 响应超过 1 MiB 限制。");
    const result = JSON.parse(text);
    const errors = validateJsonSchema(contracts.envelope.schema, result);
    if (errors.length || result.kind !== "response") throw new Error("Perch Server 返回了非法 EngineMessage。");
    if (result.id !== request?.id || result.engine !== request?.engine || result.action !== request?.action) {
      throw new Error("Perch Server 响应关联字段与请求不一致。");
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

async function callStandalone(request, environment) {
  const engine = await createPerchEngine({ mode: "standalone", environment });
  try {
    await engine.start();
    return await engine.handle(request);
  } finally {
    await engine.shutdown().catch(() => {});
  }
}

export async function runCli({ argv = process.argv.slice(2), environment = process.env } = {}) {
  let request;
  try {
    const options = parseArguments(argv);
    request = parseRequest(await readMessageText(options.messageFile));
    const serverUrl = options.serverUrl || environment.PERCH_SERVER_URL;
    if (serverUrl) {
      const contracts = await loadContractRegistry({ environment });
      return await callServer(serverUrl, request, contracts);
    }
    return await callStandalone(request, environment);
  } catch (error) {
    const code = isPerchError(error) ? error.code : error instanceof SyntaxError ? "INVALID_PAYLOAD" : "TRANSPORT_ERROR";
    const message = isPerchError(error) ? error.message : String(error?.message || "Perch CLI 失败。").slice(0, 1000);
    return errorResponse(request, code, message);
  }
}

async function main() {
  const response = await runCli();
  process.stdout.write(`${JSON.stringify(response)}\n`);
  if (response.status !== "ok") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    const response = errorResponse(null, "INTERNAL_ERROR", "Perch CLI 内部错误。");
    process.stdout.write(`${JSON.stringify(response)}\n`);
    process.stderr.write(`perch cli failure: ${String(error?.message || error).slice(0, 500)}\n`);
    process.exitCode = 1;
  });
}
