/**
 * Desktop 剪贴板环形缓冲容量（条）。须放在 ui/ 以便浏览器静态服务可加载。
 */
export const CLIPBOARD_HISTORY_LIMIT = 100;
/** Background poll when the clipboard tab is not open. */
export const CLIPBOARD_WATCH_INTERVAL_IDLE_MS = 800;
/** Faster poll while the clipboard tab is visible (pairs with push updates). */
export const CLIPBOARD_WATCH_INTERVAL_ACTIVE_MS = 120;
/** Max PNG bytes stored per image clipboard entry. */
export const CLIPBOARD_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
