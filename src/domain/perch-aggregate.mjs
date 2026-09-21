import { perchError } from "./errors.mjs";
import {
  LIMITS,
  absolutePath,
  assertAllowedKeys,
  assertRequiredKeys,
  booleanValue,
  boundedString,
  comparablePath,
  comparableTagName,
  identifier,
  integerValue,
  projectType,
  projectUrl,
  stringArray,
  tagColor,
  timestamp
} from "./value-objects.mjs";

const STATE_KEYS = ["schemaVersion", "aggregateRevision", "tags", "paths", "notes", "projects", "savedViews", "createdAt", "updatedAt"];
const TAG_KEYS = ["id", "name", "color", "createdAt", "updatedAt"];
const TAG_INPUT_KEYS = ["id", "name", "color"];
const USAGE_KEYS = ["count", "lastUsedAt"];
const INSPECTION_KEYS = ["status", "kind", "gitRoot", "projectType", "suggestedName", "checkedAt"];
const PATH_KEYS = ["id", "name", "path", "tagIds", "description", "pinned", "usage", "inspection", "createdAt", "updatedAt"];
const PATH_INPUT_KEYS = ["id", "name", "path", "tagIds", "tags", "groupId", "group", "groupColor", "description", "pinned"];
const NOTE_KEYS = ["id", "title", "content", "tagIds", "pinned", "usage", "createdAt", "updatedAt"];
const NOTE_INPUT_KEYS = ["id", "title", "content", "tagIds", "tags", "pinned"];
const PROJECT_KEYS = ["id", "name", "type", "label", "description", "path", "url", "port", "command", "tagIds", "pinned", "usage", "inspection", "createdAt", "updatedAt"];
const PROJECT_INPUT_KEYS = ["id", "name", "type", "label", "description", "path", "url", "port", "command", "tagIds", "tags", "pinned"];
const SAVED_VIEW_KEYS = ["id", "name", "scope", "query", "tagIds", "pathStatus", "sort", "createdAt", "updatedAt"];
const SAVED_VIEW_INPUT_KEYS = ["id", "name", "scope", "query", "tagIds", "pathStatus", "sort"];
const DEFAULT_TAG_COLORS = ["#FF4D6D", "#FF8A00", "#FFD60A", "#22C55E", "#2DD4BF", "#38BDF8", "#6366F1", "#A855F7", "#EC4899", "#F97316"];
const INSPECTION_STATUSES = new Set(["available", "missing", "denied", "invalid"]);
const INSPECTION_KINDS = new Set(["file", "directory", "other", "unknown"]);
const VIEW_SCOPES = new Set(["all", "paths", "notes", "projects"]);
const VIEW_PATH_STATUSES = new Set(["any", "available", "missing", "denied", "invalid"]);
const VIEW_SORTS = new Set(["smart", "recent", "frequent", "name", "updated"]);

function clone(value) {
  return structuredClone(value);
}

function ensureArray(value, name, max, code) {
  if (!Array.isArray(value) || value.length > max) throw perchError(code, `${name} 必须是不超过 ${max} 项的数组。`);
  return value;
}

