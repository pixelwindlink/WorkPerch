import { dashboardError } from "./errors.mjs";
import {
  LIMITS,
  absolutePath,
  assertAllowedKeys,
  assertRequiredKeys,
  booleanValue,
  boundedString,
  comparableGroupName,
  comparablePath,
  groupColor,
  identifier,
  isGroupColor,
  integerValue,
  projectType,
  projectUrl,
  stringArray,
  timestamp
} from "./value-objects.mjs";

const STATE_KEYS = ["schemaVersion", "aggregateRevision", "groups", "paths", "notes", "projects", "createdAt", "updatedAt"];
const GROUP_KEYS = ["id", "name", "color", "createdAt", "updatedAt"];
const GROUP_INPUT_KEYS = ["id", "name", "color"];
const PATH_KEYS = ["id", "name", "path", "groupId", "group", "groupColor", "description", "pinned", "createdAt", "updatedAt"];
const PATH_INPUT_KEYS = ["id", "name", "path", "groupId", "group", "groupColor", "description", "pinned"];
const PATH_REQUIRED_KEYS = ["id", "name", "path", "group", "description", "pinned", "createdAt", "updatedAt"];
const NOTE_KEYS = ["id", "title", "content", "pinned", "createdAt", "updatedAt"];
const PROJECT_KEYS = ["id", "name", "type", "label", "description", "path", "url", "port", "command", "tags", "pinned", "createdAt", "updatedAt"];
const DEFAULT_GROUP_COLORS = ["#FF4D6D", "#FF8A00", "#FFD60A", "#22C55E", "#2DD4BF", "#38BDF8", "#6366F1", "#A855F7", "#EC4899", "#F97316"];

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

export function defaultGroupColor(name = "未分组") {
  let hash = 0;
  for (const character of String(name || "未分组")) hash = ((hash * 31) + character.codePointAt(0)) >>> 0;
  return DEFAULT_GROUP_COLORS[hash % DEFAULT_GROUP_COLORS.length];
}

export function normalizeGroupItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", stored = false } = {}) {
  assertAllowedKeys(value, stored ? GROUP_KEYS : GROUP_INPUT_KEYS, "group item", code);
  if (stored) assertRequiredKeys(value, GROUP_KEYS, "group item", code);
  else assertRequiredKeys(value, ["name", "color"], "group item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "group.createdAt", code) : now);
  return {
    id: identifier(value.id, "group.id", { optional: true, code }) || existing?.id || idFactory("group"),
    name: boundedString(value.name, "group.name", { min: 1, max: 80, trim: true, code }),
    color: groupColor(value.color, code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "group.updatedAt", code) : now
  };
}

