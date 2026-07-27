const PROTOCOL = "generic-engines/engine-message";
const VERSION = "1.0";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

function requestId() {
  return `dashboard-desktop-${Date.now()}-${Math.random().toString(36).slice(2)}`.slice(0, 128);
}

export function resolveDesktopServerUrl(environment = process.env) {
  const configured = environment.DASHBOARD_DESKTOP_URL;
  const fallbackHost = environment.DASHBOARD_HOST || "127.0.0.1";
  const fallbackPort = environment.DASHBOARD_PORT || "4173";
  const source = configured || `http://${fallbackHost.includes(":") ? `[${fallbackHost}]` : fallbackHost}:${fallbackPort}`;
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("DASHBOARD_DESKTOP_URL 必须是合法 loopback HTTP URL。");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "http:" || !LOOPBACK_HOSTS.has(host) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Dashboard Desktop 只允许连接无凭据的 loopback HTTP 根地址。");
  }
  const port = Number(url.port || 80);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Dashboard Desktop Server 端口不合法。");
  return { baseUrl: url.origin, host, port };
}

export async function isDashboardServerReady(baseUrl, { fetchImpl = fetch, timeoutMs = 900 } = {}) {
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
        engine: "dashboard",
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
      && message?.engine === "dashboard"
      && message?.action === "engine.describe"
      && message?.status === "ok"
      && message?.payload?.id === "dashboard";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function acquireDashboardServer({ baseUrl, createServer, fetchImpl = fetch }) {
  if (await isDashboardServerReady(baseUrl, { fetchImpl })) {
    return { baseUrl, owned: false, server: null };
  }
  const server = await createServer();
  try {
    await server.start();
    return { baseUrl, owned: true, server };
  } catch (error) {
    if (await isDashboardServerReady(baseUrl, { fetchImpl })) {
      return { baseUrl, owned: false, server: null };
    }
    throw error;
  }
}