function deepSame(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertTimeOrder(createdAt, updatedAt, name, code) {
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw perchError(code, `${name}.updatedAt 不能早于 createdAt。`);
}

function enumValue(value, name, values, code) {
  if (!values.has(value)) throw perchError(code, `${name} 不受支持。`);
  return value;
}

export function defaultTagColor(name = "未分组") {
  let hash = 0;
  for (const character of String(name || "未分组")) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return DEFAULT_TAG_COLORS[hash % DEFAULT_TAG_COLORS.length];
}

export const defaultGroupColor = defaultTagColor;

export function normalizeUsage(value, { existing, code = "INVALID_PAYLOAD", stored = false } = {}) {
  const source = value ?? existing ?? { count: 0, lastUsedAt: null };
  assertAllowedKeys(source, USAGE_KEYS, "usage", code);
  if (stored) assertRequiredKeys(source, USAGE_KEYS, "usage", code);
  return {
    count: integerValue(source.count ?? 0, "usage.count", { min: 0, max: Number.MAX_SAFE_INTEGER, code }),
    lastUsedAt: source.lastUsedAt === null || source.lastUsedAt === undefined ? null : timestamp(source.lastUsedAt, "usage.lastUsedAt", code)
  };
}

export function normalizeInspection(value, { code = "INVALID_PAYLOAD" } = {}) {
  if (value === null || value === undefined) return null;
  assertAllowedKeys(value, INSPECTION_KEYS, "inspection", code);
  assertRequiredKeys(value, INSPECTION_KEYS, "inspection", code);
  return {
    status: enumValue(value.status, "inspection.status", INSPECTION_STATUSES, code),
    kind: enumValue(value.kind, "inspection.kind", INSPECTION_KINDS, code),
    gitRoot: booleanValue(value.gitRoot, "inspection.gitRoot", code),
    projectType: value.projectType ? projectType(value.projectType, code) : "",
    suggestedName: boundedString(value.suggestedName ?? "", "inspection.suggestedName", { max: 120, trim: true, code }),
    checkedAt: timestamp(value.checkedAt, "inspection.checkedAt", code)
  };
}

export function normalizeTagItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", stored = false } = {}) {
  assertAllowedKeys(value, stored ? TAG_KEYS : TAG_INPUT_KEYS, "tag item", code);
  if (stored) assertRequiredKeys(value, TAG_KEYS, "tag item", code);
  else assertRequiredKeys(value, ["name", "color"], "tag item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "tag.createdAt", code) : now);
  return {
    id: identifier(value.id, "tag.id", { optional: true, code }) || existing?.id || idFactory("tag"),
    name: boundedString(value.name, "tag.name", { min: 1, max: 80, trim: true, code }),
    color: tagColor(value.color, code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "tag.updatedAt", code) : now
  };
}

export const normalizeGroupItem = normalizeTagItem;

function normalizeTagIds(value, name, code) {
  return stringArray(value ?? [], name, { maxItems: 30, itemMax: 96, code }).map((id) => identifier(id, name, { code }));
}

export function normalizePathItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, stored ? PATH_KEYS : legacy ? [...PATH_INPUT_KEYS, "color", "createdAt", "updatedAt", "usage", "inspection"] : PATH_INPUT_KEYS, "path item", code);
  if (stored) assertRequiredKeys(value, PATH_KEYS, "path item", code);
  else assertRequiredKeys(value, ["name", "path"], "path item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "path.createdAt", code) : now);
  return {
    id: identifier(value.id, "path.id", { optional: true, code }) || existing?.id || idFactory("path"),
    name: boundedString(value.name, "path.name", { min: 1, max: 120, trim: true, code }),
    path: absolutePath(value.path, "path.path", code),
    tagIds: normalizeTagIds(value.tagIds ?? existing?.tagIds ?? [], "path.tagIds", code),
    description: boundedString(value.description ?? existing?.description ?? "", "path.description", { max: 500, trim: true, code }),
    pinned: value.pinned === undefined ? existing?.pinned ?? false : booleanValue(value.pinned, "path.pinned", code),
    usage: normalizeUsage(value.usage, { existing: existing?.usage, code, stored }),
    inspection: value.inspection === undefined ? clone(existing?.inspection ?? null) : normalizeInspection(value.inspection, { code }),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "path.updatedAt", code) : now
  };
}

export function normalizeNoteItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, stored ? NOTE_KEYS : legacy ? [...NOTE_INPUT_KEYS, "color", "createdAt", "updatedAt", "usage"] : NOTE_INPUT_KEYS, "note item", code);
  if (stored) assertRequiredKeys(value, NOTE_KEYS, "note item", code);
  else assertRequiredKeys(value, ["title", "content"], "note item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "note.createdAt", code) : now);
  return {
    id: identifier(value.id, "note.id", { optional: true, code }) || existing?.id || idFactory("note"),
    title: boundedString(value.title, "note.title", { min: 1, max: 120, trim: true, code }),
    content: boundedString(value.content, "note.content", { min: 1, max: 10000, code }),
    tagIds: normalizeTagIds(value.tagIds ?? existing?.tagIds ?? [], "note.tagIds", code),
    pinned: value.pinned === undefined ? existing?.pinned ?? false : booleanValue(value.pinned, "note.pinned", code),
    usage: normalizeUsage(value.usage, { existing: existing?.usage, code, stored }),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "note.updatedAt", code) : now
  };
}

