export function formatClipboardTimestamp(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const deltaMs = now - date.getTime();
  if (deltaMs < 60_000) return "刚刚";
  if (deltaMs < 3_600_000) return `${Math.floor(deltaMs / 60_000)} 分钟前`;
  if (deltaMs < 86_400_000) return `${Math.floor(deltaMs / 3_600_000)} 小时前`;
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function clipboardLengthTier(length) {
  if (length <= 80) return { id: "short", label: "短" };
  if (length <= 400) return { id: "medium", label: "中" };
  return { id: "long", label: "长" };
}

export function filterClipboardItems(items, query) {
  const q = String(query ?? "").trim().toLocaleLowerCase("zh-CN");
  if (!q) return items;
  return items.filter((item) => String(item.preview ?? "").toLocaleLowerCase("zh-CN").includes(q));
}
