/** Whether a drag should show the global「收录路径」overlay (external files / URIs only). */
export function isExternalPathDropDrag(dataTransfer) {
  if (!dataTransfer) return false;
  const types = Array.from(dataTransfer.types || []);
  if (types.includes("text/tab-id")) return false;
  return types.includes("Files") || types.includes("text/uri-list");
}
