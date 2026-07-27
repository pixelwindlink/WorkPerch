import { ClockPort } from "../application/ports/clock.mjs";

export class SystemClock extends ClockPort {
  now() {
    return new Date().toISOString();
  }
}
