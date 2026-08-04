import { dashboardError } from "./errors.mjs";
import {
  assertAggregate,
  assertExpectedRevision,
  defaultTagColor,
  migrateAggregateToV2,
  normalizeNoteItem,
  normalizePathItem,
  normalizeTagItem
} from "./dashboard-aggregate.mjs";
import { LIMITS, assertAllowedKeys, comparablePath, comparableTagName } from "./value-objects.mjs";

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

function legacyTag(tags, item, { now, idFactory }) {
  const name = String(item.group || "未分组").trim() || "未分组";
  let tag = item.groupId ? tags.find((candidate) => candidate.id === item.groupId) : undefined;
  if (!tag) tag = tags.find((candidate) => comparableTagName(candidate.name) === comparableTagName(name));
  if (!tag) {
    tag = normalizeTagItem({
      id: item.groupId,
      name,
      color: item.groupColor || item.color || defaultTagColor(name)
    }, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID" });
    tags.push(tag);
  }
  return tag;
}

function normalizeLegacyList(backup, { now, idFactory }) {
  assertAllowedKeys(backup, ["format", "version", "exportedAt", "paths", "notes"], "backup", "DASHBOARD_IMPORT_INVALID");
  if (!Array.isArray(backup.paths) || !Array.isArray(backup.notes)) throw dashboardError("DASHBOARD_IMPORT_INVALID", "备份集合不完整。");
  if (backup.paths.length > LIMITS.paths || backup.notes.length > LIMITS.notes) throw dashboardError("DASHBOARD_IMPORT_REJECTED", "备份集合超过 Dashboard 容量限制。");
  const tags = [];
  const paths = backup.paths.map((source) => {
    const tag = legacyTag(tags, source, { now, idFactory });
    return normalizePathItem({
      ...source,
      tagIds: [tag.id],
      description: source.description || "",
      pinned: source.pinned ?? false
    }, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", legacy: true });
  });
  const notes = backup.notes.map((source) => normalizeNoteItem({
    ...source,
    tagIds: [],
    pinned: source.pinned ?? false
  }, { now, idFactory, code: "DASHBOARD_IMPORT_INVALID", legacy: true }));
  const pathKeys = new Set();
  for (const item of paths) {
    const key = comparablePath(item.path);
    if (pathKeys.has(key)) throw dashboardError("DASHBOARD_IMPORT_INVALID", `备份内路径重复：${item.path}。`);
    pathKeys.add(key);
  }
  const noteIds = new Set();
  for (const item of notes) {
    if (noteIds.has(item.id)) throw dashboardError("DASHBOARD_IMPORT_INVALID", `备份内 notes.id 重复：${item.id}。`);
    noteIds.add(item.id);
  }
  return { tags, paths, notes, projects: null, savedViews: [] };
}

function normalizeEngineV1(backup, { now, idFactory }) {
  assertAllowedKeys(backup, ["format", "version", "aggregateRevision", "exportedAt", "groups", "paths", "notes", "projects"], "backup", "DASHBOARD_IMPORT_INVALID");
  if (!Array.isArray(backup.paths) || !Array.isArray(backup.notes) || !Array.isArray(backup.projects)) throw dashboardError("DASHBOARD_IMPORT_INVALID", "备份集合不完整。");
  const createdAt = backup.exportedAt || now;
  try {
    return migrateAggregateToV2({
      schemaVersion: "1.0",
      aggregateRevision: backup.aggregateRevision || 0,
      ...(backup.groups ? { groups: backup.groups } : {}),
      paths: backup.paths,
      notes: backup.notes,
      projects: backup.projects,
      createdAt,
      updatedAt: createdAt
    }, { now, idFactory }).state;
  } catch (error) {
    throw dashboardError("DASHBOARD_IMPORT_INVALID", `1.x Engine 备份不合法：${error.message}`, { cause: error });
  }
}

function normalizeEngineV2(backup) {
  assertAllowedKeys(backup, ["format", "version", "aggregateRevision", "exportedAt", "tags", "paths", "notes", "projects", "savedViews"], "backup", "DASHBOARD_IMPORT_INVALID");
  const state = {
    schemaVersion: "2.0",
    aggregateRevision: backup.aggregateRevision || 0,
    tags: structuredClone(backup.tags),
    paths: structuredClone(backup.paths),
    notes: structuredClone(backup.notes),
    projects: structuredClone(backup.projects),
    savedViews: structuredClone(backup.savedViews || []),
    createdAt: backup.exportedAt,
    updatedAt: backup.exportedAt
  };
  try {
    assertAggregate(state);
  } catch (error) {
    throw dashboardError("DASHBOARD_IMPORT_INVALID", `2.0 Engine 备份不合法：${error.message}`, { cause: error });
  }
  return state;
}

function normalizeBackup(backup, context) {
  if (!backup || typeof backup !== "object" || Array.isArray(backup)) throw dashboardError("DASHBOARD_IMPORT_INVALID", "备份必须是对象。");
  if (backup.format === "dashboard-key-value-list" && backup.version === 1) return normalizeLegacyList(backup, context);
  if (backup.format === "dashboard-engine-backup" && backup.version === 1) {
    const state = normalizeEngineV1(backup, context);
    return { tags: state.tags, paths: state.paths, notes: state.notes, projects: state.projects, savedViews: state.savedViews };
  }
  if (backup.format === "dashboard-engine-backup" && backup.version === 2) {
    const state = normalizeEngineV2(backup);
    return { tags: state.tags, paths: state.paths, notes: state.notes, projects: state.projects, savedViews: state.savedViews };
  }
  throw dashboardError("DASHBOARD_IMPORT_INVALID", "不支持的备份格式或版本。");
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

function mergeTags(current, incoming) {
  const tags = structuredClone(current);
  const remap = new Map();
  for (const item of incoming) {
    let index = tags.findIndex((candidate) => candidate.id === item.id);
    if (index < 0) index = tags.findIndex((candidate) => comparableTagName(candidate.name) === comparableTagName(item.name));
    if (index < 0) {
      tags.push(item);
      remap.set(item.id, item.id);
    } else {
      const existing = tags[index];
      tags[index] = { ...item, id: existing.id, createdAt: existing.createdAt };
      remap.set(item.id, existing.id);
    }
  }
  return {
    tags,
    remapItems(items) {
      return items.map((item) => ({ ...item, tagIds: item.tagIds.map((id) => remap.get(id) || id) }));
    }
  };
}

export function exportBackup(state, exportedAt) {
  return {
    format: "dashboard-engine-backup",
    version: 2,
    aggregateRevision: state.aggregateRevision,
    exportedAt,
    tags: structuredClone(state.tags),
    paths: structuredClone(state.paths),
    notes: structuredClone(state.notes),
    projects: structuredClone(state.projects),
    savedViews: structuredClone(state.savedViews)
  };
}

export function planBackupImport(state, { backup, mode, dryRun, expectedRevision }, { now, idFactory }) {
  if (!dryRun) {
    if (expectedRevision === undefined) throw dashboardError("DASHBOARD_IMPORT_REJECTED", "正式导入必须提供 expectedRevision。");
    assertExpectedRevision(state, expectedRevision);
  }
  const normalized = normalizeBackup(backup, { now, idFactory });
  const summary = blankSummary();
  let tags;
  let paths;
  let notes;
  let projects;
  let savedViews;
  if (mode === "replace") {
    tags = normalized.tags;
    paths = normalized.paths;
    notes = normalized.notes;
    projects = normalized.projects ?? structuredClone(state.projects);
    savedViews = normalized.projects === null ? structuredClone(state.savedViews) : normalized.savedViews;
    summary.paths = replaceSummary(state.paths, paths);
    summary.notes = replaceSummary(state.notes, notes);
    if (normalized.projects) summary.projects = replaceSummary(state.projects, projects);
    else summary.projects.skipped = state.projects.length;
  } else if (mode === "merge") {
    const mergedTags = mergeTags(state.tags, normalized.tags);
    tags = mergedTags.tags;
    paths = mergeCollection(state.paths, mergedTags.remapItems(normalized.paths), (item) => comparablePath(item.path), summary.paths);
    notes = mergeCollection(state.notes, mergedTags.remapItems(normalized.notes), (item) => item.id, summary.notes);
    projects = normalized.projects ? mergeCollection(state.projects, mergedTags.remapItems(normalized.projects), (item) => item.id, summary.projects) : structuredClone(state.projects);
    savedViews = normalized.savedViews?.length ? mergeCollection(state.savedViews, mergedTags.remapItems(normalized.savedViews), (item) => item.id, { added: 0, updated: 0, skipped: 0 }) : structuredClone(state.savedViews);
    if (!normalized.projects) summary.projects.skipped = state.projects.length;
  } else {
    throw dashboardError("DASHBOARD_IMPORT_REJECTED", `不支持导入模式 ${mode}。`);
  }
  const candidate = {
    ...structuredClone(state),
    tags,
    paths,
    notes,
    projects,
    savedViews,
    updatedAt: now,
    aggregateRevision: dryRun ? state.aggregateRevision : state.aggregateRevision + 1
  };
  try {
    assertAggregate(candidate);
  } catch (error) {
    throw dashboardError("DASHBOARD_IMPORT_REJECTED", `导入候选状态不满足 Dashboard 不变量：${error.message}`, { cause: error });
  }
  return { candidate, summary, dryRun, mode };
}
