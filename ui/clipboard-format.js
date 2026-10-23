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

export function clipboardKindLabel(kind) {
  if (kind === "image") return "图片";
  if (kind === "files") return "文件";
  return "文本";
}

export function clipboardRowMeta(item) {
  const when = formatClipboardTimestamp(item.capturedAt);
  const kind = item.kind || "text";
  if (kind === "image") {
    const size = item.imageWidth && item.imageHeight ? `${item.imageWidth}×${item.imageHeight}` : "图片";
    return `${clipboardKindLabel(kind)}·${size}·${when}`;
  }
  if (kind === "files") {
    const count = item.fileCount || item.length || 1;
    return `${clipboardKindLabel(kind)}·${count} 项·${when}`;
  }
  const tier = clipboardLengthTier(item.length || 0);
  return `${clipboardKindLabel(kind)}·${tier.label}·${item.length} 字·${when}`;
}

export function filterClipboardItems(items, query) {
  const q = String(query ?? "").trim().toLocaleLowerCase("zh-CN");
  if (!q) return items;
  return items.filter((item) => {
    const preview = String(item.preview ?? "").toLocaleLowerCase("zh-CN");
    const kind = clipboardKindLabel(item.kind).toLocaleLowerCase("zh-CN");
    return preview.includes(q) || kind.includes(q);
  });
}