export function normalizePathItem(value, { now, idFactory, existing, code = "INVALID_PAYLOAD", legacy = false, stored = false } = {}) {
  assertAllowedKeys(value, legacy ? [...PATH_KEYS, "color"] : stored ? PATH_KEYS : PATH_INPUT_KEYS, "path item", code);
  if (stored) assertRequiredKeys(value, PATH_REQUIRED_KEYS, "path item", code);
  else assertRequiredKeys(value, ["name", "path"], "path item", code);
  const createdAt = existing?.createdAt || (value.createdAt ? timestamp(value.createdAt, "path.createdAt", code) : now);
  let selectedColor = value.groupColor ?? existing?.groupColor;
  if (selectedColor === undefined && legacy && isGroupColor(value.color)) selectedColor = value.color;
  const selectedGroupId = value.groupId ?? existing?.groupId;
  const result = {
    id: identifier(value.id, "path.id", { optional: true, code }) || existing?.id || idFactory("path"),
    name: boundedString(value.name, "path.name", { min: 1, max: 120, trim: true, code }),
    path: absolutePath(value.path, "path.path", code),
    group: boundedString(value.group ?? existing?.group ?? "未分组", "path.group", { min: 1, max: 80, trim: true, code }),
    description: boundedString(value.description ?? "", "path.description", { max: 500, trim: true, code }),
    pinned: value.pinned === undefined ? false : booleanValue(value.pinned, "path.pinned", code),
    createdAt,
    updatedAt: value.updatedAt ? timestamp(value.updatedAt, "path.updatedAt", code) : now
  };
  if (selectedGroupId !== undefined && selectedGroupId !== "") result.groupId = identifier(selectedGroupId, "path.groupId", { code });
  if (selectedColor !== undefined && selectedColor !== "") result.groupColor = groupColor(selectedColor, code);
  return result;
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

  const groups = value.groups === undefined ? null : ensureArray(value.groups, "groups", LIMITS.groups, code);
  groups?.forEach((item) => {
    const normalized = normalizeGroupItem(item, { now: item.updatedAt, idFactory: () => item.id, code, stored: true });
    assertTimeOrder(normalized.createdAt, normalized.updatedAt, "group item", code);
    if (!deepSame(item, normalized)) throw dashboardError(code, `分组 ${normalized.id} 不是规范化状态。`);
  });
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

  if (groups) {
    const groupById = new Map(groups.map((item) => [item.id, item]));
    for (const item of value.paths) {
      if (!item.groupId) throw dashboardError(code, `路径 ${item.id} 缺少 groupId。`);
      if (item.groupColor !== undefined) throw dashboardError(code, `路径 ${item.id} 仍包含逐条 groupColor。`);
      const group = groupById.get(item.groupId);
      if (!group) throw dashboardError(code, `路径 ${item.id} 引用了不存在的分组 ${item.groupId}。`);
      if (item.group !== group.name) throw dashboardError(code, `路径 ${item.id} 的兼容 group 名称未与 Registry 同步。`);
    }
    assertUnique(groups, (item) => item.id, "groups.id", code);
    assertUnique(groups, (item) => comparableGroupName(item.name), "groups.name", code);
  }
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
    groups: [],
    paths: [],
    notes: [],
    projects: projects.map((item) => normalizeProjectItem(item, { now, idFactory, legacy: true, code: "DASHBOARD_STATE_CORRUPT" })),
    createdAt: now,
    updatedAt: now
  };
  return assertAggregate(aggregate);
}

export function materializeGroupRegistry(state, { now, idFactory, incrementRevision = true }) {
  const groups = Array.isArray(state.groups) ? clone(state.groups) : [];
  let changed = !Array.isArray(state.groups);
  const paths = state.paths.map((source) => {
    let group = source.groupId ? groups.find((candidate) => candidate.id === source.groupId) : undefined;
    if (!group) {
      group = groups.find((candidate) => comparableGroupName(candidate.name) === comparableGroupName(source.group));
    }
    if (!group) {
      const legacyColor = state.paths.find((candidate) => (
        comparableGroupName(candidate.group || "未分组") === comparableGroupName(source.group || "未分组")
        && isGroupColor(candidate.groupColor)
      ))?.groupColor;
      group = normalizeGroupItem({
        name: source.group || "未分组",
        color: legacyColor || defaultGroupColor(source.group)
      }, { now, idFactory, code: "DASHBOARD_STATE_CORRUPT" });
      groups.push(group);
      changed = true;
    }
    const next = clone(source);
    if (next.groupId !== group.id || next.group !== group.name || next.groupColor !== undefined) {
      next.groupId = group.id;
      next.group = group.name;
      delete next.groupColor;
      next.updatedAt = now;
      changed = true;
    }
    return next;
  });
  if (!changed) return { state, changed: false };
  const next = { ...clone(state), groups, paths, updatedAt: now };
  if (incrementRevision) next.aggregateRevision += 1;
  return { state: assertAggregate(next), changed: true };
}

export function assertExpectedRevision(state, expectedRevision) {
  if (state.aggregateRevision !== expectedRevision) {
    throw dashboardError("DASHBOARD_REVISION_CONFLICT", `期望 revision ${expectedRevision}，当前为 ${state.aggregateRevision}。`);
  }
}

function committed(state, changes, now) {
  const next = { ...clone(state), ...changes };
  next.aggregateRevision += 1;
  next.updatedAt = now;
  return assertAggregate(next);
}

function resolvePathGroup(state, item, { now, idFactory }) {
  const groups = clone(state.groups || []);
  let group;
  if (item.groupId) {
    group = groups.find((candidate) => candidate.id === item.groupId);
    if (!group) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `分组 ${item.groupId} 不存在。`);
  } else {
    const requestedName = boundedString(item.group ?? "未分组", "path.group", { min: 1, max: 80, trim: true });
    group = groups.find((candidate) => comparableGroupName(candidate.name) === comparableGroupName(requestedName));
    if (!group) {
      group = normalizeGroupItem({ name: requestedName, color: item.groupColor || defaultGroupColor(requestedName) }, { now, idFactory });
      groups.unshift(group);
    }
  }
  if (item.groupColor && groupColor(item.groupColor) !== group.color) {
    group = normalizeGroupItem({ id: group.id, name: group.name, color: item.groupColor }, { now, idFactory, existing: group });
    const index = groups.findIndex((candidate) => candidate.id === group.id);
    groups[index] = group;
  }
  return { group, groups };
}

