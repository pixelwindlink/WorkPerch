import { dashboardError } from "./errors.mjs";
import {
  LIMITS,
  absolutePath,
  assertAllowedKeys,
  assertRequiredKeys,
  booleanValue,
  boundedString,
  comparablePath,
  identifier,
  integerValue,
  projectType,
  projectUrl,
  stringArray,
  timestamp
} from "./value-objects.mjs";

const STATE_KEYS = ["schemaVersion", "aggregateRevision", "paths", "notes", "projects", "createdAt", "updatedAt"];
const PATH_KEYS = ["id", "name", "path", "group", "description", "pinned", "createdAt", "updatedAt"];
const NOTE_KEYS = ["id", "title", "content", "pinned", "createdAt", "updatedAt"];
const PROJECT_KEYS = ["id", "name", "type", "label", "description", "path", "url", "port", "command", "tags", "pinned", "createdAt", "updatedAt"];

function clone(value) {
  return structuredClone(value);
}

function ensureArray(value, name, max, code) {
  if (!Array.isArray(value) || value.length > max) throw dashboardError(code, `${name} 必须是不超过 ${max} 项的数组。`);
  return value;
}

function deepSame(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepSame(item, right[index]));
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key) && deepSame(left[key], right[key]));
  }
  return false;
}

function assertTimeOrder(createdAt, updatedAt, name, code) {
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw dashboardError(code, `${name}.updatedAt 不能早于 createdAt。`);
}

export function normalizePathItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, legacy ? [...PATH_KEYS, "color"] : stored ? PATH_KEYS : PATH_KEYS.slice(0, 6), "path item", code);
  if (stored) assertRequiredKeys(value, PATH_KEYS, "path item", code);
  else assertRequiredKeys(value, ["name", "path"], "path item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "path.createdAt", code) : now);
  return {
    id: identifier(value.id, "path.id", { optional: true, code }) || existing?.id || idFactory("path"),
    name: boundedString(value.name, "path.name", { min: 1, max: 120, trim: true, code }),
    path: absolutePath(value.path, "path.path", code),
    group: boundedString(value.group ?? "未分组", "path.group", { min: 1, max: 80, trim: true, code }),
    description: boundedString(value.description ?? "", "path.description", { max: 500, trim: true, code }),
    pinned: value.pinned === undefined ? false : booleanValue(value.pinned, "path.pinned", code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "path.updatedAt", code) : now
  };
}

export function normalizeNoteItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, legacy ? [...NOTE_KEYS, "color"] : stored ? NOTE_KEYS : NOTE_KEYS.slice(0, 4), "note item", code);
  if (stored) assertRequiredKeys(value, NOTE_KEYS, "note item", code);
  else assertRequiredKeys(value, ["title", "content"], "note item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "note.createdAt", code) : now);
  return {
    id: identifier(value.id, "note.id", { optional: true, code }) || existing?.id || idFactory("note"),
    title: boundedString(value.title, "note.title", { min: 1, max: 120, trim: true, code }),
    content: boundedString(value.content, "note.content", { min: 1, max: 10000, code }),
    pinned: value.pinned === undefined ? false : booleanValue(value.pinned, "note.pinned", code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "note.updatedAt", code) : now
  };
}

export function normalizeProjectItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  const allowed = legacy ? [...PROJECT_KEYS, "run"] : stored ? PROJECT_KEYS : PROJECT_KEYS.slice(0, 11);
  assertAllowedKeys(value, allowed, "project item", code);
  if (stored) assertRequiredKeys(value, PROJECT_KEYS, "project item", code);
  else assertRequiredKeys(value, ["name", "path"], "project item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "project.createdAt", code) : now);
  return {
    id: identifier(value.id, "project.id", { optional: true, code }) || existing?.id || idFactory("project"),
    name: boundedString(value.name, "project.name", { min: 1, max: 120, trim: true, code }),
    type: projectType(value.type ?? "other", code),
    label: boundedString(value.label ?? value.type ?? "Other", "project.label", { min: 1, max: 80, trim: true, code }),
    description: boundedString(value.description ?? "", "project.description", { max: 500, trim: true, code }),
    path: absolutePath(value.path, "project.path", code),
    url: projectUrl(value.url, code),
    port: integerValue(value.port ?? 0, "project.port", { min: 0, max: 65535, code }),
    command: boundedString(value.command ?? value.run ?? "", "project.command", { max: 2000, code }),
    tags: stringArray(value.tags ?? [], "project.tags", { code }),
    pinned: value.pinned === undefined ? false : booleanValue(value.pinned, "project.pinned", code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "project.updatedAt", code) : now
  };
}

function assertUnique(items, keyOf, label, code) {
  const seen = new Set();
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) throw dashboardError(code, `${label} 包含重复值：${key}。`);
    seen.add(key);
  }
}

