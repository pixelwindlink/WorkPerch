import {
  CLIPBOARD_WATCH_INTERVAL_ACTIVE_MS,
  CLIPBOARD_WATCH_INTERVAL_IDLE_MS,
} from "../ui/clipboard-config.js";

export function createClipboardWatcher({
  observeClipboardText,
  onHistoryChanged,
  intervals = {
    idle: CLIPBOARD_WATCH_INTERVAL_IDLE_MS,
    active: CLIPBOARD_WATCH_INTERVAL_ACTIVE_MS,
  },
} = {}) {
  let timer = null;
  let panelActive = false;
  let running = false;

  const tick = () => {
    const entry = observeClipboardText();
    if (entry) onHistoryChanged?.(entry);
  };

  const scheduleNext = () => {
    if (!running) return;
    if (timer) clearTimeout(timer);
    const delay = panelActive ? intervals.active : intervals.idle;
    timer = setTimeout(() => {
      tick();
      scheduleNext();
    }, delay);
  };

  return {
    start() {
      if (running) return;
      running = true;
      tick();
      scheduleNext();
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    setPanelActive(active) {
      panelActive = Boolean(active);
      tick();
    },
  };
}
