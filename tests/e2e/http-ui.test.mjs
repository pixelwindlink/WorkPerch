import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createDashboardHttpServer } from "../../server.mjs";
import { loadContractRegistry } from "../../src/inbound/contract-registry.mjs";
import { validateJsonSchema } from "../../src/inbound/json-schema-validator.mjs";
import { DASHBOARD_ROOT, GENERIC_ENGINES_ROOT, removeRuntime, request, runCli, tempRuntime } from "../helpers.mjs";

test("HTTP Adapter, CLI client and static UI share one running Engine boundary", async (t) => {
  const runtimeDir = await tempRuntime("dashboard-http-");
  const clientRuntime = await tempRuntime("dashboard-http-client-");
  const dashboardServer = await createDashboardHttpServer({ runtimeDir, port: 0, genericEnginesRoot: GENERIC_ENGINES_ROOT });
  let started = false;
  try {
    let address;
    try {
      address = await dashboardServer.start();
      started = true;
    } catch (error) {
      if (error?.code === "EPERM" || error?.code === "EACCES") {
        t.skip(`environment forbids loopback listen: ${error.code}`);
        return;
      }
      throw error;
    }
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const contracts = await loadContractRegistry({ genericEnginesRoot: GENERIC_ENGINES_ROOT });

    const htmlResponse = await fetch(`${baseUrl}/`);
    assert.equal(htmlResponse.status, 200);
    assert.match(await htmlResponse.text(), /Dashboard Engine/);
    const appResponse = await fetch(`${baseUrl}/app.js`);
    assert.equal(appResponse.status, 200);
    assert.match(await appResponse.text(), /dashboard\.snapshot\.get/);

    const snapshotRequest = request("dashboard.snapshot.get", {}, { id: "http-snapshot" });
    const httpResponse = await fetch(`${baseUrl}/engine-message`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(snapshotRequest),
    });
    assert.equal(httpResponse.status, 200);
    const httpMessage = await httpResponse.json();
    assert.deepEqual(validateJsonSchema(contracts.envelope.schema, httpMessage), []);
    assert.equal(httpMessage.status, "ok");

    const cliRequest = request("dashboard.snapshot.get", {}, { id: "cli-client-snapshot" });
    const cliResult = await runCli({
      runtimeDir: clientRuntime,
      input: JSON.stringify(cliRequest),
      environment: { DASHBOARD_SERVER_URL: baseUrl },
    });
    assert.equal(cliResult.code, 0);
    assert.equal(cliResult.stderr, "");
    const cliMessage = JSON.parse(cliResult.stdout.trim());
    assert.deepEqual(cliMessage.payload, httpMessage.payload);
    await assert.rejects(() => fs.access(path.join(clientRuntime, "dashboard-state.json")), (error) => error.code === "ENOENT");

    async function postAction(action, payload, id) {
      const response = await fetch(`${baseUrl}/engine-message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request(action, payload, { id })),
      });
      const message = await response.json();
      assert.equal(message.status, "ok", JSON.stringify(message));
      return message.payload;
    }
    const group = await postAction("dashboard.group.upsert", {
      expectedRevision: httpMessage.payload.aggregateRevision,
      item: { name: "工程", color: "#38BDF8" },
    }, "http-group");
    const firstPath = await postAction("dashboard.path.upsert", {
      expectedRevision: group.aggregateRevision,
      item: { name: "One", path: "/tmp/http-one", groupId: group.item.id, group: group.item.name, description: "", pinned: false },
    }, "http-path-one");
    const secondPath = await postAction("dashboard.path.upsert", {
      expectedRevision: firstPath.aggregateRevision,
      item: { name: "Two", path: "/tmp/http-two", groupId: group.item.id, group: group.item.name, description: "", pinned: false },
    }, "http-path-two");
    const pathColorEdit = await postAction("dashboard.path.upsert", {
      expectedRevision: secondPath.aggregateRevision,
      item: { id: firstPath.item.id, name: "One", path: "/tmp/http-one", groupId: group.item.id, group: group.item.name, groupColor: "#EC4899", description: "", pinned: false },
    }, "http-path-color");
    const recolored = await postAction("dashboard.snapshot.get", {}, "http-shared-color");
    assert.equal(recolored.groups.find((item) => item.id === group.item.id).color, "#EC4899");
    assert.equal(recolored.paths.filter((item) => [firstPath.item.id, secondPath.item.id].includes(item.id)).every((item) => item.groupId === group.item.id), true);
    const registryEdit = await postAction("dashboard.group.upsert", {
      expectedRevision: pathColorEdit.aggregateRevision,
      item: { id: group.item.id, name: "核心工程", color: "#FF8A00" },
    }, "http-group-edit");
    const renamed = await postAction("dashboard.snapshot.get", {}, "http-shared-name");
    assert.equal(registryEdit.item.color, "#FF8A00");
    assert.equal(renamed.paths.filter((item) => item.groupId === group.item.id).every((item) => item.group === "核心工程"), true);

    const invalidJson = await fetch(`${baseUrl}/engine-message`, { method: "POST", body: "{invalid" });
    assert.equal(invalidJson.status, 400);
    const invalidMessage = await invalidJson.json();
    assert.deepEqual(validateJsonSchema(contracts.envelope.schema, invalidMessage), []);
    assert.equal(invalidMessage.error.code, "INVALID_PAYLOAD");

    const tooLarge = await fetch(`${baseUrl}/engine-message`, { method: "POST", body: "x".repeat(1024 * 1024 + 1) });
    assert.equal(tooLarge.status, 413);
    assert.equal((await tooLarge.json()).error.code, "PAYLOAD_TOO_LARGE");

    assert.equal((await fetch(`${baseUrl}/%2e%2e/package.json`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/engine-message`)).status, 405);
  } finally {
    if (started) await dashboardServer.stop();
    await removeRuntime(runtimeDir);
    await removeRuntime(clientRuntime);
  }
});

