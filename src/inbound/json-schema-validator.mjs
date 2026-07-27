const SUPPORTED_KEYWORDS = new Set([
  "$schema",
  "$id",
  "title",
  "description",
  "type",
  "const",
  "enum",
  "oneOf",
  "anyOf",
  "allOf",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "minLength",
  "maxLength",
  "pattern",
  "minimum",
  "maximum",
  "minItems",
  "maxItems",
  "uniqueItems"
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isObject(left) && isObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
  }
  return false;
}

function childPath(base, name) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? `${base}.${name}` : `${base}[${JSON.stringify(name)}]`;
}

function typeMatches(type, value) {
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  return false;
}

export function assertSupportedSchema(schema, path = "$") {
  if (schema === true || schema === false) return;
  if (!isObject(schema)) throw new Error(`${path} must be a JSON Schema object or boolean.`);
  for (const key of Object.keys(schema)) {
    if (!SUPPORTED_KEYWORDS.has(key)) throw new Error(`${path} uses unsupported JSON Schema keyword ${key}.`);
  }
  if (schema.properties !== undefined) {
    if (!isObject(schema.properties)) throw new Error(`${path}.properties must be an object.`);
    for (const [name, child] of Object.entries(schema.properties)) assertSupportedSchema(child, `${path}.properties.${name}`);
  }
  if (isObject(schema.additionalProperties)) assertSupportedSchema(schema.additionalProperties, `${path}.additionalProperties`);
  if (schema.items !== undefined) assertSupportedSchema(schema.items, `${path}.items`);
  for (const keyword of ["oneOf", "anyOf", "allOf"]) {
    if (schema[keyword] !== undefined) {
      if (!Array.isArray(schema[keyword]) || schema[keyword].length === 0) throw new Error(`${path}.${keyword} must be a non-empty array.`);
      schema[keyword].forEach((child, index) => assertSupportedSchema(child, `${path}.${keyword}[${index}]`));
    }
  }
}

export function validateJsonSchema(schema, value, path = "$") {
  if (schema === true) return [];
  if (schema === false) return [{ path, message: "Value is forbidden by the Schema." }];
  const errors = [];

  if (schema.oneOf) {
    const results = schema.oneOf.map((branch) => validateJsonSchema(branch, value, path));
    const passing = results.filter((result) => result.length === 0).length;
    if (passing !== 1) return [{ path, message: `Expected exactly one oneOf branch to match; matched ${passing}.` }];
  }
  if (schema.anyOf && !schema.anyOf.some((branch) => validateJsonSchema(branch, value, path).length === 0)) {
    return [{ path, message: "Expected at least one anyOf branch to match." }];
  }
  if (schema.allOf) schema.allOf.forEach((branch) => errors.push(...validateJsonSchema(branch, value, path)));

  if (schema.const !== undefined && !deepEqual(value, schema.const)) errors.push({ path, message: `Expected constant ${JSON.stringify(schema.const)}.` });
  if (schema.enum && !schema.enum.some((candidate) => deepEqual(value, candidate))) errors.push({ path, message: `Expected one of ${JSON.stringify(schema.enum)}.` });

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => typeMatches(type, value))) {
      errors.push({ path, message: `Expected type ${types.join("|")}.` });
      return errors;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: `String is shorter than ${schema.minLength}.` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push({ path, message: `String is longer than ${schema.maxLength}.` });
    if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) errors.push({ path, message: `String does not match ${schema.pattern}.` });
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: `Number is below ${schema.minimum}.` });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: `Number is above ${schema.maximum}.` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `Array has fewer than ${schema.minItems} items.` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `Array has more than ${schema.maxItems} items.` });
    if (schema.uniqueItems) {
      value.forEach((item, index) => {
        if (value.slice(0, index).some((candidate) => deepEqual(candidate, item))) errors.push({ path: `${path}[${index}]`, message: "Array item is not unique." });
      });
    }
    if (schema.items !== undefined) value.forEach((item, index) => errors.push(...validateJsonSchema(schema.items, item, `${path}[${index}]`)));
  }

  if (isObject(value)) {
    for (const name of schema.required || []) {
      if (!Object.hasOwn(value, name)) errors.push({ path: childPath(path, name), message: "Required property is missing." });
    }
    const properties = schema.properties || {};
    for (const [name, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, name)) errors.push(...validateJsonSchema(childSchema, value[name], childPath(path, name)));
    }
    const unknown = Object.keys(value).filter((name) => !Object.hasOwn(properties, name));
    if (schema.additionalProperties === false) unknown.forEach((name) => errors.push({ path: childPath(path, name), message: "Additional property is not allowed." }));
    else if (isObject(schema.additionalProperties)) unknown.forEach((name) => errors.push(...validateJsonSchema(schema.additionalProperties, value[name], childPath(path, name))));
  }

  return errors;
}

export function assertValid(schema, value, label = "value") {
  const errors = validateJsonSchema(schema, value);
  if (!errors.length) return;
  const detail = errors.slice(0, 8).map((error) => `${error.path}: ${error.message}`).join("; ");
  throw Object.assign(new Error(`${label} is invalid: ${detail}`), { validationErrors: errors });
}