export function normalizeProjectItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, stored ? PROJECT_KEYS : legacy ? [...PROJECT_INPUT_KEYS, "run", "createdAt", "updatedAt", "usage", "inspection"] : PROJECT_INPUT_KEYS, "project item", code);
  if (stored) assertRequiredKeys(value, PROJECT_KEYS, "project item", code);
  else assertRequiredKeys(value, ["name", "path"], "project item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "project.createdAt", code) : now);
  return {
    id: identifier(value.id, "project.id", { optional: true, code }) || existing?.id || idFactory("project"),
    name: boundedString(value.name, "project.name", { min: 1, max: 120, trim: true, code }),
    type: projectType(value.type ?? existing?.type ?? "other", code),
    label: boundedString(value.label ?? existing?.label ?? value.type ?? "Other", "project.label", { min: 1, max: 80, trim: true, code }),
    description: boundedString(value.description ?? existing?.description ?? "", "project.description", { max: 500, trim: true, code }),
    path: absolutePath(value.path, "project.path", code),
    url: projectUrl(value.url ?? existing?.url ?? "", code),
    port: integerValue(value.port ?? existing?.port ?? 0, "project.port", { min: 0, max: 65535, code }),
    command: boundedString(value.command ?? value.run ?? existing?.command ?? "", "project.command", { max: 2000, code }),
    tagIds: normalizeTagIds(value.tagIds ?? existing?.tagIds ?? [], "project.tagIds", code),
    pinned: value.pinned === undefined ? existing?.pinned ?? false : booleanValue(value.pinned, "project.pinned", code),
    usage: normalizeUsage(value.usage, { existing: existing?.usage, code, stored }),
    inspection: value.inspection === undefined ? clone(existing?.inspection ?? null) : normalizeInspection(value.inspection, { code }),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "project.updatedAt", code) : now
  };
}

export function normalizeSavedView(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", stored = false } = {}) {
  assertAllowedKeys(value, stored ? SAVED_VIEW_KEYS : SAVED_VIEW_INPUT_KEYS, "saved view", code);
  if (stored) assertRequiredKeys(value, SAVED_VIEW_KEYS, "saved view", code);
  else assertRequiredKeys(value, ["name", "scope", "query", "tagIds", "pathStatus", "sort"], "saved view", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "savedView.createdAt", code) : now);
  return {
    id: identifier(value.id, "savedView.id", { optional: true, code }) || existing?.id || idFactory("view"),
    name: boundedString(value.name, "savedView.name", { min: 1, max: 80, trim: true, code }),
    scope: enumValue(value.scope, "savedView.scope", VIEW_SCOPES, code),
    query: boundedString(value.query, "savedView.query", { max: 200, trim: true, code }),
    tagIds: normalizeTagIds(value.tagIds, "savedView.tagIds", code),
    pathStatus: enumValue(value.pathStatus, "savedView.pathStatus", VIEW_PATH_STATUSES, code),
    sort: enumValue(value.sort, "savedView.sort", VIEW_SORTS, code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "savedView.updatedAt", code) : now
  };
}

function assertUnique(items, keyOf, label, code) {
  const seen = new Set();
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) throw perchError(code, `${label} 包含重复值：${key}。`);
    seen.add(key);
  }
}

function assertTagReferences(state, item, name, code) {
  const ids = new Set(state.tags.map((tag) => tag.id));
  for (const id of item.tagIds) if (!ids.has(id)) throw perchError(code, `${name} 引用了不存在的标签 ${id}。`);
}

