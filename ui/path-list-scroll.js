/** Chromium/Electron often skip wheel scrolling when the pointer is over row buttons. */
export function bindPathListWheelScroll(root = document.querySelector("#pathsPanel .path-list-body")) {
  if (!root || root.dataset.wheelBound === "1") return;
  root.dataset.wheelBound = "1";
  root.addEventListener(
    "wheel",
    (event) => {
      if (!root.contains(event.target)) return;
      const maxScroll = root.scrollHeight - root.clientHeight;
      if (maxScroll <= 0) return;
      const before = root.scrollTop;
      root.scrollTop += event.deltaY;
      if (root.scrollTop !== before) event.preventDefault();
    },
    { passive: false },
  );
}
