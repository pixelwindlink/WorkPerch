import { isDashboardError } from "../domain/errors.mjs";
import { projectEngineDescribePayload } from "../../../../common_components/engine-provider-spi/src/index.mjs";
import { validateJsonSchema } from "./json-schema-validator.mjs";

const PROTOCOL = "generic-engines/engine-message";
const VERSION = "1.0";
const ENGINE_ID = "dashboard";
const ACTION_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const ENGINE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function safeFields(request = {}) {
  request ||= {};
  return {
    id: typeof request.id === "string" && request.id.length > 0 && request.id.length <= 128 ? request.id : "dashboard-invalid-request",
    engine: typeof request.engine === "string" && request.engine.length <= 64 && ENGINE_PATTERN.test(request.engine) ? request.engine : ENGINE_ID,
    action: typeof request.action === "string" && request.action.length <= 128 && ACTION_PATTERN.test(request.action) ? request.action : "engine.describe"
  };
}

function successResponse(request, payload) {
  return {
    protocol: PROTOCOL,
    version: VERSION,
    kind: "response",
    id: request.id,
    engine: request.engine,
    action: request.action,
    status: "ok",
    payload
  };
}

function errorResponse(request, code, message) {
  const fields = safeFields(request);
  return {
    protocol: PROTOCOL,
    version: VERSION,
    kind: "response",
    ...fields,
    status: "error",
    error: { code, message: String(message || code).slice(0, 4000) }
  };
}

export class DashboardDispatcher {
  constructor({ contracts, application, lifecycle }) {
    this.contracts = contracts;
    this.application = application;
    this.lifecycle = lifecycle;
    this.handlers = application.handlers();
    this.handlers.set("engine.describe", async () => projectEngineDescribePayload(contracts.manifest, contracts.catalog));
    this.handlers.set("system.health", async () => lifecycle.healthPayload());
  }

  async dispatch(request) {
    try {
      const envelopeErrors = validateJsonSchema(this.contracts.envelope.schema, request);
      if (envelopeErrors.length || request?.kind !== "request") {
        return errorResponse(request, "INVALID_PAYLOAD", envelopeErrors[0]?.message || "只接受 EngineMessage request。");
      }
      if (request.engine !== ENGINE_ID) return errorResponse(request, "WRONG_ENGINE", `请求目标 ${request.engine} 不是 dashboard。`);
      if (!this.lifecycle.canDispatch() && request.action !== "system.health" && request.action !== "engine.describe") {
        return errorResponse(request, "ENGINE_NOT_READY", "Dashboard Engine 当前不可接收业务请求。");
      }
      const contract = this.contracts.actions.get(request.action);
      const handler = this.handlers.get(request.action);
      if (!contract || !handler) return errorResponse(request, "UNSUPPORTED_ACTION", `不支持 Action：${request.action}`);
      const requestErrors = validateJsonSchema(contract.request.schema, request.payload);
      if (requestErrors.length) return errorResponse(request, "INVALID_PAYLOAD", `${requestErrors[0].path}: ${requestErrors[0].message}`);
      const payload = await handler(request.payload);
      const successErrors = validateJsonSchema(contract.success.schema, payload);
      if (successErrors.length) throw new Error(`Action success payload contract failed: ${successErrors[0].path} ${successErrors[0].message}`);
      const response = successResponse(request, payload);
      const responseErrors = validateJsonSchema(this.contracts.envelope.schema, response);
      if (responseErrors.length) throw new Error(`Success response envelope failed: ${responseErrors[0].message}`);
      return response;
    } catch (error) {
      const code = isDashboardError(error) ? error.code : "INTERNAL_ERROR";
      return errorResponse(request, code, isDashboardError(error) ? error.message : "Dashboard Engine 内部错误。");
    }
  }
}

export { errorResponse };