export function assertAggregate(value) {
  const code = "PERCH_STATE_CORRUPT";
  assertAllowedKeys(value, STATE_KEYS, "perch state", code);
  assertRequiredKeys(value, STATE_KEYS, "perch state", code);
  if (value.schemaVersion !== "2.0") throw perchError(code, `不支持状态 Schema ${value.schemaVersion}。`);
  integerValue(value.aggregateRevision, "aggregateRevision", { min: 0, code });
  const createdAt = timestamp(value.createdAt, "createdAt", code);
  const updatedAt = timestamp(value.updatedAt, "updatedAt", code);
  assertTimeOrder(createdAt, updatedAt, "perch state", code);

  ensureArray(value.tags, "tags", LIMITS.tags, code).forEach((item) => {
    const normalized = normalizeTagItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "tag item", code);
    if (!deepSame(item, normalized)) throw perchError(code, `标签 ${normalized.id} 不是规范化状态。`);
  });
  ensureArray(value.paths, "paths", LIMITS.paths, code).forEach((item) => {
    const normalized = normalizePathItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "path item", code);
    if (!deepSame(item, normalized)) throw perchError(code, `路径 ${normalized.id} 不是规范化状态。`);
    assertTagReferences(value, item, `路径 ${item.id}`, code);
  });
  ensureArray(value.notes, "notes", LIMITS.notes, code).forEach((item) => {
    const normalized = normalizeNoteItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "note item", code);
    if (!deepSame(item, normalized)) throw perchError(code, `速记 ${normalized.id} 不是规范化状态。`);
    assertTagReferences(value, item, `速记 ${item.id}`, code);
  });
  ensureArray(value.projects, "projects", LIMITS.projects, code).forEach((item) => {
    const normalized = normalizeProjectItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "project item", code);
    if (!deepSame(item, normalized)) throw perchError(code, `项目 ${normalized.id} 不是规范化状态。`);
    assertTagReferences(value, item, `项目 ${item.id}`, code);
  });
  ensureArray(value.savedViews, "savedViews", LIMITS.savedViews, code).forEach((item) => {
    const normalized = normalizeSavedView(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "saved view", code);
    if (!deepSame(item, normalized)) throw perchError(code, `保存视图 ${normalized.id} 不是规范化状态。`);
    assertTagReferences(value, item, `保存视图 ${item.id}`, code);
  });

  assertUnique(value.tags, (item) => item.id, "tags.id", code);
  assertUnique(value.tags, (item) => comparableTagName(item.name), "tags.name", code);
  assertUnique(value.paths, (item) => item.id, "paths.id", code);
  assertUnique(value.paths, (item) => comparablePath(item.path), "paths.path", code);
  assertUnique(value.notes, (item) => item.id, "notes.id", code);
  assertUnique(value.projects, (item) => item.id, "projects.id", code);
  assertUnique(value.projects, (item) => comparablePath(item.path), "projects.path", code);
  assertUnique(value.savedViews, (item) => item.id, "savedViews.id", code);
  return value;
}

function findOrCreateTag(tags, { id, name, color }, { now, idFactory, code }) {
  let tag = id ? tags.find((candidate) => candidate.id === id) : undefined;
  if (!tag && name) tag = tags.find((candidate) => comparableTagName(candidate.name) === comparableTagName(name));
  if (tag && color && tagColor(color, code) !== tag.color) {
    const updated = normalizeTagItem({ id: tag.id, name: tag.name, color }, { now, idFactory, existing: tag, code });
    tags[tags.findIndex((candidate) => candidate.id === tag.id)] = updated;
    tag = updated;
  }
  if (!tag) {
    const selectedName = boundedString(name || "未分组", "tag.name", { min: 1, max: 80, trim: true, code });
    tag = normalizeTagItem({ id, name: selectedName, color: color || defaultTagColor(selectedName) }, { now, idFactory, code });
    tags.push(tag);
  }
  return tag;
}

