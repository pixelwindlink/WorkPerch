import { perchError } from "./errors.mjs";

export const LIMITS = Object.freeze({
  groups: 500,
  tags: 500,
  paths: 5000,
  notes: 5000,
  projects: 2000,
  savedViews: 200
});

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,95}$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const PROJECT_TYPES = new Set(["engine", "candidate", "tool", "application", "workspace", "archive", "other"]);

function invalid(message, code = "INVALID_PAYLOAD") {
  throw perchError(code, message);
}

export function boundedString(value, name, { min = 0, max, trim = false, code = "INVALID_PAYLOAD" } = {}) {
  if (typeof value !== "string") invalid(`${name} 必须是字符串。`, code);
  const result = trim ? value.trim() : value;
  if (result.length < min) invalid(`${name} 长度不能小于 ${min}。`, code);
  if (max !== undefined && result.length > max) invalid(`${name} 长度不能超过 ${max}。`, code);
  return result;
}

export function identifier(value, name = "id", { optional = false, code = "INVALID_PAYLOAD" } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return undefined;
  const result = boundedString(value, name, { min: 1, max: 96, trim: true, code });
  if (!ID_PATTERN.test(result)) invalid(`${name} 格式不合法。`, code);
  return result;
}

export function absolutePath(value, name = "path", code = "INVALID_PAYLOAD") {
  const result = boundedString(value, name, { min: 1, max: 4096, trim: true, code });
  if (!result.startsWith("/")) invalid(`${name} 必须是绝对路径。`, code);
  return result;
}

export function comparablePath(value) {
  let result = absolutePath(value);
  result = result.replace(/\/{2,}/g, "/");
  if (result.length > 1) result = result.replace(/\/+$/, "");
  return result.normalize("NFC").toLocaleLowerCase("zh-CN");
}

export function comparableGroupName(value) {
  return boundedString(value, "group.name", { min: 1, max: 80, trim: true }).normalize("NFC").toLocaleLowerCase("zh-CN");
}

export function comparableTagName(value) {
  return boundedString(value, "tag.name", { min: 1, max: 80, trim: true }).normalize("NFC").toLocaleLowerCase("zh-CN");
}

export function booleanValue(value, name, code = "INVALID_PAYLOAD") {
  if (typeof value !== "boolean") invalid(`${name} 必须是布尔值。`, code);
  return value;
}

export function integerValue(value, name, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, code = "INVALID_PAYLOAD" } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) invalid(`${name} 必须是 ${min} 到 ${max} 之间的整数。`, code);
  return value;
}

export function timestamp(value, name, code = "PERCH_STATE_CORRUPT") {
  const result = boundedString(value, name, { min: 20, max: 40, code });
  if (Number.isNaN(Date.parse(result))) invalid(`${name} 不是有效时间。`, code);
  return result;
}

export function stringArray(value, name, { maxItems = 30, itemMax = 50, code = "INVALID_PAYLOAD" } = {}) {
  if (!Array.isArray(value) || value.length > maxItems) invalid(`${name} 必须是不超过 ${maxItems} 项的数组。`, code);
  const result = value.map((item, index) => boundedString(item, `${name}[${index}]`, { min: 1, max: itemMax, trim: true, code }));
  if (new Set(result).size !== result.length) invalid(`${name} 不能包含重复项。`, code);
  return result;
}

export function projectType(value, code = "INVALID_PAYLOAD") {
  if (!PROJECT_TYPES.has(value)) invalid("project.type 不受支持。", code);
  return value;
}

export function isGroupColor(value) {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export function groupColor(value, code = "INVALID_PAYLOAD") {
  const result = boundedString(value, "path.groupColor", { min: 7, max: 7, trim: true, code });
  if (!HEX_COLOR_PATTERN.test(result)) invalid("path.groupColor 必须是 #RRGGBB 六位十六进制颜色。", code);
  return result.toUpperCase();
}

export function tagColor(value, code = "INVALID_PAYLOAD") {
  const result = boundedString(value, "tag.color", { min: 7, max: 7, trim: true, code });
  if (!HEX_COLOR_PATTERN.test(result)) invalid("tag.color 必须是 #RRGGBB 六位十六进制颜色。", code);
  return result.toUpperCase();
}

export function projectUrl(value, code = "INVALID_PAYLOAD") {
  const result = boundedString(value ?? "", "project.url", { max: 2048, trim: true, code });
  if (!result) return "";
  let url;
  try {
    url = new URL(result);
  } catch {
    invalid("project.url 必须是有效 URL。", code);
  }
  if (!["http:", "https:"].includes(url.protocol)) invalid("project.url 只允许 http 或 https。", code);
  return result;
}

export function assertAllowedKeys(value, allowed, name, code = "PERCH_IMPORT_INVALID") {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(`${name} 必须是对象。`, code);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) invalid(`${name} 包含未声明字段：${unknown.join(", ")}。`, code);
}

export function assertRequiredKeys(value, required, name, code = "PERCH_IMPORT_INVALID") {
  const missing = required.filter((key) => !Object.hasOwn(value, key));
  if (missing.length) invalid(`${name} 缺少必要字段：${missing.join(", ")}。`, code);
}
