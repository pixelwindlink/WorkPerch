export class PerchError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "PerchError";
    this.code = code;
  }
}

export function perchError(code, message, options) {
  return new PerchError(code, message, options);
}

export function isPerchError(error) {
  return error instanceof PerchError && typeof error.code === "string";
}