export function migrateAggregateToV2(source, { now, idFactory }) {
  if (source?.schemaVersion === "2.0") return { state: assertAggregate(clone(source)), changed: false };
  const code = "PERCH_STATE_CORRUPT";
  assertAllowedKeys(source, ["schemaVersion", "aggregateRevision", "groups", "paths", "notes", "projects", "createdAt", "updatedAt"], "perch state 1.x", code);
  if (source.schemaVersion !== "1.0") throw perchError(code, `不支持状态 Schema ${source?.schemaVersion}。`);
  assertRequiredKeys(source, ["schemaVersion", "aggregateRevision", "paths", "notes", "projects", "createdAt", "updatedAt"], "perch state 1.x", code);
  const tags = (source.groups || []).map((item) => normalizeTagItem(item, { now: item.updatedAt || now, idFactory, code, stored: true }));
  const paths = ensureArray(source.paths, "paths", LIMITS.paths, code).map((item) => {
    assertAllowedKeys(item, ["id", "name", "path", "groupId", "group", "groupColor", "color", "description", "pinned", "createdAt", "updatedAt"], "path item 1.x", code);
    assertRequiredKeys(item, ["id", "name", "path", "group", "description", "pinned", "createdAt", "updatedAt"], "path item 1.x", code);
    const tag = findOrCreateTag(tags, { id: item.groupId, name: item.group, color: item.groupColor || item.color }, { now, idFactory, code });
    return normalizePathItem({
      id: item.id, name: item.name, path: item.path, tagIds: [tag.id], description: item.description, pinned: item.pinned,
      usage: { count: 0, lastUsedAt: null }, inspection: null, createdAt: item.createdAt, updatedAt: item.updatedAt
    }, { now, idFactory, code, stored: true });
  });
  const notes = ensureArray(source.notes, "notes", LIMITS.notes, code).map((item) => normalizeNoteItem({
    id: item.id, title: item.title, content: item.content, tagIds: [], pinned: item.pinned,
    usage: { count: 0, lastUsedAt: null }, createdAt: item.createdAt, updatedAt: item.updatedAt
  }, { now, idFactory, code, stored: true }));
  const projects = ensureArray(source.projects, "projects", LIMITS.projects, code).map((item) => {
    const tagIds = (item.tags || []).map((name) => findOrCreateTag(tags, { name }, { now, idFactory, code }).id);
    return normalizeProjectItem({
      id: item.id, name: item.name, type: item.type, label: item.label, description: item.description, path: item.path,
      url: item.url, port: item.port, command: item.command, tagIds: [...new Set(tagIds)], pinned: item.pinned,
      usage: { count: 0, lastUsedAt: null }, inspection: null, createdAt: item.createdAt, updatedAt: item.updatedAt
    }, { now, idFactory, code, stored: true });
  });
  const state = {
    schemaVersion: "2.0",
    aggregateRevision: integerValue(source.aggregateRevision, "aggregateRevision", { min: 0, code }) + 1,
    tags,
    paths,
    notes,
    projects,
    savedViews: [],
    createdAt: timestamp(source.createdAt, "createdAt", code),
    updatedAt: now
  };
  return { state: assertAggregate(state), changed: true };
}

export function materializeGroupRegistry(state, options) {
  return migrateAggregateToV2(state, options);
}

export function createInitialAggregate({ now, projects = [], idFactory }) {
  const tags = [];
  const normalizedProjects = projects.map((item) => {
    const tagIds = (item.tags || []).map((name) => findOrCreateTag(tags, { name }, { now, idFactory, code: "PERCH_STATE_CORRUPT" }).id);
    return normalizeProjectItem({ ...item, tagIds }, { now, idFactory, legacy: true, code: "PERCH_STATE_CORRUPT" });
  });
  return assertAggregate({
    schemaVersion: "2.0",
    aggregateRevision: 0,
    tags,
    paths: [],
    notes: [],
    projects: normalizedProjects,
    savedViews: [],
    createdAt: now,
    updatedAt: now
  });
}

export function assertExpectedRevision(state, expectedRevision) {
  if (state.aggregateRevision !== expectedRevision) {
    throw perchError("PERCH_REVISION_CONFLICT", `期望 revision ${expectedRevision}，当前为 ${state.aggregateRevision}。`);
  }
}

function committed(state, changes, now) {
  const next = { ...clone(state), ...changes, aggregateRevision: state.aggregateRevision + 1, updatedAt: now };
  return assertAggregate(next);
}

