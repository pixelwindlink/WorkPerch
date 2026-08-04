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
    const htmlText = await htmlResponse.text();
    assert.match(htmlText, /Dashboard Engine/);
    assert.match(htmlText, /type="module"\s+src="\.\/app\.js"/);
    const appResponse = await fetch(`${baseUrl}/app.js`);
    assert.equal(appResponse.status, 200);
    assert.match(await appResponse.text(), /from "\.\/ui\//);
    const engineClientResponse = await fetch(`${baseUrl}/ui/engine-client.js`);
    assert.equal(engineClientResponse.status, 200);
    assert.match(await engineClientResponse.text(), /dashboard\.snapshot\.get/);
    assert.equal((await fetch(`${baseUrl}/ui/../package.json`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/ui/not-real.js`)).status, 404);

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
    assert.equal(recolored.tags.find((item) => item.id === group.item.id).color, "#EC4899");
    assert.equal(recolored.paths.filter((item) => [firstPath.item.id, secondPath.item.id].includes(item.id)).every((item) => item.tagIds.includes(group.item.id)), true);
    const registryEdit = await postAction("dashboard.group.upsert", {
      expectedRevision: pathColorEdit.aggregateRevision,
      item: { id: group.item.id, name: "核心工程", color: "#FF8A00" },
    }, "http-group-edit");
    const renamed = await postAction("dashboard.snapshot.get", {}, "http-shared-name");
    assert.equal(registryEdit.item.color, "#FF8A00");
    assert.equal(renamed.tags.find((item) => item.id === group.item.id).name, "核心工程");
    assert.equal(renamed.paths.filter((item) => item.tagIds.includes(group.item.id)).every((item) => item.tagIds.includes(group.item.id)), true);

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
  const uiDir = path.join(DASHBOARD_ROOT, "ui");
  const uiFiles = (await fs.readdir(uiDir)).filter((name) => name.endsWith(".js")).sort();
  const [html, app, css, server, ...uiSources] = await Promise.all([
    fs.readFile(path.join(DASHBOARD_ROOT, "index.html"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "app.js"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "styles.css"), "utf8"),
    fs.readFile(path.join(DASHBOARD_ROOT, "server.mjs"), "utf8"),
    ...uiFiles.map((name) => fs.readFile(path.join(uiDir, name), "utf8")),
  ]);
  const ui = Object.fromEntries(uiFiles.map((name, index) => [name, uiSources[index]]));
  const client = [app, ...uiSources].join("\n");

  assert.match(html, /type="module"\s+src="\.\/app\.js"/);
  assert.match(app, /from "\.\/ui\//);
  assert.deepEqual(uiFiles.includes("engine-client.js"), true);
  assert.deepEqual(uiFiles.includes("events.js"), true);
  assert.deepEqual(uiFiles.includes("guide.js"), true);
  assert.deepEqual(uiFiles.includes("dialogs-tag-registry.js"), true);
  assert.match(ui["engine-client.js"], /dashboard\.snapshot\.get/);
  assert.match(ui["dialogs-path.js"], /dashboard\.path\.upsert/);
  assert.match(ui["dialogs-tag-registry.js"], /dashboard\.tag\.upsert/);
  assert.match(ui["dialogs-tag-registry.js"], /dashboard\.tag\.delete/);
  assert.match(ui["dialogs-tag-registry.js"], /requestConfirm/);
  assert.match(ui["dialogs-tag-registry.js"], /setRegistryFilter/);
  assert.match(ui["dialogs-tag-registry.js"], /formatReferenceSummary/);
  assert.match(ui["confirm.js"], /export function requestConfirm/);
  assert.match(ui["confirm.js"], /#confirmDialog/);
  assert.equal(/\bconfirm\s*\(/.test(Object.entries(ui).filter(([name]) => name !== "confirm.js").map(([, source]) => source).join("\n")), false);
  assert.match(html, /id="confirmDialog"/);
  assert.match(html, /id="groupRegistryFilter"/);
  assert.match(html, /data-tag-filter="unused"/);
  assert.match(html, /data-tag-filter="in-use"/);
  assert.match(css, /\.confirm-dialog/);
  assert.match(css, /\.group-registry-toolbar/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.header-tools[\s\S]*display:\s*flex/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*#pathCategory[\s\S]*display:\s*inline-block/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.path-search-control[\s\S]*height:\s*34px/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.path-search-control[\s\S]*display:\s*flex/);
  assert.match(css, /\.kv-value[\s\S]*text-align:\s*left/);
  assert.match(css, /\.path-row[\s\S]*minmax\(280px, 1\.6fr\)/);
  assert.match(css, /\.path-name[\s\S]*white-space:\s*normal/);
  assert.match(css, /\.tag-strip[\s\S]*overflow:\s*visible/);

  assert.match(css, /@media \(max-width: 600px\)[\s\S]*\.tab-sticky-bar[\s\S]*display:\s*flex/);
  assert.match(ui["dialogs-note.js"], /dashboard\.note\.upsert/);
  assert.match(ui["dialogs-project.js"], /dashboard\.project\.upsert/);
  assert.match(ui["render-projects.js"], /dashboard\.project\.probe/);
  assert.match(ui["dialogs-project.js"], /dashboard\.project\.launch\.configure/);
  assert.match(ui["render-projects.js"], /dashboard\.project\.launch\.start/);
  assert.match(ui["render-projects.js"], /dashboard\.project\.launch\.stop/);
  assert.match(ui["render-projects.js"], /dashboard\.project\.launch\.status/);
  assert.match(ui["drop-batch.js"], /dashboard\.path\.preflight/);
  assert.match(ui["drop-batch.js"], /查看已收录/);
  assert.match(ui["drop-batch.js"], /revealExistingEntry/);
  assert.match(ui["drop-batch.js"], /dashboard\.path\.batch-upsert/);
  assert.match(ui["render-paths.js"], /dashboard\.path\.inspect/);
  assert.match(ui["render-paths.js"], /dashboard\.path\.refresh-all/);
  assert.match(ui["render-paths.js"], /dashboard\.path\.repair/);
  assert.match(html, /id="refreshAllPathsButton"/);
  assert.match(html, /id="abnormalPathsButton"/);
  assert.match(html, /id="cleanupAbnormalPathsButton"/);
  assert.match(html, /id="usageHome"/);
  assert.match(html, /id="summonOverlay"/);
  assert.match(html, /id="summonSearch"/);
  assert.match(ui["summon.js"], /onSummon/);
  assert.match(ui["summon.js"], /openSummonPalette/);
  assert.match(ui["render-paths.js"], /最近入口/);
  assert.match(ui["render-paths.js"], /reveal-usage-project/);
  assert.match(ui["render-paths.js"], /const limit = state\.minimalMode \? 36 : 8/);
  assert.match(ui["render-paths.js"], /slice\(0, limit\)/);
  assert.match(css, /\.summon-overlay/);
  assert.match(html, /id="guideButton"/);
  assert.match(html, /id="guideOverlay"/);
  assert.match(html, /id="guideSpotlight"/);
  assert.match(html, /id="guideNextButton"/);
  assert.match(html, /aria-modal="true"\s+aria-labelledby="guideTitle"/);
  assert.match(ui["events.js"], /bindGuide\(\)/);
  assert.match(ui["guide.js"], /switchTab\(step\.tab, false\)/);
  assert.match(ui["guide.js"], /applyMinimalMode\(false, \{ persist: false \}\)/);
  assert.match(ui["guide.js"], /applyMinimalMode\(true, \{ persist: false \}\)/);
  assert.match(ui["guide.js"], /scrollX: window\.scrollX/);
  assert.match(ui["guide.js"], /event\.key === "ArrowRight"/);
  assert.match(ui["guide.js"], /event\.key === "Escape"/);
  assert.match(ui["guide.js"], /window\.innerWidth <= 640[\s\S]*targetInLowerHalf[\s\S]*aboveFits/);
  assert.match(css, /\.guide-overlay/);
  assert.match(css, /\.guide-spotlight/);
  assert.match(css, /\.guide-card[\s\S]*backdrop-filter:\s*blur\(28px\)/);
  assert.match(css, /--guide-blue:\s*#0a84ff/);

  assert.match(html, /id="headerOverflow"/);
  assert.match(ui["render-paths.js"], /promote-path/);
  assert.match(ui["render-paths.js"], /open-path-parent/);
  assert.match(ui["render-paths.js"], /batchDeleteAbnormalPaths/);
  assert.match(ui["silent-refresh.js"], /dashboard\.path\.refresh-all/);
  assert.match(ui["silent-refresh.js"], /发现 .+ 条新的异常路径/);
  assert.match(ui["header-layout.js"], /headerOverflowPanel/);
  assert.match(ui["render-projects.js"], /revealExistingProject/);
  assert.match(css, /\.usage-home/);
  assert.match(ui["render-paths.js"], /bindUsageHomeScroll/);
  assert.match(html, /id="minimalModeButton"/);
  assert.match(ui["minimal.js"], /applyMinimalMode/);
  assert.match(ui["minimal.js"], /dataset\.minimal/);
  assert.match(css, /html\[data-minimal="true"\]/);
  assert.match(css, /html\[data-minimal="true"\][\s\S]*\.usage-home[\s\S]*flex:\s*1\s+1\s+auto/);
  assert.match(css, /html\[data-minimal="true"\][\s\S]*\.usage-home-chips[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /\.usage-home-chips[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.usage-chip[\s\S]*white-space:\s*nowrap/);
  assert.match(css, /\.usage-chip[\s\S]*flex:\s*0\s+0\s+auto/);
  assert.equal(/usage-home-more|toggle-usage-home|syncUsageHomeOverflow/.test(ui["render-paths.js"] + css), false);  assert.match(css, /\.header-overflow/);
  assert.match(ui["engine-client.js"], /dashboard\.entry\.usage\.record/);
  assert.match(ui["engine-client.js"], /export function knownTagIds/);
  assert.match(ui["engine-client.js"], /export async function afterWrite/);
  assert.match(ui["engine-client.js"], /patch\?\.type/);
  assert.match(ui["engine-client.js"], /LAUNCHER_UNAVAILABLE_GUIDANCE/);
  assert.match(ui["render-paths.js"], /type: "upsert", collection: "paths"/);
  assert.match(ui["render-paths.js"], /type: "inspection"/);
  assert.match(ui["render-notes.js"], /type: "delete", collection: "notes"/);
  assert.match(ui["drop-batch.js"], /afterWrite\(`已原子添加/);
  assert.equal(/afterWrite\(`已原子添加[^`]*=\s*\{[^}]*patch/.test(ui["drop-batch.js"]), false);
  assert.match(html, /id="launcherDependencyBanner"/);
  assert.match(css, /\.launcher-dependency-banner/);
  assert.match(ui["render-projects.js"], /launcherDependencyBanner/);
  assert.match(ui["render-shared.js"], /dashboard\.view\.upsert/);
  assert.match(ui["backup-legacy.js"], /dashboard\.backup\.export/);
  assert.match(ui["backup-legacy.js"], /dashboard\.backup\.import/);
  assert.equal(/const\s+PROJECTS\s*=/.test(client), false);
  assert.equal(/localStorage\.setItem\(STORAGE_KEYS\.(paths|notes)/.test(client), false);
  assert.equal(/localStorage\.getItem\(STORAGE_KEYS\.(paths|notes)/.test(client), false);
  assert.match(ui["engine-client.js"], /location\.protocol === "file:"/);
  assert.match(ui["desktop.js"], /openLocalPathInFinder/);
  assert.match(ui["render-paths.js"], /open-path-in-finder/);
  assert.match(ui["render-projects.js"], /open-project-path-in-finder/);
  assert.match(ui["desktop.js"], /普通浏览器不能打开本机访达/);
  assert.equal(/function\s+fileUrl|file:\/\//.test(client), false);

  const dryRunIndex = ui["backup-legacy.js"].indexOf("dryRun: true");
  const commitIndex = ui["backup-legacy.js"].indexOf("dryRun: false", dryRunIndex);
  const markerIndex = ui["backup-legacy.js"].indexOf("storageSet(STORAGE_KEYS.migration", commitIndex);
  assert.ok(dryRunIndex >= 0 && commitIndex > dryRunIndex && markerIndex > commitIndex);
  assert.match(ui["backup-legacy.js"], /storageRemove\(STORAGE_KEYS\.paths\)/);
  assert.match(ui["backup-legacy.js"], /storageRemove\(STORAGE_KEYS\.notes\)/);
  assert.match(ui["backup-legacy.js"], /旧 localStorage 不会被删除/);

  assert.match(html, /id="addPathButton"/);
  assert.match(html, /id="addNoteButton"/);
  assert.match(html, /id="addProjectButton"/);
  assert.match(html, /formnovalidate/);
  assert.match(html, /id="legacyMigrationDialog"/);
  assert.match(html, /NAME \/ TAGS \/ NOTE/);
  assert.match(html, /id="headerTools"/);
  assert.match(ui["render-paths.js"], /class="path-name"/);
  assert.match(ui["render-paths.js"], /class="path-note"/);
  assert.match(ui["dom.js"], /GROUP_COLORS/);
  assert.match(ui["dom.js"], /renderTagChips/);
  assert.match(ui["dom.js"], /withPreservedWindowScroll/);
  assert.match(ui["render-paths.js"], /withPreservedWindowScroll/);
  assert.match(ui["render-paths.js"], /resetScroll/);
  assert.match(ui["events.js"], /renderPaths\(\{ resetScroll: true \}\)/);
  assert.match(html, /id="editNoteTags"/);
  assert.match(html, /id="dropBatchDialog"/);
  assert.match(html, /id="manageGroupsButton"/);
  assert.match(html, /id="groupRegistryDialog"/);
  assert.match(html, /id="groupRegistryList"/);
  assert.match(html, /id="alwaysOnTopButton"/);
  assert.match(html, /id="launchProjectDialog"/);
  assert.match(html, /spawn\(executable, args, \{ shell: false \}\)/);
  assert.match(ui["render-projects.js"], /data-action="start-project-launch"/);
  assert.match(ui["render-projects.js"], /data-action="stop-project-launch"/);
  assert.match(ui["engine-client.js"], /state\.tags = snapshot\.tags/);
  assert.match(ui["render-paths.js"], /item\.tagIds\.includes\(state\.pathCategory\)/);
  assert.match(ui["dialogs-tag-registry.js"], /groupReferenceCount/);
  assert.match(css, /\.group-registry-row/);
  assert.match(css, /\.header-tools/);
  assert.match(css, /\.path-name[\s\S]*font-size:\s*13px/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.path-row[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.row-actions[\s\S]*flex-wrap:\s*wrap/);
  assert.match(css, /\.desktop-window-button:hover[\s\S]*transition-delay:\s*\.2s/);
  assert.match(css, /\.edit-dialog[\s\S]*max-height:\s*calc\(100vh - 20px\)/);
  assert.match(css, /\.path-group[\s\S]*font-size:\s*10px/);
  assert.match(css, /position:\s*sticky/);
  assert.match(css, /transition-delay:\s*\.2s/);
  assert.match(css, /grid-template-columns/);
  assert.match(server, /ui\\\/\[a-z0-9\]/);
  assert.equal(/child_process|\bexec\s*\(/.test(server), false);
});
