export function shouldOpenAddNoteOnEnter(event) {
  if (event.key !== "Enter" || event.isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return false;
  if (!document.querySelector("#notesPanel")?.classList.contains("is-active")) return false;
  if (document.querySelector("dialog[open]")) return false;
  if (document.body.classList.contains("guide-is-active")) return false;
  if (document.querySelector("#summonOverlay") && !document.querySelector("#summonOverlay").hidden) return false;

  const element = event.target;
  if (!element || typeof element.closest !== "function") return true;
  if (element.closest("#summonOverlay")) return false;
  if (element.closest("#editNoteForm")) return false;
  if (element.isContentEditable) return false;
  return true;
}

export function shouldOpenAddNoteOnShortcut(event) {
  if (event.key?.toLowerCase() !== "i" || !(event.metaKey || event.ctrlKey)) return false;
  if (event.altKey || event.shiftKey || event.isComposing) return false;
  if (!document.querySelector("#notesPanel")?.classList.contains("is-active")) return false;
  if (document.querySelector("dialog[open]")) return false;
  if (document.body.classList.contains("guide-is-active")) return false;
  const summonOverlay = document.querySelector("#summonOverlay");
  if (summonOverlay && !summonOverlay.hidden) return false;
  return !event.target?.closest?.("#summonOverlay");
}