function resolveTagSelection(state, item, existing, { now, idFactory }) {
  const tags = clone(state.tags);
  if (item.tagIds !== undefined) {
    const tagIds = normalizeTagIds(item.tagIds, "item.tagIds", "INVALID_PAYLOAD");
    for (const id of tagIds) if (!tags.some((tag) => tag.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `标签 ${id} 不存在。`);
    return { tags, tagIds };
  }
  if (item.groupId || item.group) {
    const tag = findOrCreateTag(tags, { id: item.groupId, name: item.group || "未分组", color: item.groupColor }, { now, idFactory, code: "INVALID_PAYLOAD" });
    return { tags, tagIds: [tag.id] };
  }
  if (Array.isArray(item.tags)) {
    const tagIds = item.tags.map((name) => findOrCreateTag(tags, { name }, { now, idFactory, code: "INVALID_PAYLOAD" }).id);
    return { tags, tagIds: [...new Set(tagIds)] };
  }
  return { tags, tagIds: existing?.tagIds || [] };
}

export function upsertTag(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.tags.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw perchError("PERCH_ITEM_NOT_FOUND", `标签 ${item.id} 不存在。`);
  const normalized = normalizeTagItem(item, { now, idFactory, existing });
  const duplicate = state.tags.find((candidate) => candidate.id !== normalized.id && comparableTagName(candidate.name) === comparableTagName(normalized.name));
  if (duplicate) throw perchError("PERCH_TAG_ALREADY_EXISTS", `标签名称已经由 ${duplicate.id} 使用。`);
  const tags = existing ? state.tags.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.tags];
  return { state: committed(state, { tags }, now), item: normalized };
}

export const upsertGroup = upsertTag;

export function deleteTag(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.tags.some((item) => item.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `标签 ${id} 不存在。`);
  const inUse = [...state.paths, ...state.notes, ...state.projects].some((item) => item.tagIds.includes(id)) || state.savedViews.some((view) => view.tagIds.includes(id));
  if (inUse) throw perchError("PERCH_TAG_IN_USE", `标签 ${id} 仍被记录或保存视图引用。`);
  return { state: committed(state, { tags: state.tags.filter((item) => item.id !== id) }, now), deletedId: id };
}

export const deleteGroup = deleteTag;

export function upsertPath(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.paths.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw perchError("PERCH_ITEM_NOT_FOUND", `路径 ${item.id} 不存在。`);
  const selection = resolveTagSelection(state, item, existing, { now, idFactory });
  const normalized = normalizePathItem({ ...item, tagIds: selection.tagIds }, { now, idFactory, existing });
  const duplicate = state.paths.find((candidate) => candidate.id !== normalized.id && comparablePath(candidate.path) === comparablePath(normalized.path));
  if (duplicate) throw perchError("PERCH_PATH_ALREADY_EXISTS", `路径已经由 ${duplicate.name} 收录。`);
  const paths = existing ? state.paths.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.paths];
  return { state: committed(state, { tags: selection.tags, paths }, now), item: normalized };
}

export function repairPath(state, { id, path: nextPath, expectedRevision, inspection = null }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = state.paths.find((item) => item.id === id);
  if (!existing) throw perchError("PERCH_ITEM_NOT_FOUND", `路径 ${id} 不存在。`);
  const normalizedPath = absolutePath(nextPath, "path.path");
  const duplicate = state.paths.find((candidate) => candidate.id !== id && comparablePath(candidate.path) === comparablePath(normalizedPath));
  if (duplicate) throw perchError("PERCH_PATH_ALREADY_EXISTS", `路径已经由 ${duplicate.name} 收录。`);
  const item = { ...existing, path: normalizedPath, inspection: normalizeInspection(inspection), updatedAt: now };
  const paths = state.paths.map((candidate) => candidate.id === id ? item : candidate);
  return { state: committed(state, { paths }, now), item };
}

export function setEntryInspection(state, { kind, id, inspection, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!["path", "project"].includes(kind)) throw perchError("INVALID_PAYLOAD", "inspection.kind 只允许 path 或 project。");
  const collectionName = kind === "path" ? "paths" : "projects";
  const existing = state[collectionName].find((item) => item.id === id);
  if (!existing) throw perchError("PERCH_ITEM_NOT_FOUND", `${kind} ${id} 不存在。`);
  const item = { ...existing, inspection: normalizeInspection(inspection), updatedAt: now };
  const collection = state[collectionName].map((candidate) => candidate.id === id ? item : candidate);
  return { state: committed(state, { [collectionName]: collection }, now), item };
}

