export function syncHeaderHeight() {
  const header = document.querySelector(".app-header");
  if (!header) return;
  const next = `${Math.max(header.offsetHeight, 62)}px`;
  if (document.documentElement.style.getPropertyValue("--header-height") !== next) {
    document.documentElement.style.setProperty("--header-height", next);
  }
}

function syncHeaderOverflow() {
  const collapsible = document.querySelector("#headerToolsCollapsible");
  const panel = document.querySelector("#headerOverflowPanel");
  const overflow = document.querySelector("#headerOverflow");
  if (!collapsible || !panel || !overflow) return;
  const narrow = window.matchMedia("(max-width: 720px)").matches;
  const source = narrow ? collapsible : panel;
  const target = narrow ? panel : collapsible;
  while (source.firstChild) target.append(source.firstChild);
  overflow.hidden = !narrow;
  if (!narrow) overflow.open = false;
  document.documentElement.classList.toggle("header-is-narrow", narrow);
  syncHeaderHeight();
}

export function bindHeaderLayout() {
  const header = document.querySelector(".app-header");
  const tools = document.querySelector("#headerTools");
  if (!header) return;
  syncHeaderOverflow();
  syncHeaderHeight();
  const media = window.matchMedia("(max-width: 720px)");
  const onChange = () => syncHeaderOverflow();
  if (typeof media.addEventListener === "function") media.addEventListener("change", onChange);
  else media.addListener(onChange);
  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => {
      syncHeaderOverflow();
      syncHeaderHeight();
    });
    observer.observe(header);
    if (tools) observer.observe(tools);
  } else {
    window.addEventListener("resize", () => {
      syncHeaderOverflow();
      syncHeaderHeight();
    });
  }
  if (tools && typeof MutationObserver === "function") {
    new MutationObserver(() => syncHeaderHeight()).observe(tools, {
      attributes: true,
      attributeFilter: ["hidden"],
      subtree: true,
      childList: true,
    });
  }
  document.addEventListener("click", (event) => {
    const overflow = document.querySelector("#headerOverflow");
    if (!overflow || overflow.hidden || !overflow.open) return;
    if (!overflow.contains(event.target)) overflow.open = false;
  });
}
