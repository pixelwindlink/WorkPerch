const NARROW_QUERY = "(max-width: 900px)";
const OVERFLOW_PANEL_MARGIN = 8;

function isNarrow() {
  return window.matchMedia(NARROW_QUERY).matches;
}

function activeTab() {
  return document.documentElement.dataset.activeTab || "paths";
}

export function syncHeaderHeight() {
  const header = document.querySelector(".app-header");
  if (!header) return;
  const narrow = document.documentElement.classList.contains("header-is-narrow");
  const floor = narrow ? 0 : 62;
  const next = `${Math.max(header.offsetHeight, floor)}px`;
  if (document.documentElement.style.getPropertyValue("--header-height") !== next) {
    document.documentElement.style.setProperty("--header-height", next);
  }
}

function syncPathViewTools() {
  const sort = document.querySelector("#sortMode");
  const view = document.querySelector("#savedViewSelect");
  const mount = document.querySelector("#pathViewToolsMount");
  const tools = document.querySelector("#headerTools");
  const collapsible = document.querySelector("#headerToolsCollapsible");
  if (!sort || !view || !mount || !tools || !collapsible) return;

  const narrow = isNarrow();
  const onPaths = activeTab() === "paths";
  const useMount = narrow && onPaths;
  const target = useMount ? mount : tools;

  if (sort.parentElement !== target) {
    if (useMount) target.append(sort);
    else tools.insertBefore(sort, collapsible);
  }
  if (view.parentElement !== target) {
    if (useMount) target.append(view);
    else tools.insertBefore(view, collapsible);
  }

  const showMount = narrow && onPaths;
  mount.hidden = !showMount;
  mount.setAttribute("aria-hidden", String(!showMount));
  sort.classList.toggle("header-tools-primary", !narrow);
  view.classList.toggle("header-tools-primary", !narrow);
}

function syncHeaderOverflow() {
  const collapsible = document.querySelector("#headerToolsCollapsible");
  const panel = document.querySelector("#headerOverflowPanel");
  const overflow = document.querySelector("#headerOverflow");
  if (!collapsible || !panel || !overflow) return;
  const narrow = isNarrow();
  const source = narrow ? collapsible : panel;
  const target = narrow ? panel : collapsible;
  while (source.firstChild) target.append(source.firstChild);
  overflow.hidden = !narrow;
  if (!narrow) overflow.open = false;
  document.documentElement.classList.toggle("header-is-narrow", narrow);
  syncPathViewTools();
  syncHeaderHeight();
}

export function computeOverflowPanelPosition(anchor, panel, viewport) {
  const margin = OVERFLOW_PANEL_MARGIN;
  const vw = viewport?.width ?? 0;
  const vh = viewport?.height ?? 0;
  let left = anchor.right - panel.width;
  left = Math.max(margin, Math.min(left, vw - margin - panel.width));
  let top = anchor.bottom + 6;
  if (top + panel.height > vh - margin) top = Math.max(margin, anchor.top - panel.height - 6);
  return { left, top };
}

function resetOverflowPanelPosition(panel) {
  panel.style.position = "";
  panel.style.left = "";
  panel.style.top = "";
  panel.style.right = "";
  panel.style.maxWidth = "";
  panel.classList.remove("is-floating");
}

export function positionHeaderOverflowPanel() {
  const overflow = document.querySelector("#headerOverflow");
  const panel = document.querySelector("#headerOverflowPanel");
  if (!overflow || !panel || overflow.hidden) return;
  if (!overflow.open) {
    resetOverflowPanelPosition(panel);
    return;
  }
  const summary = overflow.querySelector("summary");
  if (!summary) return;
  panel.classList.add("is-floating");
  panel.style.position = "fixed";
  panel.style.right = "auto";
  panel.style.maxWidth = `min(240px, calc(100vw - ${OVERFLOW_PANEL_MARGIN * 2}px))`;
  const anchor = summary.getBoundingClientRect();
  const placed = computeOverflowPanelPosition(anchor, panel.getBoundingClientRect(), {
    width: window.innerWidth,
    height: window.innerHeight,
  });
  panel.style.left = `${placed.left}px`;
  panel.style.top = `${placed.top}px`;
}

export function syncHeaderLayout() {
  syncHeaderOverflow();
  positionHeaderOverflowPanel();
}

export function bindHeaderLayout() {
  const header = document.querySelector(".app-header");
  const tools = document.querySelector("#headerTools");
  if (!header) return;
  syncHeaderLayout();
  const media = window.matchMedia(NARROW_QUERY);
  const onChange = () => syncHeaderLayout();
  if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
  else media.addListener(onChange);
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => syncHeaderLayout());
    observer.observe(header);
    if (tools) observer.observe(tools);
  } else {
    window.addEventListener("resize", onChange);
  }
  if (tools && typeof MutationObserver === "function") {
    new MutationObserver(() => syncHeaderHeight()).observe(tools, {
      attributes: true,
      attributeFilter: ["hidden"],
      subtree: true,
      childList: true,
    });
  }
  const overflow = document.querySelector("#headerOverflow");
  overflow?.addEventListener("toggle", () => {
    requestAnimationFrame(() => positionHeaderOverflowPanel());
  });
  window.addEventListener("resize", () => positionHeaderOverflowPanel());

  document.addEventListener("click", (event) => {
    if (!overflow || overflow.hidden || !overflow.open) return;
    if (!overflow.contains(event.target)) {
      overflow.open = false;
      positionHeaderOverflowPanel();
    }
  });
}