export function refreshAllPathInspections(state, { expectedRevision, inspections }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!Array.isArray(inspections)) throw perchError("INVALID_PAYLOAD", "inspections 必须是数组。");
  const byId = new Map();
  for (const entry of inspections) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
      throw perchError("INVALID_PAYLOAD", "inspections[].id 不合法。");
    }
    byId.set(entry.id, normalizeInspection(entry.inspection));
  }
  if (byId.size !== state.paths.length || state.paths.some((item) => !byId.has(item.id))) {
    throw perchError("INVALID_PAYLOAD", "全量刷新必须覆盖当前全部路径条目。");
  }
  const paths = state.paths.map((item) => ({
    ...item,
    inspection: byId.get(item.id),
    updatedAt: now,
  }));
  const items = paths.map((item) => ({ id: item.id, inspection: item.inspection }));
  return { state: committed(state, { paths }, now), items };
}

export function planPathCandidates(state, inspections) {
  const seen = new Map();
  return inspections.map((inspection, index) => {
    const { path: inspectedPath, ...inspectionMetadata } = inspection;
    let normalizedPath = null;
    try {
      normalizedPath = comparablePath(inspectedPath);
    } catch {
      // Invalid paths stay visible in the preflight result without comparison.
    }
    const existingPath = normalizedPath ? state.paths.find((item) => comparablePath(item.path) === normalizedPath) : undefined;
    const existingProject = normalizedPath ? state.projects.find((item) => comparablePath(item.path) === normalizedPath) : undefined;
    const duplicateOf = normalizedPath && seen.has(normalizedPath) ? seen.get(normalizedPath) : null;
    if (normalizedPath && !seen.has(normalizedPath)) seen.set(normalizedPath, index);
    return {
      index,
      path: inspectedPath,
      inspection: normalizeInspection(inspectionMetadata),
      existing: existingPath
        ? { kind: "path", id: existingPath.id, name: existingPath.name, path: existingPath.path }
        : existingProject
          ? { kind: "project", id: existingProject.id, name: existingProject.name, path: existingProject.path }
          : null,
      duplicateOf,
      suggestedTarget: inspection.status === "available" && inspection.kind === "directory" && (inspection.gitRoot || inspection.projectType) ? "project" : "path"
    };
  });
}