export function assertAggregate(value) {
  const code = "DASHBOARD_STATE_CORRUPT";
  assertAllowedKeys(value, STATE_KEYS, "dashboard state", code);
  if (value.schemaVersion !== "1.0") throw dashboardError(code, `不支持状态 Schema ${value.schemaVersion}。`);
  integerValue(value.aggregateRevision, "aggregateRevision", { min: 0, code });
  const createdAt = timestamp(value.createdAt, "createdAt", code);
  const updatedAt = timestamp(value.updatedAt, "updatedAt", code);
  assertTimeOrder(createdAt, updatedAt, "dashboard state", code);
  ensureArray(value.paths, "paths", LIMITS.paths, code).forEach((item) => {
    const normalized = normalizePathItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "path item", code);
    if (!deepSame(item, normalized)) throw dashboardError(code, `路径 ${normalized.id} 不是规范化状态。`);
  });
  ensureArray(value.notes, "notes", LIMITS.notes, code).forEach((item) => {
    const normalized = normalizeNoteItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "note item", code);
    if (!deepSame(item, normalized)) throw dashboardError(code, `速记 ${normalized.id} 不是规范化状态。`);
  });
  ensureArray(value.projects, "projects", LIMITS.projects, code).forEach((item) => {
    const normalized = normalizeProjectItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "project item", code);
    if (!deepSame(item, normalized)) throw dashboardError(code, `项目 ${normalized.id} 不是规范化状态。`);
  });
  assertUnique(value.paths, (item) => item.id, "paths.id", code);
  assertUnique(value.paths, (item) => comparablePath(item.path), "paths.path", code);
  assertUnique(value.notes, (item) => item.id, "notes.id", code);
  assertUnique(value.projects, (item) => item.id, "projects.id", code);
  return value;
}

export function createInitialAggregate({ now, projects = [], idFactory }) {
  const aggregate = {
    schemaVersion: "1.0",
    aggregateRevision: 0,
    paths: [],
    notes: [],
    projects: projects.map((item) => normalizeProjectItem(item, { now, idFactory, legacy: true, code: "DASHBOARD_STATE_CORRUPT" })),
    createdAt: now,
    updatedAt: now
  };
  return assertAggregate(aggregate);
}

export function assertExpectedRevision(state, expectedRevision) {
  if (state.aggregateRevision !== expectedRevision) {
    throw dashboardError("DASHBOARD_REVISION_CONFLICT", `期望 revision ${expectedRevision}，当前为 ${state.aggregateRevision}。`);
  }
}

function committed(state, collection, items, now) {
  const next = clone(state);
  next[collection] = items;
  next.aggregateRevision += 1;
  next.updatedAt = now;
  return assertAggregate(next);
}

export function upsertPath(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.paths.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `路径 ${item.id} 不存在。`);
  const normalized = normalizePathItem(item, { now, idFactory, existing });
  const duplicate = state.paths.find((candidate) => candidate.id !== normalized.id && comparablePath(candidate.path) === comparablePath(normalized.path));
  if (duplicate) throw dashboardError("DASHBOARD_PATH_ALREADY_EXISTS", `路径已经由 ${duplicate.name} 收录。`);
  const items = existing ? state.paths.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.paths];
  return { state: committed(state, "paths", items, now), item: normalized };
}

export function deletePath(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.paths.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `路径 ${id} 不存在。`);
  return { state: committed(state, "paths", state.paths.filter((item) => item.id !== id), now), deletedId: id };
}

export function upsertNote(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.notes.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `速记 ${item.id} 不存在。`);
  const normalized = normalizeNoteItem(item, { now, idFactory, existing });
  const items = existing ? state.notes.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.notes];
  return { state: committed(state, "notes", items, now), item: normalized };
}

export function deleteNote(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.notes.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `速记 ${id} 不存在。`);
  return { state: committed(state, "notes", state.notes.filter((item) => item.id !== id), now), deletedId: id };
}

export function upsertProject(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.projects.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `项目 ${item.id} 不存在。`);
  const normalized = normalizeProjectItem(item, { now, idFactory, existing });
  const items = existing ? state.projects.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.projects];
  return { state: committed(state, "projects", items, now), item: normalized };
}

export function deleteProject(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.projects.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `项目 ${id} 不存在。`);
  return { state: committed(state, "projects", state.projects.filter((item) => item.id !== id), now), deletedId: id };
}

export function snapshotOf(state, include = ["paths", "notes", "projects"]) {
  const result = {
    schemaVersion: state.schemaVersion,
    aggregateRevision: state.aggregateRevision,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
  include.forEach((name) => { result[name] = clone(state[name]); });
  return result;
}
