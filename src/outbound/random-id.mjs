import { randomUUID } from "node:crypto";
import { IdGeneratorPort } from "../application/ports/id-generator.mjs";

export class RandomIdGenerator extends IdGeneratorPort {
  next(prefix = "item") {
    return `${prefix}-${randomUUID()}`;
  }
}
