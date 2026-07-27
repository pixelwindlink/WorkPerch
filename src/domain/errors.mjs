export class DashboardError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "DashboardError";
    this.code = code;
  }
}

export function dashboardError(code, message, options) {
  return new DashboardError(code, message, options);
}

export function isDashboardError(error) {
  return error instanceof DashboardError && typeof error.code === "string";
}