export function upsertGroup(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.groups.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `分组 ${item.id} 不存在。`);
  const normalized = normalizeGroupItem(item, { now, idFactory, existing });
  const duplicate = state.groups.find((candidate) => candidate.id !== normalized.id && comparableGroupName(candidate.name) === comparableGroupName(normalized.name));
  if (duplicate) throw dashboardError("DASHBOARD_GROUP_ALREADY_EXISTS", `分组名称已经由 ${duplicate.id} 使用。`);
  const groups = existing ? state.groups.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.groups];
  const renamed = existing && existing.name !== normalized.name;
  const paths = renamed
    ? state.paths.map((path) => path.groupId === normalized.id ? { ...path, group: normalized.name, updatedAt: now } : path)
    : state.paths;
  return { state: committed(state, { groups, paths }, now), item: normalized };
}

export function deleteGroup(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  const group = state.groups.find((item) => item.id === id);
  if (!group) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `分组 ${id} 不存在。`);
  if (state.paths.some((item) => item.groupId === id || comparableGroupName(item.group) === comparableGroupName(group.name))) {
    throw dashboardError("DASHBOARD_GROUP_IN_USE", `分组 ${group.name} 仍被路径引用。`);
  }
  return { state: committed(state, { groups: state.groups.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function upsertPath(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.paths.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `路径 ${item.id} 不存在。`);
  const { group, groups } = resolvePathGroup(state, item, { now, idFactory });
  const normalized = normalizePathItem({ ...item, groupId: group.id, group: group.name }, { now, idFactory, existing });
  delete normalized.groupColor;
  const duplicate = state.paths.find((candidate) => candidate.id !== normalized.id && comparablePath(candidate.path) === comparablePath(normalized.path));
  if (duplicate) throw dashboardError("DASHBOARD_PATH_ALREADY_EXISTS", `路径已经由 ${duplicate.name} 收录。`);
  const paths = existing ? state.paths.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.paths];
  return { state: committed(state, { groups, paths }, now), item: normalized, group };
}

export function deletePath(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.paths.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `路径 ${id} 不存在。`);
  return { state: committed(state, { paths: state.paths.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function upsertNote(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.notes.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `速记 ${item.id} 不存在。`);
  const normalized = normalizeNoteItem(item, { now, idFactory, existing });
  const items = existing ? state.notes.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.notes];
  return { state: committed(state, { notes: items }, now), item: normalized };
}

export function deleteNote(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.notes.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `速记 ${id} 不存在。`);
  return { state: committed(state, { notes: state.notes.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function upsertProject(state, { item, expectedRevision }, { now, idFactory }) {
  assertExpectedRevision(state, expectedRevision);
  const existing = item.id ? state.projects.find((candidate) => candidate.id === item.id) : undefined;
  if (item.id && !existing) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `项目 ${item.id} 不存在。`);
  const normalized = normalizeProjectItem(item, { now, idFactory, existing });
  const items = existing ? state.projects.map((candidate) => candidate.id === normalized.id ? normalized : candidate) : [normalized, ...state.projects];
  return { state: committed(state, { projects: items }, now), item: normalized };
}

export function deleteProject(state, { id, expectedRevision }, { now }) {
  assertExpectedRevision(state, expectedRevision);
  if (!state.projects.some((item) => item.id === id)) throw dashboardError("DASHBOARD_ITEM_NOT_FOUND", `项目 ${id} 不存在。`);
  return { state: committed(state, { projects: state.projects.filter((item) => item.id !== id) }, now), deletedId: id };
}

export function snapshotOf(state, include = ["groups", "paths", "notes", "projects"]) {
  const result = {
    schemaVersion: state.schemaVersion,
    aggregateRevision: state.aggregateRevision,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt
  };
  include.forEach((name) => { result[name] = clone(state[name]); });
  return result;
}
