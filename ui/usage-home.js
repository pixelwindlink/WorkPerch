export function bindUsageHomeScroll(home) {
  if (!home || home.dataset.scrollBound === "1") return;
  home.dataset.scrollBound = "1";
  home.addEventListener("wheel", (event) => {
    const chips = event.target.closest(".usage-home-chips");
    if (!chips || !home.contains(chips)) return;
    if (chips.scrollWidth <= chips.clientWidth + 1) return;
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    chips.scrollLeft += event.deltaY;
  }, { passive: false });
}
