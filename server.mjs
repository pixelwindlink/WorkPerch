#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDashboardEngine } from "./src/composition/create-dashboard-engine.mjs";
import { errorResponse } from "./src/inbound/dispatcher.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MAX_BODY_BYTES = 1024 * 1024;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const STATIC_FILES = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/index.html", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.js", { file: "app.js", type: "text/javascript; charset=utf-8" }],
  ["/styles.css", { file: "styles.css", type: "text/css; charset=utf-8" }]
]);

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(`${JSON.stringify(payload)}\n`);
}

function transportError(response, statusCode, code, message) {
  sendJson(response, statusCode, errorResponse(null, code, message));
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  let exceeded = false;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      exceeded = true;
      continue;
    }
    chunks.push(chunk);
  }
  if (exceeded) throw Object.assign(new Error("EngineMessage 请求体超过 1 MiB 限制。"), { statusCode: 413, code: "PAYLOAD_TOO_LARGE" });
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(requestPath, response, staticRoot) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    response.writeHead(400).end("Bad Request");
    return;
  }
  if (decoded.includes("\0") || decoded.split("/").includes("..")) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  const asset = STATIC_FILES.get(decoded)
    || (/^\/ui\/[a-z0-9][a-z0-9._-]*\.js$/i.test(decoded)
      ? { file: decoded.slice(1), type: "text/javascript; charset=utf-8" }
      : null);
  if (!asset) {
    response.writeHead(404).end("Not Found");
    return;
  }
  const target = path.resolve(staticRoot, asset.file);
  const relative = path.relative(staticRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await fs.readFile(target);
    response.writeHead(200, {
      "content-type": asset.type,
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(error?.code === "ENOENT" ? 404 : 500).end(error?.code === "ENOENT" ? "Not Found" : "Internal Server Error");
  }
}

function parsePort(value, fallback = 4173) {
  const port = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error("DASHBOARD_PORT 必须是 0 到 65535 的整数。");
  return port;
}

export async function createDashboardHttpServer(options = {}) {
  const environment = options.environment || process.env;
  const host = options.host || environment.DASHBOARD_HOST || "127.0.0.1";
  if (!LOOPBACK_HOSTS.has(host)) throw new Error("Dashboard Server 只允许绑定 loopback 地址。");
  const port = parsePort(options.port ?? environment.DASHBOARD_PORT);
  const staticRoot = path.resolve(options.staticRoot || ROOT);
  const engine = options.engine || await createDashboardEngine({
    mode: "server",
    environment,
    runtimeDir: options.runtimeDir,
    genericEnginesRoot: options.genericEnginesRoot,
    envelopeSchemaPath: options.envelopeSchemaPath,
    engineClient: options.engineClient
  });

  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${host}`);
    if (requestUrl.pathname === "/engine-message") {
      if (request.method !== "POST") {
        response.setHeader("allow", "POST");
        transportError(response, 405, "METHOD_NOT_ALLOWED", "只允许 POST /engine-message。");
        return;
      }
      try {
        const text = await readRequestBody(request);
        let message;
        try {
          message = JSON.parse(text);
        } catch {
          transportError(response, 400, "INVALID_PAYLOAD", "请求体不是合法 JSON EngineMessage。");
          return;
        }
        const result = await engine.handle(message);
        sendJson(response, 200, result);
      } catch (error) {
        transportError(response, error?.statusCode || 500, error?.code || "TRANSPORT_ERROR", error?.statusCode ? error.message : "Dashboard HTTP Adapter 内部错误。");
      }
      return;
    }

    if (!new Set(["GET", "HEAD"]).has(request.method)) {
      response.writeHead(405, { allow: "GET, HEAD" }).end("Method Not Allowed");
      return;
    }
    await serveStatic(requestUrl.pathname, response, staticRoot);
  });

  let started = false;
  return {
    engine,
    server,
    host,
    async start() {
      if (started) return server.address();
      await engine.start();
      try {
        await new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(port, host, () => {
            server.off("error", reject);
            resolve();
          });
        });
        started = true;
        return server.address();
      } catch (error) {
        await engine.shutdown().catch(() => {});
        throw error;
      }
    },
    async stop() {
      if (started) {
        await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
        started = false;
      }
      await engine.shutdown();
    }
  };
}

async function main() {
  const dashboardServer = await createDashboardHttpServer();
  const address = await dashboardServer.start();
  const displayHost = typeof address === "object" && address?.family === "IPv6" ? `[${address.address}]` : address.address;
  process.stderr.write(`Dashboard Engine listening on http://${displayHost}:${address.port}\n`);
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await dashboardServer.stop();
  };
  process.once("SIGINT", () => shutdown().finally(() => { process.exitCode = 0; }));
  process.once("SIGTERM", () => shutdown().finally(() => { process.exitCode = 0; }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`dashboard server failure: ${String(error?.message || error).slice(0, 500)}\n`);
    process.exitCode = 1;
  });
}
