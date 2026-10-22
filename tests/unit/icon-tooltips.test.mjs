import test from "node:test";
import assert from "node:assert/strict";
import { ICON_TOOLTIP_DELAY_MS, resolveIconTooltipLabel } from "../../ui/icon-tooltips.js";

test("icon tooltip delay is 300ms", () => {
  assert.equal(ICON_TOOLTIP_DELAY_MS, 300);
});

test("resolveIconTooltipLabel prefers data-tooltip then aria-label", () => {
  assert.equal(
    resolveIconTooltipLabel({
      dataset: { tooltip: "自定义" },
      getAttribute: () => null,
    }),
    "自定义",
  );
  assert.equal(
    resolveIconTooltipLabel({
      dataset: {},
      getAttribute: (name) => (name === "aria-label" ? "全局置顶" : null),
    }),
    "全局置顶",
  );
  assert.equal(
    resolveIconTooltipLabel({
      dataset: { label: "复制" },
      getAttribute: () => null,
    }),
    "复制",
  );
});
