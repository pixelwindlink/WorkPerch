import http from "node:http";
import https from "node:https";
import { EndpointProbePort } from "../application/ports/endpoint-probe.mjs";
import { dashboardError } from "../domain/errors.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

export function endpointForProject(project) {
  if (project.url) return project.url;
  if (project.port > 0) return `http://127.0.0.1:${project.port}`;
  return "";
}

export function assertProbeEndpoint(endpoint) {
  if (!endpoint) return null;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(url.protocol) || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw dashboardError("DASHBOARD_PROBE_FORBIDDEN", `禁止探测非 loopback endpoint：${endpoint}`);
  }
  return url;
}

function requestOnce(url, timeoutMs) {
  return new Promise((resolve) => {
    const started = Date.now();
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url, { method: "HEAD", timeout: timeoutMs }, (response) => {
      response.resume();
      resolve({ state: "online", latencyMs: Date.now() - started });
      request.destroy();
    });
    request.once("timeout", () => request.destroy(new Error("timeout")));
    request.once("error", () => resolve({ state: "offline", latencyMs: Date.now() - started }));
    request.end();
  });
}

async function mapWithLimit(items, limit, operation) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await operation(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

export class LocalEndpointProbe extends EndpointProbePort {
  constructor({ concurrency = 4 }) {
    super();
    if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
      throw new TypeError("Endpoint probe concurrency must be an integer from 1 to 4.");
    }
    this.concurrency = concurrency;
  }

  async probe(projects, { timeoutMs = 1200 } = {}) {
    const targets = projects.map((project) => {
      const endpoint = endpointForProject(project);
      return { project, endpoint, url: assertProbeEndpoint(endpoint) };
    });
    return mapWithLimit(targets, this.concurrency, async ({ project, endpoint, url }) => {
      if (!url) return { projectId: project.id, endpoint, state: "invalid", latencyMs: 0 };
      const result = await requestOnce(url, timeoutMs);
      return { projectId: project.id, endpoint, ...result };
    });
  }
}
