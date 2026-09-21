import { existsSync } from "node:fs";
import path from "node:path";

const PROTOCOL = "generic-engines/engine-message";
const VERSION = "1.0";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function requestId() {
  return `perch-desktop-${Date.now()}-${Math.random().toString(36).slice(2)}`.slice(0, 128);
}

export function resolveDesktopServerUrl(environment = process.env) {
  const configured = environment.PERCH_DESKTOP_URL;
  const fallbackHost = environment.PERCH_HOST || "127.0.0.1";
  const fallbackPort = environment.PERCH_PORT || "4173";
  const source = configured || `http://${fallbackHost.includes(":") ? `[${fallbackHost}]` : fallbackHost}:${fallbackPort}`;
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("PERCH_DESKTOP_URL 必须是合法 loopback HTTP URL。");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(host) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Perch Desktop 只允许连接无凭据的 loopback HTTP 根地址。");
  }
  const port = Number(url.port || 80);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Perch Desktop Server 端口不合法。");
  return { baseUrl: url.origin, host, port };
}

export function resolveDesktopGenericEnginesRoot({
  environment = process.env,
  homeDir,
  resourcesPath,
  developmentRoot,
  isPackaged = false,
  exists = existsSync
}) {
  const candidates = [
    environment.GENERIC_ENGINES_ROOT,
    homeDir ? path.join(homeDir, "workspace", "generic_engines") : "",
    isPackaged ? resourcesPath : developmentRoot
  ].filter(Boolean);
  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    const envelope = path.join(root, "governance", "protocol", "engine-message", "v1.0", "envelope.schema.json");
    if (exists(envelope)) return root;
  }
  throw new Error("Perch Desktop 找不到 Generic Engines governance Contract 根目录。");
}

export function resolveProjectLauncherRoot({
  environment = process.env,
  resourcesPath,
  developmentRoot,
  isPackaged = false,
  exists = existsSync
}) {
  const candidates = [
    environment.PROJECT_LAUNCHER_ROOT,
    isPackaged && resourcesPath ? path.join(resourcesPath, "project-launcher") : "",
    developmentRoot
  ].filter(Boolean);
  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    if (exists(path.join(root, "engine.manifest.json")) && exists(path.join(root, "src", "composition", "create-project-launcher-engine.mjs"))) return root;
  }
  throw new Error("Perch Desktop 找不到 Project Launcher Engine 资源。");
}

export async function isPerchServerReady(baseUrl, { fetchImpl = fetch, timeoutMs = 900 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/engine-message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        protocol: PROTOCOL,
        version: VERSION,
        kind: "request",
        id: requestId(),
        engine: "perch",
        action: "engine.describe",
        payload: {}
      }),
      signal: controller.signal
    });
    if (!response.ok) return false;
    const message = await response.json();
    return message?.protocol === PROTOCOL
      && message?.version === VERSION
      && message?.kind === "response"
      && message?.engine === "perch"
      && message?.action === "engine.describe"
      && message?.status === "ok"
      && message?.payload?.id === "perch";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function acquirePerchServer({ baseUrl, createServer, fetchImpl = fetch, allowReuse = true }) {
  if (await isPerchServerReady(baseUrl, { fetchImpl })) {
    if (!allowReuse) throw new Error(`Perch Desktop 需要拥有组合式 Server，但 ${baseUrl} 已被现有 Perch Server 占用。`);
    return { baseUrl, owned: false, server: null };
  }
  const server = await createServer();
  try {
    await server.start();
    return { baseUrl, owned: true, server };
  } catch (error) {
    if (await isPerchServerReady(baseUrl, { fetchImpl })) {
      if (!allowReuse) throw new Error(`Perch Desktop 需要拥有组合式 Server，但 ${baseUrl} 已被并发 Perch Server 占用。`, { cause: error });
      return { baseUrl, owned: false, server: null };
    }
    throw error;
  }
}