test("Web UI preserves compact interactions without browser-owned business state", async () => {
  const [html, app, css, server] = await Promise.all([
    fs.readFile(path.join(DASHBOARD_ROOT, "index.html"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "app.js"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "styles.css"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "server.mjs"), "utf8"),
  ]);

  assert.match(app, /dashboard\.snapshot\.get/);
  assert.match(app, /dashboard\.path\.upsert/);
  assert.match(app, /dashboard\.group\.upsert/);
  assert.match(app, /dashboard\.group\.delete/);
  assert.match(app, /dashboard\.note\.upsert/);
  assert.match(app, /dashboard\.project\.upsert/);
  assert.match(app, /dashboard\.project\.probe/);
  assert.match(app, /dashboard\.backup\.export/);
  assert.match(app, /dashboard\.backup\.import/);
  assert.equal(/const\s+PROJECTS\s*=/.test(app), false);
  assert.equal(/localStorage\.setItem\(STORAGE_KEYS\.(paths|notes)/.test(app), false);
  assert.equal(/localStorage\.getItem\(STORAGE_KEYS\.(paths|notes)/.test(app), false);
  assert.match(app, /location\.protocol === "file:"/);

  const dryRunIndex = app.indexOf('dryRun: true');
  const commitIndex = app.indexOf('dryRun: false', dryRunIndex);
  const markerIndex = app.indexOf('storageSet(STORAGE_KEYS.migration', commitIndex);
  assert.ok(dryRunIndex >= 0 && commitIndex > dryRunIndex && markerIndex > commitIndex);
  assert.match(app, /storageRemove\(STORAGE_KEYS\.paths\)/);
  assert.match(app, /storageRemove\(STORAGE_KEYS\.notes\)/);
  assert.match(app, /旧 localStorage 不会被删除/);

  assert.match(html, /id="addPathButton"/);
  assert.match(html, /id="addNoteButton"/);
  assert.match(html, /id="addProjectButton"/);
  assert.match(html, /formnovalidate/);
  assert.match(html, /id="legacyMigrationDialog"/);
  assert.match(html, /NAME \/ GROUP \/ NOTE/);
  assert.match(app, /class="path-name"/);
  assert.match(app, /class="path-note"/);
  assert.match(app, /GROUP_COLORS/);
  assert.match(app, /groupColorFor/);
  assert.match(html, /id="editPathGroupColor"/);
  assert.match(html, /id="pathColorPalette"/);
  assert.match(html, /id="manageGroupsButton"/);
  assert.match(html, /id="groupRegistryDialog"/);
  assert.match(html, /id="groupRegistryList"/);
  assert.match(html, /id="alwaysOnTopButton"/);
  assert.match(app, /state\.groups = snapshot\.groups/);
  assert.match(app, /group\.id === state\.pathCategory/);
  assert.match(app, /groupReferenceCount/);
  assert.match(css, /\.group-registry-row/);
  assert.match(css, /\.path-name[\s\S]*font-size:\s*13px/);
  assert.match(css, /\.desktop-window-button:hover[\s\S]*transition-delay:\s*\.2s/);
  assert.match(css, /\.edit-dialog[\s\S]*max-height:\s*calc\(100vh - 20px\)/);
  assert.match(css, /\.path-group[\s\S]*font-size:\s*10px/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /transition-delay:\s*\.2s/);
  assert.match(css, /grid-template-columns/);
  assert.equal(/child_process|\bexec\s*\(/.test(server), false);
});
