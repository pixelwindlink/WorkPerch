import { dashboardError } from "./errors.mjs";
import {
  assertAggregate,
  assertExpectedRevision,
  materializeGroupRegistry,
  normalizeGroupItem,
  normalizeNoteItem,
  normalizePathItem,
  normalizeProjectItem
} from "./dashboard-aggregate.mjs";
import { LIMITS, assertAllowedKeys, comparableGroupName, comparablePath } from "./value-objects.mjs";

function blankSummary() {
  return {
    paths: { added: 0, updated: 0, skipped: 0 },
    notes: { added: 0, updated: 0, skipped: 0 },
    projects: { added: 0, updated: 0, skipped: 0 }
  };
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizeBackup(backup, { now, idFactory }) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) throw dashboardError("DASHBOARD_IMPORT_INVALID", "备份必须是对象。");
  const legacy = backup.format === "dashboard-key-value-list" && backup.version === 1;
  const engine = backup.format === "dashboard-engine-backup" && backup.version === 1;
  if (!legacy && !engine) throw dashboardError("DASHBOARD_IMPORT_INVALID", "不支持的备份格式或版本。");
  assertAllowedKeys(
    backup,
    legacy ? ["format", "version", "exportedAt", "paths", "notes"] : ["format", "version", "aggregateRevision", "exportedAt", "groups", "paths", "notes", "projects"],
    "backup",
    "DASHBOARD_IMPORT_INVALID"
  );
  if (!Array.isArray(backup.paths) || !Array.isArray(backup.notes) || (engine && !Array.isArray(backup.projects))) {
    throw dashboardError("DASHBOARD_IMPORT_INVALID", "备份集合不完整。");
  }
  if (
    backup.paths.length > LIMITS.paths
    || backup.notes.length > LIMITS.notes
    || (engine && backup.projects.length > LIMITS.projects)
    || (Array.isArray(backup.groups) && backup.groups.length > LIMITS.groups)
  ) {
    throw dashboardError("DASHBOARD_IMPORT_REJECTED", "备份集合超过 Dashboard 容量限制。");
  }
  if (engine && backup.groups !== undefined && !Array.isArray(backup.groups)) {
    throw dashboardError("DASHBOARD_IMPORT_INVALID", "backup.groups 必须是数组。");
  }
  const groups = engine && backup.groups
    ? backup.groups.map((item) => normalizeGroupItem(item, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", stored: true }))
    : undefined;
  const paths = backup.paths.map((item) => normalizePathItem(item, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", legacy, stored: engine }));
  const notes = backup.notes.map((item) => normalizeNoteItem(item, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", legacy, stored: engine }));
  const projects = engine ? backup.projects.map((item) => normalizeProjectItem(item, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", stored: true })) : null;
  const pathKeys = new Set();
  for (const item of paths) {
    const key = comparablePath(item.path);
    if (pathKeys.has(key)) throw dashboardError("DASHBOARD_IMPORT_INVALID", `备份内路径重复：${item.path}。`);
    pathKeys.add(key);
  }
  for (const [items, label] of [[notes, "notes.id"], [projects || [], "projects.id"]]) {
    const ids = new Set();
    for (const item of items) {
      if (ids.has(item.id)) throw dashboardError("DASHBOARD_IMPORT_INVALID", `备份内 ${label} 重复：${item.id}。`);
      ids.add(item.id);
    }
  }
  let registry;
  try {
    registry = materializeGroupRegistry({
      schemaVersion: "1.0",
      aggregateRevision: 0,
      ...(groups ? { groups } : {}),
      paths,
      notes,
      projects: projects || [],
      createdAt: now,
      updatedAt: now
    }, { now, idFactory, incrementRevision: false }).state;
  } catch (error) {
    if (error?.code === "DASHBOARD_STATE_CORRUPT") {
      throw dashboardError("DASHBOARD_IMPORT_INVALID", `备份 Group Registry 不合法：${error.message}`, { cause: error });
    }
    throw error;
  }
  return { legacy, groups: registry.groups, paths: registry.paths, notes, projects };
}

function mergeCollection(current, incoming, keyOf, summary) {
  const result = structuredClone(current);
  for (const item of incoming) {
    const index = result.findIndex((candidate) => keyOf(candidate) === keyOf(item));
    if (index < 0) {
      result.push(item);
      summary.added += 1;
    } else if (same(result[index], item)) {
      summary.skipped += 1;
    } else {
      result[index] = { ...item, id: result[index].id, createdAt: result[index].createdAt };
      summary.updated += 1;
    }
  }
  return result;
}

function replaceSummary(current, incoming) {
  const currentById = new Map(current.map((item) => [item.id, item]));
  const result = { added: 0, updated: 0, skipped: 0 };
  for (const item of incoming) {
    const existing = currentById.get(item.id);
    if (!existing) result.added += 1;
    else if (same(existing, item)) result.skipped += 1;
    else result.updated += 1;
  }
  return result;
}

function mergeGroups(current, incoming) {
  const groups = structuredClone(current);
  const remap = new Map();
  for (const item of incoming) {
    let index = groups.findIndex((candidate) => candidate.id === item.id);
    if (index < 0) index = groups.findIndex((candidate) => comparableGroupName(candidate.name) === comparableGroupName(item.name));
    if (index < 0) {
      groups.push(item);
      remap.set(item.id, item.id);
      continue;
    }
    const existing = groups[index];
    const merged = { ...item, id: existing.id, createdAt: existing.createdAt };
    groups[index] = merged;
    remap.set(item.id, existing.id);
  }
  const byId = new Map(groups.map((item) => [item.id, item]));
  return {
    groups,
    paths: (paths) => paths.map((item) => {
      const groupId = remap.get(item.groupId) || item.groupId;
      const group = byId.get(groupId);
      return { ...item, groupId, group: group?.name || item.group };
    })
  };
}

export function exportBackup(state, exportedAt) {
  return {
    format: "dashboard-engine-backup",
    version: 1,
    aggregateRevision: state.aggregateRevision,
    exportedAt,
    groups: structuredClone(state.groups),
    paths: structuredClone(state.paths),
    notes: structuredClone(state.notes),
    projects: structuredClone(state.projects)
  };
}

export function planBackupImport(state, { backup, mode, dryRun, expectedRevision }, { now, idFactory }) {
  if (!dryRun) {
    if (expectedRevision === undefined) throw dashboardError("DASHBOARD_IMPORT_REJECTED", "正式导入必须提供 expectedRevision。");
    assertExpectedRevision(state, expectedRevision);
  }
  const normalized = normalizeBackup(backup, { now, idFactory });
  const summary = blankSummary();
  let paths;
  let groups;
  let notes;
  let projects;
  if (mode === "replace") {
    groups = normalized.groups;
    paths = normalized.paths;
    notes = normalized.notes;
    projects = normalized.projects ?? structuredClone(state.projects);
    summary.paths = replaceSummary(state.paths, paths);
    summary.notes = replaceSummary(state.notes, notes);
    if (normalized.projects) summary.projects = replaceSummary(state.projects, projects);
    else summary.projects.skipped = state.projects.length;
  } else if (mode === "merge") {
    const mergedGroups = mergeGroups(state.groups, normalized.groups);
    groups = mergedGroups.groups;
    paths = mergeCollection(state.paths, mergedGroups.paths(normalized.paths), (item) => comparablePath(item.path), summary.paths);
    notes = mergeCollection(state.notes, normalized.notes, (item) => item.id, summary.notes);
    projects = normalized.projects ? mergeCollection(state.projects, normalized.projects, (item) => item.id, summary.projects) : structuredClone(state.projects);
    if (!normalized.projects) summary.projects.skipped = state.projects.length;
  } else {
    throw dashboardError("DASHBOARD_IMPORT_REJECTED", `不支持导入模式 ${mode}。`);
  }
  const candidate = {
    ...structuredClone(state),
    groups,
    paths,
    notes,
    projects,
    updatedAt: now,
    aggregateRevision: dryRun ? state.aggregateRevision : state.aggregateRevision + 1
  };
  try {
    assertAggregate(candidate);
  } catch (error) {
    if (error?.code === "DASHBOARD_STATE_CORRUPT") {
      throw dashboardError("DASHBOARD_IMPORT_REJECTED", `导入候选状态不满足 Dashboard 不变量：${error.message}`, { cause: error });
    }
    throw error;
  }
  return { candidate, summary, dryRun, mode };
}
