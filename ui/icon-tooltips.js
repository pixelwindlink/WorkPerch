export const ICON_TOOLTIP_DELAY_MS = 300;

const SELECTOR = ".icon-button:not(.dialog-close), .add-icon-button";

export function resolveIconTooltipLabel(element) {
  if (!element) return "";
  const fromData = element.dataset.tooltip?.trim();
  if (fromData) return fromData;
  const fromAria = element.getAttribute("aria-label")?.trim();
  if (fromAria) return fromAria;
  const fromTitle = element.getAttribute("title")?.trim();
  if (fromTitle) return fromTitle;
  const fromLabel = element.dataset.label?.trim();
  if (fromLabel) return fromLabel;
  return "";
}

function createTooltipElement() {
  const tip = document.createElement("div");
  tip.id = "iconTooltip";
  tip.className = "icon-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.append(tip);
  return tip;
}

export function bindIconTooltips({ delayMs = ICON_TOOLTIP_DELAY_MS } = {}) {
  if (typeof document === "undefined") return;
  const tip = document.querySelector("#iconTooltip") || createTooltipElement();
  let hoverTarget = null;
  let showTimer = null;
  let visibleTarget = null;

  const cancelShow = () => {
    if (showTimer) clearTimeout(showTimer);
    showTimer = null;
  };

  const hide = () => {
    cancelShow();
    tip.classList.remove("is-visible");
    tip.hidden = true;
    tip.textContent = "";
    visibleTarget = null;
  };

  const position = (anchor) => {
    const rect = anchor.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    let top = rect.bottom + 6;
    if (top + tipRect.height > window.innerHeight - 8) top = rect.top - tipRect.height - 6;
    let left = rect.left + rect.width / 2;
    const half = tipRect.width / 2;
    left = Math.min(Math.max(left, half + 8), window.innerWidth - half - 8);
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  };

  const show = (anchor) => {
    const label = resolveIconTooltipLabel(anchor);
    if (!label) {
      hide();
      return;
    }
    tip.textContent = label;
    tip.hidden = false;
    position(anchor);
    tip.classList.add("is-visible");
    visibleTarget = anchor;
  };

  const scheduleShow = (anchor) => {
    if (anchor === hoverTarget && showTimer) return;
    cancelShow();
    hoverTarget = anchor;
    showTimer = setTimeout(() => {
      if (hoverTarget === anchor) show(anchor);
    }, delayMs);
  };

  document.addEventListener(
    "mouseover",
    (event) => {
      const anchor = event.target.closest?.(SELECTOR);
      if (!anchor) return;
      if (anchor.disabled || anchor.getAttribute("aria-disabled") === "true") return;
      scheduleShow(anchor);
    },
    true,
  );

  document.addEventListener(
    "mouseout",
    (event) => {
      const anchor = event.target.closest?.(SELECTOR);
      if (!anchor || anchor !== hoverTarget) return;
      const next = event.relatedTarget;
      if (next && anchor.contains(next)) return;
      hoverTarget = null;
      cancelShow();
      if (visibleTarget === anchor) hide();
    },
    true,
  );

  document.addEventListener("mousedown", hide, true);
  window.addEventListener(
    "scroll",
    () => {
      if (visibleTarget) hide();
      hoverTarget = null;
      cancelShow();
    },
    { capture: true, passive: true },
  );

  document.querySelectorAll(SELECTOR).forEach((button) => {
    if (button.hasAttribute("title")) button.removeAttribute("title");
  });

  if (typeof MutationObserver === "function") {
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== "childList") continue;
        record.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const buttons = node.matches?.(SELECTOR) ? [node] : [...node.querySelectorAll?.(SELECTOR) || []];
          buttons.forEach((button) => {
            if (button.hasAttribute("title")) button.removeAttribute("title");
          });
        });
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
}
