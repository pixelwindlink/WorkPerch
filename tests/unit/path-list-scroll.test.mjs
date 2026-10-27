import test from "node:test";
import assert from "node:assert/strict";
import { bindPathListWheelScroll } from "../../ui/path-list-scroll.js";

test("bindPathListWheelScroll applies wheel delta to scroll container", () => {
  const root = {
    dataset: {},
    scrollHeight: 400,
    clientHeight: 200,
    scrollTop: 50,
    contains: () => true,
    addEventListener(type, handler, options) {
      assert.equal(type, "wheel");
      assert.equal(options.passive, false);
      const event = { target: {}, deltaY: 24, preventDefault() { this.defaultPrevented = true; } };
      handler(event);
      assert.equal(root.scrollTop, 74);
      assert.equal(event.defaultPrevented, true);
    },
  };
  bindPathListWheelScroll(root);
  assert.equal(root.dataset.wheelBound, "1");
});
