import test from "node:test";
import assert from "node:assert/strict";
import { LocalEndpointProbe, assertProbeEndpoint, endpointForProject } from "../../src/outbound/local-endpoint-probe.mjs";

test("probe policy accepts only HTTP(S) loopback targets", () => {
  assert.equal(assertProbeEndpoint(""), null);
  assert.equal(assertProbeEndpoint("not a url"), null);
  assert.equal(assertProbeEndpoint("http://127.0.0.1:4173").hostname, "127.0.0.1");
  assert.equal(assertProbeEndpoint("https://localhost:4443").protocol, "https:");
  assert.throws(() => assertProbeEndpoint("http://example.com"), (error) => error.code === "DASHBOARD_PROBE_FORBIDDEN");
  assert.throws(() => assertProbeEndpoint("file:///tmp/a"), (error) => error.code === "DASHBOARD_PROBE_FORBIDDEN");
});

test("probe derives only registered project endpoint data and caps concurrency", () => {
  assert.equal(endpointForProject({ url: "", port: 4317 }), "http://127.0.0.1:4317");
  assert.equal(endpointForProject({ url: "", port: 0 }), "");
  assert.throws(() => new LocalEndpointProbe({ concurrency: 5 }), /1 to 4/);
  assert.doesNotThrow(() => new LocalEndpointProbe({ concurrency: 4 }));
});