export function batchUpsertEntries(state, { items, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw perchError("INVALID_PAYLOAD", "batch.items 必须是 1 到 50 项的数组。");
  let candidate = clone(state);
  const accepted = [];
  for (const source of items) {
    if (!source || !["path", "project"].includes(source.target)) throw perchError("INVALID_PAYLOAD", "batch item.target 只允许 path 或 project。");
    const existingOther = source.target === "path"
      ? candidate.projects.find((item) => comparablePath(item.path) === comparablePath(source.item?.path))
      : candidate.paths.find((item) => comparablePath(item.path) === comparablePath(source.item?.path));
    if (existingOther) throw perchError("PERCH_PATH_ALREADY_EXISTS", `路径已经由 ${existingOther.name} 收录。`);
    const { inspection: _ignoredInspection, ...itemInput } = source.item || {};
    const result = source.target === "path"
      ? upsertPath(candidate, { item: itemInput, expectedRevision: candidate.aggregateRevision }, { now, idFactory })
      : upsertProject(candidate, { item: itemInput, expectedRevision: candidate.aggregateRevision }, { now, idFactory });
    candidate = result.state;
    const inspection = source.inspection === undefined ? null : normalizeInspection(source.inspection);
    const collectionName = source.target === "path" ? "paths" : "projects";
    candidate[collectionName] = candidate[collectionName].map((item) => item.id === result.item.id ? { ...item, inspection } : item);
    accepted.push({ target: source.target, id: result.item.id });
  }
  candidate.aggregateRevision = state.aggregateRevision + 1;
  candidate.updatedAt = now;
  return { state: assertAggregate(candidate), items: accepted };
}

export function deletePath(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.paths.some((item) => item.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `路径 ${id} 不存在。`);
  return { state: committed(state, { paths: state.paths.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function upsertNote(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.notes.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw perchError("PERCH_ITEM_NOT_FOUND", `速记 ${item.id} 不存在。`);
  const selection = resolveTagSelection(state, item, existing, { now, idFactory });
  const normalized = normalizeNoteItem({ ...item, tagIds: selection.tagIds }, { now, idFactory, existing });
  const notes = existing ? state.notes.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.notes];
  return { state: committed(state, { tags: selection.tags, notes }, now), item: normalized };
}

export function deleteNote(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.notes.some((item) => item.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `速记 ${id} 不存在。`);
  return { state: committed(state, { notes: state.notes.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function upsertProject(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.projects.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw perchError("PERCH_ITEM_NOT_FOUND", `项目 ${item.id} 不存在。`);
  const selection = resolveTagSelection(state, item, existing, { now, idFactory });
  const normalized = normalizeProjectItem({ ...item, tagIds: selection.tagIds }, { now, idFactory, existing });
  const duplicate = state.projects.find((candidate) => candidate.id !== normalized.id && comparablePath(candidate.path) === comparablePath(normalized.path));
  if (duplicate) throw perchError("PERCH_PROJECT_ALREADY_EXISTS", `项目路径已经由 ${duplicate.name} 收录。`);
  const projects = existing ? state.projects.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.projects];
  return { state: committed(state, { tags: selection.tags, projects }, now), item: normalized };
}

export function deleteProject(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.projects.some((item) => item.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `项目 ${id} 不存在。`);
  return { state: committed(state, { projects: state.projects.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function recordEntryUsage(state, { kind, id }, { now }) {
  const collections = { path: "paths", note: "notes", project: "projects" };
  const collectionName = collections[kind];
  if (!collectionName) throw perchError("INVALID_PAYLOAD", "usage.kind 只允许 path、note 或 project。");
  const existing = state[collectionName].find((item) => item.id === id);
  if (!existing) throw perchError("PERCH_ITEM_NOT_FOUND", `${kind} ${id} 不存在。`);
  const item = { ...existing, usage: { count: existing.usage.count + 1, lastUsedAt: now } };
  const collection = state[collectionName].map((candidate) => candidate.id === id ? item : candidate);
  return { state: committed(state, { [collectionName]: collection }, now), item };
}

export function upsertSavedView(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.savedViews.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw perchError("PERCH_ITEM_NOT_FOUND", `保存视图 ${item.id} 不存在。`);
  const normalized = normalizeSavedView(item, { now, idFactory, existing });
  for (const id of normalized.tagIds) if (!state.tags.some((tag) => tag.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `标签 ${id} 不存在。`);
  const duplicate = state.savedViews.find((candidate) => candidate.id !== normalized.id && comparableTagName(candidate.name) === comparableTagName(normalized.name));
  if (duplicate) throw perchError("PERCH_VIEW_ALREADY_EXISTS", `保存视图名称已经由 ${duplicate.id} 使用。`);
  const savedViews = existing ? state.savedViews.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.savedViews];
  return { state: committed(state, { savedViews }, now), item: normalized };
}

export function deleteSavedView(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.savedViews.some((item) => item.id === id)) throw perchError("PERCH_ITEM_NOT_FOUND", `保存视图 ${id} 不存在。`);
  return { state: committed(state, { savedViews: state.savedViews.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function snapshotOf(state, include = ["tags", "paths", "notes", "projects", "savedViews"]) {
  const result = {
    schemaVersion: state.schemaVersion,
    aggregateRevision: state.aggregateRevision,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
  include.forEach((name) => {
    if (!STATE_KEYS.includes(name) || ["schemaVersion", "aggregateRevision", "createdAt", "updatedAt"].includes(name)) {
      throw perchError("INVALID_PAYLOAD", `snapshot include 不支持 ${name}。`);
    }
    result[name] = clone(state[name]);
  });
  return result;
}
